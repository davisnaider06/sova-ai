import "server-only";

import { prisma } from "@/lib/db";
import { toCents } from "@/lib/money";
import { loadSellerProfit, loadTopCreators } from "@/lib/campaign-metrics";
import { OrderStatus, type Prisma } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Números do dashboard, lidos do domínio real.
//
// Duas regras que valem para tudo aqui:
//
// - **Pedido cancelado e devolvido não conta como GMV.** Somar tudo é mais
//   fácil e faz o gráfico subir bonito, mas o seller descobre a diferença no
//   fechamento do mês e perde a confiança no painel inteiro.
//
// - **Comparação é sempre contra o mesmo intervalo anterior.** Um "+18%" sem
//   período de referência é enfeite; com ele, é informação.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/// Status que representam venda de verdade. Fica numa constante porque a mesma
/// regra precisa valer no KPI, no gráfico e no ranking — se divergirem, o
/// gráfico não fecha com o número em cima dele.
const REALIZED: Prisma.EnumOrderStatusFilter = {
  notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED],
};

export type SellerStats = {
  gmvCents: number;
  gmvDelta: number | null;
  orders: number;
  ordersDelta: number | null;
  activeProducts: number;
  activeCreators: number;
  pendingAffiliations: number;
  commissionsToPayCents: number;
  attributedShare: number | null;
  /// Null quando algum produto vendido não tem custos cadastrados — meio lucro
  /// é pior que lucro nenhum, porque o seller acredita no número.
  estimatedProfitCents: number | null;
  /// GMV ÷ comissões pagas. "Para cada R$ 1 de comissão, quanto entrou."
  roi: number | null;
  series: Array<{ label: string; value: number }>;
  topProducts: Array<{ id: string; name: string; gmvCents: number; orders: number }>;
  topCreators: Array<{
    creatorProfileId: string;
    name: string;
    gmvCents: number;
    orders: number;
    commissionCents: number;
  }>;
};

export async function loadSellerStats(
  sellerProfileId: string,
  days = 30,
): Promise<SellerStats> {
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY_MS);
  const previousSince = new Date(now.getTime() - 2 * days * DAY_MS);

  const [
    current,
    previous,
    activeProducts,
    activeCreators,
    pendingAffiliations,
    commissions,
    profit,
    topCreators,
  ] = await Promise.all([
      prisma.order.findMany({
        where: { sellerProfileId, placedAt: { gte: since }, orderStatus: REALIZED },
        select: {
          totalAmount: true,
          placedAt: true,
          attributedAffiliationId: true,
          items: {
            select: {
              totalAmount: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          sellerProfileId,
          placedAt: { gte: previousSince, lt: since },
          orderStatus: REALIZED,
        },
        select: { totalAmount: true },
      }),
      prisma.product.count({ where: { sellerProfileId, status: "ACTIVE" } }),
      prisma.affiliation
        .findMany({
          where: { status: "ACTIVE", product: { sellerProfileId } },
          select: { creatorProfileId: true },
          distinct: ["creatorProfileId"],
        })
        .then((r) => r.length),
      prisma.affiliation.count({
        where: { status: "PENDING", product: { sellerProfileId } },
      }),
      prisma.commission.findMany({
        where: {
          status: { in: ["PENDING", "APPROVED", "ESTIMATED"] },
          order: { sellerProfileId },
        },
        select: { estimatedAmount: true, finalAmount: true },
      }),
      loadSellerProfit(sellerProfileId, since),
      loadTopCreators(sellerProfileId, since),
    ]);

  const gmvCents = current.reduce((acc, o) => acc + toCents(o.totalAmount), 0);
  const previousGmv = previous.reduce((acc, o) => acc + toCents(o.totalAmount), 0);

  const attributedCount = current.filter((o) => o.attributedAffiliationId !== null).length;

  // Ranking de produtos por GMV: agregação em memória sobre um recorte de 30
  // dias. Vira SQL quando o recorte deixar de caber — não antes.
  const byProduct = new Map<string, { name: string; gmvCents: number; orders: number }>();
  for (const order of current) {
    for (const item of order.items) {
      const entry = byProduct.get(item.product.id) ?? {
        name: item.product.name,
        gmvCents: 0,
        orders: 0,
      };
      entry.gmvCents += toCents(item.totalAmount);
      entry.orders += 1;
      byProduct.set(item.product.id, entry);
    }
  }

  return {
    gmvCents,
    gmvDelta: percentChange(previousGmv, gmvCents),
    orders: current.length,
    ordersDelta: percentChange(previous.length, current.length),
    activeProducts,
    activeCreators,
    pendingAffiliations,
    commissionsToPayCents: commissions.reduce(
      (acc, c) => acc + (c.finalAmount !== null ? toCents(c.finalAmount) : toCents(c.estimatedAmount)),
      0,
    ),
    attributedShare: current.length > 0 ? attributedCount / current.length : null,
    estimatedProfitCents: profit.estimatedProfitCents,
    roi: profit.roi,
    topCreators,
    series: buildSeries(
      current.map((o) => ({ at: o.placedAt, cents: toCents(o.totalAmount) })),
      since,
      days,
    ),
    topProducts: [...byProduct.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.gmvCents - a.gmvCents)
      .slice(0, 5),
  };
}

export type CreatorStats = {
  earnedCents: number;
  pendingCents: number;
  earnedDelta: number | null;
  attributedOrders: number;
  gmvGeneratedCents: number;
  activeAffiliations: number;
  pendingAffiliations: number;
  series: Array<{ label: string; value: number }>;
  topProducts: Array<{ name: string; commissionCents: number; orders: number }>;
};

export async function loadCreatorStats(
  creatorProfileId: string,
  days = 30,
): Promise<CreatorStats> {
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY_MS);
  const previousSince = new Date(now.getTime() - 2 * days * DAY_MS);

  const [commissions, previousCommissions, affiliations] = await Promise.all([
    prisma.commission.findMany({
      where: {
        creatorProfileId,
        order: { placedAt: { gte: since }, orderStatus: REALIZED },
      },
      select: {
        estimatedAmount: true,
        finalAmount: true,
        status: true,
        order: {
          select: {
            placedAt: true,
            totalAmount: true,
            items: { select: { product: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.commission.findMany({
      where: {
        creatorProfileId,
        order: { placedAt: { gte: previousSince, lt: since }, orderStatus: REALIZED },
      },
      select: { estimatedAmount: true, finalAmount: true },
    }),
    prisma.affiliation.groupBy({
      by: ["status"],
      where: { creatorProfileId },
      _count: { _all: true },
    }),
  ]);

  const amountOf = (c: { estimatedAmount: unknown; finalAmount: unknown }) =>
    c.finalAmount !== null ? toCents(c.finalAmount as never) : toCents(c.estimatedAmount as never);

  const earned = commissions
    .filter((c) => ["APPROVED", "PAID"].includes(c.status))
    .reduce((acc, c) => acc + amountOf(c), 0);

  const pending = commissions
    .filter((c) => ["PENDING", "ESTIMATED"].includes(c.status))
    .reduce((acc, c) => acc + amountOf(c), 0);

  const byProduct = new Map<string, { commissionCents: number; orders: number }>();
  for (const c of commissions) {
    const name = c.order.items[0]?.product.name ?? "—";
    const entry = byProduct.get(name) ?? { commissionCents: 0, orders: 0 };
    entry.commissionCents += amountOf(c);
    entry.orders += 1;
    byProduct.set(name, entry);
  }

  const statusCount = (status: string) =>
    affiliations.find((a) => a.status === status)?._count._all ?? 0;

  return {
    earnedCents: earned,
    pendingCents: pending,
    earnedDelta: percentChange(
      previousCommissions.reduce((acc, c) => acc + amountOf(c), 0),
      earned,
    ),
    attributedOrders: commissions.length,
    gmvGeneratedCents: commissions.reduce((acc, c) => acc + toCents(c.order.totalAmount), 0),
    activeAffiliations: statusCount("ACTIVE"),
    pendingAffiliations: statusCount("PENDING"),
    series: buildSeries(
      commissions.map((c) => ({ at: c.order.placedAt, cents: amountOf(c) })),
      since,
      days,
    ),
    topProducts: [...byProduct.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.commissionCents - a.commissionCents)
      .slice(0, 5),
  };
}

// ---------------------------------------------------------------------------

/// Série diária completa, incluindo os dias sem venda.
///
/// Omitir os dias vazios encolhe o eixo e faz três vendas em três semanas
/// parecerem uma sequência — o gráfico passa a contar uma história que os dados
/// não contam.
function buildSeries(
  points: Array<{ at: Date; cents: number }>,
  since: Date,
  days: number,
): Array<{ label: string; value: number }> {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const date = new Date(since.getTime() + i * DAY_MS);
    buckets.set(dayKey(date), 0);
  }

  for (const p of points) {
    const key = dayKey(p.at);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + p.cents);
  }

  return [...buckets.entries()].map(([key, cents]) => ({
    label: key.slice(5).split("-").reverse().join("/"),
    value: cents / 100,
  }));
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/// Variação percentual. Devolve null quando não havia base de comparação —
/// crescer de zero para dez não é "+1000%", é a primeira venda.
function percentChange(before: number, after: number): number | null {
  if (before === 0) return null;
  return ((after - before) / before) * 100;
}

import "server-only";

import { prisma } from "@/lib/db";
import { parseCsv, pick } from "@/lib/integration/csv";
import { parseCents, toDecimalString } from "@/lib/money";
import { decideAttribution, DEFAULT_ATTRIBUTION_WINDOW_DAYS } from "@/lib/attribution";
import type { ImportReport } from "@/lib/integration/orders-contract";
import { OrderStatus, PaymentStatus } from "@/generated/prisma";

export type { ImportReport };

// ---------------------------------------------------------------------------
// Adapter de ingestão — CSV.
//
// É o primeiro adaptador da camada de integração, e existe por uma razão
// estratégica (DECISOES-E-PLANO.md §5): validar o desenho da ingestão hoje, com
// dado real, sem depender da aprovação do TikTok Shop Partner Center.
//
// O contrato desta camada é o que importa, não o formato: **normalizar para o
// domínio e devolver um relatório**. Quando a API liberar, ela entra como um
// segundo adapter chamando as mesmas funções de domínio daqui para baixo, e
// nenhuma linha de Order, Affiliation ou Commission muda.
//
// Idempotência (§62): webhook e planilha duplicados são regra, não exceção. A
// constraint (source, externalOrderId) resolve na origem, e reimportar o mesmo
// arquivo é uma operação segura — conta como "já existia", não cria de novo.
// ---------------------------------------------------------------------------

type ParsedRow = {
  line: number;
  externalOrderId: string;
  placedAt: Date;
  productRef: string;
  quantity: number;
  unitPriceCents: number | null;
  totalCents: number | null;
  status: OrderStatus;
  creatorHandle: string | null;
};

export async function importOrdersCsv(
  sellerProfileId: string,
  csvText: string,
  options: { windowDays?: number } = {},
): Promise<ImportReport> {
  const report: ImportReport = {
    ordersCreated: 0,
    ordersSkipped: 0,
    itemsCreated: 0,
    attributed: 0,
    unattributed: 0,
    commissionsCreated: 0,
    commissionTotalCents: 0,
    gmvCents: 0,
    errors: [],
  };

  const { rows } = parseCsv(csvText);
  if (rows.length === 0) {
    report.errors.push({ line: 0, message: "A planilha está vazia ou sem cabeçalho." });
    return report;
  }

  // Catálogo do seller indexado pelas três formas de referência que uma
  // planilha usa na prática: o id interno, o id da origem, e o nome do produto.
  const products = await prisma.product.findMany({
    where: { sellerProfileId },
    select: { id: true, name: true, externalProductId: true, price: true },
  });

  const byRef = new Map<string, (typeof products)[number]>();
  for (const p of products) {
    byRef.set(p.id.toLowerCase(), p);
    if (p.externalProductId) byRef.set(p.externalProductId.toLowerCase(), p);
    byRef.set(normalizeName(p.name), p);
  }

  // --- Leitura e validação linha a linha ---------------------------------
  const parsed: ParsedRow[] = [];
  rows.forEach((row, i) => {
    const line = i + 2; // +1 pelo cabeçalho, +1 porque humano conta do 1

    const externalOrderId = pick(row, "pedido_id", "id_do_pedido", "order_id", "numero_do_pedido", "pedido", "id");
    if (!externalOrderId) {
      report.errors.push({ line, message: "Sem identificador do pedido." });
      return;
    }

    const rawDate = pick(row, "data", "data_do_pedido", "order_date", "data_criacao", "created_time", "data_da_venda");
    const placedAt = parseDate(rawDate);
    if (!placedAt) {
      report.errors.push({ line, message: `Data inválida: "${rawDate}".` });
      return;
    }

    const productRef = pick(row, "produto_id", "product_id", "sku", "produto", "nome_do_produto", "product_name");
    if (!productRef) {
      report.errors.push({ line, message: "Sem produto." });
      return;
    }

    const quantity = Number(pick(row, "quantidade", "qtd", "quantity") || "1");
    if (!Number.isInteger(quantity) || quantity <= 0) {
      report.errors.push({ line, message: "Quantidade inválida." });
      return;
    }

    const unitPriceCents = parseCents(
      pick(row, "preco_unitario", "valor_unitario", "unit_price", "preco", "price"),
    );
    const totalCents = parseCents(
      pick(row, "total", "valor_total", "total_amount", "subtotal", "valor"),
    );

    if (unitPriceCents === null && totalCents === null) {
      report.errors.push({ line, message: "Sem preço unitário nem total." });
      return;
    }

    parsed.push({
      line,
      externalOrderId,
      placedAt,
      productRef,
      quantity,
      unitPriceCents,
      totalCents,
      status: mapStatus(pick(row, "status", "situacao", "order_status")),
      creatorHandle:
        pick(row, "creator", "criador", "afiliado", "creator_handle", "influenciador", "username") ||
        null,
    });
  });

  // --- Agrupamento por pedido -------------------------------------------
  // Um pedido de 3 itens são 3 linhas na planilha e 1 Order com 3 OrderItem.
  // É exatamente o que o schema pede ao não ter productId no Order.
  const byOrder = new Map<string, ParsedRow[]>();
  for (const row of parsed) {
    const list = byOrder.get(row.externalOrderId) ?? [];
    list.push(row);
    byOrder.set(row.externalOrderId, list);
  }

  const windowDays = options.windowDays ?? DEFAULT_ATTRIBUTION_WINDOW_DAYS;

  for (const [externalOrderId, lines] of byOrder) {
    try {
      const result = await importOneOrder(
        sellerProfileId,
        externalOrderId,
        lines,
        byRef,
        windowDays,
      );

      if (result.skipped) {
        report.ordersSkipped++;
        continue;
      }

      report.ordersCreated++;
      report.itemsCreated += result.items;
      report.gmvCents += result.gmvCents;
      if (result.attributed) {
        report.attributed++;
        report.commissionsCreated += result.commissionCents > 0 ? 1 : 0;
        report.commissionTotalCents += result.commissionCents;
      } else {
        report.unattributed++;
      }
    } catch (error) {
      report.errors.push({
        line: lines[0].line,
        message: error instanceof Error ? error.message : "Falha ao importar o pedido.",
      });
    }
  }

  return report;
}

async function importOneOrder(
  sellerProfileId: string,
  externalOrderId: string,
  lines: ParsedRow[],
  byRef: Map<string, { id: string; name: string; price: unknown }>,
  windowDays: number,
) {
  // Idempotência primeiro: reimportar o mesmo arquivo não pode duplicar venda
  // nem, principalmente, duplicar comissão.
  const existing = await prisma.order.findUnique({
    where: {
      source_externalOrderId: { source: "CSV_IMPORT", externalOrderId },
    },
    select: { id: true },
  });
  if (existing) return { skipped: true as const, items: 0, gmvCents: 0, attributed: false, commissionCents: 0 };

  const items = lines.map((line) => {
    const product = byRef.get(line.productRef.toLowerCase()) ?? byRef.get(normalizeName(line.productRef));
    if (!product) {
      throw new Error(`Produto não encontrado no seu catálogo: "${line.productRef}".`);
    }

    const unit = line.unitPriceCents ?? Math.round((line.totalCents ?? 0) / line.quantity);
    const total = line.totalCents ?? unit * line.quantity;

    return { productId: product.id, quantity: line.quantity, unitPriceCents: unit, totalCents: total };
  });

  const gmvCents = items.reduce((acc, i) => acc + i.totalCents, 0);
  const placedAt = lines[0].placedAt;
  const status = lines[0].status;
  const declaredCreatorHandle = lines.find((l) => l.creatorHandle)?.creatorHandle ?? null;

  // --- Candidatos à atribuição ------------------------------------------
  const productIds = [...new Set(items.map((i) => i.productId))];
  const affiliations = await prisma.affiliation.findMany({
    where: { productId: { in: productIds } },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      commissionRate: true,
      creatorProfileId: true,
      productId: true,
      creatorProfile: {
        select: {
          contents: {
            where: { productId: { in: productIds }, publishedAt: { not: null } },
            orderBy: { publishedAt: "desc" },
            take: 1,
            select: { publishedAt: true },
          },
          profile: { select: { displayName: true, externalAccounts: { select: { metadata: true } } } },
        },
      },
    },
  });

  const decision = decideAttribution({
    placedAt,
    declaredCreatorHandle,
    windowDays,
    candidates: affiliations.map((a) => ({
      affiliationId: a.id,
      creatorProfileId: a.creatorProfileId,
      // O handle do creator vem do perfil externo quando existe; sem OAuth
      // ainda, cai no nome de exibição, que é o que o seller digita na planilha.
      creatorHandle: a.creatorProfile.profile.displayName,
      startedAt: a.startedAt,
      endedAt: a.endedAt,
      status: a.status,
      lastContentAt: a.creatorProfile.contents[0]?.publishedAt ?? null,
    })),
  });

  const attributed = affiliations.find((a) => a.id === decision.affiliationId) ?? null;
  const rate = attributed ? Number(attributed.commissionRate.toString()) : 0;
  const commissionCents = attributed ? Math.round(gmvCents * rate) : 0;

  // Campanha vigente na data da venda, se houver.
  //
  // Sem isso `Order.campaignId` ficava sempre nulo e toda campanha exibia
  // resultado zero — o seller montava a iniciativa e nunca conseguia saber se
  // ela funcionou. A janela é a da própria campanha: uma venda de julho não
  // entra numa campanha que começou em agosto.
  const campaign = await prisma.campaign.findFirst({
    where: {
      sellerProfileId,
      status: { in: ["ACTIVE", "PAUSED", "ENDED"] },
      products: { some: { productId: { in: productIds } } },
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: placedAt } }] },
        { OR: [{ endAt: null }, { endAt: { gte: placedAt } }] },
      ],
    },
    orderBy: { startAt: "desc" },
    select: { id: true },
  });

  // Uma transação: pedido, itens e comissão entram juntos ou não entram.
  // Pedido gravado sem a comissão correspondente é dinheiro que some do
  // extrato do creator sem ninguém saber por quê.
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        sellerProfileId,
        campaignId: campaign?.id ?? null,
        orderStatus: status,
        paymentStatus: paymentFor(status),
        totalAmount: toDecimalString(gmvCents),
        creatorCommission: toDecimalString(commissionCents),
        netRevenue: toDecimalString(gmvCents - commissionCents),
        source: "CSV_IMPORT",
        externalOrderId,
        syncedAt: new Date(),
        placedAt,
        // A decisão de atribuição fica GRAVADA, com a janela usada. É o que
        // permite auditar depois por que aquela venda foi de quem foi.
        attributedAffiliationId: decision.affiliationId,
        attributedAt: decision.affiliationId ? new Date() : null,
        attributionWindowDays: decision.windowDays,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: toDecimalString(i.unitPriceCents),
            totalAmount: toDecimalString(i.totalCents),
          })),
        },
      },
      select: { id: true },
    });

    if (attributed && commissionCents > 0) {
      await tx.commission.create({
        data: {
          creatorProfileId: attributed.creatorProfileId,
          orderId: order.id,
          affiliationId: attributed.id,
          campaignId: campaign?.id ?? null,
          // Taxa congelada no momento da criação. Se o seller mudar a comissão
          // amanhã, esta linha não muda junto.
          rate: String(rate),
          estimatedAmount: toDecimalString(commissionCents),
          status: status === "DELIVERED" ? "APPROVED" : "PENDING",
        },
      });
    }

    await tx.event.create({
      data: {
        eventType: "ORDER_IMPORTED",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          externalOrderId,
          attributionReason: decision.reason,
          windowDays: decision.windowDays,
          gmvCents,
          commissionCents,
        },
      },
    });
  });

  return {
    skipped: false as const,
    items: items.length,
    gmvCents,
    attributed: decision.affiliationId !== null,
    commissionCents,
  };
}

// ---------------------------------------------------------------------------
// Normalizações de fronteira
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/// Aceita dd/mm/aaaa (o que o Excel brasileiro escreve) e ISO (o que uma API
/// escreve). Sem essa distinção, 03/08/2026 vira 8 de março.
function parseDate(raw: string): Date | null {
  if (!raw) return null;

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const [, d, m, y] = br;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapStatus(raw: string): OrderStatus {
  const s = raw.trim().toLowerCase();
  if (/entreg|delivered|conclu|complet/.test(s)) return OrderStatus.DELIVERED;
  if (/envi|shipped|transport/.test(s)) return OrderStatus.SHIPPED;
  if (/cancel/.test(s)) return OrderStatus.CANCELLED;
  if (/devolv|return|reembols|refund/.test(s)) return OrderStatus.RETURNED;
  if (/confirm|pago|paid|process/.test(s)) return OrderStatus.CONFIRMED;
  return OrderStatus.PENDING;
}

function paymentFor(status: OrderStatus): PaymentStatus {
  switch (status) {
    case OrderStatus.DELIVERED:
    case OrderStatus.SHIPPED:
    case OrderStatus.CONFIRMED:
      return PaymentStatus.PAID;
    case OrderStatus.RETURNED:
      return PaymentStatus.REFUNDED;
    case OrderStatus.CANCELLED:
      return PaymentStatus.FAILED;
    default:
      return PaymentStatus.PENDING;
  }
}

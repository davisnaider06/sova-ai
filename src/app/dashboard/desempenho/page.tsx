import { BarChart3, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { formatBRL, formatCompactNumber, formatPercent, toCents } from "@/lib/money";
import { OrderStatus } from "@/generated/prisma";

// §36 — Desempenho.
//
// Tudo aqui sai de venda atribuída de verdade (procedência PLATFORM). É a
// mesma fonte que alimenta o componente de histórico do matching, então o que
// o creator lê nesta tela explica por que os matches dele mudaram.
//
// Nada de views nem conversão: esses números viriam da conta conectada, que
// ainda não existe. Inventar aqui seria o erro que a §79 proíbe.
export default async function DesempenhoPage() {
  const { scope } = await requireCreatorScope();

  const commissions = await prisma.commission.findMany({
    where: {
      creatorProfileId: scope.creatorProfileId,
      order: { orderStatus: { notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED] } },
    },
    select: {
      estimatedAmount: true,
      finalAmount: true,
      rate: true,
      order: {
        select: {
          totalAmount: true,
          placedAt: true,
          items: {
            select: {
              quantity: true,
              totalAmount: true,
              product: { select: { id: true, name: true, category: true } },
            },
          },
        },
      },
    },
  });

  if (commissions.length === 0) {
    return (
      <>
        <Topbar title="Desempenho" subtitle="Onde você converte melhor" />
        <div className="p-6">
          <EmptyState
            icon={BarChart3}
            title="Ainda não há vendas suas para analisar"
            description="Esta tela sai de vendas atribuídas a você. Depois da primeira, ela mostra em que categoria e em que produto você rende mais — e é esse mesmo histórico que melhora os seus matches."
            action={{ href: "/dashboard/descobrir", label: "Descobrir produtos" }}
          />
        </div>
      </>
    );
  }

  const amountOf = (c: (typeof commissions)[number]) =>
    c.finalAmount !== null ? toCents(c.finalAmount) : toCents(c.estimatedAmount);

  const byCategory = new Map<string, { gmv: number; commission: number; orders: number }>();
  const byProduct = new Map<
    string,
    { name: string; category: string; gmv: number; commission: number; units: number }
  >();

  let totalGmv = 0;
  let totalCommission = 0;

  for (const c of commissions) {
    const commission = amountOf(c);
    totalCommission += commission;
    totalGmv += toCents(c.order.totalAmount);

    // A comissão é do pedido inteiro; rateamos entre os itens pelo valor de
    // cada um. Sem o rateio, um pedido de dois produtos creditaria a comissão
    // cheia aos dois e o total por categoria não fecharia com o total geral.
    const orderTotal = c.order.items.reduce((acc, i) => acc + toCents(i.totalAmount), 0) || 1;

    for (const item of c.order.items) {
      const itemGmv = toCents(item.totalAmount);
      const share = itemGmv / orderTotal;
      const itemCommission = Math.round(commission * share);

      const cat = byCategory.get(item.product.category) ?? { gmv: 0, commission: 0, orders: 0 };
      cat.gmv += itemGmv;
      cat.commission += itemCommission;
      cat.orders += 1;
      byCategory.set(item.product.category, cat);

      const prod = byProduct.get(item.product.id) ?? {
        name: item.product.name,
        category: item.product.category,
        gmv: 0,
        commission: 0,
        units: 0,
      };
      prod.gmv += itemGmv;
      prod.commission += itemCommission;
      prod.units += item.quantity;
      byProduct.set(item.product.id, prod);
    }
  }

  const categories = [...byCategory.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.commission - a.commission);

  const productsRanked = [...byProduct.values()].sort((a, b) => b.commission - a.commission);

  const bestCategory = categories[0];
  const maxCommission = categories[0]?.commission ?? 1;

  // Ticket médio por categoria comparado ao geral: é o sinal mais defensável
  // que dá para extrair sem dado de views. "Você converte 2,8x melhor" (§35)
  // exigiria taxa de conversão, que só a conta conectada traz.
  const overallTicket = totalGmv / commissions.length;

  return (
    <>
      <Topbar
        title="Desempenho"
        subtitle={`${commissions.length} ${commissions.length === 1 ? "venda atribuída" : "vendas atribuídas"} · ${formatBRL(totalCommission)} em comissões`}
      />

      <div className="flex flex-col gap-6 p-6">
        {bestCategory && (
          <Card className="flex items-start gap-3 border-brand/40 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-ink">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink-primary">
                {bestCategory.category} é onde você mais ganha
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {formatBRL(bestCategory.commission)} de comissão em{" "}
                {bestCategory.orders} {bestCategory.orders === 1 ? "venda" : "vendas"}.
                Produtos dessa categoria também recebem nota mais alta nos seus matches,
                porque o histórico entra no cálculo.
              </p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi label="GMV que você gerou" value={formatBRL(totalGmv)} />
          <Kpi label="Suas comissões" value={formatBRL(totalCommission)} accent />
          <Kpi
            label="Ticket médio"
            value={formatBRL(Math.round(overallTicket))}
            hint="por venda atribuída"
          />
        </div>

        <Card className="p-5">
          <p className="text-sm font-medium text-ink-primary">Por categoria</p>
          <ul className="mt-4 flex flex-col gap-4">
            {categories.map((c) => (
              <li key={c.category}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-primary">{c.category}</span>
                  <span className="text-sm font-medium tabular-nums text-ink-primary">
                    {formatBRL(c.commission)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border-strong">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.round((c.commission / maxCommission) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {c.orders} {c.orders === 1 ? "venda" : "vendas"} · {formatBRL(c.gmv)} de GMV ·
                  taxa efetiva {formatPercent(c.gmv > 0 ? c.commission / c.gmv : 0)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-2xl text-sm">
            <thead>
              <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 text-right font-medium">Unidades</th>
                <th className="px-5 py-3 text-right font-medium">GMV</th>
                <th className="px-5 py-3 text-right font-medium">Sua comissão</th>
              </tr>
            </thead>
            <tbody>
              {productsRanked.map((p) => (
                <tr key={p.name} className="border-b border-border-hairline last:border-0">
                  <td className="max-w-64 truncate px-5 py-3 text-ink-primary">{p.name}</td>
                  <td className="px-5 py-3 text-ink-secondary">{p.category}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">
                    {formatCompactNumber(p.units)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">
                    {formatBRL(p.gmv)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-brand-ink">
                    {formatBRL(p.commission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <p className="text-xs text-ink-muted">
          Views, cliques e taxa de conversão dependem da conta do TikTok conectada.
          Enquanto o OAuth não estiver liberado, esta tela mostra só o que foi medido
          aqui dentro — venda atribuída e comissão.
        </p>
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p
        className={
          accent
            ? "mt-2 text-2xl font-semibold tracking-tight text-brand-ink"
            : "mt-2 text-2xl font-semibold tracking-tight text-ink-primary"
        }
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </Card>
  );
}

import { Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { formatBRL, formatPercent, toCents } from "@/lib/money";

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "subtle" | "good" | "warning" | "critical" }
> = {
  ESTIMATED: { label: "Estimada", variant: "subtle" },
  PENDING: { label: "A aprovar", variant: "warning" },
  APPROVED: { label: "Aprovada", variant: "good" },
  PAID: { label: "Paga", variant: "good" },
  CANCELLED: { label: "Cancelada", variant: "critical" },
  ADJUSTED: { label: "Ajustada", variant: "subtle" },
};

export default async function ComissoesPage() {
  const { scope } = await requireCreatorScope();

  const commissions = await prisma.commission.findMany({
    where: { creatorProfileId: scope.creatorProfileId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      order: {
        select: {
          externalOrderId: true,
          placedAt: true,
          orderStatus: true,
          items: { select: { quantity: true, product: { select: { name: true } } } },
        },
      },
    },
  });

  // O valor final manda quando existe; a estimativa é o que se tem antes de o
  // seller fechar o repasse. Somar os dois campos sem essa regra faria a tela
  // mostrar um número que não é nem um nem outro.
  const amountOf = (c: (typeof commissions)[number]) =>
    c.finalAmount !== null ? toCents(c.finalAmount) : toCents(c.estimatedAmount);

  const paid = commissions.filter((c) => c.status === "PAID");
  const approved = commissions.filter((c) => c.status === "APPROVED");
  const pending = commissions.filter((c) => ["PENDING", "ESTIMATED"].includes(c.status));

  const sum = (list: typeof commissions) => list.reduce((acc, c) => acc + amountOf(c), 0);

  return (
    <>
      <Topbar
        title="Comissões"
        subtitle={
          commissions.length > 0
            ? `${commissions.length} ${commissions.length === 1 ? "venda atribuída a você" : "vendas atribuídas a você"}`
            : "O que você ganhou nas vendas atribuídas a você"
        }
      />

      <div className="flex flex-col gap-6 p-6">
        {commissions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhuma comissão ainda"
            description="Assim que uma venda for atribuída a você, ela aparece aqui com a taxa que valia no dia — e essa taxa não muda depois."
            action={{ href: "/dashboard/descobrir", label: "Descobrir produtos" }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Kpi label="Recebido" value={formatBRL(sum(paid))} hint={`${paid.length} pagas`} />
              <Kpi
                label="Aprovado, a receber"
                value={formatBRL(sum(approved))}
                hint={`${approved.length} aprovadas`}
                accent
              />
              <Kpi
                label="Em análise"
                value={formatBRL(sum(pending))}
                hint={`${pending.length} aguardando`}
              />
            </div>

            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-3xl text-sm">
                <thead>
                  <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
                    <th className="px-5 py-3 font-medium">Produto</th>
                    <th className="px-5 py-3 font-medium">Pedido</th>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 text-right font-medium">Taxa</th>
                    <th className="px-5 py-3 text-right font-medium">Você recebe</th>
                    <th className="px-5 py-3 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => {
                    const meta = STATUS_META[c.status] ?? STATUS_META.ESTIMATED;
                    return (
                      <tr key={c.id} className="border-b border-border-hairline last:border-0">
                        <td className="max-w-64 truncate px-5 py-3 text-ink-primary">
                          {c.order.items
                            .map((i) => `${i.quantity}× ${i.product.name}`)
                            .join(", ")}
                        </td>
                        <td className="px-5 py-3 text-ink-secondary">
                          {c.order.externalOrderId ?? "—"}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-ink-secondary">
                          {c.order.placedAt.toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">
                          {formatPercent(c.rate, 0)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums text-brand">
                          {formatBRL(amountOf(c))}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            <p className="text-xs text-ink-muted">
              A taxa mostrada é a que valia no momento da venda. Se o seller mudar a
              comissão depois, as vendas antigas continuam valendo o que valiam.
            </p>
          </>
        )}
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
  hint: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p
        className={
          accent
            ? "mt-2 text-2xl font-semibold tracking-tight text-brand"
            : "mt-2 text-2xl font-semibold tracking-tight text-ink-primary"
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </Card>
  );
}

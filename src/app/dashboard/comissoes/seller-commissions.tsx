import { Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/db";
import { requireSellerScope } from "@/lib/session";
import { formatBRL, formatPercent, toCents } from "@/lib/money";
import { approveAllPending, setCommissionStatus } from "./actions";

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

export async function SellerCommissions() {
  const { scope } = await requireSellerScope();

  const commissions = await prisma.commission.findMany({
    where: { order: { sellerProfileId: scope.sellerProfileId } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
    include: {
      creatorProfile: { select: { profile: { select: { displayName: true } } } },
      order: {
        select: {
          externalOrderId: true,
          placedAt: true,
          items: { select: { quantity: true, product: { select: { name: true } } } },
        },
      },
    },
  });

  const amountOf = (c: (typeof commissions)[number]) =>
    c.finalAmount !== null ? toCents(c.finalAmount) : toCents(c.estimatedAmount);

  const pending = commissions.filter((c) => ["PENDING", "ESTIMATED"].includes(c.status));
  const approved = commissions.filter((c) => c.status === "APPROVED");
  const paid = commissions.filter((c) => c.status === "PAID");
  const sum = (list: typeof commissions) => list.reduce((acc, c) => acc + amountOf(c), 0);

  // Quanto se deve a cada creator: é assim que o repasse é feito na prática,
  // uma transferência por pessoa, não uma por venda.
  const byCreator = new Map<string, { name: string; cents: number; count: number }>();
  for (const c of [...pending, ...approved]) {
    const name = c.creatorProfile.profile.displayName;
    const entry = byCreator.get(name) ?? { name, cents: 0, count: 0 };
    entry.cents += amountOf(c);
    entry.count += 1;
    byCreator.set(name, entry);
  }
  const owed = [...byCreator.values()].sort((a, b) => b.cents - a.cents);

  return (
    <>
      <Topbar
        title="Comissões"
        subtitle={
          commissions.length > 0
            ? `${formatBRL(sum(pending) + sum(approved))} a pagar para ${owed.length} ${owed.length === 1 ? "creator" : "creators"}`
            : "O que você deve aos creators"
        }
      />

      <div className="flex flex-col gap-6 p-6">
        {commissions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhuma comissão ainda"
            description="As comissões nascem da importação de pedidos: cada venda atribuída a um creator gera uma, com a taxa que valia no dia."
            action={{ href: "/dashboard/pedidos", label: "Importar pedidos" }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Kpi
                label="A aprovar"
                value={formatBRL(sum(pending))}
                hint={`${pending.length} ${pending.length === 1 ? "comissão" : "comissões"}`}
                accent={pending.length > 0}
              />
              <Kpi
                label="Aprovado, a pagar"
                value={formatBRL(sum(approved))}
                hint={`${approved.length} aguardando repasse`}
              />
              <Kpi label="Já pago" value={formatBRL(sum(paid))} hint={`${paid.length} quitadas`} />
            </div>

            {owed.length > 0 && (
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-primary">Total por creator</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      O repasse é uma transferência por pessoa, não uma por venda.
                    </p>
                  </div>
                  {pending.length > 0 && (
                    <form action={approveAllPending}>
                      <SubmitButton size="sm" variant="outline" pendingLabel="Aprovando...">
                        Aprovar as {pending.length} pendentes
                      </SubmitButton>
                    </form>
                  )}
                </div>

                <ul className="mt-4 flex flex-col gap-2">
                  {owed.map((o) => (
                    <li
                      key={o.name}
                      className="flex items-center justify-between gap-4 rounded-xl bg-surface-2 px-4 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm text-ink-primary">{o.name}</span>
                      <span className="shrink-0 text-xs text-ink-muted">
                        {o.count} {o.count === 1 ? "venda" : "vendas"}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-primary">
                        {formatBRL(o.cents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-3xl text-sm">
                <thead>
                  <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
                    <th className="px-5 py-3 font-medium">Creator</th>
                    <th className="px-5 py-3 font-medium">Produto</th>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 text-right font-medium">Taxa</th>
                    <th className="px-5 py-3 text-right font-medium">Valor</th>
                    <th className="px-5 py-3 font-medium">Situação</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => {
                    const meta = STATUS_META[c.status] ?? STATUS_META.ESTIMATED;
                    return (
                      <tr key={c.id} className="border-b border-border-hairline last:border-0">
                        <td className="px-5 py-3 text-ink-primary">
                          {c.creatorProfile.profile.displayName}
                        </td>
                        <td className="max-w-56 truncate px-5 py-3 text-ink-secondary">
                          {c.order.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-ink-secondary">
                          {c.order.placedAt.toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">
                          {formatPercent(c.rate, 0)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums text-ink-primary">
                          {formatBRL(amountOf(c))}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {["PENDING", "ESTIMATED"].includes(c.status) ? (
                            <form action={setCommissionStatus}>
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="status" value="APPROVED" />
                              <SubmitButton size="sm" variant="ghost" pendingLabel="...">
                                Aprovar
                              </SubmitButton>
                            </form>
                          ) : c.status === "APPROVED" ? (
                            <form action={setCommissionStatus}>
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="status" value="PAID" />
                              <SubmitButton size="sm" variant="outline" pendingLabel="...">
                                Marcar paga
                              </SubmitButton>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            <p className="text-xs text-ink-muted">
              A taxa de cada linha é a que valia no momento da venda e não muda mais.
              Aprovar e marcar como paga altera a situação do registro, nunca o valor.
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
    <Card className={accent ? "border-brand/40 p-5" : "p-5"}>
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </Card>
  );
}

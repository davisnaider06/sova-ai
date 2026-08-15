import { Receipt, TrendingUp, UserCheck, Users, Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { requireAdmin } from "@/lib/session";
import { ManualAccessForm } from "./manual-access-form";
import { UsersTable, type AdminUserRow } from "./users-table";

// Painel de administração: dinheiro que entrou e quem tem acesso.
//
// Restrito por `requireAdmin()`, que redireciona quem não é admin — e não por
// esconder o item de menu, que só esconderia o link, não a rota.

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function AdminPage() {
  const admin = await requireAdmin();

  const [pagos, doMes, ultimos, usuarios, assinaturasAtivas] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "paid" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: "paid", paidAt: { gte: startOfMonth() } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { subscription: true },
    }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
  ]);

  const rows: AdminUserRow[] = usuarios.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    subscriptionStatus: u.subscription?.status ?? null,
    subscriptionPlan: u.subscription?.planName ?? null,
    provider: u.subscription?.provider ?? null,
  }));

  const total = pagos._sum.amountCents ?? 0;
  const mes = doMes._sum.amountCents ?? 0;

  return (
    <>
      <Topbar title="Administração" subtitle="Faturamento e controle de acesso" />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Recebido no total"
            value={formatBRL(total)}
            icon={Wallet}
            hint={`${pagos._count} ${pagos._count === 1 ? "pagamento" : "pagamentos"}`}
          />
          <StatCard
            label="Recebido neste mês"
            value={formatBRL(mes)}
            icon={TrendingUp}
            hint={`${doMes._count} ${doMes._count === 1 ? "pagamento" : "pagamentos"}`}
          />
          <StatCard
            label="Assinaturas ativas"
            value={String(assinaturasAtivas)}
            icon={UserCheck}
          />
          <StatCard label="Contas criadas" value={String(usuarios.length)} icon={Users} />
        </div>

        {/* O aviso importa: o total aqui é o que a Hubla nos contou por webhook,
            não o extrato dela. Se um evento se perdeu, o número diverge — e
            quem lê precisa saber disso antes de conferir com o financeiro. */}
        <p className="text-xs text-ink-muted">
          Os valores vêm dos eventos que a Hubla enviou para a plataforma. Para conferência
          contábil, o extrato oficial é o do painel da Hubla.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-ink-primary">Últimos pagamentos</h2>
          {ultimos.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhum pagamento registrado ainda"
              description="Assim que a primeira venda cair na Hubla, ela aparece aqui."
            />
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-2xl text-sm">
                <thead>
                  <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">E-mail</th>
                    <th className="px-5 py-3 font-medium">Situação</th>
                    <th className="px-5 py-3 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimos.map((p) => (
                    <tr key={p.id} className="border-b border-border-hairline last:border-0">
                      <td className="px-5 py-3 text-ink-secondary">
                        {p.paidAt
                          ? p.paidAt.toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-ink-secondary">{p.email}</td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            p.status === "refunded"
                              ? "text-xs text-status-critical"
                              : "text-xs text-status-good"
                          }
                        >
                          {p.status === "refunded" ? "Reembolsado" : "Pago"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-ink-primary">
                        {formatBRL(p.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-ink-primary">Liberar acesso manualmente</h2>
          <ManualAccessForm />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-ink-primary">Usuários</h2>
          <UsersTable users={rows} currentUserId={admin.id} />
        </section>
      </div>
    </>
  );
}

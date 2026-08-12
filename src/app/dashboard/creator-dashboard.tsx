import Link from "next/link";
import { ArrowRight, Compass, Handshake, Receipt, Sparkles, Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { GmvAreaChart } from "@/components/charts/gmv-area-chart";
import { MatchScore } from "@/components/matching/match-score";
import { formatBRL, formatBRLCompact, formatPercent } from "@/lib/money";
import type { CreatorStats } from "@/lib/dashboard-stats";
import type { ScoredProduct } from "@/lib/discovery";

export function CreatorDashboard({
  stats,
  displayName,
  topMatches,
  profileComplete,
}: {
  stats: CreatorStats;
  displayName: string;
  topMatches: ScoredProduct[];
  profileComplete: boolean;
}) {
  const hasEarnings = stats.attributedOrders > 0;

  return (
    <>
      <Topbar title="Visão geral" subtitle={`Últimos 30 dias · ${displayName}`} />

      <div className="flex flex-col gap-6 p-6">
        {!profileComplete && <CompleteProfile />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Você ganhou"
            value={formatBRLCompact(stats.earnedCents)}
            delta={stats.earnedDelta}
            hint={hasEarnings ? undefined : "Aprovadas e pagas"}
            icon={Wallet}
            href="/dashboard/comissoes"
            accent
          />
          <StatCard
            label="Em análise"
            value={formatBRLCompact(stats.pendingCents)}
            hint="Aguardando o seller aprovar"
            icon={Receipt}
            href="/dashboard/comissoes"
          />
          <StatCard
            label="Vendas suas"
            value={String(stats.attributedOrders)}
            hint={
              stats.gmvGeneratedCents > 0
                ? `${formatBRLCompact(stats.gmvGeneratedCents)} movimentados`
                : "Atribuídas a você"
            }
            icon={Sparkles}
          />
          <StatCard
            label="Afiliações ativas"
            value={String(stats.activeAffiliations)}
            hint={
              stats.pendingAffiliations > 0
                ? `${stats.pendingAffiliations} aguardando aprovação`
                : "Produtos que você pode promover"
            }
            icon={Handshake}
            href="/dashboard/minhas-afiliacoes"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="flex flex-col p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-ink-primary">Comissões por dia</p>
              <p className="text-xs text-ink-muted">30 dias</p>
            </div>
            <div className="mt-4 h-64">
              {hasEarnings ? (
                <GmvAreaChart data={stats.series} />
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl bg-surface-2">
                  <p className="max-w-xs text-center text-sm text-ink-muted">
                    Suas comissões aparecem aqui assim que a primeira venda for
                    atribuída a você.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="flex flex-col p-5">
            <p className="text-sm font-medium text-ink-primary">
              {hasEarnings ? "Seus produtos que mais renderam" : "Melhores matches para você"}
            </p>

            {hasEarnings ? (
              <ul className="mt-4 flex flex-col gap-3">
                {stats.topProducts.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-semibold text-ink-secondary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-primary">{p.name}</p>
                      <p className="text-xs text-ink-muted">
                        {p.orders} {p.orders === 1 ? "venda" : "vendas"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-brand">
                      {formatBRL(p.commissionCents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : topMatches.length > 0 ? (
              <>
                <ul className="mt-4 flex flex-col gap-3">
                  {topMatches.map((p) => (
                    <li key={p.id}>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink-primary">{p.name}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {formatPercent(p.commissionRate, 0)} ·{" "}
                            {formatBRL(Math.round(p.priceCents * p.commissionRate))} por venda
                          </p>
                          <MatchScore match={p.match} className="mt-1.5" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link href="/dashboard/descobrir">Ver todos</Link>
                </Button>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">
                Ainda não há produtos disponíveis no marketplace.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/// O creator sem nicho declarado recebe match sem o componente mais pesado do
/// score. Dizer isso é mais útil que mostrar uma lista fraca sem explicação.
function CompleteProfile() {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 border-brand/40 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <Compass className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink-primary">Escolha seus nichos</p>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            O nicho é o sinal de maior peso no seu match. Sem ele, os produtos que
            aparecem para você são ordenados só pela comissão — não pelo que combina
            com o seu público.
          </p>
        </div>
      </div>
      <Button asChild size="sm">
        <Link href="/dashboard/configuracoes">
          Completar perfil
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}

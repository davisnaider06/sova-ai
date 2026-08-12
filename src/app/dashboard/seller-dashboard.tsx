import Link from "next/link";
import {
  ArrowRight,
  Handshake,
  Package,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { GmvAreaChart } from "@/components/charts/gmv-area-chart";
import { formatBRL, formatBRLCompact } from "@/lib/money";
import type { SellerStats } from "@/lib/dashboard-stats";

export function SellerDashboard({
  stats,
  displayName,
  hasProducts,
}: {
  stats: SellerStats;
  displayName: string;
  hasProducts: boolean;
}) {
  const hasSales = stats.orders > 0;

  return (
    <>
      <Topbar title="Visão geral" subtitle={`Últimos 30 dias · ${displayName}`} />

      <div className="flex flex-col gap-6 p-6">
        {/* Primeiro o que exige ação, depois o que informa. Um seller com
            creators esperando aprovação precisa ver isso antes do gráfico. */}
        {stats.pendingAffiliations > 0 && (
          <Card className="flex flex-wrap items-center justify-between gap-4 border-brand/40 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <Handshake className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-primary">
                  {stats.pendingAffiliations}{" "}
                  {stats.pendingAffiliations === 1
                    ? "creator quer promover seus produtos"
                    : "creators querem promover seus produtos"}
                </p>
                <p className="text-xs text-ink-muted">
                  Cada dia parado é venda que não acontece.
                </p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/afiliacoes">
                Ver pedidos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Card>
        )}

        {!hasProducts && <FirstStep />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="GMV"
            value={formatBRLCompact(stats.gmvCents)}
            delta={stats.gmvDelta}
            hint={hasSales ? undefined : "Sem vendas no período"}
            icon={TrendingUp}
            accent
          />
          <StatCard
            label="Pedidos"
            value={String(stats.orders)}
            delta={stats.ordersDelta}
            hint={
              stats.attributedShare !== null
                ? `${Math.round(stats.attributedShare * 100)}% com creator`
                : "Importe seus pedidos"
            }
            icon={Receipt}
            href="/dashboard/pedidos"
          />
          <StatCard
            label="Creators ativos"
            value={String(stats.activeCreators)}
            hint={
              stats.pendingAffiliations > 0
                ? `${stats.pendingAffiliations} aguardando você`
                : "Promovendo seus produtos"
            }
            icon={Users}
            href="/dashboard/afiliacoes"
          />
          <StatCard
            label="Comissões a pagar"
            value={formatBRL(stats.commissionsToPayCents)}
            hint="Aprovadas e pendentes"
            icon={Wallet}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="flex flex-col p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-ink-primary">GMV por dia</p>
              <p className="text-xs text-ink-muted">30 dias</p>
            </div>
            <div className="mt-4 h-64">
              {hasSales ? (
                <GmvAreaChart data={stats.series} />
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl bg-surface-2">
                  <p className="max-w-xs text-center text-sm text-ink-muted">
                    O gráfico aparece quando os primeiros pedidos forem importados.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="flex flex-col p-5">
            <p className="text-sm font-medium text-ink-primary">Produtos que mais venderam</p>
            {stats.topProducts.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">
                Sem vendas no período. Assim que houver, o ranking aparece aqui.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {stats.topProducts.map((p, i) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/produtos/${p.id}`}
                      className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-semibold text-ink-secondary">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink-primary">{p.name}</p>
                        <p className="text-xs text-ink-muted">
                          {p.orders} {p.orders === 1 ? "item vendido" : "itens vendidos"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-ink-primary">
                        {formatBRLCompact(p.gmvCents)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/// Primeiro passo explícito para conta nova. Um dashboard zerado sem instrução
/// é a tela em que o usuário decide que o produto não serve para ele.
function FirstStep() {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted">
          <Package className="h-4 w-4" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink-primary">Comece cadastrando um produto</p>
            <Badge variant="subtle">1 de 3</Badge>
          </div>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Cadastre o produto e informe os custos: a partir daí a plataforma calcula
            a comissão que cabe na sua margem, e o produto passa a aparecer para os
            creators.
          </p>
        </div>
      </div>
      <Button asChild size="sm">
        <Link href="/dashboard/produtos/novo">
          Cadastrar produto
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}

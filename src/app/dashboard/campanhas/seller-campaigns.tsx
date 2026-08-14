import Link from "next/link";
import { Megaphone, Package, Plus, Users } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSellerScope } from "@/lib/session";
import { formatBRLCompact, formatPercent } from "@/lib/money";
import { loadCampaignMetrics } from "@/lib/campaign-metrics";

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "subtle" | "good" | "warning" | "critical" }
> = {
  DRAFT: { label: "Rascunho", variant: "subtle" },
  ACTIVE: { label: "Ativa", variant: "good" },
  PAUSED: { label: "Pausada", variant: "warning" },
  ENDED: { label: "Encerrada", variant: "subtle" },
};

export async function SellerCampaigns() {
  const { scope } = await requireSellerScope();
  const campaigns = await scope.campaigns.listForIndex({ orderBy: { createdAt: "desc" } });

  // Resultado de cada campanha na própria listagem: campanha sem número é só
  // uma anotação, e o §45 é explícito que o seller precisa ver GMV e ROI.
  const metrics = await loadCampaignMetrics(campaigns.map((c) => c.id));

  return (
    <>
      <Topbar title="Campanhas" subtitle="Iniciativas comerciais com começo, fim e meta" />

      <div className="flex flex-col gap-6 p-6">
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Nenhuma campanha ainda"
            description="Campanha é diferente de afiliação: a afiliação é o creator habilitado a promover um produto; a campanha é uma ação sua, com prazo e meta, reunindo produtos e creators."
            action={{ href: "/dashboard/campanhas/nova", label: "Criar campanha" }}
          />
        ) : (
          <>
            <div className="flex justify-end">
              <Button asChild size="sm">
                <Link href="/dashboard/campanhas/nova">
                  <Plus className="h-4 w-4" />
                  Nova campanha
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.map((c) => {
                const meta = STATUS_META[c.status] ?? STATUS_META.DRAFT;
                const m = metrics.get(c.id);

                return (
                  <Link key={c.id} href={`/dashboard/campanhas/${c.id}`} className="group">
                    <Card className="flex h-full flex-col p-5 transition-colors group-hover:border-brand/40">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-ink-primary">{c.name}</p>
                        <Badge variant={meta.variant} className="shrink-0">
                          {meta.label}
                        </Badge>
                      </div>

                      {c.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-ink-muted">
                          {c.description}
                        </p>
                      )}

                      {m && m.orders > 0 && (
                        <div className="mt-4 flex gap-5">
                          <div>
                            <p className="text-[11px] text-ink-muted">GMV</p>
                            <p className="text-sm font-semibold tabular-nums text-ink-primary">
                              {formatBRLCompact(m.gmvCents)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-ink-muted">Pedidos</p>
                            <p className="text-sm font-semibold tabular-nums text-ink-primary">
                              {m.orders}
                            </p>
                          </div>
                          {m.roi !== null && (
                            <div>
                              <p className="text-[11px] text-ink-muted">ROI</p>
                              <p className="text-sm font-semibold tabular-nums text-ink-primary">
                                {m.roi.toFixed(1).replace(".", ",")}x
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs text-ink-muted">
                        <span className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" />
                          {c._count.products} {c._count.products === 1 ? "produto" : "produtos"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {c._count.creators} {c._count.creators === 1 ? "creator" : "creators"}
                        </span>
                        {c.commissionRate && (
                          <span className="font-medium text-ink-secondary">
                            {formatPercent(c.commissionRate)}
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

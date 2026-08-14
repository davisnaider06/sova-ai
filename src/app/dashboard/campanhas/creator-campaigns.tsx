import { Check, Megaphone, Package, X } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { formatBRL, formatPercent, toCents } from "@/lib/money";
import { respondToCampaignInvite } from "./creator-actions";

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "subtle" | "good" | "warning" | "critical" }
> = {
  INVITED: { label: "Convite aberto", variant: "warning" },
  ACCEPTED: { label: "Você aceitou", variant: "good" },
  REJECTED: { label: "Você recusou", variant: "subtle" },
  REMOVED: { label: "Removido", variant: "subtle" },
};

export async function CreatorCampaigns() {
  const { scope } = await requireCreatorScope();

  const invites = await prisma.campaignCreator.findMany({
    where: { creatorProfileId: scope.creatorProfileId },
    orderBy: [{ status: "asc" }, { invitedAt: "desc" }],
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          commissionRate: true,
          startAt: true,
          endAt: true,
          sellerProfile: { select: { profile: { select: { displayName: true } } } },
          products: {
            select: {
              commissionRate: true,
              product: { select: { id: true, name: true, price: true, category: true } },
            },
          },
        },
      },
    },
  });

  const open = invites.filter((i) => i.status === "INVITED");

  return (
    <>
      <Topbar
        title="Campanhas"
        subtitle={
          open.length > 0
            ? `${open.length} ${open.length === 1 ? "convite esperando" : "convites esperando"} sua resposta`
            : "Convites de sellers para campanhas"
        }
      />

      <div className="flex flex-col gap-6 p-6">
        {invites.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Nenhum convite ainda"
            description="Sellers montam campanhas com prazo e comissão diferenciada, e convidam creators que combinam com os produtos. Um perfil completo faz você aparecer nessas buscas."
            action={{ href: "/dashboard/configuracoes", label: "Completar meu perfil" }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {invites.map((invite) => {
              const c = invite.campaign;
              const meta = STATUS_META[invite.status] ?? STATUS_META.INVITED;
              const canRespond = invite.status === "INVITED" && c.status !== "ENDED";

              return (
                <Card key={invite.id} className="flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink-primary">{c.name}</p>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        {c.status === "ENDED" && invite.status === "INVITED" && (
                          <Badge variant="subtle">Campanha encerrada</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {c.sellerProfile.profile.displayName}
                        {c.endAt && ` · até ${c.endAt.toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>

                    {c.commissionRate && (
                      <div className="text-right">
                        <p className="text-[11px] text-ink-muted">Comissão da campanha</p>
                        <p className="text-lg font-semibold tabular-nums text-brand-ink">
                          {formatPercent(c.commissionRate, 0)}
                        </p>
                      </div>
                    )}
                  </div>

                  {c.description && (
                    <p className="text-sm text-ink-secondary">{c.description}</p>
                  )}

                  {/* O creator precisa saber o que vai promover e quanto ganha
                      em cada item antes de aceitar — aceitar cria a afiliação. */}
                  {c.products.length > 0 && (
                    <div className="rounded-xl bg-surface-2 p-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                        Produtos da campanha
                      </p>
                      <ul className="flex flex-col gap-2">
                        {c.products.map((cp) => {
                          const rate = cp.commissionRate ?? c.commissionRate;
                          const priceCents = toCents(cp.product.price);
                          const perSale =
                            rate !== null ? Math.round(priceCents * Number(rate.toString())) : null;

                          return (
                            <li
                              key={cp.product.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <Package className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                                <span className="truncate text-ink-primary">{cp.product.name}</span>
                              </span>
                              <span className="shrink-0 text-ink-muted">
                                {formatBRL(priceCents)}
                                {perSale !== null && (
                                  <>
                                    {" · você ganha "}
                                    <span className="font-medium text-brand-ink">
                                      {formatBRL(perSale)}
                                    </span>
                                  </>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {canRespond ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={respondToCampaignInvite}>
                        <input type="hidden" name="campaignId" value={c.id} />
                        <input type="hidden" name="decision" value="ACCEPT" />
                        <SubmitButton size="sm" pendingLabel="Aceitando...">
                          <Check className="h-4 w-4" />
                          Aceitar e me afiliar
                        </SubmitButton>
                      </form>
                      <form action={respondToCampaignInvite}>
                        <input type="hidden" name="campaignId" value={c.id} />
                        <input type="hidden" name="decision" value="REJECT" />
                        <SubmitButton size="sm" variant="outline" pendingLabel="...">
                          <X className="h-4 w-4" />
                          Recusar
                        </SubmitButton>
                      </form>
                    </div>
                  ) : invite.status === "ACCEPTED" ? (
                    <p className="text-xs text-ink-muted">
                      Você já está afiliado aos produtos desta campanha. Acompanhe em{" "}
                      <span className="text-ink-secondary">Minhas afiliações</span>.
                    </p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

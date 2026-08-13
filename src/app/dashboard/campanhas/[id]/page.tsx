import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Package, Plus, Users } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignForm } from "@/components/campanhas/campaign-form";
import { requireSellerScope } from "@/lib/session";
import { formatBRL, formatCompactNumber, toCents, toPercent } from "@/lib/money";
import { toggleCampaignProduct, updateCampaign } from "../actions";

export default async function CampanhaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { scope } = await requireSellerScope();

  const campaign = await scope.campaigns.findByIdWithRelations(id);
  if (!campaign) notFound();

  // Todos os produtos do seller, para o seletor de vínculo. Marcados os que já
  // estão na campanha — é mais direto que uma busca separada de "adicionar".
  const products = await scope.products.findMany({ orderBy: { name: "asc" } });
  const linkedIds = new Set(campaign.products.map((cp) => cp.productId));

  return (
    <>
      <Topbar title={campaign.name} subtitle="Campanha" />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6">
        <Link
          href="/dashboard/campanhas"
          className="flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para campanhas
        </Link>

        <Tabs defaultValue="produtos">
          <TabsList>
            <TabsTrigger value="produtos">
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Produtos ({campaign.products.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="creators">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Creators ({campaign.creators.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="dados">Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="produtos">
            {products.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-ink-muted">
                  Cadastre produtos antes de montar a campanha.
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {products.map((p) => {
                  const linked = linkedIds.has(p.id);
                  return (
                    <Card key={p.id} className="flex items-center gap-4 p-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-ink-muted" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-primary">{p.name}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {p.category} · {formatBRL(toCents(p.price))}
                        </p>
                      </div>

                      <form action={toggleCampaignProduct}>
                        <input type="hidden" name="campaignId" value={campaign.id} />
                        <input type="hidden" name="productId" value={p.id} />
                        <SubmitButton
                          size="sm"
                          variant={linked ? "subtle" : "outline"}
                          pendingLabel="..."
                        >
                          {linked ? (
                            <>
                              <Check className="h-4 w-4" />
                              Na campanha
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Adicionar
                            </>
                          )}
                        </SubmitButton>
                      </form>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="creators">
            {campaign.creators.length === 0 ? (
              <Card className="flex flex-col items-center px-6 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-muted">
                  <Users className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm font-medium text-ink-primary">
                  Nenhum creator convidado
                </p>
                <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
                  Convide creators a partir da busca, onde o match aparece com o
                  motivo e o nível de confiança.
                </p>
                <Link
                  href="/dashboard/creators"
                  className="mt-4 text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
                >
                  Encontrar creators
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {campaign.creators.map((cc) => (
                  <Card key={cc.id} className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-primary">
                        {cc.creatorProfile.profile.displayName}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {cc.creatorProfile.followersCount !== null
                          ? `${formatCompactNumber(cc.creatorProfile.followersCount)} seguidores`
                          : "Audiência não informada"}
                      </p>
                    </div>
                    <Badge variant={cc.status === "ACCEPTED" ? "good" : "subtle"}>
                      {CREATOR_STATUS[cc.status] ?? cc.status}
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="dados">
            <CampaignForm
              action={updateCampaign}
              submitLabel="Salvar campanha"
              values={{
                id: campaign.id,
                name: campaign.name,
                description: campaign.description ?? "",
                status: campaign.status,
                commissionRate: campaign.commissionRate
                  ? String(toPercent(campaign.commissionRate))
                  : "",
                targetSales: campaign.targetSales?.toString() ?? "",
                budget: campaign.budget
                  ? (toCents(campaign.budget) / 100).toFixed(2).replace(".", ",")
                  : "",
                startAt: toDateInput(campaign.startAt),
                endAt: toDateInput(campaign.endAt),
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

const CREATOR_STATUS: Record<string, string> = {
  INVITED: "Convidado",
  ACCEPTED: "Aceitou",
  REJECTED: "Recusou",
  REMOVED: "Removido",
};

function toDateInput(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

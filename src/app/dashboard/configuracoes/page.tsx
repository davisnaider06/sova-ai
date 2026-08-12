import { Link2, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/session";
import { toPercent } from "@/lib/money";
import { CreatorProfileForm } from "./creator-profile-form";
import { SellerProfileForm } from "./seller-profile-form";

export default async function ConfiguracoesPage() {
  const { user, profile } = await requireProfile();

  const [creator, seller, externalAccounts] = await Promise.all([
    profile.type === "CREATOR"
      ? prisma.creatorProfile.findUnique({ where: { profileId: profile.id } })
      : null,
    profile.type === "SELLER"
      ? prisma.sellerProfile.findUnique({ where: { profileId: profile.id } })
      : null,
    prisma.externalAccount.findMany({
      where: { profileId: profile.id },
      select: { provider: true, status: true, lastSyncedAt: true },
    }),
  ]);

  const tiktok = externalAccounts.find((a) => a.provider === "TIKTOK") ?? null;

  return (
    <>
      <Topbar
        title="Configurações"
        subtitle={profile.type === "CREATOR" ? "Seu perfil de creator" : "Seu perfil de seller"}
      />

      <div className="p-6">
        <Tabs defaultValue="perfil">
          <TabsList>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="integracoes">Integrações</TabsTrigger>
            <TabsTrigger value="conta">Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            {profile.type === "CREATOR" ? (
              <CreatorProfileForm
                values={{
                  displayName: profile.displayName,
                  bio: creator?.bio ?? "",
                  niches: creator?.niches ?? [],
                  followersCount: creator?.followersCount?.toString() ?? "",
                  averageViews: creator?.averageViews?.toString() ?? "",
                  engagementRate: creator?.engagementRate
                    ? String(toPercent(creator.engagementRate))
                    : "",
                }}
              />
            ) : (
              <SellerProfileForm
                values={{
                  displayName: profile.displayName,
                  companyName: seller?.companyName ?? "",
                  document: seller?.document ?? "",
                  businessType: seller?.businessType ?? "",
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="integracoes">
            {/* Status honesto. A integração com o TikTok depende de aprovação no
                Partner Center, que ainda não aconteceu — dizer "Conectada" numa
                tela de demonstração é o tipo de mentira que só aparece na frente
                do cliente. */}
            <Card className="flex max-w-2xl flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted">
                  <Link2 className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-primary">TikTok Shop</p>
                    <Badge variant={tiktok ? "good" : "subtle"}>
                      {tiktok ? "Conectada" : "Não conectada"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-muted">
                    {tiktok
                      ? tiktok.lastSyncedAt
                        ? `Última sincronização em ${tiktok.lastSyncedAt.toLocaleDateString("pt-BR")}.`
                        : "Conectada, aguardando primeira sincronização."
                      : "A conexão via OAuth entra quando o app for aprovado no Partner Center. Até lá, os pedidos entram por importação de planilha."}
                  </p>
                </div>
              </div>

              {!tiktok && (
                <div className="rounded-xl bg-surface-2 p-4 text-sm text-ink-secondary">
                  <p className="font-medium text-ink-primary">Enquanto isso</p>
                  <p className="mt-1">
                    A importação de pedidos por CSV cobre o mesmo fluxo: os pedidos
                    entram, a atribuição roda e as comissões são geradas do mesmo
                    jeito. Quando a API liberar, ela vira só mais uma fonte.
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="conta">
            <Card className="flex max-w-2xl flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink-primary">{user.email}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    E-mail, senha e login social são gerenciados pelo Clerk. Use o
                    menu do seu avatar, no topo, para alterá-los.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs text-ink-muted">Perfis nesta conta</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.profiles.map((p) => (
                    <Badge key={p.id} variant={p.id === profile.id ? "default" : "subtle"}>
                      {p.type === "CREATOR" ? "Creator" : "Seller"} · {p.displayName}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-muted">
                  Um mesmo login pode ter os dois papéis. Alterne pelo seletor na
                  barra lateral.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

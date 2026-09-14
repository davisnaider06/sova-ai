import { ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/session";
import { toPercent } from "@/lib/money";
import { isTikTokConfigured } from "@/lib/tiktok/config";
import { countVideos } from "@/lib/tiktok/connection";
import { isTikTokShopConfigured } from "@/lib/tiktok-shop/config";
import { countSyncedOrders } from "@/lib/tiktok-shop/connection";
import { CreatorProfileForm } from "./creator-profile-form";
import { SellerProfileForm } from "./seller-profile-form";
import { TikTokCard, type TikTokCardProps } from "./tiktok-card";
import { TikTokShopCard, type TikTokShopCardProps } from "./tiktok-shop-card";

/// Lê um campo do retrato de perfil guardado em `ExternalAccount.metadata`.
///
/// O metadata é `Json` no Prisma — um valor que veio de fora e pode ser
/// qualquer coisa. Ler com checagem de tipo evita que um formato inesperado
/// derrube a página de configurações inteira.
function readMetadata(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/// Mensagens que o callback e as actions devolvem pela query string.
function readFeedback(params: Record<string, string | string[] | undefined>) {
  const value = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  switch (value("tiktok")) {
    case "conectado":
      return { kind: "ok" as const, message: "Conta do TikTok conectada. Sincronize para trazer seus vídeos." };
    case "sincronizado": {
      const videos = Number(value("videos") ?? 0);
      return {
        kind: "ok" as const,
        message:
          videos > 0
            ? `Sincronizado: ${videos} ${videos === 1 ? "vídeo" : "vídeos"}.`
            : "Sincronizado. Nenhum vídeo público foi retornado.",
      };
    }
    case "desconectado":
      return { kind: "ok" as const, message: "Conta do TikTok desconectada." };
    case "erro":
      return { kind: "erro" as const, message: value("motivo") ?? "Algo deu errado na integração." };
    default:
      return null;
  }
}

/// Mesma lógica de `readFeedback`, para a conexão com a Affiliate Creator API
/// — chave de query separada (`tiktokshop`) porque os dois fluxos podem estar
/// em estados diferentes ao mesmo tempo.
function readTikTokShopFeedback(params: Record<string, string | string[] | undefined>) {
  const value = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  switch (value("tiktokshop")) {
    case "conectado":
      return {
        kind: "ok" as const,
        message: "Conta do TikTok Shop conectada. Sincronize para trazer seus pedidos.",
      };
    case "parcial":
      return { kind: "aviso" as const, message: value("motivo") ?? "Conectado com permissões incompletas." };
    case "sincronizado": {
      const pedidos = Number(value("pedidos") ?? 0);
      const avisos = Number(value("avisos") ?? 0);
      return {
        kind: "ok" as const,
        message:
          pedidos > 0
            ? `Sincronizado: ${pedidos} ${pedidos === 1 ? "pedido novo" : "pedidos novos"}.${
                avisos > 0 ? ` ${avisos} ${avisos === 1 ? "aviso" : "avisos"} — veja o log do servidor.` : ""
              }`
            : "Sincronizado. Nenhum pedido novo bateu com seu catálogo afiliado.",
      };
    }
    case "desconectado":
      return { kind: "ok" as const, message: "Conta do TikTok Shop desconectada." };
    case "erro":
      return { kind: "erro" as const, message: value("motivo") ?? "Algo deu errado na integração." };
    default:
      return null;
  }
}

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, profile } = await requireProfile();
  const params = await searchParams;

  const [creator, seller, tiktokAccount, tiktokShopAccount] = await Promise.all([
    profile.type === "CREATOR"
      ? prisma.creatorProfile.findUnique({ where: { profileId: profile.id } })
      : null,
    profile.type === "SELLER"
      ? prisma.sellerProfile.findUnique({ where: { profileId: profile.id } })
      : null,
    prisma.externalAccount.findFirst({
      where: { profileId: profile.id, provider: "TIKTOK" },
    }),
    profile.type === "CREATOR"
      ? prisma.externalAccount.findFirst({
          where: { profileId: profile.id, provider: "TIKTOK_SHOP" },
        })
      : null,
  ]);

  // Nenhum campo de token é lido aqui — nem cifrado. A UI não precisa deles.
  const connection: TikTokCardProps["connection"] = tiktokAccount
    ? {
        status: tiktokAccount.status,
        syncStatus: tiktokAccount.syncStatus,
        lastSyncedAt: tiktokAccount.lastSyncedAt,
        lastSyncError: tiktokAccount.lastSyncError,
        scopes: tiktokAccount.scopes,
        username: readMetadata(tiktokAccount.metadata, "username"),
        displayName: readMetadata(tiktokAccount.metadata, "displayName"),
        videoCount: await countVideos(tiktokAccount.id),
      }
    : null;

  const tiktokShopConnection: TikTokShopCardProps["connection"] = tiktokShopAccount
    ? {
        status: tiktokShopAccount.status,
        syncStatus: tiktokShopAccount.syncStatus,
        lastSyncedAt: tiktokShopAccount.lastSyncedAt,
        lastSyncError: tiktokShopAccount.lastSyncError,
        scopes: tiktokShopAccount.scopes,
        username: readMetadata(tiktokShopAccount.metadata, "username"),
        ordersSynced: await countSyncedOrders(profile.id),
      }
    : null;

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
            <div className="flex flex-col gap-4">
              {profile.type === "CREATOR" && (
                // Affiliate Creator API: histórico real de venda — o fluxo
                // padrão de onboarding, em destaque. Ver [[Sova -
                // Especificacao Integracao API TikTok]] no segundo cérebro.
                <TikTokShopCard
                  configured={isTikTokShopConfigured()}
                  connection={tiktokShopConnection}
                  feedback={readTikTokShopFeedback(params)}
                />
              )}

              {/* Login Kit: perfil e vídeos do próprio creator — audiência,
                  não venda. Continua existindo como está. */}
              <TikTokCard
                configured={isTikTokConfigured()}
                connection={connection}
                feedback={readFeedback(params)}
              />

              {profile.type === "SELLER" && (
                <Card className="flex max-w-2xl flex-col gap-3 p-5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-primary">TikTok Shop</p>
                    <Badge variant="subtle">Conexão do creator</Badge>
                  </div>
                  <p className="text-sm text-ink-muted">
                    Quem conecta o TikTok Shop é o creator, a partir do perfil dele — é a
                    autorização de venda afiliada, diferente desta conta. Enquanto isso, ou
                    para quem prefere planilha, a importação de pedidos na tela de Pedidos
                    cobre o mesmo fluxo: os pedidos entram, a atribuição roda e as comissões
                    são geradas do mesmo jeito.
                  </p>
                </Card>
              )}
            </div>
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

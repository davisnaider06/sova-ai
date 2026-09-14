import { AlertCircle, BadgeCheck, Check, Link2, RefreshCw, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  disconnectTikTokShop,
  startTikTokShopConnect,
  syncTikTokShopOrders,
} from "./tiktok-shop-actions";

// ---------------------------------------------------------------------------
// Card da conexão de creator com a Affiliate Creator API.
//
// Fica em destaque acima da importação por CSV (ver `Sova - Especificacao
// Integracao API TikTok` no segundo cérebro): é o fluxo padrão de onboarding
// — "conecte seu TikTok" — e o CSV vira a opção pra quem preferir planilha.
// O texto é honesto sobre o estado real: "não configurado" enquanto a Sova
// não tiver `TIKTOK_SHOP_APP_KEY`/`_APP_SECRET`, sem fingir que já funciona.
// ---------------------------------------------------------------------------

export type TikTokShopCardProps = {
  configured: boolean;
  connection: {
    status: string;
    syncStatus: string;
    lastSyncedAt: Date | null;
    lastSyncError: string | null;
    scopes: string[];
    username: string | null;
    ordersSynced: number;
  } | null;
  feedback: { kind: "ok" | "erro" | "aviso"; message: string } | null;
};

export function TikTokShopCard({ configured, connection, feedback }: TikTokShopCardProps) {
  const connected = connection?.status === "ACTIVE";
  const expired = connection?.status === "EXPIRED";

  return (
    <Card className="flex max-w-2xl flex-col gap-4 border-brand/30 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-ink">
          <ShoppingBag className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink-primary">TikTok Shop</p>
            <Badge variant="subtle" className="gap-1">
              <BadgeCheck className="h-3 w-3" />
              Recomendado
            </Badge>
            <Badge variant={connected ? "good" : expired ? "warning" : "subtle"}>
              {connected ? "Conta conectada" : expired ? "Autorização expirada" : "Não conectada"}
            </Badge>
          </div>

          {connected && connection ? (
            <div className="mt-1.5 text-sm text-ink-muted">
              {connection.username && <p className="text-ink-secondary">@{connection.username}</p>}
              <p className="mt-0.5">
                {connection.ordersSynced > 0
                  ? `${connection.ordersSynced} ${connection.ordersSynced === 1 ? "pedido trazido" : "pedidos trazidos"} da API`
                  : "Nenhum pedido trazido ainda"}
                {connection.lastSyncedAt &&
                  ` · última sincronização em ${connection.lastSyncedAt.toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}`}
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-ink-muted">
              Conecte para trazer seu histórico real de vendas afiliadas — produto, valor e
              comissão de cada pedido, direto do TikTok Shop. É esse dado que faz o matching
              enxergar creator que vende, não só creator com seguidor.
            </p>
          )}
        </div>
      </div>

      {feedback && (
        <p
          className={
            feedback.kind === "ok"
              ? "flex items-start gap-2 rounded-xl bg-status-good/10 px-4 py-3 text-sm text-ink-primary"
              : feedback.kind === "aviso"
                ? "flex items-start gap-2 rounded-xl bg-status-warning/10 px-4 py-3 text-sm text-ink-primary"
                : "flex items-start gap-2 rounded-xl bg-status-critical/10 px-4 py-3 text-sm text-ink-primary"
          }
        >
          {feedback.kind === "ok" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-status-good" />
          ) : (
            <AlertCircle
              className={
                feedback.kind === "aviso"
                  ? "mt-0.5 h-4 w-4 shrink-0 text-status-warning"
                  : "mt-0.5 h-4 w-4 shrink-0 text-status-critical"
              }
            />
          )}
          {feedback.message}
        </p>
      )}

      {connected && connection?.lastSyncError && (
        <p className="rounded-xl bg-status-warning/10 px-4 py-3 text-xs text-ink-secondary">
          Última sincronização com ressalvas: {connection.lastSyncError}
        </p>
      )}

      {!configured && (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-xs text-ink-muted">
          A integração não está configurada neste ambiente. Faltam{" "}
          <code className="text-ink-secondary">TIKTOK_SHOP_APP_KEY</code>,{" "}
          <code className="text-ink-secondary">TIKTOK_SHOP_APP_SECRET</code> e{" "}
          <code className="text-ink-secondary">TIKTOK_SHOP_REDIRECT_URI</code> — dependem do app
          criado no Partner Center, categoria Creator collaborations.
        </p>
      )}

      {connected && connection && connection.scopes.length > 0 && (
        <div>
          <p className="text-xs text-ink-muted">Permissões concedidas por você</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {connection.scopes.map((s) => (
              <Badge key={s} variant="subtle" className="px-2 py-0.5 text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {connected ? (
          <>
            <form action={syncTikTokShopOrders}>
              <SubmitButton size="sm" variant="outline" pendingLabel="Sincronizando...">
                <RefreshCw className="h-4 w-4" />
                Sincronizar agora
              </SubmitButton>
            </form>
            <form action={disconnectTikTokShop}>
              <SubmitButton size="sm" variant="ghost" pendingLabel="Desconectando...">
                Desconectar
              </SubmitButton>
            </form>
          </>
        ) : (
          <form action={startTikTokShopConnect}>
            <SubmitButton size="sm" disabled={!configured} pendingLabel="Abrindo o TikTok Shop...">
              <Link2 className="h-4 w-4" />
              {expired ? "Reconectar TikTok Shop" : "Conectar TikTok Shop"}
            </SubmitButton>
          </form>
        )}
      </div>

      {connected && (
        <p className="text-xs text-ink-muted">
          Só entram pedidos de produtos que já existem no catálogo de algum vendedor da Sova, com
          afiliação vinculada a você. Pedidos de outras lojas do TikTok Shop são ignorados.
        </p>
      )}

      {!connected && (
        <p className="text-xs text-ink-muted">
          Prefere não conectar agora? A importação de pedidos por planilha, na tela de Pedidos,
          cobre o mesmo fluxo — os pedidos entram, a atribuição roda e as comissões são geradas do
          mesmo jeito.
        </p>
      )}
    </Card>
  );
}

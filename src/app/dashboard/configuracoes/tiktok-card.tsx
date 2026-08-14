import { AlertCircle, Check, Link2, RefreshCw, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCompactNumber } from "@/lib/money";
import { disconnectTikTok, startTikTokConnect, syncTikTok } from "./tiktok-actions";

// Card da integração, usando os mesmos primitivos do resto do painel — Card,
// Badge, SubmitButton. Nada de tela com identidade própria.

export type TikTokCardProps = {
  configured: boolean;
  connection: {
    status: string;
    syncStatus: string;
    lastSyncedAt: Date | null;
    lastSyncError: string | null;
    scopes: string[];
    username: string | null;
    displayName: string | null;
    videoCount: number;
  } | null;
  /// Mensagem vinda do callback ou das actions, via query string.
  feedback: { kind: "ok" | "erro"; message: string } | null;
};

export function TikTokCard({ configured, connection, feedback }: TikTokCardProps) {
  const connected = connection?.status === "ACTIVE";
  const expired = connection?.status === "EXPIRED";

  return (
    <Card className="flex max-w-2xl flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted">
          <Link2 className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink-primary">TikTok</p>
            <Badge
              variant={connected ? "good" : expired ? "warning" : "subtle"}
              // O selo diz o estado real. Um "Conectada" fixo era o que estava
              // aqui antes de a integração existir.
            >
              {connected
                ? "Conta conectada"
                : expired
                  ? "Autorização expirada"
                  : "Não conectada"}
            </Badge>
          </div>

          {connected && connection ? (
            <div className="mt-1.5 text-sm text-ink-muted">
              {connection.username && (
                <p className="text-ink-secondary">@{connection.username}</p>
              )}
              <p className="mt-0.5">
                {connection.videoCount > 0
                  ? `${formatCompactNumber(connection.videoCount)} ${connection.videoCount === 1 ? "vídeo sincronizado" : "vídeos sincronizados"}`
                  : "Nenhum vídeo sincronizado ainda"}
                {connection.lastSyncedAt &&
                  ` · última sincronização em ${connection.lastSyncedAt.toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}`}
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-ink-muted">
              {expired
                ? "A autorização venceu ou foi revogada no TikTok. Reconecte para voltar a sincronizar."
                : "Conecte sua conta para o SaaS ler seu perfil e seus vídeos públicos, com sua autorização. Nunca pedimos sua senha."}
            </p>
          )}
        </div>
      </div>

      {feedback && (
        <p
          className={
            feedback.kind === "ok"
              ? "flex items-start gap-2 rounded-xl bg-status-good/10 px-4 py-3 text-sm text-ink-primary"
              : "flex items-start gap-2 rounded-xl bg-status-critical/10 px-4 py-3 text-sm text-ink-primary"
          }
        >
          {feedback.kind === "ok" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-status-good" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-critical" />
          )}
          {feedback.message}
        </p>
      )}

      {/* Erro do último sync que não impediu a conexão — scope faltando, por
          exemplo. Vale mostrar: explica por que um dado está vazio. */}
      {connected && connection?.lastSyncError && (
        <p className="rounded-xl bg-status-warning/10 px-4 py-3 text-xs text-ink-secondary">
          Última sincronização com ressalvas: {connection.lastSyncError}
        </p>
      )}

      {!configured && (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-xs text-ink-muted">
          A integração não está configurada neste ambiente. Faltam{" "}
          <code className="text-ink-secondary">TIKTOK_CLIENT_KEY</code>,{" "}
          <code className="text-ink-secondary">TIKTOK_CLIENT_SECRET</code> e{" "}
          <code className="text-ink-secondary">TIKTOK_REDIRECT_URI</code>. Ver
          TIKTOK-INTEGRACAO.md.
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
            <form action={syncTikTok}>
              <SubmitButton size="sm" variant="outline" pendingLabel="Sincronizando...">
                <RefreshCw className="h-4 w-4" />
                Sincronizar agora
              </SubmitButton>
            </form>
            <form action={disconnectTikTok}>
              <SubmitButton size="sm" variant="ghost" pendingLabel="Desconectando...">
                Desconectar
              </SubmitButton>
            </form>
          </>
        ) : (
          <form action={startTikTokConnect}>
            <SubmitButton size="sm" disabled={!configured} pendingLabel="Abrindo o TikTok...">
              <Video className="h-4 w-4" />
              {expired ? "Reconectar TikTok" : "Conectar TikTok"}
            </SubmitButton>
          </form>
        )}
      </div>

      {connected && (
        <p className="text-xs text-ink-muted">
          Ao desconectar, revogamos o acesso no TikTok e apagamos os tokens. Os vídeos
          já coletados permanecem — apagá-los é decisão de política de dados, não
          efeito colateral de um clique.
        </p>
      )}
    </Card>
  );
}

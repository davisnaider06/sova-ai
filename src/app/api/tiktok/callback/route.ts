import { NextResponse, type NextRequest } from "next/server";
import { ensureUser, resolveActiveProfile } from "@/lib/session";
import { exchangeCodeForTokens } from "@/lib/tiktok/oauth";
import { consumeState } from "@/lib/tiktok/state";
import { saveConnection } from "@/lib/tiktok/connection";
import { recordAudit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Callback do OAuth do TikTok.
//
// Route handler, e não Server Action, porque quem chama é o navegador voltando
// de um domínio externo com uma query string — não um formulário nosso.
//
// A ordem das validações importa e é deliberada:
//
//   1. erro devolvido pelo TikTok (usuário cancelou, app sem aprovação)
//   2. sessão autenticada    — o dono da conexão sai daqui, nunca da query
//   3. state                 — CSRF; consumido em qualquer desfecho
//   4. presença do code
//   5. troca do code por tokens
//   6. gravação
//
// O `profileId` vem da sessão do servidor. Aceitar um identificador de usuário
// vindo da query permitiria pendurar a conta TikTok do atacante no perfil de
// qualquer vítima.
// ---------------------------------------------------------------------------

const DESTINO = "/dashboard/configuracoes";

function back(request: NextRequest, params: Record<string, string>) {
  const url = new URL(DESTINO, request.nextUrl.origin);
  url.searchParams.set("aba", "integracoes");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // 1. O TikTok pode voltar com erro — cancelamento do usuário, por exemplo.
  const tiktokError = params.get("error");
  if (tiktokError) {
    // O state precisa ser consumido mesmo aqui, senão sobra válido no cookie.
    await consumeState(params.get("state"));
    return back(request, {
      tiktok: "erro",
      motivo:
        params.get("error_description") ||
        (tiktokError === "access_denied"
          ? "Você não autorizou o acesso."
          : `O TikTok recusou a autorização (${tiktokError}).`),
    });
  }

  // 2. Identidade: do servidor, nunca da query.
  const user = await ensureUser();
  const profile = user ? resolveActiveProfile(user) : null;
  if (!user || !profile) {
    return back(request, { tiktok: "erro", motivo: "Sessão expirada. Entre e tente de novo." });
  }

  // 3. CSRF.
  const stateOk = await consumeState(params.get("state"));
  if (!stateOk) {
    return back(request, {
      tiktok: "erro",
      motivo: "A autorização não pôde ser validada. Comece a conexão de novo.",
    });
  }

  // 4. Code.
  const code = params.get("code");
  if (!code) {
    return back(request, { tiktok: "erro", motivo: "O TikTok não devolveu o código." });
  }

  // 5. Troca.
  const tokens = await exchangeCodeForTokens(code);
  if (tokens.status !== "ok") {
    const motivo =
      tokens.status === "not_configured"
        ? "A integração com o TikTok não está configurada neste ambiente."
        : tokens.message;
    console.error("[tiktok] troca de code falhou:", motivo);
    return back(request, { tiktok: "erro", motivo });
  }

  // 6. Gravação.
  const saved = await saveConnection(profile.id, tokens.data);
  if (saved.status === "taken") {
    return back(request, {
      tiktok: "erro",
      motivo: "Esta conta do TikTok já está conectada a outro perfil.",
    });
  }
  if (saved.status !== "ok") {
    return back(request, { tiktok: "erro", motivo: saved.message });
  }

  await recordAudit({
    userId: user.id,
    profileId: profile.id,
    action: "TIKTOK_CONNECTED",
    entityType: "ExternalAccount",
    entityId: saved.account.id,
    // Só os scopes concedidos. Nenhum token entra no log de auditoria.
    metadata: { scopes: tokens.data.grantedScopes },
  });

  return back(request, { tiktok: "conectado" });
}

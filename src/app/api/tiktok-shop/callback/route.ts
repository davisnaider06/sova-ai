import { NextResponse, type NextRequest } from "next/server";
import { ensureUser, resolveActiveProfile } from "@/lib/session";
import { exchangeCodeForTokens, describeWrongUserType, missingScopes } from "@/lib/tiktok-shop/oauth";
import { consumeState } from "@/lib/tiktok-shop/state";
import { saveConnection } from "@/lib/tiktok-shop/connection";
import { recordAudit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Callback do OAuth de creator da Affiliate Creator API.
//
// Espelha `api/tiktok/callback/route.ts` (mesma ordem de validação, mesmo
// motivo para cada passo) — a diferença é o que vem depois da troca de token:
// aqui ainda falta confirmar `user_type === 1` e os scopes concedidos, porque
// a doc oficial ("Creator authorization guide") avisa duas vezes que sucesso
// no callback não garante nem a identidade certa nem os scopes pedidos.
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

  // 1. O TikTok pode voltar com erro — cancelamento do creator, por exemplo.
  const tiktokError = params.get("error");
  if (tiktokError) {
    await consumeState(params.get("state"));
    return back(request, {
      tiktokshop: "erro",
      motivo:
        params.get("error_description") ||
        (tiktokError === "auth_denied"
          ? "Você não autorizou o acesso."
          : `O TikTok Shop recusou a autorização (${tiktokError}).`),
    });
  }

  // 2. Identidade: do servidor, nunca da query.
  const user = await ensureUser();
  const profile = user ? resolveActiveProfile(user) : null;
  if (!user || !profile) {
    return back(request, { tiktokshop: "erro", motivo: "Sessão expirada. Entre e tente de novo." });
  }

  // A autorização de creator só faz sentido para um perfil de creator — um
  // seller que cair aqui por engano teria `user_type` errado de qualquer
  // forma, mas vale barrar antes de gastar uma troca de token.
  if (profile.type !== "CREATOR" || !profile.creatorProfile) {
    return back(request, {
      tiktokshop: "erro",
      motivo: "Conecte o TikTok Shop a partir do perfil de creator.",
    });
  }

  // 3. CSRF.
  const stateOk = await consumeState(params.get("state"));
  if (!stateOk) {
    return back(request, {
      tiktokshop: "erro",
      motivo: "A autorização não pôde ser validada. Comece a conexão de novo.",
    });
  }

  // 4. Code.
  const code = params.get("code");
  if (!code) {
    return back(request, { tiktokshop: "erro", motivo: "O TikTok Shop não devolveu o código." });
  }

  // 5. Troca.
  const tokens = await exchangeCodeForTokens(code);
  if (tokens.status !== "ok") {
    const motivo =
      tokens.status === "not_configured"
        ? "A integração com o TikTok Shop não está configurada neste ambiente."
        : tokens.message;
    console.error("[tiktok-shop] troca de code falhou:", motivo);
    return back(request, { tiktokshop: "erro", motivo });
  }

  // 5b. Identidade da autorização — precisa ser creator (user_type 1).
  const wrongType = describeWrongUserType(tokens.data.userType);
  if (wrongType) {
    return back(request, { tiktokshop: "erro", motivo: wrongType });
  }

  // 6. Gravação.
  const saved = await saveConnection(profile.id, tokens.data);
  if (saved.status === "taken") {
    return back(request, {
      tiktokshop: "erro",
      motivo: "Esta conta do TikTok Shop já está conectada a outro perfil.",
    });
  }
  if (saved.status !== "ok") {
    return back(request, { tiktokshop: "erro", motivo: saved.message });
  }

  await recordAudit({
    userId: user.id,
    profileId: profile.id,
    action: "TIKTOK_SHOP_CONNECTED",
    entityType: "ExternalAccount",
    entityId: saved.account.id,
    metadata: { scopes: tokens.data.grantedScopes },
  });

  // O creator pode ter desmarcado um scope na tela de autorização — sucesso
  // no callback não garante que o que a Sova precisa veio junto.
  const missing = missingScopes(tokens.data.grantedScopes);
  if (missing.length > 0) {
    return back(request, {
      tiktokshop: "parcial",
      motivo: `Conectado, mas faltam permissões: ${missing.join(", ")}. Reconecte e mantenha todas marcadas.`,
    });
  }

  return back(request, { tiktokshop: "conectado" });
}

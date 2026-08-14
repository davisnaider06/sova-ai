import { randomBytes } from "node:crypto";
import { TIKTOK_ENDPOINTS, TIKTOK_SCOPES, getTikTokConfig } from "@/lib/tiktok/config";

// ---------------------------------------------------------------------------
// Fluxo OAuth do Login Kit (web).
//
// Formas conferidas na documentação oficial em 13/08/2026:
//
//   autorizar : GET  https://www.tiktok.com/v2/auth/authorize/
//               client_key, scope, response_type=code, redirect_uri, state
//   token     : POST https://open.tiktokapis.com/v2/oauth/token/
//               form-urlencoded; grant_type=authorization_code | refresh_token
//   revogar   : POST https://open.tiktokapis.com/v2/oauth/revoke/
//               form-urlencoded; client_key, client_secret, token
//
// PKCE **não se aplica a web** — é exigido só para mobile e desktop. No web a
// proteção é o `state` mais o client secret, que nunca sai do servidor.
//
// Vidas úteis documentadas: access token 24 horas, refresh token 365 dias.
// ---------------------------------------------------------------------------

export type TikTokTokens = {
  accessToken: string;
  refreshToken: string;
  /// Identificador do usuário no TikTok. É o que casa a conexão com a conta.
  openId: string;
  /// Scopes efetivamente concedidos — pode ser menos do que pedimos, se o
  /// usuário desmarcar algum na tela de autorização.
  grantedScopes: string[];
  expiresAt: Date;
  refreshExpiresAt: Date;
};

export type OAuthResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_configured" }
  | { status: "error"; message: string };

/// Valor aleatório para o parâmetro `state`.
///
/// Serve de proteção contra CSRF: o callback só é aceito se o `state` que volta
/// do TikTok bater com o que guardamos em cookie httpOnly no início do fluxo.
/// Sem isso, um terceiro poderia induzir o usuário logado a completar uma
/// autorização que ele não iniciou.
export function generateState(): string {
  return randomBytes(32).toString("base64url");
}

/// Compara o state recebido com o esperado, em tempo constante.
///
/// `===` em string retorna no primeiro caractere diferente, e essa variação de
/// tempo é mensurável — daria a um atacante um oráculo para descobrir o state
/// caractere a caractere. Mora aqui, e não junto do cookie, para poder ser
/// testada sem contexto de requisição.
export function statesMatch(expected: string | null, received: string | null): boolean {
  if (!expected || !received) return false;
  if (expected.length !== received.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}

export function buildAuthorizeUrl(state: string): OAuthResult<string> {
  const config = getTikTokConfig();
  if (!config) return { status: "not_configured" };

  const url = new URL(TIKTOK_ENDPOINTS.authorize);
  url.searchParams.set("client_key", config.clientKey);
  url.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);

  return { status: "ok", data: url.toString() };
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  open_id?: string;
  scope?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
  log_id?: string;
};

export async function exchangeCodeForTokens(code: string): Promise<OAuthResult<TikTokTokens>> {
  const config = getTikTokConfig();
  if (!config) return { status: "not_configured" };

  return requestTokens({
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    // A doc é explícita: o code precisa ir **decodificado**. Ele chega na query
    // string do callback já decodificado pelo `URLSearchParams`, então não há
    // nada a fazer aqui — mas codificar de novo por engano quebraria a troca.
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<OAuthResult<TikTokTokens>> {
  const config = getTikTokConfig();
  if (!config) return { status: "not_configured" };

  return requestTokens({
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

/// Revoga o acesso no TikTok. Melhor esforço: se a chamada falhar, a conexão
/// local ainda é encerrada — deixar o usuário preso a uma conexão que ele
/// mandou remover seria pior que uma revogação remota pendente.
export async function revokeToken(accessToken: string): Promise<OAuthResult<true>> {
  const config = getTikTokConfig();
  if (!config) return { status: "not_configured" };

  try {
    const response = await fetch(TIKTOK_ENDPOINTS.revoke, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: config.clientKey,
        client_secret: config.clientSecret,
        token: accessToken,
      }),
    });

    if (!response.ok) {
      return { status: "error", message: `TikTok respondeu ${response.status} à revogação.` };
    }
    return { status: "ok", data: true };
  } catch {
    return { status: "error", message: "Não consegui falar com o TikTok para revogar o acesso." };
  }
}

async function requestTokens(
  params: Record<string, string>,
): Promise<OAuthResult<TikTokTokens>> {
  let payload: TokenResponse;

  try {
    const response = await fetch(TIKTOK_ENDPOINTS.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams(params),
    });
    payload = (await response.json()) as TokenResponse;
  } catch {
    return { status: "error", message: "Não consegui falar com o TikTok." };
  }

  if (payload.error) {
    // `error_description` do TikTok não carrega token; o `log_id` ajuda no
    // suporte deles. Nada daqui inclui o que enviamos.
    return {
      status: "error",
      message: payload.error_description
        ? `${payload.error}: ${payload.error_description}`
        : payload.error,
    };
  }

  if (!payload.access_token || !payload.refresh_token || !payload.open_id) {
    return { status: "error", message: "O TikTok devolveu uma resposta incompleta." };
  }

  const now = Date.now();
  return {
    status: "ok",
    data: {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      openId: payload.open_id,
      grantedScopes: parseScopes(payload.scope),
      expiresAt: new Date(now + (payload.expires_in ?? 0) * 1000),
      refreshExpiresAt: new Date(now + (payload.refresh_expires_in ?? 0) * 1000),
    },
  };
}

/// O TikTok devolve os scopes numa string separada por vírgula.
export function parseScopes(scope: string | undefined): string[] {
  if (!scope) return [];
  return scope
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/// Um token é tratado como vencido um pouco antes da hora.
///
/// A margem cobre o tempo entre decidir usar o token e a chamada chegar ao
/// TikTok: sem ela, um token com 3 segundos de vida passa na checagem e falha
/// na requisição.
const EXPIRY_SKEW_MS = 60_000;

export function isExpired(expiresAt: Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - EXPIRY_SKEW_MS <= now.getTime();
}

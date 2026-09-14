import { generateState, statesMatch } from "@/lib/tiktok/oauth";
import {
  CREATOR_USER_TYPE,
  TIKTOK_SHOP_ENDPOINTS,
  TIKTOK_SHOP_SCOPES,
  getTikTokShopConfig,
} from "@/lib/tiktok-shop/config";

// ---------------------------------------------------------------------------
// Fluxo OAuth do creator na Affiliate Creator API.
//
// Formas conferidas na doc oficial em 14/09/2026 ("Authorization overview" e
// "Creator authorization guide") — **diferente do Login Kit** em três pontos
// que custam uma tarde de debug se copiados de lá sem olhar a doc de novo:
//
//   1. domínio de autorização é shop.tiktok.com/alliance/creator/auth, com
//      `app_key` — não o `service_id` que a autorização de seller usa
//   2. troca de código é GET, não POST, em auth.tiktok-shops.com, e o
//      `grant_type` correto é `authorized_code` (assim mesmo, não é erro de
//      digitação — "consertar" para `authorization_code` quebra a chamada)
//   3. token de acesso dura 7 dias (não 24h) e vai no header
//      `x-tts-access-token` — não em `Authorization: Bearer`
//
// `generateState`/`statesMatch` são reaproveitados de `tiktok/oauth.ts`: são
// primitivas genéricas de string, sem nada específico do Login Kit.
// ---------------------------------------------------------------------------

export { generateState, statesMatch };

export type TikTokShopTokens = {
  accessToken: string;
  refreshToken: string;
  /// Identificador do creator no TikTok. Não confundir com o `open_id` do
  /// Login Kit — são apps diferentes, IDs diferentes, mesmo que a pessoa seja
  /// a mesma do outro lado.
  openId: string;
  grantedScopes: string[];
  expiresAt: Date;
  refreshExpiresAt: Date;
  /// Confirmado no passo 6 do fluxo oficial: precisa ser 1 (Creator). Guardado
  /// para o chamador decidir o que fazer com uma autorização no link errado,
  /// em vez de a checagem morar espalhada em cada callback.
  userType: number;
};

export type TikTokShopOAuthResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_configured" }
  | { status: "error"; message: string };

export function buildCreatorAuthorizeUrl(state: string): TikTokShopOAuthResult<string> {
  const config = getTikTokShopConfig();
  if (!config) return { status: "not_configured" };

  const url = new URL(TIKTOK_SHOP_ENDPOINTS.creatorAuthorize);
  url.searchParams.set("app_key", config.appKey);
  url.searchParams.set("state", state);

  return { status: "ok", data: url.toString() };
}

type TokenResponse = {
  code: number;
  message: string;
  request_id: string;
  data?: {
    access_token: string;
    access_token_expire_in: number;
    refresh_token: string;
    refresh_token_expire_in: number;
    open_id: string;
    user_type: number;
    granted_scopes?: string[];
  };
};

export async function exchangeCodeForTokens(
  authCode: string,
): Promise<TikTokShopOAuthResult<TikTokShopTokens>> {
  const config = getTikTokShopConfig();
  if (!config) return { status: "not_configured" };

  return requestTokens(TIKTOK_SHOP_ENDPOINTS.tokenGet, {
    app_key: config.appKey,
    app_secret: config.appSecret,
    auth_code: authCode,
    // Grafia exigida pela API do TikTok Shop — ver nota no cabeçalho do arquivo.
    grant_type: "authorized_code",
  });
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TikTokShopOAuthResult<TikTokShopTokens>> {
  const config = getTikTokShopConfig();
  if (!config) return { status: "not_configured" };

  return requestTokens(TIKTOK_SHOP_ENDPOINTS.tokenRefresh, {
    app_key: config.appKey,
    app_secret: config.appSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

async function requestTokens(
  endpoint: string,
  params: Record<string, string>,
): Promise<TikTokShopOAuthResult<TikTokShopTokens>> {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  let payload: TokenResponse;
  try {
    const response = await fetch(url, { method: "GET" });
    payload = (await response.json()) as TokenResponse;
  } catch {
    return { status: "error", message: "Não consegui falar com o TikTok Shop." };
  }

  if (payload.code !== 0 || !payload.data) {
    return {
      status: "error",
      message: payload.message || `O TikTok Shop recusou a chamada (código ${payload.code}).`,
    };
  }

  const { data } = payload;

  return {
    status: "ok",
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      openId: data.open_id,
      grantedScopes: data.granted_scopes ?? [],
      // `_expire_in` aqui é timestamp absoluto (epoch), não duração — a doc
      // oficial mostra o exemplo "1660556783", que é uma data, não 604800s.
      expiresAt: new Date(data.access_token_expire_in * 1000),
      refreshExpiresAt: new Date(data.refresh_token_expire_in * 1000),
      userType: data.user_type,
    },
  };
}

/// Confere se a autorização veio de um creator, e não de um seller/partner que
/// clicou no link errado. Devolve o motivo em português para a UI, sem expor
/// o número cru do `user_type`.
export function describeWrongUserType(userType: number): string {
  if (userType === CREATOR_USER_TYPE) return "";
  const names: Record<number, string> = { 0: "seller", 3: "partner (TAP)" };
  const name = names[userType] ?? `tipo ${userType}`;
  return `A autorização veio como ${name}, não como creator. Use o link de conexão do creator.`;
}

/// Confere se os scopes mínimos foram concedidos. A doc oficial é explícita:
/// "a creator may authorize only part of the requested scopes" — sucesso no
/// callback não significa que os scopes que a Sova precisa vieram junto.
export function missingScopes(granted: string[]): string[] {
  return TIKTOK_SHOP_SCOPES.filter((required) => !granted.includes(required));
}

const EXPIRY_SKEW_MS = 60_000;

export function isExpired(expiresAt: Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - EXPIRY_SKEW_MS <= now.getTime();
}

import { TIKTOK_SHOP_ENDPOINTS } from "@/lib/tiktok-shop/config";
import { signTikTokShopRequest } from "@/lib/tiktok-shop/sign";

// ---------------------------------------------------------------------------
// Cliente HTTP assinado da Affiliate Creator API.
//
// Toda resposta vem no mesmo envelope: { code, message, request_id, data }.
// Sucesso é `code === 0` — não o status HTTP. Confirmado na doc oficial
// ("Sign your API request", 14/09/2026) junto do algoritmo de assinatura.
//
// Este arquivo é HTTP puro: recebe app_key/app_secret/access_token, não sabe
// de banco. O ciclo de vida do token mora em `connection.ts` — mesma separação
// que `tiktok/client.ts` já usa para o Login Kit, pelo mesmo motivo: dá para
// testar parsing e assinatura sem subir Postgres.
// ---------------------------------------------------------------------------

export type TikTokShopErrorCode =
  | "invalid_token"
  | "missing_scope"
  | "expired_token"
  | "rate_limited"
  | "unavailable"
  | "unknown";

export type TikTokShopApiResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; code: TikTokShopErrorCode; message: string; rawCode: number };

type Envelope<T> = {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
};

/// Traduz o código numérico do TikTok Shop numa categoria que o chamador
/// consegue agir. A tabela completa de códigos é grande e muda por endpoint —
/// a doc do "Creator authorization guide" documenta só os mais comuns
/// (105001/105002/105005), por isso o padrão é `unknown` em vez de uma tabela
/// exaustiva que envelheceria calada.
function classifyError(code: number, httpStatus: number): TikTokShopErrorCode {
  if (code === 105002) return "expired_token";
  if (code === 105001 || code === 101000) return "invalid_token";
  if (code === 105005) return "missing_scope";
  if (code === 36009002 || httpStatus === 429) return "rate_limited";
  if (httpStatus >= 500) return "unavailable";
  return "unknown";
}

type RequestArgs = {
  method: "GET" | "POST";
  path: string;
  appKey: string;
  appSecret: string;
  accessToken: string;
  query?: Record<string, string>;
  /// Corpo já pronto para `JSON.stringify` — o client serializa uma vez só,
  /// e assina exatamente os bytes que envia (ver nota em `sign.ts`).
  body?: Record<string, unknown>;
};

async function request<T>({
  method,
  path,
  appKey,
  appSecret,
  accessToken,
  query = {},
  body,
}: RequestArgs): Promise<TikTokShopApiResult<T>> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signQuery = { ...query, app_key: appKey, timestamp };
  const bodyText = body ? JSON.stringify(body) : null;

  const sign = signTikTokShopRequest({
    path,
    query: signQuery,
    body: bodyText,
    appSecret,
  });

  const url = new URL(`${TIKTOK_SHOP_ENDPOINTS.apiBase}${path}`);
  for (const [key, value] of Object.entries(signQuery)) url.searchParams.set(key, value);
  url.searchParams.set("sign", sign);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        "x-tts-access-token": accessToken,
      },
      body: bodyText ?? undefined,
    });
  } catch {
    return {
      status: "error",
      code: "unavailable",
      message: "Não consegui falar com o TikTok Shop.",
      rawCode: -1,
    };
  }

  let payload: Envelope<T>;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    return {
      status: "error",
      code: classifyError(-1, response.status),
      message: `O TikTok Shop respondeu ${response.status} sem um corpo legível.`,
      rawCode: -1,
    };
  }

  if (payload.code !== 0) {
    return {
      status: "error",
      code: classifyError(payload.code, response.status),
      message: payload.message || `O TikTok Shop recusou a chamada (código ${payload.code}).`,
      rawCode: payload.code,
    };
  }

  if (payload.data === undefined) {
    return {
      status: "error",
      code: "unknown",
      message: "Resposta sem dados.",
      rawCode: payload.code,
    };
  }

  return { status: "ok", data: payload.data };
}

export function tiktokShopGet<T>(
  args: Omit<RequestArgs, "method" | "body">,
): Promise<TikTokShopApiResult<T>> {
  return request<T>({ ...args, method: "GET" });
}

export function tiktokShopPost<T>(
  args: Omit<RequestArgs, "method">,
): Promise<TikTokShopApiResult<T>> {
  return request<T>({ ...args, method: "POST" });
}

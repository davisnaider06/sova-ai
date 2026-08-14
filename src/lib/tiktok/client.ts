// ---------------------------------------------------------------------------
// Cliente HTTP da Display API.
//
// Toda resposta do TikTok vem no mesmo envelope:
//
//   { "data": { ... }, "error": { "code": "ok", "message": "", "log_id": "..." } }
//
// Sucesso é `error.code === "ok"` — e não o status HTTP. Uma resposta 200 pode
// perfeitamente carregar um erro de scope aqui dentro, então checar só o status
// deixaria passar falha silenciosa.
//
// Este arquivo é HTTP puro: recebe um token, não sabe de banco nem de refresh.
// O ciclo de vida do token mora em `connection.ts`, e é essa separação que
// permite testar o parsing sem subir banco.
// ---------------------------------------------------------------------------

export type TikTokErrorCode =
  | "invalid_token"
  | "scope_missing"
  | "rate_limited"
  | "unavailable"
  | "unknown";

export type TikTokApiResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; code: TikTokErrorCode; message: string };

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string; log_id?: string };
};

/// Traduz o código do TikTok para uma categoria que o chamador consegue tratar.
///
/// A lista de códigos do TikTok é aberta e muda sem aviso; por isso o padrão é
/// `unknown` em vez de uma tabela exaustiva que envelheceria calada.
export function classifyError(code: string | undefined, httpStatus: number): TikTokErrorCode {
  const c = (code ?? "").toLowerCase();
  if (c.includes("access_token") || c.includes("token") || httpStatus === 401) {
    return "invalid_token";
  }
  if (c.includes("scope") || httpStatus === 403) return "scope_missing";
  if (c.includes("rate") || httpStatus === 429) return "rate_limited";
  if (httpStatus >= 500) return "unavailable";
  return "unknown";
}

async function request<T>(
  url: string,
  accessToken: string,
  init: RequestInit,
): Promise<TikTokApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        // O token só existe aqui. Nunca é logado, nunca volta numa mensagem de
        // erro, nunca cruza para o cliente.
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    return { status: "error", code: "unavailable", message: "Não consegui falar com o TikTok." };
  }

  let payload: Envelope<T>;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    return {
      status: "error",
      code: classifyError(undefined, response.status),
      message: `O TikTok respondeu ${response.status} sem um corpo legível.`,
    };
  }

  const errorCode = payload.error?.code;
  if (errorCode && errorCode !== "ok") {
    return {
      status: "error",
      code: classifyError(errorCode, response.status),
      message: payload.error?.message || `O TikTok recusou a chamada (${errorCode}).`,
    };
  }

  if (!response.ok) {
    return {
      status: "error",
      code: classifyError(errorCode, response.status),
      message: `O TikTok respondeu ${response.status}.`,
    };
  }

  if (!payload.data) {
    return { status: "error", code: "unknown", message: "Resposta sem dados." };
  }

  return { status: "ok", data: payload.data };
}

export function tiktokGet<T>(
  endpoint: string,
  accessToken: string,
  fields: readonly string[],
): Promise<TikTokApiResult<T>> {
  const url = new URL(endpoint);
  url.searchParams.set("fields", fields.join(","));
  return request<T>(url.toString(), accessToken, { method: "GET" });
}

export function tiktokPost<T>(
  endpoint: string,
  accessToken: string,
  fields: readonly string[],
  body: Record<string, unknown>,
): Promise<TikTokApiResult<T>> {
  // Detalhe da API que engana: mesmo no POST, `fields` vai na query string —
  // não no corpo. Mandar no corpo devolve a resposta sem os campos pedidos.
  const url = new URL(endpoint);
  url.searchParams.set("fields", fields.join(","));

  return request<T>(url.toString(), accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

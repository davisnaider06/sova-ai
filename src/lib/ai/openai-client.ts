import "server-only";

import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Cliente da API da OpenAI — usado só para geração de imagem (gpt-image-1).
//
// Mesmo padrão do cliente da Anthropic em client.ts: sem a chave, devolve
// null e cada feature mostra "não configurado" em vez de estourar exceção ou,
// pior, mostrar imagem de exemplo como se fosse gerada.
// ---------------------------------------------------------------------------

export const IMAGE_MODEL = "gpt-image-1";

let cached: OpenAI | null | undefined;

export function getOpenAi(): OpenAI | null {
  if (cached !== undefined) return cached;

  const apiKey = process.env.OPENAI_API_KEY;
  cached = apiKey ? new OpenAI({ apiKey }) : null;
  return cached;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export type OpenAiResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_configured" }
  | { status: "refused"; reason: string }
  | { status: "error"; message: string };

/// Traduz uma exceção do SDK numa mensagem que o usuário consegue agir.
export function describeOpenAiError(error: unknown): string {
  if (error instanceof OpenAI.AuthenticationError) {
    return "A chave da API foi recusada. Confira OPENAI_API_KEY.";
  }
  if (error instanceof OpenAI.RateLimitError) {
    return "Limite de uso da API atingido. Tente de novo em alguns instantes.";
  }
  if (error instanceof OpenAI.BadRequestError) {
    if (/billing|quota|insufficient_quota/i.test(error.message)) {
      return "A conta da OpenAI está sem créditos. Adicione crédito em platform.openai.com > Billing.";
    }
    return `A requisição foi recusada pela API: ${error.message}`;
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return "Não consegui falar com a API da OpenAI. Verifique a conexão.";
  }
  if (error instanceof OpenAI.APIError) {
    return `Erro da API (${error.status}): ${error.message}`;
  }
  return error instanceof Error ? error.message : "Falha inesperada na geração.";
}

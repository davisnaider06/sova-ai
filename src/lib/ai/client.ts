import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Cliente da API da Anthropic.
//
// Um ponto que confunde e custa dinheiro: **assinatura do Claude.ai ou do
// Claude Code não é acesso à API.** São produtos e faturamentos separados. A
// chave sai do console.anthropic.com e o consumo é cobrado por token.
//
// Enquanto a chave não existir, `getAnthropic()` devolve null e cada feature de
// IA mostra estado "não configurado" — em vez de estourar exceção na cara do
// usuário ou, pior, exibir texto de exemplo como se fosse gerado.
// ---------------------------------------------------------------------------

/// Modelo padrão. Fixo aqui para não haver duas telas gerando com modelos
/// diferentes sem ninguém decidir.
export const AI_MODEL = "claude-opus-5";

let cached: Anthropic | null | undefined;

export function getAnthropic(): Anthropic | null {
  if (cached !== undefined) return cached;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  cached = apiKey ? new Anthropic({ apiKey }) : null;
  return cached;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/// Resultado de qualquer geração de IA.
///
/// União discriminada em vez de exceção: "não configurado" e "o modelo recusou"
/// são estados normais do produto que a UI precisa saber distinguir, não falhas
/// excepcionais. Só erro de rede/API vira `error`.
export type AiResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_configured" }
  | { status: "refused"; reason: string }
  | { status: "error"; message: string };

/// Traduz uma exceção do SDK numa mensagem que o usuário consegue agir.
export function describeAiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "A chave da API foi recusada. Confira ANTHROPIC_API_KEY.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Limite de uso da API atingido. Tente de novo em alguns instantes.";
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `A requisição foi recusada pela API: ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Não consegui falar com a API da Anthropic. Verifique a conexão.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Erro da API (${error.status}): ${error.message}`;
  }
  return error instanceof Error ? error.message : "Falha inesperada na geração.";
}

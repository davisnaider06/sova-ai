import "server-only";

import RunwayML from "@runwayml/sdk";

// ---------------------------------------------------------------------------
// Cliente da API da Runway — geração de vídeo (recipe productUgc).
//
// Mesmo padrão dos outros dois clientes (Anthropic, OpenAI): sem a chave,
// devolve null e a feature mostra "não configurado".
//
// A chave sai de RUNWAYML_API_SECRET (nome que o próprio SDK já lê por
// padrão) — não confundir com uma eventual "API key" de outro produto da
// Runway, é especificamente a "API Secret" do painel de developers.
// ---------------------------------------------------------------------------

let cached: RunwayML | null | undefined;

export function getRunway(): RunwayML | null {
  if (cached !== undefined) return cached;

  const apiKey = process.env.RUNWAYML_API_SECRET;
  cached = apiKey ? new RunwayML({ apiKey }) : null;
  return cached;
}

export function isRunwayConfigured(): boolean {
  return Boolean(process.env.RUNWAYML_API_SECRET);
}

/// Traduz uma exceção do SDK numa mensagem que o usuário consegue agir.
export function describeRunwayError(error: unknown): string {
  if (error instanceof RunwayML.AuthenticationError) {
    return "A chave da API foi recusada. Confira RUNWAYML_API_SECRET.";
  }
  if (error instanceof RunwayML.RateLimitError) {
    return "Limite de uso da API da Runway atingido. Tente de novo em alguns instantes.";
  }
  if (error instanceof RunwayML.BadRequestError) {
    if (/credit|balance|insufficient/i.test(error.message)) {
      return "A conta da Runway está sem créditos. Adicione crédito no painel da Runway.";
    }
    return `A requisição foi recusada pela API: ${error.message}`;
  }
  if (error instanceof RunwayML.APIConnectionError) {
    return "Não consegui falar com a API da Runway. Verifique a conexão.";
  }
  if (error instanceof RunwayML.APIError) {
    return `Erro da API (${error.status}): ${error.message}`;
  }
  return error instanceof Error ? error.message : "Falha inesperada na geração.";
}

/// Mesmo formato de `AiResult`/`OpenAiResult` — união discriminada em vez de
/// exceção, porque "não configurado" é estado normal do produto.
export type RunwayResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_configured" }
  | { status: "error"; message: string };

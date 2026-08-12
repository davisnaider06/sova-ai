// ---------------------------------------------------------------------------
// Contrato da importação de pedidos: o que o servidor devolve e o cliente lê.
//
// Fica separado de `orders-import.ts` porque aquele módulo é `server-only` — ele
// toca o Prisma. O formulário de upload é um componente cliente e precisa do
// tipo do relatório e dos cabeçalhos do modelo; importá-los do módulo do
// servidor arrastaria o Prisma para o bundle do browser.
//
// Um arquivo de contrato entre as duas metades é mais honesto que relaxar o
// `server-only` do módulo que fala com o banco.
// ---------------------------------------------------------------------------

export type ImportReport = {
  ordersCreated: number;
  ordersSkipped: number;
  itemsCreated: number;
  attributed: number;
  unattributed: number;
  commissionsCreated: number;
  commissionTotalCents: number;
  gmvCents: number;
  errors: Array<{ line: number; message: string }>;
};

/// Estado do formulário de importação, para `useActionState`.
///
/// Mora aqui, e não no arquivo de actions, porque um módulo `"use server"` só
/// pode exportar funções async — exportar a constante inicial de lá quebra o
/// build.
export type ImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; report: ImportReport };

export const IMPORT_IDLE: ImportState = { status: "idle" };

/// Cabeçalhos do modelo de planilha. O importador aceita sinônimos (ver `pick`
/// em orders-import.ts), mas o modelo que o usuário baixa usa estes nomes.
export const CSV_TEMPLATE_HEADERS = [
  "pedido_id",
  "data",
  "produto",
  "quantidade",
  "preco_unitario",
  "total",
  "status",
  "creator",
] as const;

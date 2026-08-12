// ---------------------------------------------------------------------------
// Taxonomia de categorias.
//
// Lista fechada de propósito: categoria é a chave que liga produto a nicho de
// creator no matching (§46). Se cada seller digitar a sua ("suplemento",
// "suplementos", "Suplementos Alimentares"), o matching passa a comparar
// strings que não batem e o score fica errado sem ninguém perceber.
//
// Espelha as categorias do TikTok Shop BR para o dia em que a ingestão real
// chegar — mapear categoria externa para a nossa fica sendo tradução, não
// invenção.
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  "Beleza e cuidados pessoais",
  "Saúde e suplementos",
  "Moda feminina",
  "Moda masculina",
  "Casa e cozinha",
  "Eletrônicos e acessórios",
  "Fitness e esportes",
  "Infantil e bebê",
  "Pet shop",
  "Automotivo",
  "Papelaria e escritório",
  "Alimentos e bebidas",
  "Joias e acessórios",
  "Outros",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

/// Normaliza uma categoria vinda de fora (CSV, API) para a nossa taxonomia.
/// Devolve "Outros" em vez de criar categoria nova — inventar categoria na
/// ingestão é como a lista fechada vira lista aberta sem ninguém decidir.
export function normalizeCategory(value: string | null | undefined): Category {
  if (!value) return "Outros";
  const needle = value.trim().toLowerCase();
  const hit = CATEGORIES.find((c) => c.toLowerCase() === needle);
  return hit ?? "Outros";
}

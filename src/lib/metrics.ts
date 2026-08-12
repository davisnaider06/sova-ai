import type { MetricSource } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Procedência e confiança das métricas (§79 da arquitetura, §6 do plano).
//
// Nenhum número entra no sistema sem dizer de onde veio. Não é burocracia: é o
// que permite misturar um seguidor digitado no onboarding com um seguidor lido
// da API do TikTok sem que a UI minta sobre a diferença — e é o que faz o
// matching pesar cada sinal pelo que ele vale.
//
// A confiança é do *tipo de fonte*, não do número. Um creator pode inflar o que
// declara; ninguém infla o que já vendeu dentro da plataforma.
// ---------------------------------------------------------------------------

export const CONFIDENCE_BY_SOURCE: Record<MetricSource, number> = {
  // O usuário digitou. Serve para não começar do zero, não para decidir nada
  // sozinho — por isso vale menos de um terço.
  DECLARED: 0.3,
  // Veio do OAuth da conta dele: é medição de terceiro, com consentimento.
  CONNECTED: 0.8,
  // Aconteceu aqui dentro. É o único dado que nós mesmos testemunhamos.
  PLATFORM: 1.0,
  // Calculado ou estimado por nós a partir de outros sinais.
  INFERRED: 0.5,
};

export const SOURCE_LABEL: Record<MetricSource, string> = {
  DECLARED: "informado pelo creator",
  CONNECTED: "da conta conectada",
  PLATFORM: "medido na plataforma",
  INFERRED: "estimado",
};

/// Chaves de métrica em uso. String livre no banco (o catálogo cresce sem
/// migration), constante aqui para o código não escrever "followers" de três
/// jeitos diferentes.
export const METRIC_KEYS = {
  followers: "followers",
  averageViews: "avg_views",
  engagementRate: "engagement_rate",
  gmv: "gmv",
  conversionRate: "conversion_rate",
  ordersCount: "orders_count",
} as const;

export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS];

/// Como a UI deve rotular uma confiança. Três faixas, porque "0,42 de confiança"
/// não significa nada para quem está decidindo se aceita um match.
export type ConfidenceLevel = "baixa" | "média" | "alta";

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.7) return "alta";
  if (confidence >= 0.45) return "média";
  return "baixa";
}

/// Frase que explica a confiança em termos do que falta fazer, não do número.
export function confidenceHint(level: ConfidenceLevel): string {
  switch (level) {
    case "alta":
      return "Baseado em vendas reais na plataforma.";
    case "média":
      return "Baseado na audiência da conta conectada.";
    case "baixa":
      return "Baseado apenas no que foi informado no cadastro.";
  }
}

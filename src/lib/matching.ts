import type { MetricSource } from "@/generated/prisma";
import { CONFIDENCE_BY_SOURCE, confidenceLevel, type ConfidenceLevel } from "@/lib/metrics";

// ---------------------------------------------------------------------------
// Matching Engine v1 — por regras, explicável, com confiança visível.
//
// A tese da §46 é que um creator de 25k seguidores com R$120k de GMV em
// suplementos vale mais que um de 50k sem histórico. Implementar isso ingenuamente
// dá `categoria === categoria` com uma pintura por cima — exatamente o que a §46
// manda não fazer.
//
// O que faz a diferença aqui são duas decisões:
//
// 1. **O score é uma média ponderada só dos componentes DISPONÍVEIS**, com os
//    pesos renormalizados. Um creator sem histórico não é penalizado por um
//    componente que ninguém tem como preencher — ele simplesmente é avaliado
//    pelo que existe, e a confiança cai junto.
//
// 2. **A confiança sai da procedência dos sinais usados**, não do score. Dois
//    creators podem ter 82 de match e confianças completamente diferentes: um
//    porque já vendeu aqui, outro porque digitou os números no cadastro. A UI
//    mostra os dois lados — nunca só o "82%" (§23).
//
// Todo componente carrega o motivo em português. Um match que não sabe se
// explicar não deveria ser mostrado.
// ---------------------------------------------------------------------------

export type CreatorSignals = {
  niches: string[];
  followers: number | null;
  averageViews: number | null;
  /// Fração: 0.045 = 4,5%.
  engagementRate: number | null;
  /// O que o creator já vendeu DENTRO da plataforma, por categoria. É o sinal
  /// mais forte que existe, porque é o único que nós mesmos testemunhamos.
  categoryHistory: Record<string, { gmvCents: number; orders: number }>;
  /// Conta externa ligada por OAuth: muda a procedência de audiência e
  /// engajamento de DECLARED para CONNECTED, e portanto o peso da confiança.
  hasConnectedAccount: boolean;
};

export type ProductSignals = {
  category: string;
  priceCents: number;
  /// Fração: 0.20 = 20%.
  commissionRate: number;
};

export type MatchComponent = {
  key: "nicho" | "historico" | "alcance" | "engajamento" | "oferta";
  label: string;
  /// 0 a 1.
  score: number;
  weight: number;
  source: MetricSource;
  /// Frase pronta para a UI. É o "porquê" do §23.
  reason: string;
};

export type MatchResult = {
  /// 0 a 100, arredondado.
  score: number;
  /// 0 a 1 — o quanto dá para confiar neste score.
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  /// A frase de capa: o componente mais forte, em português.
  headline: string;
  components: MatchComponent[];
  /// O que elevaria a confiança, em ordem de impacto. Vira o call-to-action.
  improves: string[];
};

const WEIGHTS = {
  nicho: 0.35,
  historico: 0.3,
  alcance: 0.2,
  engajamento: 0.15,
  oferta: 0.1,
} as const;

const TOTAL_POSSIBLE_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

/// Fração do score que sobrevive quando não há evidência nenhuma além da
/// oferta. Acima disso, o score cresce conforme a evidência aparece.
///
/// 0.6 é calibragem, não teorema: baixo o bastante para separar quem tem
/// histórico de quem não tem, alto o bastante para um creator novo no nicho
/// certo ainda aparecer na lista em vez de ser sepultado.
const EVIDENCE_FLOOR = 0.6;

/// Referências das heurísticas. Ficam nomeadas e num lugar só de propósito:
/// são escolhas editoriais nossas, não fatos medidos, e quem for calibrar
/// depois precisa achá-las sem ler o algoritmo inteiro.
const REFERENCE = {
  /// Audiência que satura o componente de alcance.
  followersCeiling: 1_000_000,
  /// Engajamento considerado excelente (fração).
  strongEngagement: 0.06,
  /// GMV na categoria que satura o componente de histórico (em centavos).
  strongCategoryGmv: 5_000_000, // R$ 50.000
  /// Comissão considerada muito atrativa para o creator.
  strongRate: 0.25,
  /// Valor por venda considerado muito atrativo (em centavos).
  strongCommissionValue: 3_000, // R$ 30
};

export function matchCreatorToProduct(
  creator: CreatorSignals,
  product: ProductSignals,
): MatchResult {
  const components: MatchComponent[] = [];

  // --- Nicho × categoria -------------------------------------------------
  // Nichos e categorias saem da MESMA taxonomia (lib/categories.ts), então a
  // comparação é exata em vez de heurística de string.
  if (creator.niches.length > 0) {
    const hit = creator.niches.includes(product.category);
    components.push({
      key: "nicho",
      label: "Nicho",
      // Fora do nicho não é zero: creator testa categorias vizinhas o tempo
      // todo, e zerar aqui esconderia o produto para sempre.
      score: hit ? 1 : 0.15,
      weight: WEIGHTS.nicho,
      source: "DECLARED",
      reason: hit
        ? `${product.category} está entre os seus nichos`
        : `Fora dos seus nichos declarados`,
    });
  }

  // --- Histórico na categoria (o sinal da §46) ---------------------------
  const history = creator.categoryHistory[product.category];
  if (history && history.orders > 0) {
    components.push({
      key: "historico",
      label: "Histórico na categoria",
      score: logScore(history.gmvCents, REFERENCE.strongCategoryGmv),
      weight: WEIGHTS.historico,
      source: "PLATFORM",
      reason: `${history.orders} ${history.orders === 1 ? "venda" : "vendas"} em ${product.category} pela plataforma`,
    });
  }

  // --- Alcance -----------------------------------------------------------
  if (creator.followers !== null && creator.followers > 0) {
    components.push({
      key: "alcance",
      label: "Alcance",
      score: logScore(creator.followers, REFERENCE.followersCeiling),
      weight: WEIGHTS.alcance,
      source: creator.hasConnectedAccount ? "CONNECTED" : "DECLARED",
      reason: `${formatCount(creator.followers)} seguidores${
        creator.hasConnectedAccount ? "" : " (informado no cadastro)"
      }`,
    });
  }

  // --- Engajamento -------------------------------------------------------
  if (creator.engagementRate !== null && creator.engagementRate > 0) {
    components.push({
      key: "engajamento",
      label: "Engajamento",
      score: clamp(creator.engagementRate / REFERENCE.strongEngagement),
      weight: WEIGHTS.engajamento,
      source: creator.hasConnectedAccount ? "CONNECTED" : "DECLARED",
      reason: `${(creator.engagementRate * 100).toFixed(1).replace(".", ",")}% de engajamento`,
    });
  }

  // --- Atratividade da oferta -------------------------------------------
  // Sempre disponível: preço e comissão são dado nosso. Um produto barato com
  // taxa alta e um caro com taxa média podem ser igualmente atrativos, então
  // vale o melhor dos dois ângulos em vez da média.
  const commissionValue = Math.round(product.priceCents * product.commissionRate);
  components.push({
    key: "oferta",
    label: "Oferta",
    score: Math.max(
      clamp(product.commissionRate / REFERENCE.strongRate),
      clamp(commissionValue / REFERENCE.strongCommissionValue),
    ),
    weight: WEIGHTS.oferta,
    source: "PLATFORM",
    reason: `${(product.commissionRate * 100).toFixed(0)}% de comissão · ${formatBRLShort(commissionValue)} por venda`,
  });

  // --- Agregação ---------------------------------------------------------
  // Pesos renormalizados sobre o que existe: quem não tem histórico não leva
  // zero no histórico, é avaliado sem ele — e paga isso na confiança.
  const totalWeight = components.reduce((acc, c) => acc + c.weight, 0);
  const rawScore = totalWeight === 0
    ? 0
    : components.reduce((acc, c) => acc + c.score * c.weight, 0) / totalWeight;

  const confidence = totalWeight === 0
    ? 0
    : components.reduce(
        (acc, c) => acc + CONFIDENCE_BY_SOURCE[c.source] * c.weight,
        0,
      ) / totalWeight;

  // Amortecimento por cobertura de evidência.
  //
  // Só renormalizar não basta, e isso apareceu com dado real: um creator de
  // 1.800 seguidores, sem histórico nenhum, tirava 89 — contra 91 de um de 128
  // mil com oito vendas registradas. Acontece porque contas pequenas costumam
  // ter engajamento alto, e sem este ajuste dois sinais favoráveis empatam com
  // cinco sinais fortes.
  //
  // Dois pontos de diferença tornam o ranking inútil, que é justamente o que a
  // §46 manda evitar. Aqui o score é puxado proporcionalmente ao quanto da
  // evidência possível existe: quem tem tudo mantém o score cheio, quem tem
  // metade não chega perto do topo. A confiança continua contando a mesma
  // história por outro ângulo — mas o número que ordena a lista também precisa
  // saber disso, senão a ordenação mente.
  const coverage = totalWeight / TOTAL_POSSIBLE_WEIGHT;
  const score = rawScore * (EVIDENCE_FLOOR + (1 - EVIDENCE_FLOOR) * coverage);

  return {
    score: Math.round(score * 100),
    confidence: Math.round(confidence * 100) / 100,
    confidenceLevel: confidenceLevel(confidence),
    headline: buildHeadline(components, product),
    components: components.sort((a, b) => b.score * b.weight - a.score * a.weight),
    improves: buildImprovements(creator, product, components),
  };
}

/// A frase de capa sai do componente que mais contribuiu — não de um template
/// fixo. É o que faz dois matches de 80 lerem diferente quando chegaram lá por
/// caminhos diferentes.
function buildHeadline(components: MatchComponent[], product: ProductSignals): string {
  if (components.length === 0) return "Sem sinais suficientes para avaliar";

  const strongest = [...components].sort(
    (a, b) => b.score * b.weight - a.score * a.weight,
  )[0];

  switch (strongest.key) {
    case "historico":
      return "Baseado no seu histórico de vendas nessa categoria";
    case "nicho":
      return strongest.score === 1
        ? `Combina com o seu nicho de ${product.category.toLowerCase()}`
        : "Fora do seu nicho, mas a oferta compensa";
    case "alcance":
      return "Seu alcance é o ponto forte deste match";
    case "engajamento":
      return "Sua audiência engaja bem — bom para produto de recomendação";
    case "oferta":
      return "A comissão deste produto é o destaque";
  }
}

/// O que falta para o match ser mais confiável. Ordem = impacto.
function buildImprovements(
  creator: CreatorSignals,
  product: ProductSignals,
  components: MatchComponent[],
): string[] {
  const out: string[] = [];

  if (!components.some((c) => c.key === "historico")) {
    out.push(`Sua primeira venda em ${product.category} torna este match muito mais preciso`);
  }
  if (!creator.hasConnectedAccount) {
    out.push("Conecte seu TikTok para o match usar audiência medida, não declarada");
  }
  if (creator.niches.length === 0) {
    out.push("Escolha seus nichos no perfil para receber produtos relevantes");
  }
  if (creator.engagementRate === null) {
    out.push("Informe seu engajamento médio no perfil");
  }

  return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Escala logarítmica: a diferença entre 1k e 10k seguidores importa muito mais
/// que entre 500k e 510k. Linear achataria todo mundo pequeno em zero.
function logScore(value: number, ceiling: number): number {
  if (value <= 0) return 0;
  return clamp(Math.log10(value + 1) / Math.log10(ceiling + 1));
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(".", ",")} mil`;
  return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`;
}

function formatBRLShort(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

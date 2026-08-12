// ---------------------------------------------------------------------------
// Calculadora de comissão recomendada (§43 da arquitetura).
//
// É a feature que entrega valor no dia 1 sem depender de API nenhuma: dado o
// preço e os custos, quanta comissão o seller consegue pagar sem quebrar a
// margem — e o que sobra em cada faixa.
//
// Tudo em centavos inteiros; taxa é fração (0.20 = 20%), como no banco.
//
// A conta, por extenso, para não virar caixa-preta:
//
//   custos    = produto + frete + taxa da plataforma + operacional
//   comissão  = preço × taxa            (comissão incide sobre o preço de venda)
//   lucro     = preço − custos − comissão
//   margem    = lucro ÷ preço
//
// Isolando a taxa que produz uma margem alvo `m`:
//
//   m = (preço − custos − preço×taxa) ÷ preço
//   m = 1 − custos/preço − taxa
//   taxa = (1 − custos/preço) − m
//
// Ou seja: a taxa que atinge a margem `m` é o ponto de equilíbrio menos `m`.
// Toda a calculadora sai dessa linha.
// ---------------------------------------------------------------------------

export type ProductCosts = {
  /// Todos em centavos.
  productCost: number;
  shippingCost: number;
  platformFee: number;
  operationalCost: number;
};

export type CommissionScenario = {
  /// Fração: 0.18 = 18%.
  rate: number;
  /// Centavos pagos ao creator nesta venda.
  commission: number;
  /// Centavos que sobram para o seller depois de custos e comissão.
  profit: number;
  /// Fração do preço: 0.22 = 22% de margem.
  margin: number;
  /// Abaixo do mínimo aceitável definido pelo seller.
  belowMinimum: boolean;
  /// Prejuízo — a comissão come mais do que existe de folga.
  negative: boolean;
};

export type CommissionAdvice = {
  totalCosts: number;
  /// Taxa em que o lucro do seller zera. Teto absoluto, nunca uma sugestão.
  breakEvenRate: number;
  /// Maior taxa que ainda respeita a margem mínima. Null se nem a margem
  /// mínima cabe no preço atual.
  maxRate: number | null;
  /// Taxa que atinge exatamente a margem alvo. É a recomendação.
  recommendedRate: number | null;
  /// A recomendação existe mas é baixa demais para atrair creator — decisão de
  /// negócio, não resultado da conta. Ver ATTRACTIVE_RATE_FLOOR.
  recommendedBelowMarketFloor: boolean;
  /// Nem o ponto de equilíbrio é positivo: os custos já comem o preço inteiro.
  impossible: boolean;
  scenarios: CommissionScenario[];
};

/// Referência de mercado, não resultado de cálculo.
///
/// Faixa usual de comissão de afiliado no TikTok Shop; serve para avisar
/// "matematicamente cabe, mas provavelmente ninguém aceita". É premissa
/// editorial nossa e a UI precisa dizer isso — número sem procedência
/// apresentado como fato é exatamente o que a §79 proíbe.
export const ATTRACTIVE_RATE_FLOOR = 0.05;
export const TYPICAL_RATE_CEILING = 0.30;

export const DEFAULT_MINIMUM_MARGIN = 0.1;
export const DEFAULT_TARGET_MARGIN = 0.2;

export function sumCosts(costs: ProductCosts): number {
  return (
    costs.productCost + costs.shippingCost + costs.platformFee + costs.operationalCost
  );
}

/// Taxa que zera o lucro. Negativa quando os custos já passam do preço.
///
/// O arredondamento em 4 casas não é cosmético: `1 - 5500/10000 - 0.20` em
/// float dá 0.24999999999999994, e essa taxa acabaria gravada no banco e
/// exibida como 24,9%. Taxa tem 4 casas no schema (Decimal(5,4)) — arredondar
/// aqui é fazer a conta viver na mesma precisão em que ela é armazenada.
export function breakEvenRate(priceCents: number, costs: ProductCosts): number {
  if (priceCents <= 0) return 0;
  return round4(1 - sumCosts(costs) / priceCents);
}

/// Taxa que produz exatamente a margem pedida.
export function rateForMargin(
  priceCents: number,
  costs: ProductCosts,
  margin: number,
): number {
  return round4(breakEvenRate(priceCents, costs) - margin);
}

export function scenarioAt(
  priceCents: number,
  costs: ProductCosts,
  rate: number,
  minimumMargin: number,
): CommissionScenario {
  const commission = Math.round(priceCents * rate);
  const profit = priceCents - sumCosts(costs) - commission;
  const margin = priceCents > 0 ? round4(profit / priceCents) : 0;
  return {
    rate,
    commission,
    profit,
    margin,
    belowMinimum: margin < minimumMargin,
    negative: profit < 0,
  };
}

/// A recomendação completa. Devolve a faixa e a escada de cenários em vez de um
/// número só — é o mesmo princípio do §23 ("nunca mostrar só 94%") aplicado a
/// preço: o seller precisa ver o que perde e o que ganha em cada faixa para
/// decidir, não receber um veredito.
export function recommendCommission(
  priceCents: number,
  costs: ProductCosts,
  options: { minimumMargin?: number; targetMargin?: number } = {},
): CommissionAdvice {
  const minimumMargin = options.minimumMargin ?? DEFAULT_MINIMUM_MARGIN;
  const targetMargin = options.targetMargin ?? DEFAULT_TARGET_MARGIN;

  const total = sumCosts(costs);
  const breakEven = breakEvenRate(priceCents, costs);
  const impossible = priceCents <= 0 || breakEven <= 0;

  const rawMax = round4(breakEven - minimumMargin);
  const rawRecommended = round4(breakEven - targetMargin);

  const maxRate = rawMax > 0 ? rawMax : null;
  const recommendedRate = rawRecommended > 0 ? rawRecommended : null;

  return {
    totalCosts: total,
    breakEvenRate: round4(breakEven),
    maxRate,
    recommendedRate,
    recommendedBelowMarketFloor:
      recommendedRate !== null && recommendedRate < ATTRACTIVE_RATE_FLOOR,
    impossible,
    scenarios: buildScenarios(priceCents, costs, minimumMargin, breakEven),
  };
}

/// Escada de cenários de 5% em 5%, indo até o ponto de equilíbrio (ou até 30%,
/// o que vier primeiro) — mostrar taxas que já dão prejuízo não ajuda a decidir.
function buildScenarios(
  priceCents: number,
  costs: ProductCosts,
  minimumMargin: number,
  breakEven: number,
): CommissionScenario[] {
  if (priceCents <= 0) return [];

  const ceiling = Math.min(Math.max(breakEven, 0), TYPICAL_RATE_CEILING);
  const rates: number[] = [];
  for (let r = 0.05; r <= ceiling + 1e-9; r += 0.05) rates.push(round4(r));

  // Sempre inclui o ponto de equilíbrio arredondado, para o teto ficar visível
  // mesmo quando ele cai entre dois degraus da escada.
  if (breakEven > 0 && breakEven < TYPICAL_RATE_CEILING) {
    const be = round4(breakEven);
    if (!rates.some((r) => Math.abs(r - be) < 0.005)) rates.push(be);
  }

  rates.sort((a, b) => a - b);
  return rates.map((rate) => scenarioAt(priceCents, costs, rate, minimumMargin));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

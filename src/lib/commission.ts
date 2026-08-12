import Decimal from "decimal.js-light";
import { platformFee as scheduleFee, type FeeSchedule } from "@/lib/platform-fees";

// ---------------------------------------------------------------------------
// Calculadora de comissão recomendada.
//
// A pergunta que ela responde: "até quanto eu posso pagar de comissão neste
// produto sem quebrar minha margem?" — e a resposta vem com o porquê, não só
// com o número. O seller que não entende de onde saiu o teto não confia nele,
// e o que não confia continua chutando 20%.
//
// Duas decisões que valem explicar:
//
// 1. **Tudo em Decimal, nunca Float.** É dinheiro, e o schema já tomou essa
//    decisão (Decimal(12,2) para valor, Decimal(5,4) para taxa). Um centavo de
//    divergência aqui vira discussão com o creator no fim do mês.
//
// 2. **Margem é sobre o preço de venda, não sobre o custo.** `minimumMargin`
//    0.15 quer dizer "quinze por cento do que entra é meu lucro", não "markup
//    de 15% sobre o custo". É a leitura que o schema documenta e a que o
//    lojista usa quando fala "trabalho com 30%".
//
// Sobre a dependência: usa `decimal.js-light` direto, não o `Prisma.Decimal`.
// A calculadora recalcula enquanto o usuário digita, então este arquivo roda
// no navegador — e importar o client do Prisma aqui arrastaria o ORM inteiro
// para o bundle. É a mesma implementação que o Prisma usa por baixo, então os
// valores interoperam: `new Prisma.Decimal(analysis.maxRate.toString())`.
// ---------------------------------------------------------------------------

/// Aceita o `Prisma.Decimal` do servidor sem importá-lo: os dois expõem
/// `toString()`, e o construtor do Decimal aceita string.
export type MoneyInput = Decimal | number | string | { toString(): string };

const ZERO = new Decimal(0);
const ONE = new Decimal(1);

/// `decimal.js-light` não tem o estático `Decimal.max`.
function maxOf(a: Decimal, b: Decimal): Decimal {
  return a.gte(b) ? a : b;
}

/// Converte qualquer entrada em Decimal, tratando lixo como zero.
///
/// `decimal.js-light` **lança** em entrada inválida — não devolve NaN. E a
/// calculadora recalcula a cada tecla, então "12," ou "-" (estados normais de
/// alguém digitando) derrubariam a tela. Vírgula vira ponto porque o usuário é
/// brasileiro e digita "12,50".
function money(value: MoneyInput | null | undefined): Decimal {
  if (value === null || value === undefined) return ZERO;
  if (value instanceof Decimal) return value;
  try {
    const raw = String(value).trim().replace(",", ".");
    return raw === "" ? ZERO : new Decimal(raw);
  } catch {
    return ZERO;
  }
}

/// Taxas são gravadas em Decimal(5,4) — arredondar aqui evita que o número
/// mostrado na tela seja diferente do número que o banco aceita.
function asRate(value: Decimal): Decimal {
  return value.toDecimalPlaces(4, Decimal.ROUND_DOWN);
}

/// Valor em dinheiro arredondado para centavo, sempre a favor da margem:
/// comissão sobe truncando para baixo, para o teto calculado nunca estourar.
function asMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_DOWN);
}

export type CommissionInputs = {
  /// Preço de venda ao consumidor.
  price: MoneyInput;
  productCost: MoneyInput;
  shippingCost?: MoneyInput;
  /// Taxa da plataforma em valor absoluto, quando o seller sabe o número.
  platformFee?: MoneyInput;
  /// Alternativa percentual à `platformFee`. Se as duas vierem, somam.
  platformFeeRate?: MoneyInput;
  /// Tabela da plataforma — o caminho normal. A do TikTok Shop BR é escalonada
  /// por preço e tem parte fixa por item, então não cabe num percentual só.
  /// Soma com `platformFee`/`platformFeeRate` se vierem juntas.
  feeSchedule?: FeeSchedule | null;
  operationalCost?: MoneyInput;
  /// Fração: 0.15 = 15%. O piso que o seller não aceita furar.
  minimumMargin?: MoneyInput | null;
  /// Fração: a margem que ele gostaria de ter. Gera a comissão *recomendada*.
  targetMargin?: MoneyInput | null;
};

export type CommissionStatus =
  /// Dá para pagar comissão respeitando a margem mínima.
  | "OK"
  /// O produto já dá prejuízo antes de qualquer comissão.
  | "LOSS"
  /// Dá lucro, mas não sobra nada para comissão sem furar a margem mínima.
  | "NO_ROOM";

export type CommissionAnalysis = {
  status: CommissionStatus;

  price: Decimal;
  totalCost: Decimal;
  /// Lucro antes da comissão.
  grossProfit: Decimal;
  /// Margem antes da comissão, como fração do preço.
  grossMarginRate: Decimal;

  /// Comissão que zera o lucro. É o teto absoluto — pagar acima disso é pagar
  /// para vender. Serve de referência na UI, nunca de recomendação.
  breakEvenRate: Decimal;
  breakEvenValue: Decimal;

  /// Maior comissão que ainda respeita `minimumMargin`. Null quando o seller
  /// não declarou margem mínima — aí o único limite real é o break-even.
  maxRate: Decimal | null;
  maxValue: Decimal | null;

  /// Comissão que entrega exatamente a `targetMargin`. É o número que a tela
  /// mostra em destaque.
  recommendedRate: Decimal | null;
  recommendedValue: Decimal | null;

  /// A conta aberta, para a UI poder mostrar de onde saiu o teto.
  breakdown: {
    productCost: Decimal;
    shippingCost: Decimal;
    platformFee: Decimal;
    operationalCost: Decimal;
  };
};

/// Analisa a economia de um produto e devolve os tetos de comissão.
///
/// Não lança em entrada ruim: preço zero ou negativo devolve `LOSS` com tudo
/// zerado. A calculadora é usada enquanto o usuário digita, e um formulário
/// meio preenchido é estado normal, não erro.
export function analyzeCommission(inputs: CommissionInputs): CommissionAnalysis {
  const price = money(inputs.price);

  const productCost = money(inputs.productCost);
  const shippingCost = money(inputs.shippingCost);
  const operationalCost = money(inputs.operationalCost);
  const platformFee = money(inputs.platformFee)
    .plus(price.times(money(inputs.platformFeeRate)))
    .plus(inputs.feeSchedule ? scheduleFee(inputs.feeSchedule, price).total : ZERO);

  const breakdown = { productCost, shippingCost, platformFee, operationalCost };
  const totalCost = productCost.plus(shippingCost).plus(platformFee).plus(operationalCost);

  if (price.lte(ZERO)) {
    return {
      status: "LOSS",
      price,
      totalCost,
      grossProfit: totalCost.negated(),
      grossMarginRate: ZERO,
      breakEvenRate: ZERO,
      breakEvenValue: ZERO,
      maxRate: null,
      maxValue: null,
      recommendedRate: null,
      recommendedValue: null,
      breakdown,
    };
  }

  const grossProfit = price.minus(totalCost);
  const grossMarginRate = asRate(grossProfit.div(price));

  // Comissão que zera o lucro: tudo que sobra depois do custo.
  const breakEvenRate = asRate(maxOf(grossProfit.div(price), ZERO));
  const breakEvenValue = asMoney(maxOf(grossProfit, ZERO));

  // Teto e recomendação saem da mesma conta, com margens diferentes:
  //   preço − custo − comissão ≥ margem × preço
  //   comissão ≤ preço × (1 − margem) − custo
  const rateForMargin = (marginInput: MoneyInput | null | undefined) => {
    if (marginInput === null || marginInput === undefined) return null;
    const margin = money(marginInput);
    const allowed = price.times(ONE.minus(margin)).minus(totalCost);
    if (allowed.lte(ZERO)) return { rate: ZERO, value: ZERO };
    return { rate: asRate(allowed.div(price)), value: asMoney(allowed) };
  };

  const max = rateForMargin(inputs.minimumMargin);
  const recommended = rateForMargin(inputs.targetMargin);

  const status: CommissionStatus = grossProfit.lte(ZERO)
    ? "LOSS"
    : max !== null && max.rate.lte(ZERO)
      ? "NO_ROOM"
      : "OK";

  return {
    status,
    price,
    totalCost,
    grossProfit,
    grossMarginRate,
    breakEvenRate,
    breakEvenValue,
    maxRate: max?.rate ?? null,
    maxValue: max?.value ?? null,
    recommendedRate: recommended?.rate ?? null,
    recommendedValue: recommended?.value ?? null,
    breakdown,
  };
}

export type RateEvaluation = {
  rate: Decimal;
  commissionValue: Decimal;
  netProfit: Decimal;
  netMarginRate: Decimal;
  /// Respeita a margem mínima declarada. Sem margem mínima, "viável" é só
  /// não dar prejuízo.
  viable: boolean;
  /// Paga mais do que o produto rende — prejuízo em cada venda.
  belowBreakEven: boolean;
};

/// "Se eu pagar X% neste produto, o que sobra pra mim?"
///
/// É o caminho inverso da `analyzeCommission`: em vez de derivar a comissão a
/// partir da margem, deriva a margem a partir de uma comissão que o seller já
/// tem em mente — o creator pediu 25%, dá ou não dá.
export function evaluateCommissionRate(
  inputs: CommissionInputs,
  rateInput: MoneyInput,
): RateEvaluation {
  const analysis = analyzeCommission(inputs);
  const rate = money(rateInput);

  const commissionValue = asMoney(analysis.price.times(rate));
  const netProfit = analysis.grossProfit.minus(commissionValue);
  const netMarginRate = analysis.price.gt(ZERO)
    ? asRate(netProfit.div(analysis.price))
    : ZERO;

  const minimumMargin =
    inputs.minimumMargin === null || inputs.minimumMargin === undefined
      ? null
      : money(inputs.minimumMargin);

  return {
    rate: asRate(rate),
    commissionValue,
    netProfit,
    netMarginRate,
    viable: minimumMargin ? netMarginRate.gte(minimumMargin) : netProfit.gt(ZERO),
    belowBreakEven: netProfit.lt(ZERO),
  };
}

/// Passos padrão da escada da §43 do doc de arquitetura.
export const DEFAULT_LADDER = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3];

export type LadderRow = RateEvaluation & {
  /// A taxa recomendada cai entre dois degraus; este marca o degrau mais
  /// próximo dela, para a UI destacar uma linha sem inventar um valor.
  isRecommended: boolean;
};

/// "10% → margem X, 15% → margem X, …" — a tabela da §43.
///
/// Mostrar a escada em vez de um número só é o que faz o seller entender o
/// trade-off: ele vê o que ganha e o que perde em cada degrau, e escolhe. Um
/// número sozinho ele aceita ou ignora, mas não entende.
export function commissionLadder(
  inputs: CommissionInputs,
  rates: number[] = DEFAULT_LADDER,
): LadderRow[] {
  const analysis = analyzeCommission(inputs);
  const target = analysis.recommendedRate;

  // O degrau recomendado é o maior que ainda não passa da taxa alvo — o seller
  // nunca é empurrado para cima do que a margem dele aguenta.
  let bestIndex = -1;
  if (target !== null) {
    rates.forEach((rate, i) => {
      if (target.gte(rate)) bestIndex = i;
    });
  }

  return rates.map((rate, i) => ({
    ...evaluateCommissionRate(inputs, rate),
    isRecommended: i === bestIndex,
  }));
}

/// Formata fração como percentual para a UI: 0.1875 → "18,75%".
export function formatRate(rate: Decimal | number | string | null): string {
  if (rate === null) return "—";
  const pct = new Decimal(rate).times(100);
  return `${pct.toDecimalPlaces(2).toString().replace(".", ",")}%`;
}

/// Formata valor em reais: 12.5 → "R$ 12,50".
export function formatMoney(value: Decimal | number | string | null, currency = "BRL"): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    new Decimal(value).toNumber(),
  );
}

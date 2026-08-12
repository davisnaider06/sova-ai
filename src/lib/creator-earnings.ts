import Decimal from "decimal.js-light";

// ---------------------------------------------------------------------------
// "Quanto eu vou ganhar com esse produto, antes de gravar?"
//
// A funcionalidade #3 do lado creator. A conta é simples de propósito — o valor
// não está na sofisticação do modelo, está em o creator ver **R$ 3,00 por
// venda** antes de queimar um vídeo num produto que não paga.
//
// Duas honestidades embutidas:
//
// 1. A taxa de conversão é um palpite, não uma medição. Enquanto o creator não
//    tiver histórico na plataforma, o número é DECLARED/INFERRED e a UI precisa
//    dizer isso. Por isso a função devolve `basis`, e não só o número.
// 2. Vender é sempre "por venda". O total estimado depende de views e conversão
//    — duas coisas que variam muito. Quem promete total sem faixa está mentindo,
//    então devolvemos uma faixa, não um ponto.
// ---------------------------------------------------------------------------

/// Conversão típica de vídeo de afiliado, em fração de quem vê.
/// Faixa conservadora — serve como piso enquanto não há dado real do creator.
export const DEFAULT_CONVERSION = {
  low: 0.002, // 0,2% — 2 vendas a cada 1.000 views
  high: 0.01, // 1,0% — 10 vendas a cada 1.000 views
};

export type EarningsBasis =
  /// O creator informou views/conversão no onboarding.
  | "DECLARED"
  /// Veio da conta conectada dele.
  | "CONNECTED"
  /// Veio do que ele já vendeu dentro da plataforma.
  | "PLATFORM"
  /// Estimativa nossa a partir de faixa de mercado.
  | "INFERRED";

export type Earnings = {
  /// O que entra no bolso a cada venda. Este é o número confiável — não depende
  /// de previsão nenhuma.
  perSale: Decimal;
  /// Faixa estimada para um vídeo, dado o alcance médio.
  estimatedLow: Decimal | null;
  estimatedHigh: Decimal | null;
  /// Vendas necessárias para o vídeo pagar um valor alvo.
  salesForTarget: number | null;
  basis: EarningsBasis;
};

export function estimateEarnings({
  price,
  commissionRate,
  averageViews,
  conversionLow = DEFAULT_CONVERSION.low,
  conversionHigh = DEFAULT_CONVERSION.high,
  basis = "INFERRED",
  targetPerVideo,
}: {
  price: Decimal | number | string;
  commissionRate: Decimal | number | string;
  averageViews?: number | null;
  conversionLow?: number;
  conversionHigh?: number;
  basis?: EarningsBasis;
  targetPerVideo?: number;
}): Earnings {
  const p = safe(price);
  const rate = safe(commissionRate);
  const perSale = p.times(rate).toDecimalPlaces(2);

  const hasReach = typeof averageViews === "number" && averageViews > 0;

  return {
    perSale,
    estimatedLow: hasReach
      ? perSale.times(averageViews).times(conversionLow).toDecimalPlaces(2)
      : null,
    estimatedHigh: hasReach
      ? perSale.times(averageViews).times(conversionHigh).toDecimalPlaces(2)
      : null,
    salesForTarget:
      targetPerVideo && perSale.gt(0)
        ? Math.ceil(new Decimal(targetPerVideo).div(perSale).toNumber())
        : null,
    basis: hasReach ? basis : "INFERRED",
  };
}

/// Rótulo honesto da procedência, para a UI nunca mostrar número sem contexto.
export function basisLabel(basis: EarningsBasis): string {
  switch (basis) {
    case "CONNECTED":
      return "Baseado no seu público real";
    case "PLATFORM":
      return "Baseado no seu histórico de vendas aqui";
    case "DECLARED":
      return "Baseado no alcance que você informou";
    default:
      return "Estimativa de mercado — conecte seu TikTok para precisão";
  }
}

function safe(value: Decimal | number | string): Decimal {
  try {
    const raw = String(value).trim().replace(",", ".");
    return raw === "" ? new Decimal(0) : new Decimal(raw);
  } catch {
    return new Decimal(0);
  }
}

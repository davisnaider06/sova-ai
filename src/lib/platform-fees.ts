import Decimal from "decimal.js-light";

// ---------------------------------------------------------------------------
// Tabelas de taxa das plataformas de venda.
//
// A taxa do TikTok Shop no Brasil **não é um percentual único** — ela é
// escalonada por preço, e tem uma parte fixa por item. A parte fixa é o que
// mais machuca: R$ 4,00 num produto de R$ 20 são 20% do preço, e é invisível
// pra quem só pensa em "a plataforma cobra 10%".
//
// É exatamente por isso que a calculadora existe. O seller não precisa saber
// a tabela; ele digita o preço e a gente aplica.
//
// **Estes números são declarados, não medidos.** Vieram do usuário em
// 12/08/2026 e não foram verificados contra documentação oficial do TikTok.
// Ficam aqui, num só lugar e com data, porque taxa de marketplace muda — e
// quando mudar, é este arquivo que se edita, não quinze telas.
// ---------------------------------------------------------------------------

/// Uma faixa da tabela. Vale a partir de `minPrice` (inclusive) até a faixa
/// seguinte.
export type FeeTier = {
  minPrice: number;
  /// Fração sobre o preço: 0.10 = 10%.
  rate: number;
  /// Valor fixo por item, na moeda da tabela.
  fixed: number;
};

export type FeeSchedule = {
  id: string;
  label: string;
  currency: string;
  /// Quando a tabela foi conferida pela última vez, e por quem/onde. Taxa sem
  /// data de validade vira número mágico em seis meses.
  verifiedAt: string;
  source: string;
  /// Ordenadas por `minPrice` crescente.
  tiers: FeeTier[];
};

export const TIKTOK_SHOP_BR: FeeSchedule = {
  id: "tiktok-shop-br",
  label: "TikTok Shop — Brasil",
  currency: "BRL",
  verifiedAt: "2026-08-12",
  source: "Informado pelo usuário; pendente de confirmação na documentação oficial",
  tiers: [
    { minPrice: 0, rate: 0.1, fixed: 4 },
    { minPrice: 50, rate: 0.06, fixed: 6 },
  ],
};

/// Vender sem plataforma nenhuma — venda direta, feira, WhatsApp.
export const NO_PLATFORM: FeeSchedule = {
  id: "none",
  label: "Sem plataforma",
  currency: "BRL",
  verifiedAt: "2026-08-12",
  source: "—",
  tiers: [{ minPrice: 0, rate: 0, fixed: 0 }],
};

export const FEE_SCHEDULES: FeeSchedule[] = [TIKTOK_SHOP_BR, NO_PLATFORM];

export function findFeeSchedule(id: string): FeeSchedule | null {
  return FEE_SCHEDULES.find((s) => s.id === id) ?? null;
}

/// A faixa que se aplica a um preço. Devolve a última faixa cujo `minPrice`
/// o preço alcança.
export function tierForPrice(schedule: FeeSchedule, price: Decimal | number | string): FeeTier {
  const p = new Decimal(price);
  let match = schedule.tiers[0];
  for (const tier of schedule.tiers) {
    if (p.gte(tier.minPrice)) match = tier;
  }
  return match;
}

export type PlatformFeeBreakdown = {
  tier: FeeTier;
  /// Parte percentual, em dinheiro.
  variable: Decimal;
  /// Parte fixa por item.
  fixed: Decimal;
  total: Decimal;
  /// Quanto a taxa representa do preço. É este número que assusta — e informa —
  /// em produto barato.
  effectiveRate: Decimal;
};

/// Calcula a taxa da plataforma para um preço, com a conta aberta.
///
/// A UI mostra o `effectiveRate` de propósito: num produto de R$ 20 na tabela
/// do TikTok BR, os "10%" viram 30% na prática por causa dos R$ 4,00 fixos.
export function platformFee(
  schedule: FeeSchedule,
  price: Decimal | number | string,
): PlatformFeeBreakdown {
  const p = new Decimal(price);
  const tier = tierForPrice(schedule, p);

  const variable = p.times(tier.rate).toDecimalPlaces(2, Decimal.ROUND_UP);
  const fixed = new Decimal(tier.fixed);
  const total = variable.plus(fixed);

  return {
    tier,
    variable,
    fixed,
    total,
    effectiveRate: p.gt(0) ? total.div(p).toDecimalPlaces(4, Decimal.ROUND_UP) : new Decimal(0),
  };
}

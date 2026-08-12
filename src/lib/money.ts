// ---------------------------------------------------------------------------
// Dinheiro em centavos, sempre inteiro.
//
// No banco o dinheiro é Decimal (nunca Float — ver o cabeçalho do schema). Na
// aplicação ele vira `number` de centavos: inteiro não acumula erro de
// arredondamento, e a mesma função roda no servidor e no cliente sem carregar
// uma lib de decimal para o browser.
//
// A conversão acontece só na fronteira: `toCents` ao ler do Prisma, `toDecimal`
// ao escrever. No meio, tudo é inteiro.
// ---------------------------------------------------------------------------

/// Valor vindo do Prisma (Decimal serializa como objeto com toString) ou de um
/// número solto. Aceita null para o caso do campo opcional.
export type DecimalLike = { toString(): string } | number | string | null | undefined;

/// Decimal do banco → centavos. Arredonda para o centavo mais próximo em vez de
/// truncar: truncar sistematicamente para baixo vira centavo faltando na
/// comissão do creator, que é justamente a divergência que queremos evitar.
export function toCents(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/// Centavos → string pronta para o Prisma escrever num campo Decimal.
export function toDecimalString(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.round(cents) / 100);
}

/// Formato compacto para KPI: R$ 128,4 mil. Abaixo de mil, valor cheio.
export function formatBRLCompact(cents: number): string {
  const value = Math.round(cents) / 100;
  if (Math.abs(value) < 1000) return formatBRL(cents);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/// Texto digitado pelo usuário → centavos. Aceita "1.234,56", "1234.56",
/// "R$ 12,90" e "12". Devolve null quando não dá para ler um número — o
/// chamador decide se isso é erro de validação ou campo vazio.
export function parseCents(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim();
  if (raw === "") return null;

  // Tira tudo que não é dígito, vírgula, ponto ou sinal.
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (cleaned === "" || cleaned === "-") return null;

  // Decide qual símbolo é o separador decimal: o último que aparecer. É o que
  // faz "1.234,56" (pt-BR) e "1,234.56" (en-US) lerem o mesmo número.
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalSep = lastComma > lastDot ? "," : lastDot > lastComma ? "." : null;

  let normalized: string;
  if (decimalSep === null) {
    normalized = cleaned;
  } else {
    const intPart = cleaned.slice(0, cleaned.lastIndexOf(decimalSep)).replace(/[.,]/g, "");
    const fracPart = cleaned.slice(cleaned.lastIndexOf(decimalSep) + 1).replace(/[.,]/g, "");
    normalized = `${intPart}.${fracPart}`;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

// ---------------------------------------------------------------------------
// Percentuais
//
// No banco a taxa é fração (0.20 = 20%), porque é assim que ela entra na conta.
// Na tela é percentual, porque é assim que o vendedor pensa. As duas funções
// abaixo são a única fronteira entre os dois mundos.
// ---------------------------------------------------------------------------

export function toRate(percent: number): number {
  return Math.round(percent * 100) / 10000;
}

export function toPercent(rate: DecimalLike): number {
  if (rate === null || rate === undefined) return 0;
  const n = typeof rate === "number" ? rate : Number(rate.toString());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10000) / 100;
}

export function formatPercent(rate: DecimalLike, digits = 1): string {
  return `${toPercent(rate).toFixed(digits).replace(".", ",")}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) < 1000) return formatNumber(value);
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

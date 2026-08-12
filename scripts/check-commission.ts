import { analyzeCommission, evaluateCommissionRate, commissionLadder, formatRate, formatMoney } from "../src/lib/commission";
import { platformFee, TIKTOK_SHOP_BR } from "../src/lib/platform-fees";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = String(actual);
  const e = String(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "  ok" : "FAIL"}  ${label}: ${a}${ok ? "" : `  (esperado ${e})`}`);
}

console.log("\n--- Caso 1: suplemento R$100, custo total R$50, margem mínima 20%, alvo 30% ---");
const c1 = {
  price: 100,
  productCost: 35,
  shippingCost: 10,
  platformFee: 5,
  minimumMargin: 0.2,
  targetMargin: 0.3,
};
const a1 = analyzeCommission(c1);
check("status", a1.status, "OK");
check("custo total", a1.totalCost, "50");
check("lucro bruto", a1.grossProfit, "50");
check("margem bruta", a1.grossMarginRate, "0.5");
// break-even: sobra 50 de 100 = 50%
check("break-even", a1.breakEvenRate, "0.5");
// max com margem 20%: 100*(1-0.20) - 50 = 30 -> 30%
check("comissão máxima", a1.maxRate, "0.3");
check("valor máximo", a1.maxValue, "30");
// recomendada com alvo 30%: 100*0.70 - 50 = 20 -> 20%
check("comissão recomendada", a1.recommendedRate, "0.2");
check("valor recomendado", a1.recommendedValue, "20");

console.log("\n--- Caso 2: creator pede 25% no mesmo produto ---");
const e1 = evaluateCommissionRate(c1, 0.25);
check("comissão em R$", e1.commissionValue, "25");
check("lucro líquido", e1.netProfit, "25");
check("margem líquida", e1.netMarginRate, "0.25");
check("viável (>= 20% mín)", e1.viable, true);
check("abaixo do break-even", e1.belowBreakEven, false);

console.log("\n--- Caso 3: creator pede 60% (acima do break-even de 50%) ---");
const e2 = evaluateCommissionRate(c1, 0.6);
check("lucro líquido", e2.netProfit, "-10");
check("viável", e2.viable, false);
check("abaixo do break-even", e2.belowBreakEven, true);

console.log("\n--- Caso 4: produto que já dá prejuízo (custo 120 > preço 100) ---");
const a2 = analyzeCommission({ price: 100, productCost: 120, minimumMargin: 0.2 });
check("status", a2.status, "LOSS");
check("break-even (não pode ser negativo)", a2.breakEvenRate, "0");
check("comissão máxima", a2.maxRate, "0");

console.log("\n--- Caso 5: dá lucro mas não sobra pra comissão ---");
// preço 100, custo 85, margem mínima 20% -> 100*0.8 - 85 = -5 -> sem espaço
const a3 = analyzeCommission({ price: 100, productCost: 85, minimumMargin: 0.2 });
check("status", a3.status, "NO_ROOM");
check("lucro bruto (existe)", a3.grossProfit, "15");
check("comissão máxima", a3.maxRate, "0");

console.log("\n--- Caso 6: taxa de plataforma percentual (TikTok cobra %) ---");
// preço 200, custo 60, taxa 5% = 10 -> custo total 70
const a4 = analyzeCommission({ price: 200, productCost: 60, platformFeeRate: 0.05, targetMargin: 0.25 });
check("taxa da plataforma em R$", a4.breakdown.platformFee, "10");
check("custo total", a4.totalCost, "70");
// 200*0.75 - 70 = 80 -> 40%
check("comissão recomendada", a4.recommendedRate, "0.4");
check("valor recomendado", a4.recommendedValue, "80");

console.log("\n--- Caso 7: formulário meio preenchido não quebra ---");
const a5 = analyzeCommission({ price: 0, productCost: 0 });
check("status", a5.status, "LOSS");
check("sem margem declarada, max é null", a5.maxRate, null);

console.log("\n--- Caso 7b: usuário digitando não derruba a tela ---");
// decimal.js-light LANÇA em entrada inválida. Como a calculadora recalcula a
// cada tecla, estes estados são normais, não erro.
// "12," não vira zero de propósito: quem digitou isso quis dizer 12 e está
// prestes a digitar os centavos. Zerar faria o número piscar durante a digitação.
const whileTyping: Array<[string, string]> = [
  ["", "0"],
  ["abc", "0"],
  ["-", "0"],
  ["R$", "0"],
  [" ", "0"],
  ["12,", "12"],
  ["12.", "12"],
  [".5", "0.5"],
];
for (const [typed, expected] of whileTyping) {
  let threw = false;
  let total = "";
  try {
    total = String(analyzeCommission({ price: 100, productCost: typed }).totalCost);
  } catch {
    threw = true;
  }
  check(`custo ${JSON.stringify(typed)} não lança`, threw, false);
  if (!threw) check(`custo ${JSON.stringify(typed)} → ${expected}`, total, expected);
}
// Vírgula decimal brasileira é entrada de primeira classe.
check("preço '12,50' entendido", analyzeCommission({ price: "12,50", productCost: 0 }).price, "12.5");
check(
  "custo '7,25' entendido",
  analyzeCommission({ price: 100, productCost: "7,25" }).totalCost,
  "7.25",
);

console.log("\n--- Caso 9: tabela do TikTok Shop BR (escalonada + parte fixa) ---");
// Abaixo de R$50: 10% + R$4,00. De R$50 pra cima: 6% + R$6,00.
const f20 = platformFee(TIKTOK_SHOP_BR, 20);
check("R$20 → variável 10%", f20.variable, "2");
check("R$20 → fixa", f20.fixed, "4");
check("R$20 → total", f20.total, "6");
check("R$20 → taxa efetiva 30%", f20.effectiveRate, "0.3");

const f49 = platformFee(TIKTOK_SHOP_BR, 49.99);
check("R$49,99 ainda na faixa de baixo", f49.tier.rate, 0.1);

const f50 = platformFee(TIKTOK_SHOP_BR, 50);
check("R$50 vira faixa de cima", f50.tier.rate, 0.06);
check("R$50 → total (3 + 6)", f50.total, "9");
check("R$50 → taxa efetiva 18%", f50.effectiveRate, "0.18");

const f200 = platformFee(TIKTOK_SHOP_BR, 200);
check("R$200 → total (12 + 6)", f200.total, "18");
check("R$200 → taxa efetiva 9%", f200.effectiveRate, "0.09");

console.log("\n--- Caso 10: a tabela dentro da calculadora ---");
// Produto de R$29,90, custo R$12. Taxa = 2,99 + 4,00 = 6,99.
const barato = analyzeCommission({
  price: 29.9,
  productCost: 12,
  feeSchedule: TIKTOK_SHOP_BR,
  minimumMargin: 0.2,
});
check("taxa da plataforma aplicada", barato.breakdown.platformFee, "6.99");
check("custo total", barato.totalCost, "18.99");
// 29,90*0,80 − 18,99 = 23,92 − 18,99 = 4,93 → 4,93/29,90 = 16,48%
check("comissão máxima com margem mín 20%", barato.maxRate, "0.1648");
check("valor máximo", barato.maxValue, "4.93");
check("status", barato.status, "OK");

// O mesmo produto ignorando a taxa: 29,90 × 0,80 − 12 = 11,92 → 39,86%.
// Ou seja, o seller que não conta a taxa da plataforma acha que pode pagar
// 39,86% quando o teto real é 16,48% — duas vezes e meia mais. É este erro
// que a calculadora existe para evitar, e num produto barato ele é enorme
// por causa dos R$ 4,00 fixos.
const semTabela = analyzeCommission({ price: 29.9, productCost: 12, minimumMargin: 0.2 });
check("sem a tabela, teto aparente", semTabela.maxRate, "0.3986");

console.log("\n--- Caso 11: escada de comissão (§43) ---");
// Produto R$89,90, custo R$30, taxa da tabela, margem alvo 25%.
const escadaInputs = {
  price: 89.9,
  productCost: 30,
  feeSchedule: TIKTOK_SHOP_BR,
  minimumMargin: 0.15,
  targetMargin: 0.25,
};
const escada = commissionLadder(escadaInputs);
check("tem 6 degraus", escada.length, 6);
check("degraus em ordem", escada.map((r) => String(r.rate)).join(","), "0.05,0.1,0.15,0.2,0.25,0.3");
// Taxa = 89,90×0,06 + 6 = 5,40 (arredonda pra cima) + 6 = 11,40. Custo total 41,40.
check("custo total", analyzeCommission(escadaInputs).totalCost, "41.4");
// Recomendada = 89,90×0,75 − 41,40 = 67,42 − 41,40 = 26,02 → 28,94%
check("taxa recomendada", analyzeCommission(escadaInputs).recommendedRate, "0.2894");
// Maior degrau que não passa de 28,94% é 25%.
check("degrau recomendado", escada.find((r) => r.isRecommended)?.rate, "0.25");
check("só um degrau marcado", escada.filter((r) => r.isRecommended).length, 1);
// Margem em cada degrau cai conforme a comissão sobe.
const margens = escada.map((r) => r.netMarginRate.toNumber());
check("margem sempre decrescente", margens.every((m, i) => i === 0 || m < margens[i - 1]), true);
// Com margem mínima 15%, degraus muito altos deixam de ser viáveis.
check("30% ainda viável?", escada[5].viable, true);

// Produto sem espaço nenhum: nenhum degrau é marcado como recomendado.
const semEspaco = commissionLadder({ price: 100, productCost: 85, minimumMargin: 0.2 });
check("sem espaço, nenhum degrau recomendado", semEspaco.filter((r) => r.isRecommended).length, 0);

console.log("\n--- Caso 8: formatação pt-BR ---");
check("taxa", formatRate(0.1875), "18,75%");
check("taxa nula", formatRate(null), "—");
check("dinheiro", formatMoney(12.5).replace(/ /g, " "), "R$ 12,50");

console.log(`\n${failures === 0 ? "TODOS OS CASOS PASSARAM" : `${failures} FALHA(S)`}\n`);
process.exit(failures === 0 ? 0 : 1);

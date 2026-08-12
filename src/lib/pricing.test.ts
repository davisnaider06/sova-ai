import { test } from "node:test";
import assert from "node:assert/strict";
import {
  breakEvenRate,
  rateForMargin,
  recommendCommission,
  scenarioAt,
  sumCosts,
  type ProductCosts,
} from "./pricing";
import { formatBRL, parseCents, toCents, toPercent, toRate } from "./money";

// Produto de R$ 100,00 com R$ 55,00 de custo total.
// Sobra 45% do preço — é o ponto de equilíbrio.
const price = 10_000;
const costs: ProductCosts = {
  productCost: 4_000,
  shippingCost: 1_000,
  platformFee: 500,
  operationalCost: 0,
};

test("sumCosts soma as quatro parcelas", () => {
  assert.equal(sumCosts(costs), 5_500);
});

test("ponto de equilíbrio é o que sobra do preço depois dos custos", () => {
  assert.equal(breakEvenRate(price, costs), 0.45);
});

test("no ponto de equilíbrio o lucro é exatamente zero", () => {
  const s = scenarioAt(price, costs, breakEvenRate(price, costs), 0.1);
  assert.equal(s.profit, 0);
  assert.equal(s.margin, 0);
});

test("taxa para uma margem alvo é o equilíbrio menos a margem", () => {
  assert.equal(rateForMargin(price, costs, 0.2), 0.25);

  // E a conta fecha de volta: cobrando 25%, a margem realizada é 20%.
  const s = scenarioAt(price, costs, 0.25, 0.1);
  assert.equal(s.commission, 2_500);
  assert.equal(s.profit, 2_000);
  assert.equal(s.margin, 0.2);
});

test("recomendação respeita margem mínima e alvo", () => {
  const advice = recommendCommission(price, costs, {
    minimumMargin: 0.1,
    targetMargin: 0.2,
  });

  assert.equal(advice.impossible, false);
  assert.equal(advice.recommendedRate, 0.25); // atinge 20% de margem
  assert.equal(advice.maxRate, 0.35); // teto que ainda deixa 10%
  assert.equal(advice.recommendedBelowMarketFloor, false);
});

test("produto sem folga é marcado como impossível, não recomendado a 0", () => {
  const semFolga: ProductCosts = { ...costs, productCost: 10_000 };
  const advice = recommendCommission(price, semFolga);

  assert.equal(advice.impossible, true);
  assert.equal(advice.recommendedRate, null);
  assert.equal(advice.maxRate, null);
});

test("folga pequena avisa que a taxa não atrai creator", () => {
  // Custos de R$ 76 num preço de R$ 100: sobra 24%, alvo de 20% deixa só 4%.
  const apertado: ProductCosts = { ...costs, productCost: 6_100 };
  const advice = recommendCommission(price, apertado, { targetMargin: 0.2 });

  assert.equal(advice.recommendedRate, 0.04);
  assert.equal(advice.recommendedBelowMarketFloor, true);
});

test("cenários nunca passam do ponto de equilíbrio", () => {
  const advice = recommendCommission(price, costs);
  for (const s of advice.scenarios) {
    assert.ok(s.rate <= advice.breakEvenRate + 1e-9, `taxa ${s.rate} passou do equilíbrio`);
    assert.ok(s.profit >= 0, `taxa ${s.rate} deu prejuízo`);
  }
});

test("preço zero não estoura a conta", () => {
  const advice = recommendCommission(0, costs);
  assert.equal(advice.impossible, true);
  assert.deepEqual(advice.scenarios, []);
});

// ---------------------------------------------------------------------------
// money.ts
// ---------------------------------------------------------------------------

test("parseCents lê os formatos que o usuário digita", () => {
  assert.equal(parseCents("1.234,56"), 123_456);
  assert.equal(parseCents("1,234.56"), 123_456);
  assert.equal(parseCents("R$ 12,90"), 1_290);
  assert.equal(parseCents("12"), 1_200);
  assert.equal(parseCents("0,5"), 50);
  assert.equal(parseCents(""), null);
  assert.equal(parseCents("abc"), null);
});

test("toCents arredonda em vez de truncar", () => {
  // Truncar sistematicamente para baixo vira centavo faltando na comissão.
  assert.equal(toCents("12.995"), 1_300);
  assert.equal(toCents(12.994), 1_299);
  assert.equal(toCents(null), 0);
});

test("taxa e percentual são a mesma coisa nos dois sentidos", () => {
  assert.equal(toRate(20), 0.2);
  assert.equal(toPercent(0.2), 20);
  assert.equal(toPercent("0.1550"), 15.5);
});

test("formatBRL usa o formato brasileiro", () => {
  //   é o espaço não-quebrável que o Intl coloca depois do R$.
  assert.equal(formatBRL(123_456), "R$ 1.234,56");
});

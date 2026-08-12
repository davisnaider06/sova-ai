import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCreatorToProduct, type CreatorSignals, type ProductSignals } from "./matching";

const suplementos: ProductSignals = {
  category: "Saúde e suplementos",
  priceCents: 12_000,
  commissionRate: 0.2,
};

function creator(overrides: Partial<CreatorSignals> = {}): CreatorSignals {
  return {
    niches: ["Saúde e suplementos"],
    followers: 25_000,
    averageViews: 8_000,
    engagementRate: 0.045,
    categoryHistory: {},
    hasConnectedAccount: false,
    ...overrides,
  };
}

// -- A tese da §46, virada em teste ----------------------------------------
// "Um creator de 25k com R$120k de GMV em suplementos vale mais que um de 50k
// sem histórico." Se este teste falhar, o matching virou categoria = categoria.

test("histórico na categoria supera audiência maior sem histórico", () => {
  const comHistorico = matchCreatorToProduct(
    creator({
      followers: 25_000,
      categoryHistory: { "Saúde e suplementos": { gmvCents: 12_000_000, orders: 340 } },
    }),
    suplementos,
  );

  const semHistorico = matchCreatorToProduct(
    creator({ followers: 50_000 }),
    suplementos,
  );

  assert.ok(
    comHistorico.score > semHistorico.score,
    `esperava histórico (${comHistorico.score}) acima de audiência (${semHistorico.score})`,
  );
});

test("creator pequeno com engajamento alto não empata com o estabelecido", () => {
  // Regressão de um caso encontrado com dado real: contas pequenas costumam ter
  // engajamento alto, e sem o amortecimento por cobertura de evidência um
  // creator de 1.800 seguidores sem histórico chegava a 2 pontos de um de 128
  // mil com oito vendas. A ordenação ficava sem sentido.
  const novato = matchCreatorToProduct(
    creator({
      followers: 1_800,
      engagementRate: 0.071,
      categoryHistory: {},
    }),
    suplementos,
  );

  const estabelecido = matchCreatorToProduct(
    creator({
      followers: 128_000,
      engagementRate: 0.058,
      categoryHistory: { "Saúde e suplementos": { gmvCents: 1_500_00, orders: 8 } },
    }),
    suplementos,
  );

  const gap = estabelecido.score - novato.score;
  assert.ok(
    gap >= 10,
    `esperava pelo menos 10 pontos de diferença, veio ${gap} (novato ${novato.score}, estabelecido ${estabelecido.score})`,
  );

  // Mas o novato continua visível: sepultá-lo mataria a aquisição de creator.
  assert.ok(novato.score >= 45, `novato no nicho certo caiu para ${novato.score}`);
});

test("sinal faltando derruba o score, não só a confiança", () => {
  const completo = matchCreatorToProduct(
    creator({ categoryHistory: { "Saúde e suplementos": { gmvCents: 1_000_000, orders: 20 } } }),
    suplementos,
  );
  const semNada = matchCreatorToProduct(
    creator({ followers: null, engagementRate: null }),
    suplementos,
  );

  assert.ok(completo.score > semNada.score);
});

test("histórico também eleva a confiança, não só o score", () => {
  const comHistorico = matchCreatorToProduct(
    creator({ categoryHistory: { "Saúde e suplementos": { gmvCents: 12_000_000, orders: 340 } } }),
    suplementos,
  );
  const semHistorico = matchCreatorToProduct(creator(), suplementos);

  assert.ok(comHistorico.confidence > semHistorico.confidence);
  assert.equal(semHistorico.confidenceLevel, "baixa");
});

test("conta conectada eleva a confiança com os mesmos números", () => {
  const declarado = matchCreatorToProduct(creator(), suplementos);
  const conectado = matchCreatorToProduct(
    creator({ hasConnectedAccount: true }),
    suplementos,
  );

  assert.equal(declarado.score, conectado.score); // o score não muda...
  assert.ok(conectado.confidence > declarado.confidence); // ...a confiança sim
});

test("creator sem histórico não é penalizado por um componente que ninguém tem", () => {
  // Os pesos são renormalizados sobre o que existe. Se o histórico entrasse
  // como zero, todo creator novo ficaria com score irrecuperável.
  const novo = matchCreatorToProduct(creator(), suplementos);
  assert.ok(novo.score > 50, `creator novo no nicho certo não deveria ficar em ${novo.score}`);
  assert.ok(!novo.components.some((c) => c.key === "historico"));
});

test("fora do nicho pontua menos, mas não desaparece", () => {
  const dentro = matchCreatorToProduct(creator(), suplementos);
  const fora = matchCreatorToProduct(creator({ niches: ["Pet shop"] }), suplementos);

  assert.ok(fora.score < dentro.score);
  assert.ok(fora.score > 0, "fora do nicho não pode zerar — creator testa categoria vizinha");
});

test("todo componente sabe se explicar", () => {
  const result = matchCreatorToProduct(creator(), suplementos);
  assert.ok(result.components.length > 0);
  for (const c of result.components) {
    assert.ok(c.reason.length > 0, `componente ${c.key} sem motivo`);
    assert.ok(c.score >= 0 && c.score <= 1, `componente ${c.key} fora de 0..1`);
  }
  assert.ok(result.headline.length > 0);
});

test("creator sem nenhum sinal recebe só a oferta, com confiança do que sobrou", () => {
  const vazio = matchCreatorToProduct(
    creator({ niches: [], followers: null, engagementRate: null }),
    suplementos,
  );

  assert.deepEqual(
    vazio.components.map((c) => c.key),
    ["oferta"],
  );
  assert.ok(vazio.improves.length > 0, "deveria dizer o que fazer para melhorar");
});

test("improves aponta o caminho de maior impacto primeiro", () => {
  const novo = matchCreatorToProduct(creator(), suplementos);
  assert.match(novo.improves[0], /primeira venda/i);

  const comHistorico = matchCreatorToProduct(
    creator({ categoryHistory: { "Saúde e suplementos": { gmvCents: 500_000, orders: 12 } } }),
    suplementos,
  );
  assert.match(comHistorico.improves[0], /Conecte seu TikTok/i);
});

test("score e confiança ficam sempre dentro da faixa", () => {
  const extremos = [
    creator({ followers: 0, engagementRate: 0 }),
    creator({ followers: 50_000_000, engagementRate: 1 }),
    creator({ categoryHistory: { "Saúde e suplementos": { gmvCents: 999_999_999, orders: 99_999 } } }),
  ];

  for (const c of extremos) {
    const r = matchCreatorToProduct(c, suplementos);
    assert.ok(r.score >= 0 && r.score <= 100, `score fora da faixa: ${r.score}`);
    assert.ok(r.confidence >= 0 && r.confidence <= 1, `confiança fora da faixa: ${r.confidence}`);
  }
});

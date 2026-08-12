import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commissionFor,
  decideAttribution,
  type AttributionCandidate,
} from "./attribution";

const orderDate = new Date("2026-08-20T12:00:00Z");

function candidate(over: Partial<AttributionCandidate> = {}): AttributionCandidate {
  return {
    affiliationId: "aff-1",
    creatorProfileId: "creator-1",
    creatorHandle: "@joana",
    startedAt: new Date("2026-08-01T00:00:00Z"),
    endedAt: null,
    status: "ACTIVE",
    lastContentAt: null,
    ...over,
  };
}

test("sem candidato nenhum, a venda é orgânica", () => {
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: null,
    candidates: [],
  });
  assert.equal(d.affiliationId, null);
  assert.match(d.reason, /orgânica/i);
});

test("creator informado pela origem vence qualquer heurística", () => {
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: "@joana",
    candidates: [
      candidate({ affiliationId: "aff-2", creatorHandle: "@outro", lastContentAt: orderDate }),
      candidate({ affiliationId: "aff-1", creatorHandle: "@joana" }),
    ],
  });
  assert.equal(d.affiliationId, "aff-1");
  assert.match(d.reason, /informado na origem/i);
});

test("handle compara sem arroba e sem diferença de caixa", () => {
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: "JOANA",
    candidates: [candidate({ creatorHandle: "@joana" })],
  });
  assert.equal(d.affiliationId, "aff-1");
});

test("conteúdo dentro da janela ganha do que está fora", () => {
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: null,
    candidates: [
      candidate({
        affiliationId: "antigo",
        lastContentAt: new Date("2026-08-01T00:00:00Z"), // 19 dias antes
      }),
      candidate({
        affiliationId: "recente",
        lastContentAt: new Date("2026-08-18T00:00:00Z"), // 2 dias antes
      }),
    ],
    windowDays: 7,
  });
  assert.equal(d.affiliationId, "recente");
  assert.match(d.reason, /2 dias antes/);
});

test("conteúdo fora da janela não atribui sozinho", () => {
  // O caso do plano: postou dia 1, venda entrou dia 20, janela de 7.
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: null,
    candidates: [
      candidate({ affiliationId: "a" , lastContentAt: new Date("2026-08-01T00:00:00Z") }),
      candidate({ affiliationId: "b", creatorHandle: "@b", lastContentAt: null }),
    ],
    windowDays: 7,
  });
  assert.equal(d.affiliationId, null);
  assert.match(d.reason, /decisão manual/i);
});

test("um único afiliado ativo resolve sem conteúdo", () => {
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: null,
    candidates: [candidate()],
  });
  assert.equal(d.affiliationId, "aff-1");
  assert.match(d.reason, /único/i);
});

test("empate sem sinal fica sem atribuição, em vez de sortear", () => {
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: null,
    candidates: [
      candidate({ affiliationId: "a" }),
      candidate({ affiliationId: "b", creatorHandle: "@b" }),
    ],
  });
  assert.equal(d.affiliationId, null);
  assert.match(d.reason, /2 creators ativos/);
});

test("afiliação que começou depois da venda não conta", () => {
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: null,
    candidates: [candidate({ startedAt: new Date("2026-08-25T00:00:00Z") })],
  });
  assert.equal(d.affiliationId, null);
  assert.match(d.reason, /ativa na data/i);
});

test("afiliação encerrada antes da venda não conta, encerrada depois conta", () => {
  const antes = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: null,
    candidates: [candidate({ status: "ENDED", endedAt: new Date("2026-08-10T00:00:00Z") })],
  });
  assert.equal(antes.affiliationId, null);

  const depois = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: null,
    candidates: [candidate({ status: "ENDED", endedAt: new Date("2026-08-25T00:00:00Z") })],
  });
  assert.equal(depois.affiliationId, "aff-1");
});

test("pedido pendente de aprovação nunca gera comissão", () => {
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: "@joana",
    candidates: [candidate({ status: "PENDING" })],
  });
  assert.equal(d.affiliationId, null);
});

test("a janela usada volta na decisão, para ficar gravada", () => {
  const d = decideAttribution({
    placedAt: orderDate,
    declaredCreatorHandle: null,
    candidates: [candidate()],
    windowDays: 30,
  });
  assert.equal(d.windowDays, 30);
});

test("comissão congela a taxa e arredonda ao centavo", () => {
  assert.deepEqual(commissionFor(12_999, 0.15), { rate: 0.15, amountCents: 1_950 });
  assert.deepEqual(commissionFor(10_000, 0.2), { rate: 0.2, amountCents: 2_000 });
});

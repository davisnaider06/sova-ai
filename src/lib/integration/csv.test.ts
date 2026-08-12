import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeHeader, parseCsv, pick } from "./csv";

test("lê CSV simples com vírgula", () => {
  const { headers, rows } = parseCsv("a,b\n1,2\n3,4");
  assert.deepEqual(headers, ["a", "b"]);
  assert.deepEqual(rows, [
    { a: "1", b: "2" },
    { a: "3", b: "4" },
  ]);
});

test("detecta ponto-e-vírgula, que é o que o Excel brasileiro exporta", () => {
  const { headers, rows } = parseCsv("pedido;valor\nABC-1;10,50");
  assert.deepEqual(headers, ["pedido", "valor"]);
  assert.equal(rows[0].valor, "10,50");
});

test("campo com o delimitador dentro de aspas não quebra a coluna", () => {
  const { rows } = parseCsv('nome,qtd\n"Kit 2 unidades, sabor limão",3');
  assert.equal(rows[0].nome, "Kit 2 unidades, sabor limão");
  assert.equal(rows[0].qtd, "3");
});

test("aspas escapadas por duplicação viram uma aspa só", () => {
  const { rows } = parseCsv('nome\n"Camiseta ""oversized"""');
  assert.equal(rows[0].nome, 'Camiseta "oversized"');
});

test("BOM do Excel não gruda no primeiro cabeçalho", () => {
  const { headers } = parseCsv("﻿pedido_id,valor\n1,2");
  assert.deepEqual(headers, ["pedido_id", "valor"]);
});

test("CRLF e linha em branco no fim não viram registro", () => {
  const { rows } = parseCsv("a,b\r\n1,2\r\n\r\n");
  assert.equal(rows.length, 1);
});

test("cabeçalho com acento e espaço chega normalizado", () => {
  assert.equal(normalizeHeader("Preço Unitário"), "preco_unitario");
  assert.equal(normalizeHeader("  ID do Pedido  "), "id_do_pedido");
  assert.equal(normalizeHeader("total(R$)"), "total_r");
});

test("pick aceita sinônimos de coluna", () => {
  const { rows } = parseCsv("Preço Unitário;Qtd\n12,90;2");
  assert.equal(pick(rows[0], "valor_unitario", "preco_unitario"), "12,90");
  assert.equal(pick(rows[0], "quantidade", "qtd"), "2");
  assert.equal(pick(rows[0], "coluna_inexistente"), "");
});

test("arquivo vazio devolve tabela vazia em vez de estourar", () => {
  assert.deepEqual(parseCsv(""), { headers: [], rows: [] });
  assert.deepEqual(parseCsv("   \n  "), { headers: [], rows: [] });
});

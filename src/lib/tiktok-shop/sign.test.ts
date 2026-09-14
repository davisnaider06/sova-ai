import { test } from "node:test";
import assert from "node:assert/strict";
import { signTikTokShopRequest } from "./sign";

// ---------------------------------------------------------------------------
// O caso de teste é o exemplo passo a passo da própria doc oficial ("Sign
// your API request", conferida em 14/09/2026) — app_secret, path, query e o
// sign esperado vêm de lá, byte a byte. Se este teste quebrar depois de mexer
// no algoritmo, o algoritmo é que está errado, não o teste.
// ---------------------------------------------------------------------------

test("bate com o exemplo oficial da doc (Get Authorized Shops)", () => {
  const sign = signTikTokShopRequest({
    path: "/authorization/202309/shops",
    query: { app_key: "29a39d", timestamp: "1623812664" },
    body: null,
    appSecret: "e59af819cc",
  });

  assert.equal(sign, "b596b73e0cc6de07ac26f036364178ab16b0a907af13d43f0a0cd2345f582dc8");
});

test("ordena as chaves alfabeticamente, não pela ordem de inserção", () => {
  const a = signTikTokShopRequest({
    path: "/x",
    query: { timestamp: "1", app_key: "2" },
    body: null,
    appSecret: "s",
  });
  const b = signTikTokShopRequest({
    path: "/x",
    query: { app_key: "2", timestamp: "1" },
    body: null,
    appSecret: "s",
  });
  assert.equal(a, b);
});

test("o corpo entra na assinatura quando presente", () => {
  const semCorpo = signTikTokShopRequest({
    path: "/x",
    query: { app_key: "2", timestamp: "1" },
    body: null,
    appSecret: "s",
  });
  const comCorpo = signTikTokShopRequest({
    path: "/x",
    query: { app_key: "2", timestamp: "1" },
    body: '{"a":1}',
    appSecret: "s",
  });
  assert.notEqual(semCorpo, comCorpo);
});

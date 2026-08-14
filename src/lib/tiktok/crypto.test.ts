import { test, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  TokenEncryptionError,
  decryptToken,
  encryptToken,
  isTokenEncryptionConfigured,
  tryDecryptToken,
} from "./crypto";

const KEY = randomBytes(32).toString("base64");

before(() => {
  process.env.TOKEN_ENCRYPTION_KEY = KEY;
});

test("ida e volta devolve o texto original", () => {
  const token = "act.abc123DEF456-_xyz";
  assert.equal(decryptToken(encryptToken(token)), token);
});

test("o texto cifrado não contém o token em claro", () => {
  const token = "act.segredo-que-nao-pode-vazar";
  const encrypted = encryptToken(token);
  assert.ok(!encrypted.includes("segredo"));
  assert.ok(!encrypted.includes(token));
});

test("cifrar duas vezes o mesmo token dá saídas diferentes", () => {
  // IV aleatório por chamada. Sem isso, dois usuários com o mesmo token teriam
  // o mesmo texto cifrado, e o banco viraria um oráculo de igualdade.
  const token = "act.mesmo-token";
  assert.notEqual(encryptToken(token), encryptToken(token));
});

test("adulterar o texto cifrado faz a decifragem falhar", () => {
  // É o ponto de usar GCM em vez de CBC: adulteração vira erro, não lixo
  // silencioso que o código trataria como token válido.
  const encrypted = encryptToken("act.original");
  const parts = encrypted.split(".");
  const data = Buffer.from(parts[3], "base64url");
  data[0] ^= 0xff;
  parts[3] = data.toString("base64url");

  assert.throws(() => decryptToken(parts.join(".")), TokenEncryptionError);
});

test("adulterar a tag de autenticação também falha", () => {
  const encrypted = encryptToken("act.original");
  const parts = encrypted.split(".");
  const tag = Buffer.from(parts[2], "base64url");
  tag[0] ^= 0xff;
  parts[2] = tag.toString("base64url");

  assert.throws(() => decryptToken(parts.join(".")), TokenEncryptionError);
});

test("formato desconhecido é recusado", () => {
  assert.throws(() => decryptToken("nao-e-um-token-cifrado"), TokenEncryptionError);
  assert.throws(() => decryptToken("v2.a.b.c"), TokenEncryptionError);
});

test("chave de tamanho errado é erro de configuração", () => {
  const original = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("curta").toString("base64");
  assert.throws(() => encryptToken("x"), TokenEncryptionError);
  assert.equal(isTokenEncryptionConfigured(), false);
  process.env.TOKEN_ENCRYPTION_KEY = original;
});

test("chave ausente é erro de configuração", () => {
  const original = process.env.TOKEN_ENCRYPTION_KEY;
  delete process.env.TOKEN_ENCRYPTION_KEY;
  assert.throws(() => encryptToken("x"), TokenEncryptionError);
  process.env.TOKEN_ENCRYPTION_KEY = original;
});

test("tryDecryptToken degrada para null em vez de estourar", () => {
  assert.equal(tryDecryptToken(null), null);
  assert.equal(tryDecryptToken(undefined), null);
  assert.equal(tryDecryptToken("lixo"), null);
  assert.equal(tryDecryptToken(encryptToken("ok")), "ok");
});

test("token cifrado com outra chave não decifra", () => {
  const encrypted = encryptToken("act.token");
  const original = process.env.TOKEN_ENCRYPTION_KEY;
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  assert.equal(tryDecryptToken(encrypted), null);
  process.env.TOKEN_ENCRYPTION_KEY = original;
});

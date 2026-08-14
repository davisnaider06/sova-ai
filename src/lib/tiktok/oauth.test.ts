import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildAuthorizeUrl, generateState, isExpired, parseScopes, statesMatch } from "./oauth";

const ENV = {
  TIKTOK_CLIENT_KEY: "awxyz123",
  TIKTOK_CLIENT_SECRET: "secret-que-nao-pode-vazar",
  TIKTOK_REDIRECT_URI: "https://sova.ai/api/tiktok/callback",
};

before(() => Object.assign(process.env, ENV));
after(() => {
  for (const key of Object.keys(ENV)) delete process.env[key as keyof typeof ENV];
});

test("a URL de autorização usa o endpoint e os parâmetros documentados", () => {
  const result = buildAuthorizeUrl("estado-123");
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;

  const url = new URL(result.data);
  assert.equal(url.origin + url.pathname, "https://www.tiktok.com/v2/auth/authorize/");
  assert.equal(url.searchParams.get("client_key"), ENV.TIKTOK_CLIENT_KEY);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("redirect_uri"), ENV.TIKTOK_REDIRECT_URI);
  assert.equal(url.searchParams.get("state"), "estado-123");
});

test("os scopes vão separados por vírgula, como a API espera", () => {
  const result = buildAuthorizeUrl("s");
  if (result.status !== "ok") throw new Error("esperava ok");

  const scope = new URL(result.data).searchParams.get("scope") ?? "";
  assert.deepEqual(scope.split(","), [
    "user.info.basic",
    "user.info.profile",
    "user.info.stats",
    "video.list",
  ]);
});

test("o client secret NUNCA entra na URL de autorização", () => {
  // A URL vai para o navegador do usuário. Um secret aqui vazaria em histórico,
  // referrer e logs de proxy.
  const result = buildAuthorizeUrl("s");
  if (result.status !== "ok") throw new Error("esperava ok");
  assert.ok(!result.data.includes(ENV.TIKTOK_CLIENT_SECRET));
  assert.ok(!result.data.includes("client_secret"));
});

test("sem configuração, devolve not_configured em vez de estourar", () => {
  const saved = process.env.TIKTOK_CLIENT_KEY;
  delete process.env.TIKTOK_CLIENT_KEY;
  assert.equal(buildAuthorizeUrl("s").status, "not_configured");
  process.env.TIKTOK_CLIENT_KEY = saved;
});

test("o state é aleatório e longo o bastante", () => {
  const a = generateState();
  const b = generateState();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32, `state curto demais: ${a.length}`);
  // base64url não pode conter caractere que precise de escape em query string.
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});

test("parseScopes lê a lista separada por vírgula", () => {
  assert.deepEqual(parseScopes("user.info.basic,video.list"), [
    "user.info.basic",
    "video.list",
  ]);
  assert.deepEqual(parseScopes("user.info.basic, video.list "), [
    "user.info.basic",
    "video.list",
  ]);
  assert.deepEqual(parseScopes(undefined), []);
  assert.deepEqual(parseScopes(""), []);
});

test("state só bate consigo mesmo", () => {
  const state = generateState();
  assert.equal(statesMatch(state, state), true);
  assert.equal(statesMatch(state, generateState()), false);
});

test("callback sem state, ou com state que não foi emitido, é recusado", () => {
  // Os dois casos de CSRF: o atacante não tem o cookie httpOnly, então ou não
  // manda state nenhum, ou manda um que ele inventou.
  const emitido = generateState();
  assert.equal(statesMatch(emitido, null), false);
  assert.equal(statesMatch(null, emitido), false);
  assert.equal(statesMatch(null, null), false);
  assert.equal(statesMatch(emitido, ""), false);
  assert.equal(statesMatch(emitido, "estado-inventado-pelo-atacante"), false);
});

test("state com prefixo correto mas comprimento diferente é recusado", () => {
  const emitido = generateState();
  assert.equal(statesMatch(emitido, emitido.slice(0, -1)), false);
  assert.equal(statesMatch(emitido, emitido + "x"), false);
});

test("isExpired trata a janela de segurança antes do vencimento", () => {
  const agora = new Date("2026-08-13T12:00:00Z");

  const daquiUmaHora = new Date(agora.getTime() + 3_600_000);
  assert.equal(isExpired(daquiUmaHora, agora), false);

  // Dentro da margem: ainda não venceu no relógio, mas venceria antes de a
  // requisição chegar ao TikTok.
  const daquiDezSegundos = new Date(agora.getTime() + 10_000);
  assert.equal(isExpired(daquiDezSegundos, agora), true);

  const jaVenceu = new Date(agora.getTime() - 1000);
  assert.equal(isExpired(jaVenceu, agora), true);

  // Sem data conhecida, tratar como vencido é o lado seguro: força um refresh
  // em vez de mandar um token possivelmente morto.
  assert.equal(isExpired(null, agora), true);
  assert.equal(isExpired(undefined, agora), true);
});

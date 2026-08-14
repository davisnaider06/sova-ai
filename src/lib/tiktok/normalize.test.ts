import { test } from "node:test";
import assert from "node:assert/strict";
import { engagementRate, normalizeVideo, normalizeVideos } from "./normalize";
import {
  computeAccountMetrics,
  durationInsight,
  median,
  postingFrequency,
} from "./metrics";
import { fieldsForScopes } from "./profile";
import { classifyError } from "./client";
import type { TikTokVideoPayload } from "./videos";

function payload(over: Partial<TikTokVideoPayload> = {}): TikTokVideoPayload {
  return {
    id: "v1",
    create_time: 1_754_000_000, // segundos
    title: "Meu vídeo",
    video_description: "descrição",
    duration: 42,
    share_url: "https://www.tiktok.com/@x/video/1",
    view_count: 1000,
    like_count: 80,
    comment_count: 15,
    share_count: 5,
    ...over,
  };
}

// -- normalização ----------------------------------------------------------

test("create_time em segundos vira Date correto", () => {
  // O erro clássico aqui é esquecer o ×1000 e jogar todo vídeo em 1970.
  const v = normalizeVideo(payload({ create_time: 1_754_000_000 }));
  assert.equal(v?.publishedAt?.getTime(), 1_754_000_000_000);
  assert.ok((v?.publishedAt?.getUTCFullYear() ?? 0) > 2020);
});

test("vídeo sem id é descartado", () => {
  assert.equal(normalizeVideo(payload({ id: "" })), null);
  assert.equal(normalizeVideos([payload(), payload({ id: "" })]).length, 1);
});

test("contadores ausentes viram zero, não NaN", () => {
  const v = normalizeVideo(
    payload({ view_count: undefined, like_count: undefined, share_count: -5 }),
  );
  assert.equal(v?.viewCount, 0);
  assert.equal(v?.likeCount, 0);
  assert.equal(v?.shareCount, 0);
});

test("strings vazias viram null", () => {
  const v = normalizeVideo(payload({ title: "   ", video_description: "" }));
  assert.equal(v?.title, null);
  assert.equal(v?.description, null);
});

test("engajamento é interações sobre views", () => {
  // (80 + 15 + 5) / 1000 = 0,10
  assert.equal(normalizeVideo(payload())?.engagementRate, 0.1);
});

test("engajamento é null sem views, nunca zero nem infinito", () => {
  assert.equal(engagementRate({ viewCount: 0, likeCount: 5, commentCount: 0, shareCount: 0 }), null);
  assert.equal(normalizeVideo(payload({ view_count: 0 }))?.engagementRate, null);
});

// -- métricas --------------------------------------------------------------

test("mediana resiste a um viral, ao contrário da média", () => {
  const views = [1000, 1100, 900, 1050, 1_000_000];
  assert.equal(median(views), 1050);
  const media = views.reduce((a, b) => a + b, 0) / views.length;
  assert.ok(media > 200_000, "a média seria distorcida pelo viral");
});

test("mediana de lista vazia é null", () => {
  assert.equal(median([]), null);
});

test("frequência de publicação precisa de pelo menos dois vídeos datados", () => {
  const um = [normalizeVideo(payload())!];
  assert.equal(postingFrequency(um), null);
});

test("frequência sai em vídeos por semana", () => {
  const dia = 86_400;
  const base = 1_754_000_000;
  const videos = [0, 7, 14, 21].map((d, i) =>
    normalizeVideo(payload({ id: `v${i}`, create_time: base + d * dia }))!,
  );
  // 4 vídeos em 21 dias = 3 semanas → ~1,33 por semana
  const freq = postingFrequency(videos);
  assert.ok(freq !== null && freq > 1.2 && freq < 1.5, `veio ${freq}`);
});

test("insight de duração exige amostra mínima", () => {
  const poucos = [1, 2, 3].map((i) =>
    normalizeVideo(payload({ id: `v${i}`, duration: i * 10 }))!,
  );
  assert.equal(durationInsight(poucos), null);
});

test("diferença pequena entre curtos e longos não vira afirmação", () => {
  // Views quase iguais nos dois grupos: não há padrão a declarar.
  const videos = [
    { id: "a", duration: 10, view_count: 1000 },
    { id: "b", duration: 12, view_count: 1010 },
    { id: "c", duration: 14, view_count: 1020 },
    { id: "d", duration: 60, view_count: 990 },
    { id: "e", duration: 70, view_count: 1005 },
    { id: "f", duration: 80, view_count: 1015 },
  ].map((p) => normalizeVideo(payload(p))!);

  const insight = durationInsight(videos);
  assert.ok(insight !== null);
  assert.equal(insight?.betterBucket, null, "não deveria afirmar padrão com 1% de diferença");
});

test("diferença grande é declarada", () => {
  const videos = [
    { id: "a", duration: 10, view_count: 5000 },
    { id: "b", duration: 12, view_count: 5200 },
    { id: "c", duration: 14, view_count: 4800 },
    { id: "d", duration: 60, view_count: 900 },
    { id: "e", duration: 70, view_count: 1000 },
    { id: "f", duration: 80, view_count: 1100 },
  ].map((p) => normalizeVideo(payload(p))!);

  assert.equal(durationInsight(videos)?.betterBucket, "short");
});

test("métricas da conta somam e classificam corretamente", () => {
  const videos = [
    { id: "a", view_count: 100 },
    { id: "b", view_count: 200 },
    { id: "c", view_count: 300 },
  ].map((p) => normalizeVideo(payload(p))!);

  const m = computeAccountMetrics(videos);
  assert.equal(m.videoCount, 3);
  assert.equal(m.totalViews, 600);
  assert.equal(m.medianViews, 200);
  assert.deepEqual(m.aboveMedian, ["c"]);
});

test("conta sem vídeos não estoura", () => {
  const m = computeAccountMetrics([]);
  assert.equal(m.videoCount, 0);
  assert.equal(m.medianViews, null);
  assert.equal(m.averageEngagementRate, null);
  assert.equal(m.postingFrequencyPerWeek, null);
  assert.equal(m.durationInsight, null);
  assert.deepEqual(m.aboveMedian, []);
});

// -- campos por scope ------------------------------------------------------

test("só pede campos cujos scopes foram concedidos", () => {
  // Pedir follower_count sem user.info.stats derruba a chamada inteira,
  // levando junto nome e avatar.
  const fields = fieldsForScopes(["user.info.basic"]);
  assert.ok(fields.includes("display_name"));
  assert.ok(!fields.includes("follower_count"));
  assert.ok(!fields.includes("bio_description"));
});

test("open_id vem sempre — é a chave da conexão", () => {
  assert.ok(fieldsForScopes([]).includes("open_id"));
  assert.ok(fieldsForScopes(["user.info.stats"]).includes("open_id"));
});

test("com todos os scopes, pede os campos de estatística", () => {
  const fields = fieldsForScopes([
    "user.info.basic",
    "user.info.profile",
    "user.info.stats",
  ]);
  for (const f of ["display_name", "bio_description", "follower_count", "video_count"]) {
    assert.ok(fields.includes(f), `faltou ${f}`);
  }
});

// -- classificação de erro -------------------------------------------------

test("erros do TikTok viram categorias que o chamador sabe tratar", () => {
  assert.equal(classifyError("access_token_invalid", 200), "invalid_token");
  assert.equal(classifyError(undefined, 401), "invalid_token");
  assert.equal(classifyError("scope_not_authorized", 200), "scope_missing");
  assert.equal(classifyError(undefined, 403), "scope_missing");
  assert.equal(classifyError("rate_limit_exceeded", 200), "rate_limited");
  assert.equal(classifyError(undefined, 429), "rate_limited");
  assert.equal(classifyError(undefined, 503), "unavailable");
  assert.equal(classifyError("algo_novo_do_tiktok", 200), "unknown");
});

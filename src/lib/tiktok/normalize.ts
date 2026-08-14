import type { TikTokVideoPayload } from "@/lib/tiktok/videos";

// ---------------------------------------------------------------------------
// Fronteira entre o que o TikTok devolve e o que nós guardamos.
//
// Nada de resposta bruta atravessa daqui para dentro. Duas razões práticas:
// quando o TikTok renomear um campo, o conserto é neste arquivo; e a camada de
// IA recebe dado com nome e unidade nossos, não `create_time` em segundos que
// alguém vai confundir com milissegundos.
// ---------------------------------------------------------------------------

export type NormalizedVideo = {
  videoId: string;
  title: string | null;
  description: string | null;
  shareUrl: string | null;
  embedLink: string | null;
  coverImageUrl: string | null;
  durationSeconds: number | null;
  publishedAt: Date | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  /// Fração de 0 a 1. Null quando não há views — dividir por zero produziria
  /// um número inventado, e a §79 é explícita: a IA nunca deve inventar métrica.
  engagementRate: number | null;
};

export function normalizeVideo(payload: TikTokVideoPayload): NormalizedVideo | null {
  // Sem id não há como deduplicar nem atualizar; a linha seria lixo.
  if (!payload.id) return null;

  const viewCount = nonNegative(payload.view_count);
  const likeCount = nonNegative(payload.like_count);
  const commentCount = nonNegative(payload.comment_count);
  const shareCount = nonNegative(payload.share_count);

  return {
    videoId: payload.id,
    title: emptyToNull(payload.title),
    description: emptyToNull(payload.video_description),
    shareUrl: emptyToNull(payload.share_url),
    embedLink: emptyToNull(payload.embed_link),
    coverImageUrl: emptyToNull(payload.cover_image_url),
    durationSeconds:
      typeof payload.duration === "number" && payload.duration > 0
        ? Math.round(payload.duration)
        : null,
    // `create_time` vem em SEGUNDOS. O Date do JS espera milissegundos —
    // esquecer o fator 1000 põe todo vídeo em 1970 e quebra qualquer análise
    // por período.
    publishedAt:
      typeof payload.create_time === "number" && payload.create_time > 0
        ? new Date(payload.create_time * 1000)
        : null,
    viewCount,
    likeCount,
    commentCount,
    shareCount,
    engagementRate: engagementRate({ viewCount, likeCount, commentCount, shareCount }),
  };
}

export function normalizeVideos(payloads: TikTokVideoPayload[]): NormalizedVideo[] {
  return payloads
    .map(normalizeVideo)
    .filter((v): v is NormalizedVideo => v !== null);
}

/// Interações por visualização.
///
/// É a única métrica derivada que a Display API sustenta sozinha: temos views e
/// as três interações, e nada mais. Alcance, retenção, taxa de conclusão e
/// origem do tráfego não vêm nesta API — calcular qualquer uma delas aqui seria
/// chute apresentado como número.
export function engagementRate(v: {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}): number | null {
  if (v.viewCount <= 0) return null;
  const interactions = v.likeCount + v.commentCount + v.shareCount;
  return Math.round((interactions / v.viewCount) * 10000) / 10000;
}

function nonNegative(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

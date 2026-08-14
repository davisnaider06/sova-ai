import { TIKTOK_ENDPOINTS, VIDEO_FIELDS, VIDEO_PAGE_MAX } from "@/lib/tiktok/config";
import { tiktokPost, type TikTokApiResult } from "@/lib/tiktok/client";

// ---------------------------------------------------------------------------
// Vídeos do próprio usuário — POST /v2/video/list/
//
// Só vídeos públicos, só do dono do token, só com o scope `video.list`.
//
// Paginação: o `cursor` é um timestamp UTC em **milissegundos**, e a resposta
// diz se há mais páginas em `has_more`. `max_count` tem teto de 20 por página.
// ---------------------------------------------------------------------------

/// Objeto de vídeo como a API devolve. Nomes exatamente como na documentação —
/// a tradução para o nosso modelo acontece em `normalize.ts`, não aqui.
export type TikTokVideoPayload = {
  id: string;
  create_time?: number; // segundos desde a época
  title?: string;
  video_description?: string;
  duration?: number; // segundos
  cover_image_url?: string; // expira em 6 horas
  share_url?: string;
  embed_link?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
};

export type VideoPage = {
  videos: TikTokVideoPayload[];
  cursor?: number;
  has_more?: boolean;
};

export async function fetchVideoPage(
  accessToken: string,
  options: { cursor?: number; maxCount?: number } = {},
): Promise<TikTokApiResult<VideoPage>> {
  const body: Record<string, unknown> = {
    max_count: Math.min(options.maxCount ?? VIDEO_PAGE_MAX, VIDEO_PAGE_MAX),
  };
  // Só manda o cursor quando existe: enviar `cursor: 0` na primeira página
  // pediria vídeos anteriores a 1970 e voltaria vazio.
  if (options.cursor) body.cursor = options.cursor;

  const result = await tiktokPost<VideoPage>(
    TIKTOK_ENDPOINTS.videoList,
    accessToken,
    VIDEO_FIELDS,
    body,
  );

  if (result.status !== "ok") return result;
  return { status: "ok", data: { ...result.data, videos: result.data.videos ?? [] } };
}

/// Percorre as páginas até atingir o limite ou acabarem os vídeos.
///
/// O teto é obrigatório: uma conta com milhares de vídeos percorrida até o fim
/// estouraria o tempo da função serverless e o rate limit do TikTok.
export async function fetchVideos(
  accessToken: string,
  limit: number,
): Promise<TikTokApiResult<TikTokVideoPayload[]>> {
  const collected: TikTokVideoPayload[] = [];
  let cursor: number | undefined;

  while (collected.length < limit) {
    const remaining = limit - collected.length;
    const page = await fetchVideoPage(accessToken, {
      cursor,
      maxCount: Math.min(remaining, VIDEO_PAGE_MAX),
    });

    if (page.status !== "ok") {
      // Falha no meio da paginação não descarta o que já veio: meia página de
      // vídeos reais vale mais que erro seco, e o sync registra o que obteve.
      if (collected.length > 0) break;
      return page;
    }

    collected.push(...page.data.videos);

    if (!page.data.has_more || !page.data.cursor || page.data.videos.length === 0) break;
    cursor = page.data.cursor;
  }

  return { status: "ok", data: collected.slice(0, limit) };
}

import "server-only";

import { prisma } from "@/lib/db";
import { profileScope } from "@/lib/scoped-db";
import { CONFIDENCE_BY_SOURCE, METRIC_KEYS } from "@/lib/metrics";
import { SYNC_VIDEO_LIMIT } from "@/lib/tiktok/config";
import { getValidAccessToken } from "@/lib/tiktok/connection";
import { fetchUserInfo, type TikTokUserInfo } from "@/lib/tiktok/profile";
import { fetchVideos, type TikTokVideoPayload } from "@/lib/tiktok/videos";
import { normalizeVideos } from "@/lib/tiktok/normalize";
import type { ExternalAccount } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Sincronização: TikTok → normalização → banco.
//
// Roda dentro da requisição, com teto de vídeos. O modelo `Job` existe no
// schema mas nunca teve worker nem cron; montar essa infraestrutura só para
// isto seria a "infraestrutura gigantesca" que o pedido mandou evitar. A
// fronteira fica pronta: quando houver fila, `syncConnection` é o corpo do job
// e nada mais muda.
//
// O ponto mais importante deste arquivo não é gravar vídeo — é o que acontece
// com as métricas de perfil. Seguidores lidos da conta conectada entram como
// `ProfileMetric` com procedência CONNECTED (confiança 0,8) em vez de DECLARED
// (0,3). É isso que faz o motor de matching parar de tratar número digitado e
// número medido como a mesma coisa.
// ---------------------------------------------------------------------------

export type SyncReport = {
  videosFetched: number;
  videosSaved: number;
  profileUpdated: boolean;
  /// Scopes que faltaram para coletar algo — a UI usa para explicar o vazio.
  missingData: string[];
};

export type SyncResult =
  | { status: "ok"; report: SyncReport }
  | { status: "reconnect"; reason: string }
  | { status: "error"; message: string };

export async function syncConnection(
  profileId: string,
  account: ExternalAccount,
): Promise<SyncResult> {
  const token = await getValidAccessToken(profileId, account);
  if (token.status !== "ok") {
    return { status: "reconnect", reason: token.reason };
  }

  const scope = profileScope(profileId);
  await scope.externalAccounts.update(account.id, { syncStatus: "PENDING" });

  const report: SyncReport = {
    videosFetched: 0,
    videosSaved: 0,
    profileUpdated: false,
    missingData: [],
  };

  try {
    // --- Perfil ----------------------------------------------------------
    const info = await fetchUserInfo(token.accessToken, token.scopes);
    if (info.status === "ok") {
      report.profileUpdated = await persistProfile(profileId, account.id, info.data);
    } else if (info.code === "invalid_token") {
      await failSync(profileId, account.id, info.message, "EXPIRED");
      return { status: "reconnect", reason: "A autorização do TikTok expirou." };
    } else {
      report.missingData.push(`perfil: ${info.message}`);
    }

    // --- Vídeos ----------------------------------------------------------
    if (!token.scopes.includes("video.list")) {
      report.missingData.push(
        "vídeos: o scope video.list não foi concedido nesta autorização",
      );
    } else {
      const videos = await fetchVideos(token.accessToken, SYNC_VIDEO_LIMIT);
      if (videos.status === "ok") {
        report.videosFetched = videos.data.length;
        report.videosSaved = await persistVideos(account.id, videos.data);
      } else if (videos.code === "invalid_token") {
        await failSync(profileId, account.id, videos.message, "EXPIRED");
        return { status: "reconnect", reason: "A autorização do TikTok expirou." };
      } else {
        report.missingData.push(`vídeos: ${videos.message}`);
      }
    }

    await scope.externalAccounts.update(account.id, {
      syncStatus: "OK",
      lastSyncedAt: new Date(),
      lastSyncError: report.missingData.length > 0 ? report.missingData.join(" · ") : null,
    });

    return { status: "ok", report };
  } catch (error) {
    console.error("[tiktok] sync falhou", error);
    await failSync(
      profileId,
      account.id,
      error instanceof Error ? error.message : "falha inesperada",
    );
    return { status: "error", message: "A sincronização falhou. Tente de novo em instantes." };
  }
}

async function failSync(
  profileId: string,
  accountId: string,
  message: string,
  status?: "EXPIRED",
) {
  await profileScope(profileId).externalAccounts.update(accountId, {
    syncStatus: "ERROR",
    lastSyncError: message,
    ...(status ? { status } : {}),
  });
}

/// Grava o retrato do perfil em três lugares, cada um com um papel:
///
///   ExternalAccount.metadata — o retrato bruto (username, avatar, bio)
///   ProfileMetric            — a série append-only com procedência CONNECTED
///   CreatorProfile           — o cache de vitrine que as listagens leem
async function persistProfile(
  profileId: string,
  accountId: string,
  info: TikTokUserInfo,
): Promise<boolean> {
  const scope = profileScope(profileId);

  await scope.externalAccounts.update(accountId, {
    metadata: {
      username: info.username ?? null,
      displayName: info.display_name ?? null,
      avatarUrl: info.avatar_url ?? null,
      bio: info.bio_description ?? null,
      profileLink: info.profile_deep_link ?? null,
      isVerified: info.is_verified ?? null,
      capturedAt: new Date().toISOString(),
    } as never,
  });

  const measured: Array<[string, number | undefined, string | null]> = [
    [METRIC_KEYS.followers, info.follower_count, "seguidores"],
    ["following", info.following_count, "seguindo"],
    ["likes_total", info.likes_count, "curtidas"],
    ["video_count", info.video_count, "vídeos"],
  ];

  const present = measured.filter(
    (m): m is [string, number, string | null] => typeof m[1] === "number",
  );
  if (present.length === 0) return false;

  // Série append-only: cada sync é uma leitura nova, nunca um UPDATE. É o que
  // permite ver depois que a conta saiu de 25 mil para 40 mil seguidores — e
  // com que confiança cada número foi obtido.
  await Promise.all(
    present.map(([key, value, unit]) =>
      scope.metrics.record({
        key,
        value: String(value),
        unit,
        source: "CONNECTED",
        confidence: String(CONFIDENCE_BY_SOURCE.CONNECTED),
        calculationMethod: "TikTok Display API /v2/user/info/",
      }),
    ),
  );

  // Cache de vitrine. Só sobrescreve o que veio medido — um scope não concedido
  // não pode zerar o que o creator declarou no cadastro.
  const cache: Record<string, number> = {};
  if (typeof info.follower_count === "number") cache.followersCount = info.follower_count;

  if (Object.keys(cache).length > 0) {
    await prisma.creatorProfile.updateMany({ where: { profileId }, data: cache });
  }

  return true;
}

/// Grava os vídeos, atualizando os que já existem.
///
/// Idempotente pela chave (conexão, videoId): sincronizar de novo atualiza
/// contadores em vez de duplicar linhas. É a mesma regra da ingestão de
/// pedidos por CSV — reimportar não pode inventar histórico.
async function persistVideos(
  externalAccountId: string,
  payloads: TikTokVideoPayload[],
): Promise<number> {
  const videos = normalizeVideos(payloads);
  const fetchedAt = new Date();
  let saved = 0;

  for (const video of videos) {
    const data = {
      title: video.title,
      description: video.description,
      shareUrl: video.shareUrl,
      embedLink: video.embedLink,
      coverImageUrl: video.coverImageUrl,
      durationSeconds: video.durationSeconds,
      publishedAt: video.publishedAt,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      commentCount: video.commentCount,
      shareCount: video.shareCount,
      engagementRate: video.engagementRate === null ? null : String(video.engagementRate),
      fetchedAt,
    };

    await prisma.tikTokVideo.upsert({
      where: { externalAccountId_videoId: { externalAccountId, videoId: video.videoId } },
      create: { externalAccountId, videoId: video.videoId, ...data },
      update: data,
    });
    saved++;
  }

  return saved;
}

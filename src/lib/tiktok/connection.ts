import "server-only";

import { prisma } from "@/lib/db";
import { profileScope } from "@/lib/scoped-db";
import { encryptToken, tryDecryptToken } from "@/lib/tiktok/crypto";
import { isExpired, refreshAccessToken, revokeToken, type TikTokTokens } from "@/lib/tiktok/oauth";
import type { ExternalAccount } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Ciclo de vida da conexão: persistência, refresh e desconexão.
//
// É a única parte do módulo que toca banco. `client.ts` e os endpoints são HTTP
// puro; separar assim é o que permite testar parsing sem subir Postgres, e o
// que mantém o token confinado a um lugar só.
//
// A conexão vive em `ExternalAccount`, que existe desde o Sprint 1 justamente
// para isto (§12 da arquitetura: "ExternalAccount separado do Profile — a
// plataforma não é refém do TikTok"). Não há tabela `tiktok_connection`: o
// matching já lê `ExternalAccount` para decidir se a audiência do creator é
// medida ou declarada, e uma tabela paralela criaria duas verdades sobre a
// mesma pergunta.
// ---------------------------------------------------------------------------

export type ConnectionResult =
  | { status: "ok"; account: ExternalAccount }
  | { status: "taken" }
  | { status: "error"; message: string };

/// Grava a conexão depois do OAuth.
export async function saveConnection(
  profileId: string,
  tokens: TikTokTokens,
  profileSnapshot?: Record<string, unknown>,
): Promise<ConnectionResult> {
  const scope = profileScope(profileId);

  try {
    const account = await scope.externalAccounts.connect("TIKTOK", tokens.openId, {
      accessTokenEncrypted: encryptToken(tokens.accessToken),
      refreshTokenEncrypted: encryptToken(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.grantedScopes,
      status: "ACTIVE",
      syncStatus: "NEVER",
      lastSyncError: null,
      metadata: (profileSnapshot ?? {}) as never,
    });

    if (!account) return { status: "taken" };
    return { status: "ok", account };
  } catch (error) {
    console.error("[tiktok] falha ao salvar conexão", error);
    return { status: "error", message: "Não consegui salvar a conexão." };
  }
}

export function findConnection(profileId: string) {
  return profileScope(profileId).externalAccounts.findByProvider("TIKTOK");
}

export type TokenResult =
  | { status: "ok"; accessToken: string; scopes: string[] }
  | { status: "reconnect"; reason: string };

/// Devolve um access token válido, renovando se necessário.
///
/// O TikTok documenta access token de 24 horas e refresh token de 365 dias, e
/// **o refresh devolve um refresh token novo** — por isso gravamos os dois a
/// cada renovação. Guardar só o access token faria a conexão morrer em um ano
/// sem motivo aparente.
///
/// Qualquer falha vira `reconnect`: pedir ao usuário para reconectar é honesto
/// e resolve, enquanto tentar adivinhar o estado do token não.
export async function getValidAccessToken(
  profileId: string,
  account: ExternalAccount,
): Promise<TokenResult> {
  if (account.status !== "ACTIVE") {
    return { status: "reconnect", reason: "A conexão com o TikTok não está ativa." };
  }

  const accessToken = tryDecryptToken(account.accessTokenEncrypted);

  if (accessToken && !isExpired(account.tokenExpiresAt)) {
    return { status: "ok", accessToken, scopes: account.scopes };
  }

  const refreshToken = tryDecryptToken(account.refreshTokenEncrypted);
  if (!refreshToken) {
    await markExpired(profileId, account.id, "Token ilegível ou chave de criptografia trocada.");
    return { status: "reconnect", reason: "Não consegui ler o token guardado. Reconecte a conta." };
  }

  const refreshed = await refreshAccessToken(refreshToken);
  if (refreshed.status !== "ok") {
    const reason =
      refreshed.status === "not_configured"
        ? "A integração com o TikTok não está configurada."
        : refreshed.message;
    await markExpired(profileId, account.id, reason);
    return { status: "reconnect", reason: "A autorização do TikTok expirou. Reconecte a conta." };
  }

  const scope = profileScope(profileId);
  await scope.externalAccounts.update(account.id, {
    accessTokenEncrypted: encryptToken(refreshed.data.accessToken),
    refreshTokenEncrypted: encryptToken(refreshed.data.refreshToken),
    tokenExpiresAt: refreshed.data.expiresAt,
    scopes: refreshed.data.grantedScopes.length > 0 ? refreshed.data.grantedScopes : account.scopes,
    status: "ACTIVE",
    lastSyncError: null,
  });

  return {
    status: "ok",
    accessToken: refreshed.data.accessToken,
    scopes: refreshed.data.grantedScopes.length > 0 ? refreshed.data.grantedScopes : account.scopes,
  };
}

async function markExpired(profileId: string, accountId: string, reason: string) {
  await profileScope(profileId).externalAccounts.update(accountId, {
    status: "EXPIRED",
    lastSyncError: reason,
  });
}

/// Desconecta a conta.
///
/// Revoga no TikTok quando dá (melhor esforço — se a chamada falhar, a conexão
/// local é encerrada mesmo assim; deixar o usuário preso a algo que ele mandou
/// remover seria pior), apaga os tokens e marca como revogada.
///
/// **Os vídeos já coletados não são apagados.** Apagar histórico é decisão de
/// política de dados, não efeito colateral de um clique — e o creator pode
/// reconectar amanhã. Quando houver política de retenção definida, ela decide.
export async function disconnect(
  profileId: string,
  account: ExternalAccount,
): Promise<{ revokedRemotely: boolean }> {
  let revokedRemotely = false;

  const accessToken = tryDecryptToken(account.accessTokenEncrypted);
  if (accessToken) {
    const result = await revokeToken(accessToken);
    revokedRemotely = result.status === "ok";
    if (!revokedRemotely) {
      console.error("[tiktok] revogação remota falhou; encerrando conexão local mesmo assim");
    }
  }

  await profileScope(profileId).externalAccounts.update(account.id, {
    status: "REVOKED",
    accessTokenEncrypted: null,
    refreshTokenEncrypted: null,
    tokenExpiresAt: null,
    lastSyncError: null,
  });

  return { revokedRemotely };
}

/// Conta quantos vídeos já foram coletados para esta conexão.
///
/// Consulta direta ao Prisma, e não pelo escopo: `TikTokVideo` só é alcançável
/// através de um `ExternalAccount` que o escopo do perfil já resolveu — o
/// filtro de dono está acima, não aqui.
export function countVideos(externalAccountId: string) {
  return prisma.tikTokVideo.count({ where: { externalAccountId } });
}

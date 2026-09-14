import "server-only";

import { prisma } from "@/lib/db";
import { profileScope } from "@/lib/scoped-db";
import { encryptToken, tryDecryptToken } from "@/lib/tiktok/crypto";
import {
  isExpired,
  refreshAccessToken,
  type TikTokShopTokens,
} from "@/lib/tiktok-shop/oauth";
import type { ExternalAccount } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Ciclo de vida da conexão de creator com a Affiliate Creator API.
//
// Espelha `tiktok/connection.ts` (mesmo padrão: persistência, refresh,
// desconexão em um lugar só) com `provider: "TIKTOK_SHOP"` em vez de
// "TIKTOK" — são autorizações diferentes, e o schema já suporta duas linhas
// de ExternalAccount por perfil desde que o provider seja diferente.
//
// A criptografia dos tokens é a mesma de `tiktok/crypto.ts` (mesma
// TOKEN_ENCRYPTION_KEY) — não há razão para duas chaves de criptografia numa
// mesma tabela.
// ---------------------------------------------------------------------------

export type ConnectionResult =
  | { status: "ok"; account: ExternalAccount }
  | { status: "taken" }
  | { status: "error"; message: string };

export async function saveConnection(
  profileId: string,
  tokens: TikTokShopTokens,
  profileSnapshot?: Record<string, unknown>,
): Promise<ConnectionResult> {
  const scope = profileScope(profileId);

  try {
    const account = await scope.externalAccounts.connect("TIKTOK_SHOP", tokens.openId, {
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
    console.error("[tiktok-shop] falha ao salvar conexão", error);
    return { status: "error", message: "Não consegui salvar a conexão." };
  }
}

export function findConnection(profileId: string) {
  return profileScope(profileId).externalAccounts.findByProvider("TIKTOK_SHOP");
}

export type TokenResult =
  | { status: "ok"; accessToken: string; scopes: string[] }
  | { status: "reconnect"; reason: string };

/// Devolve um access token válido, renovando se necessário.
///
/// O token de creator dura 7 dias (contra 24h do Login Kit) — a doc oficial
/// não fala se o refresh devolve um refresh token novo, então gravamos os
/// dois a cada renovação por segurança, igual ao Login Kit já faz.
export async function getValidAccessToken(
  profileId: string,
  account: ExternalAccount,
): Promise<TokenResult> {
  if (account.status !== "ACTIVE") {
    return { status: "reconnect", reason: "A conexão com o TikTok Shop não está ativa." };
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
        ? "A integração com o TikTok Shop não está configurada."
        : refreshed.message;
    await markExpired(profileId, account.id, reason);
    return { status: "reconnect", reason: "A autorização do TikTok Shop expirou. Reconecte a conta." };
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

/// Desconecta a conta. Sem endpoint de revogação documentado para o lado
/// creator (diferente do Login Kit, que tem `/v2/oauth/revoke/`) — a doc
/// oficial só descreve "o creator remove o acesso pelo próprio TikTok". Por
/// isso aqui é só local: apaga os tokens e marca como revogada.
export async function disconnect(profileId: string, account: ExternalAccount): Promise<void> {
  await profileScope(profileId).externalAccounts.update(account.id, {
    status: "REVOKED",
    accessTokenEncrypted: null,
    refreshTokenEncrypted: null,
    tokenExpiresAt: null,
    lastSyncError: null,
  });
}

/// Quantas comissões já vieram da API para este perfil — a UI usa para não
/// mostrar "0 sincronizações" para sempre depois da primeira sincronização
/// sem nenhum pedido elegível.
///
/// Passa por `Commission`, não por `Order`: é onde a atribuição a este creator
/// específico vive, e `Order` não guarda qual `ExternalAccount` trouxe cada
/// pedido — só a origem (`source: "TIKTOK"`).
export function countSyncedOrders(profileId: string) {
  return prisma.commission.count({
    where: { creatorProfile: { profileId }, order: { source: "TIKTOK" } },
  });
}

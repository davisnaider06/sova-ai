"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCreatorScope } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { buildCreatorAuthorizeUrl } from "@/lib/tiktok-shop/oauth";
import { issueState } from "@/lib/tiktok-shop/state";
import { disconnect, findConnection } from "@/lib/tiktok-shop/connection";
import { syncCreatorAffiliateOrders } from "@/lib/integration/tiktok-shop-sync";
import { isTokenEncryptionConfigured } from "@/lib/tiktok/crypto";

// ---------------------------------------------------------------------------
// Ações da conexão de creator com a Affiliate Creator API.
//
// Espelha `tiktok-actions.ts`, com uma diferença de propósito: só um perfil de
// creator pode iniciar esta autorização (é o `user_type=1` da doc oficial) —
// por isso `requireCreatorScope()` em vez de `requireProfile()`.
// ---------------------------------------------------------------------------

const REDIRECT = "/dashboard/configuracoes?aba=integracoes";

export async function startTikTokShopConnect() {
  // A checagem em si é o efeito colateral: só um perfil de creator pode
  // seguir daqui — `requireCreatorScope()` redireciona quem não for.
  await requireCreatorScope();

  if (!isTokenEncryptionConfigured()) {
    redirect(
      `${REDIRECT}&tiktokshop=erro&motivo=` +
        encodeURIComponent("TOKEN_ENCRYPTION_KEY não configurada no servidor."),
    );
  }

  const state = await issueState();
  const url = buildCreatorAuthorizeUrl(state);

  if (url.status !== "ok") {
    redirect(
      `${REDIRECT}&tiktokshop=erro&motivo=` +
        encodeURIComponent("A integração com o TikTok Shop não está configurada neste ambiente."),
    );
  }

  redirect(url.data);
}

export async function syncTikTokShopOrders() {
  const { profile, scope } = await requireCreatorScope();

  const account = await findConnection(profile.id);
  if (!account) {
    redirect(
      `${REDIRECT}&tiktokshop=erro&motivo=` +
        encodeURIComponent("Nenhuma conta do TikTok Shop conectada."),
    );
  }

  const result = await syncCreatorAffiliateOrders(
    profile.id,
    scope.creatorProfileId,
    profile.displayName,
    account,
  );

  revalidatePath("/dashboard/configuracoes");
  // A sincronização pode criar Order/Commission novos, que mudam o histórico
  // usado no matching e os números do dashboard.
  revalidatePath("/dashboard/descobrir", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pedidos");

  if (result.status === "reconnect") {
    redirect(`${REDIRECT}&tiktokshop=erro&motivo=${encodeURIComponent(result.reason)}`);
  }
  if (result.status === "not_configured") {
    redirect(
      `${REDIRECT}&tiktokshop=erro&motivo=` +
        encodeURIComponent("A integração com o TikTok Shop não está configurada neste ambiente."),
    );
  }

  await recordAudit({
    profileId: profile.id,
    action: "TIKTOK_SHOP_SYNCED",
    entityType: "ExternalAccount",
    entityId: account.id,
    metadata: {
      ordersCreated: result.ordersCreated,
      ordersIgnored: result.ordersIgnored,
      gmvCents: result.gmvCents,
    },
  });

  const query = new URLSearchParams({
    tiktokshop: "sincronizado",
    pedidos: String(result.ordersCreated),
  });
  if (result.errors.length > 0) query.set("avisos", String(result.errors.length));

  redirect(`${REDIRECT}&${query.toString()}`);
}

export async function disconnectTikTokShop() {
  const { user, profile } = await requireCreatorScope();

  const account = await findConnection(profile.id);
  if (account) {
    await disconnect(profile.id, account);
    await recordAudit({
      userId: user.id,
      profileId: profile.id,
      action: "TIKTOK_SHOP_DISCONNECTED",
      entityType: "ExternalAccount",
      entityId: account.id,
    });
  }

  revalidatePath("/dashboard/configuracoes");
  revalidatePath("/dashboard/descobrir", "layout");
  redirect(`${REDIRECT}&tiktokshop=desconectado`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { buildAuthorizeUrl } from "@/lib/tiktok/oauth";
import { issueState } from "@/lib/tiktok/state";
import { disconnect, findConnection } from "@/lib/tiktok/connection";
import { syncConnection } from "@/lib/tiktok/sync";
import { isTokenEncryptionConfigured } from "@/lib/tiktok/crypto";

// Ações da integração TikTok.
//
// Nenhuma delas devolve token, nem para a UI nem para o log. O que atravessa a
// fronteira é estado ("conectado", "expirado") e contagem.

/// Começa o fluxo: emite o state, monta a URL e manda o navegador ao TikTok.
export async function startTikTokConnect() {
  await requireProfile();

  // Sem chave de criptografia não dá para guardar o token com segurança. Melhor
  // barrar aqui do que descobrir depois do usuário autorizar — e gravar em
  // claro num campo chamado "Encrypted" não é opção.
  if (!isTokenEncryptionConfigured()) {
    redirect(
      "/dashboard/configuracoes?aba=integracoes&tiktok=erro&motivo=" +
        encodeURIComponent("TOKEN_ENCRYPTION_KEY não configurada no servidor."),
    );
  }

  const state = await issueState();
  const url = buildAuthorizeUrl(state);

  if (url.status !== "ok") {
    redirect(
      "/dashboard/configuracoes?aba=integracoes&tiktok=erro&motivo=" +
        encodeURIComponent("A integração com o TikTok não está configurada neste ambiente."),
    );
  }

  redirect(url.data);
}

export async function syncTikTok() {
  const { profile } = await requireProfile();

  const account = await findConnection(profile.id);
  if (!account) {
    redirect(
      "/dashboard/configuracoes?aba=integracoes&tiktok=erro&motivo=" +
        encodeURIComponent("Nenhuma conta do TikTok conectada."),
    );
  }

  const result = await syncConnection(profile.id, account);

  revalidatePath("/dashboard/configuracoes");
  // O sync muda seguidores e procedência das métricas, que alimentam o match.
  revalidatePath("/dashboard/descobrir", "layout");
  revalidatePath("/dashboard");

  const query =
    result.status === "ok"
      ? `tiktok=sincronizado&videos=${result.report.videosSaved}`
      : `tiktok=erro&motivo=${encodeURIComponent(
          result.status === "reconnect" ? result.reason : result.message,
        )}`;

  redirect(`/dashboard/configuracoes?aba=integracoes&${query}`);
}

export async function disconnectTikTok() {
  const { user, profile } = await requireProfile();

  const account = await findConnection(profile.id);
  if (account) {
    await disconnect(profile.id, account);
    await recordAudit({
      userId: user.id,
      profileId: profile.id,
      action: "TIKTOK_DISCONNECTED",
      entityType: "ExternalAccount",
      entityId: account.id,
    });
  }

  revalidatePath("/dashboard/configuracoes");
  revalidatePath("/dashboard/descobrir", "layout");
  redirect("/dashboard/configuracoes?aba=integracoes&tiktok=desconectado");
}

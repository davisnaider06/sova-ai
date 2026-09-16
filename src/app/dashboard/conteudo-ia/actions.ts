"use server";

import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { Validator } from "@/lib/form";
import { toCents } from "@/lib/money";
import { generateVideoScript, type VideoScript } from "@/lib/ai/video-script";
import { generateCoverImage as generateCoverImageAi } from "@/lib/ai/cover-image";
import { submitCreatorVideo } from "@/lib/ai/creator-video";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Prisma } from "@/generated/prisma";
import type { CoverImageState, ScriptState, VideoGenerationState } from "./contract";

/// Gera o roteiro para um produto que o creator promove.
///
/// A exigência de afiliação ativa é o portão: sem ela qualquer usuário logado
/// dispararia chamadas pagas à API contra qualquer produto do catálogo. Amarrar
/// à afiliação limita o uso ao que faz sentido no domínio e, de quebra, dá ao
/// prompt o contexto real da relação (a taxa que ele de fato recebe).
export async function generateScript(
  _prev: ScriptState,
  formData: FormData,
): Promise<ScriptState> {
  const { scope, common } = await requireCreatorScope();

  // Teto próprio, mais apertado que o geral de sessão: cada chamada aqui é
  // dinheiro de verdade na conta da Anthropic, então o limite é por hora, não
  // por minuto — o objetivo é conter abuso de custo, não throttle de UI.
  const rateLimit = await checkRateLimit("ai-script", scope.creatorProfileId, 15, "1 h");
  if (!rateLimit.allowed) {
    return {
      status: "error",
      message: `Limite de gerações por hora atingido. Tente de novo em ${Math.ceil(rateLimit.retryAfterSeconds / 60)} min.`,
    };
  }

  const v = new Validator(formData);

  const productId = v.id("productId", "Produto");
  const angle = v.optionalText("angle", 300);
  if (!v.ok) return { status: "error", message: "Escolha um produto." };

  const affiliation = await prisma.affiliation.findFirst({
    where: { creatorProfileId: scope.creatorProfileId, productId, status: "ACTIVE" },
    select: {
      commissionRate: true,
      product: {
        select: { name: true, description: true, category: true, price: true },
      },
      creatorProfile: {
        select: { niches: true, followersCount: true },
      },
    },
  });

  if (!affiliation) {
    return {
      status: "error",
      message: "Você precisa de uma afiliação ativa neste produto para gerar o roteiro.",
    };
  }

  const result = await generateVideoScript({
    productName: affiliation.product.name,
    productDescription: affiliation.product.description,
    category: affiliation.product.category,
    priceCents: toCents(affiliation.product.price),
    commissionRate: Number(affiliation.commissionRate.toString()),
    creatorNiches: affiliation.creatorProfile.niches,
    followers: affiliation.creatorProfile.followersCount,
    angle,
  });

  switch (result.status) {
    case "ok":
      await common.events.record("AI_SCRIPT_GENERATED", {
        entityType: "Product",
        entityId: productId,
      });
      return { status: "done", script: result.data, productName: affiliation.product.name };

    case "not_configured":
      return {
        status: "error",
        message:
          "A geração por IA ainda não está configurada. Falta a chave da API da Anthropic.",
      };

    case "refused":
      return { status: "error", message: result.reason };

    case "error":
      return { status: "error", message: result.message };
  }
}

/// Gera a imagem de capa a partir do hook e da primeira cena do roteiro já
/// escrito pelo Claude — por isso os dois vêm do formulário (campos ocultos
/// preenchidos pelo componente cliente), não de uma nova chamada de IA.
///
/// Reconfirma a afiliação como `generateScript`: o formulário não é prova de
/// posse, só o banco é.
export async function generateCoverImage(
  _prev: CoverImageState,
  formData: FormData,
): Promise<CoverImageState> {
  const { scope } = await requireCreatorScope();

  const rateLimit = await checkRateLimit("ai-cover-image", scope.creatorProfileId, 15, "1 h");
  if (!rateLimit.allowed) {
    return {
      status: "error",
      message: `Limite de gerações por hora atingido. Tente de novo em ${Math.ceil(rateLimit.retryAfterSeconds / 60)} min.`,
    };
  }

  const v = new Validator(formData);
  const productId = v.id("productId", "Produto");
  const hook = v.text("hook", "Gancho", { max: 500 });
  const firstSceneAction = v.text("firstSceneAction", "Primeira cena", { max: 500 });
  if (!v.ok) return { status: "error", message: "Gere o roteiro antes da capa." };

  const affiliation = await prisma.affiliation.findFirst({
    where: { creatorProfileId: scope.creatorProfileId, productId, status: "ACTIVE" },
    select: { product: { select: { name: true, description: true, category: true } } },
  });
  if (!affiliation) {
    return { status: "error", message: "Você precisa de uma afiliação ativa neste produto." };
  }

  const result = await generateCoverImageAi({
    productName: affiliation.product.name,
    productDescription: affiliation.product.description,
    category: affiliation.product.category,
    hook,
    firstSceneAction,
  });

  switch (result.status) {
    case "ok":
      return { status: "done", imageBase64: result.data };
    case "not_configured":
      return {
        status: "error",
        message: "A geração de imagem ainda não está configurada. Falta a chave da API da OpenAI.",
      };
    case "refused":
      return { status: "error", message: result.reason };
    case "error":
      return { status: "error", message: result.message };
  }
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // limite da Runway para imagem de personagem

/// Salva a foto do creator para aparecer nos vídeos gerados. Fica no
/// `CreatorProfile`, reaproveitada em toda geração futura — o creator só
/// sobe uma vez.
export async function saveCharacterPhoto(
  _prev: { status: "idle" | "error" | "done"; message?: string },
  formData: FormData,
): Promise<{ status: "idle" | "error" | "done"; message?: string }> {
  const { profile } = await requireCreatorScope();

  const rateLimit = await checkRateLimit("save-character-photo", profile.id, 10, "1 h");
  if (!rateLimit.allowed) {
    return { status: "error", message: "Muitas tentativas. Aguarde um instante e tente de novo." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Escolha uma foto." };
  }
  if (!file.type.startsWith("image/")) {
    return { status: "error", message: "O arquivo precisa ser uma imagem." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { status: "error", message: "A imagem precisa ter até 5 MB." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;

  await prisma.creatorProfile.update({
    where: { profileId: profile.id },
    data: { videoCharacterImage: dataUri },
  });

  return { status: "done" };
}

/// Submete a geração de vídeo (Runway productUgc) usando o roteiro já
/// escrito como direção criativa. Não espera o vídeo ficar pronto — devolve
/// o id do registro para o cliente consultar o status em
/// /api/video-generations/[id].
export async function submitVideo(
  _prev: VideoGenerationState,
  formData: FormData,
): Promise<VideoGenerationState> {
  const { scope } = await requireCreatorScope();

  // Vídeo é a chamada mais cara das três (crédito de verdade na Runway) —
  // teto bem mais apertado, por dia em vez de por hora.
  const rateLimit = await checkRateLimit("ai-video", scope.creatorProfileId, 5, "24 h");
  if (!rateLimit.allowed) {
    return {
      status: "error",
      message: `Limite diário de gerações de vídeo atingido. Tente de novo em ${Math.ceil(rateLimit.retryAfterSeconds / 3600)}h.`,
    };
  }

  const v = new Validator(formData);
  const productId = v.id("productId", "Produto");
  const scriptJson = v.text("script", "Roteiro", { max: 20000 });
  if (!v.ok) return { status: "error", message: "Gere o roteiro antes do vídeo." };

  let script: VideoScript;
  try {
    script = JSON.parse(scriptJson) as VideoScript;
  } catch {
    return { status: "error", message: "Roteiro inválido — gere de novo." };
  }

  const [affiliation, creatorProfile] = await Promise.all([
    prisma.affiliation.findFirst({
      where: { creatorProfileId: scope.creatorProfileId, productId, status: "ACTIVE" },
      select: { product: { select: { name: true, description: true, imageUrl: true } } },
    }),
    prisma.creatorProfile.findUnique({
      where: { id: scope.creatorProfileId },
      select: { videoCharacterImage: true },
    }),
  ]);

  if (!affiliation) {
    return { status: "error", message: "Você precisa de uma afiliação ativa neste produto." };
  }
  if (!affiliation.product.imageUrl) {
    return {
      status: "error",
      message: "Este produto não tem foto cadastrada — peça ao vendedor para adicionar uma.",
    };
  }
  if (!creatorProfile?.videoCharacterImage) {
    return { status: "error", message: "Envie sua foto antes de gerar o vídeo." };
  }

  const result = await submitCreatorVideo({
    characterImage: creatorProfile.videoCharacterImage,
    productImage: affiliation.product.imageUrl,
    productName: affiliation.product.name,
    productDescription: affiliation.product.description,
    script,
  });

  switch (result.status) {
    case "ok": {
      const row = await scope.videoGenerations.create({
        productId,
        status: "RUNNING",
        externalTaskId: result.data.taskId,
        script: script as unknown as Prisma.InputJsonValue,
      });
      return { status: "submitted", id: row.id };
    }
    case "not_configured":
      return {
        status: "error",
        message: "A geração de vídeo ainda não está configurada. Falta a chave da API da Runway.",
      };
    case "error":
      return { status: "error", message: result.message };
  }
}

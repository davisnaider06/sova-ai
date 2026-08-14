"use server";

import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { Validator } from "@/lib/form";
import { toCents } from "@/lib/money";
import { generateVideoScript } from "@/lib/ai/video-script";
import type { ScriptState } from "./contract";

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

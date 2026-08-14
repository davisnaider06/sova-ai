"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSellerScope } from "@/lib/session";
import { Validator } from "@/lib/form";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_OFFER_RATE } from "@/lib/discovery";

/// Seller habilita um creator a promover um produto seu.
///
/// Vai direto para ACTIVE, e não para PENDING: PENDING existe para o pedido que
/// nasce do creator e espera decisão do seller. Quando é o seller que convida,
/// a decisão dele já está tomada — deixar em PENDING criaria uma fila que só
/// ele mesmo poderia aprovar.
export async function enableCreator(formData: FormData) {
  const { scope, common, profile } = await requireSellerScope();
  const v = new Validator(formData);
  const productId = v.id("productId", "Produto");
  const creatorProfileId = v.id("creatorProfileId", "Creator");
  if (!v.ok) throw new Error("Requisição inválida.");

  // Ownership do produto pelo escopo; o creator é público no marketplace.
  const product = await scope.products.findById(productId);
  if (!product) throw new Error("Produto não encontrado.");

  const campaignProduct = await prisma.campaignProduct.findFirst({
    where: { productId, campaign: { status: "ACTIVE", sellerProfileId: scope.sellerProfileId } },
    select: { commissionRate: true, campaign: { select: { commissionRate: true } } },
  });

  const rate =
    campaignProduct?.commissionRate != null
      ? Number(campaignProduct.commissionRate.toString())
      : campaignProduct?.campaign.commissionRate != null
        ? Number(campaignProduct.campaign.commissionRate.toString())
        : DEFAULT_OFFER_RATE;

  await prisma.affiliation.upsert({
    where: { creatorProfileId_productId: { creatorProfileId, productId } },
    create: {
      creatorProfileId,
      productId,
      commissionRate: String(rate),
      status: "ACTIVE",
      startedAt: new Date(),
    },
    update: { status: "ACTIVE", startedAt: new Date(), endedAt: null },
  });

  await common.events.record("CREATOR_ENABLED", {
    entityType: "Product",
    entityId: productId,
    metadata: { creatorProfileId, rate },
  });
  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "CREATOR_ENABLED",
    entityType: "Product",
    entityId: productId,
    metadata: { creatorProfileId, rate },
  });

  revalidatePath("/dashboard/creators");
  revalidatePath("/dashboard/afiliacoes");
  revalidatePath(`/dashboard/produtos/${productId}`);
}

/// Convida um creator para uma campanha. Aqui INVITED faz sentido: o creator
/// precisa aceitar participar de uma iniciativa com prazo e contrapartida.
export async function inviteCreatorToCampaign(formData: FormData) {
  const { scope, common, profile } = await requireSellerScope();
  const v = new Validator(formData);
  const campaignId = v.id("campaignId", "Campanha");
  const creatorProfileId = v.id("creatorProfileId", "Creator");
  if (!v.ok) throw new Error("Requisição inválida.");

  const campaign = await scope.campaigns.findById(campaignId);
  if (!campaign) throw new Error("Campanha não encontrada.");

  await prisma.campaignCreator.upsert({
    where: { campaignId_creatorProfileId: { campaignId, creatorProfileId } },
    create: { campaignId, creatorProfileId, status: "INVITED" },
    update: { status: "INVITED", invitedAt: new Date(), rejectedAt: null },
  });

  await common.events.record("CAMPAIGN_CREATOR_INVITED", {
    entityType: "Campaign",
    entityId: campaignId,
    metadata: { creatorProfileId },
  });
  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "CREATOR_INVITED",
    entityType: "Campaign",
    entityId: campaignId,
    metadata: { creatorProfileId },
  });

  revalidatePath(`/dashboard/campanhas/${campaignId}`);
  revalidatePath("/dashboard/creators");
}

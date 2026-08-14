"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { Validator } from "@/lib/form";
import { recordAudit } from "@/lib/audit";

/// Creator responde a um convite de campanha.
///
/// Aceitar **cria as afiliações** aos produtos da campanha, com a taxa dela.
/// Sem isso o creator aceitaria o convite e continuaria sem poder promover
/// nada — que era exatamente o estado do produto antes desta tela existir: o
/// seller convidava e o convite morria sem destino.
export async function respondToCampaignInvite(formData: FormData) {
  const { scope, profile, common } = await requireCreatorScope();
  const v = new Validator(formData);

  const campaignId = v.id("campaignId", "Campanha");
  const decision = v.oneOf("decision", "Decisão", ["ACCEPT", "REJECT"] as const);
  if (!v.ok) throw new Error("Requisição inválida.");

  const invite = await prisma.campaignCreator.findUnique({
    where: {
      campaignId_creatorProfileId: {
        campaignId,
        creatorProfileId: scope.creatorProfileId,
      },
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          status: true,
          commissionRate: true,
          products: { select: { productId: true, commissionRate: true } },
        },
      },
    },
  });

  if (!invite) throw new Error("Convite não encontrado.");
  if (invite.status !== "INVITED") throw new Error("Este convite já foi respondido.");

  if (decision === "REJECT") {
    await prisma.campaignCreator.update({
      where: { id: invite.id },
      data: { status: "REJECTED", rejectedAt: new Date() },
    });
    await recordAudit({
      userId: profile.userId,
      profileId: profile.id,
      action: "CAMPAIGN_INVITE_REJECTED",
      entityType: "Campaign",
      entityId: campaignId,
    });
    revalidatePath("/dashboard/campanhas");
    return;
  }

  // Campanha encerrada não vira afiliação: aceitar daria ao creator um vínculo
  // com a taxa de uma iniciativa que não está mais de pé.
  if (invite.campaign.status === "ENDED") {
    throw new Error("Esta campanha já foi encerrada.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaignCreator.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    // Uma afiliação por produto da campanha. A taxa segue a precedência do
    // domínio: a do produto dentro da campanha sobrepõe a da campanha.
    for (const cp of invite.campaign.products) {
      const rate = cp.commissionRate ?? invite.campaign.commissionRate;
      if (rate === null) continue;

      await tx.affiliation.upsert({
        where: {
          creatorProfileId_productId: {
            creatorProfileId: scope.creatorProfileId,
            productId: cp.productId,
          },
        },
        create: {
          creatorProfileId: scope.creatorProfileId,
          productId: cp.productId,
          commissionRate: rate,
          status: "ACTIVE",
          startedAt: new Date(),
        },
        // Já existia: a campanha reativa e aplica a taxa dela, que é o
        // incentivo que a campanha está oferecendo.
        update: {
          status: "ACTIVE",
          startedAt: new Date(),
          endedAt: null,
          commissionRate: rate,
        },
      });
    }
  });

  await common.events.record("CAMPAIGN_INVITE_ACCEPTED", {
    entityType: "Campaign",
    entityId: campaignId,
  });
  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "CAMPAIGN_INVITE_ACCEPTED",
    entityType: "Campaign",
    entityId: campaignId,
    metadata: { campaignName: invite.campaign.name, products: invite.campaign.products.length },
  });

  revalidatePath("/dashboard/campanhas");
  revalidatePath("/dashboard/minhas-afiliacoes");
  revalidatePath("/dashboard/descobrir");
}

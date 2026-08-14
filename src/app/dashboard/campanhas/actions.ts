"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSellerScope } from "@/lib/session";
import { Validator, fail, succeed, type ActionState } from "@/lib/form";
import { recordAudit } from "@/lib/audit";
import { toDecimalString } from "@/lib/money";
import { CampaignStatus } from "@/generated/prisma";

const STATUSES = Object.values(CampaignStatus);

function readCampaignForm(formData: FormData) {
  const v = new Validator(formData);
  const startAt = v.optionalText("startAt", 32);
  const endAt = v.optionalText("endAt", 32);

  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;

  if (start && Number.isNaN(start.getTime())) v.errors.startAt = "Data inválida.";
  if (end && Number.isNaN(end.getTime())) v.errors.endAt = "Data inválida.";
  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
    v.errors.endAt = "O fim não pode ser antes do início.";
  }

  return {
    v,
    data: {
      name: v.text("name", "Nome da campanha", { min: 2, max: 120 }),
      description: v.optionalText("description", 2000),
      status: v.oneOf("status", "Status", STATUSES),
      commissionRate: v.percent("commissionRate", "Comissão"),
      targetSales: v.int("targetSales", "Meta de vendas"),
      budget: v.money("budget", "Orçamento"),
      startAt: start,
      endAt: end,
    },
  };
}

export async function createCampaign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { scope, common, profile } = await requireSellerScope();
  const { v, data } = readCampaignForm(formData);
  if (!v.ok) return fail(v.errors, "Confira os campos destacados.");

  const campaign = await scope.campaigns.create({
    name: data.name,
    description: data.description,
    status: data.status,
    commissionRate: data.commissionRate === null ? null : String(data.commissionRate),
    targetSales: data.targetSales,
    budget: data.budget === null ? null : toDecimalString(data.budget),
    startAt: data.startAt,
    endAt: data.endAt,
  });

  await common.events.record("CAMPAIGN_CREATED", {
    entityType: "Campaign",
    entityId: campaign.id,
  });
  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "CAMPAIGN_CREATED",
    entityType: "Campaign",
    entityId: campaign.id,
    metadata: { name: data.name },
  });

  revalidatePath("/dashboard/campanhas");
  redirect(`/dashboard/campanhas/${campaign.id}`);
}

export async function updateCampaign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { scope, profile } = await requireSellerScope();
  const { v, data } = readCampaignForm(formData);
  const id = v.id("id", "Campanha");
  if (!v.ok) return fail(v.errors, "Confira os campos destacados.");

  const { count } = await scope.campaigns.update(id, {
    name: data.name,
    description: data.description,
    status: data.status,
    commissionRate: data.commissionRate === null ? null : String(data.commissionRate),
    targetSales: data.targetSales,
    budget: data.budget === null ? null : toDecimalString(data.budget),
    startAt: data.startAt,
    endAt: data.endAt,
  });
  if (count === 0) return fail({}, "Campanha não encontrada.");

  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "CAMPAIGN_UPDATED",
    entityType: "Campaign",
    entityId: id,
    metadata: { name: data.name, status: data.status },
  });

  revalidatePath("/dashboard/campanhas");
  revalidatePath(`/dashboard/campanhas/${id}`);
  return succeed("Campanha salva.");
}

/// Vincula ou desvincula um produto da campanha.
///
/// Confere o dono dos dois lados antes de escrever: a campanha pelo escopo, o
/// produto por consulta explícita. Sem a segunda checagem daria para pendurar
/// o produto de outro seller numa campanha própria.
export async function toggleCampaignProduct(formData: FormData) {
  const { scope } = await requireSellerScope();
  const v = new Validator(formData);
  const campaignId = v.id("campaignId", "Campanha");
  const productId = v.id("productId", "Produto");
  if (!v.ok) throw new Error("Requisição inválida.");

  const [campaign, product] = await Promise.all([
    scope.campaigns.findById(campaignId),
    scope.products.findById(productId),
  ]);
  if (!campaign || !product) throw new Error("Campanha ou produto não encontrado.");

  const existing = await prisma.campaignProduct.findUnique({
    where: { campaignId_productId: { campaignId, productId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.campaignProduct.delete({ where: { id: existing.id } });
  } else {
    await prisma.campaignProduct.create({ data: { campaignId, productId } });
  }

  revalidatePath(`/dashboard/campanhas/${campaignId}`);
}

export async function setCampaignStatus(formData: FormData) {
  const { scope } = await requireSellerScope();
  const v = new Validator(formData);
  const id = v.id("id", "Campanha");
  const status = v.oneOf("status", "Status", STATUSES);
  if (!v.ok) throw new Error("Requisição inválida.");

  await scope.campaigns.update(id, {
    status,
    ...(status === "ACTIVE" ? { startAt: new Date() } : {}),
    ...(status === "ENDED" ? { endAt: new Date() } : {}),
  });

  revalidatePath("/dashboard/campanhas");
  revalidatePath(`/dashboard/campanhas/${id}`);
}

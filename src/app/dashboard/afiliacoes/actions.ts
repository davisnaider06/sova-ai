"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { requireCreatorScope, requireSellerScope } from "@/lib/session";
import { prisma } from "@/lib/db";
import { analyzeCommission } from "@/lib/commission";
import { TIKTOK_SHOP_BR } from "@/lib/platform-fees";

// ---------------------------------------------------------------------------
// Fluxo de afiliação: o creator pede, o seller aceita.
//
// A `commissionRate` é **congelada no vínculo**, não lida do produto na hora de
// pagar. Se o seller mudar a comissão amanhã, quem já estava afiliado continua
// no que foi combinado — é a mesma regra que o doc aplica a `Commission`
// (registro financeiro é imutável), aplicada uma casa antes.
//
// O par (creator, produto) é único: pedir de novo reativa o mesmo registro em
// vez de criar um segundo. Sem isso, "pedir" viraria um botão que gera lixo.
// ---------------------------------------------------------------------------

export type SimpleResult = { ok: true } | { ok: false; error: string };

/// Comissão que o seller oferece num produto: a recomendada pela margem dele.
/// Sem economia cadastrada não há número defensável, então o pedido fica sem
/// taxa proposta e o seller decide na aprovação.
async function offeredRate(productId: string): Promise<Prisma.Decimal> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { economics: true },
  });
  if (!product?.economics) return new Prisma.Decimal(0);

  const analysis = analyzeCommission({
    price: product.price.toString(),
    productCost: product.economics.productCost.toString(),
    shippingCost: product.economics.shippingCost.toString(),
    operationalCost: product.economics.operationalCost.toString(),
    feeSchedule: TIKTOK_SHOP_BR,
    minimumMargin: product.economics.minimumMargin?.toString() ?? null,
    targetMargin: product.economics.targetMargin?.toString() ?? null,
  });

  const rate = analysis.recommendedRate ?? analysis.maxRate;
  return new Prisma.Decimal(rate ? rate.toString() : 0);
}

// ===========================================================================
// Lado creator
// ===========================================================================

/// Creator pede para promover um produto.
export async function requestAffiliation(productId: string): Promise<SimpleResult> {
  const { scope, common } = await requireCreatorScope();

  // Só produto ATIVO aceita pedido — rascunho e pausado não aparecem para o
  // creator, e um pedido direto por URL não deve furar essa regra.
  const product = await prisma.product.findFirst({
    where: { id: productId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "Produto indisponível para afiliação." };

  const rate = await offeredRate(productId);
  const affiliation = await scope.affiliations.request(productId, rate);

  await common.events.record("affiliation.requested", {
    entityType: "Affiliation",
    entityId: affiliation.id,
    metadata: { productId },
  });

  revalidatePath("/dashboard/descobrir");
  revalidatePath("/dashboard/minhas-afiliacoes");
  return { ok: true };
}

/// Creator encerra a própria afiliação.
export async function endAffiliation(affiliationId: string): Promise<SimpleResult> {
  const { scope, common } = await requireCreatorScope();
  const { count } = await scope.affiliations.end(affiliationId);
  if (count === 0) return { ok: false, error: "Afiliação não encontrada." };

  await common.events.record("affiliation.ended", {
    entityType: "Affiliation",
    entityId: affiliationId,
  });

  revalidatePath("/dashboard/minhas-afiliacoes");
  return { ok: true };
}

// ===========================================================================
// Lado seller
// ===========================================================================

/// Seller aprova o pedido. A taxa vai congelada aqui: o seller pode ajustar o
/// número no momento de aprovar, e o que ele aprovar é o que vale para sempre
/// naquele vínculo.
export async function approveAffiliation(
  affiliationId: string,
  commissionRate?: string,
): Promise<SimpleResult> {
  const { scope, common } = await requireSellerScope();

  const affiliation = await scope.affiliations.findById(affiliationId);
  if (!affiliation) return { ok: false, error: "Afiliação não encontrada." };

  let rate: Prisma.Decimal | undefined;
  if (commissionRate !== undefined && commissionRate.trim() !== "") {
    try {
      // A tela manda percentual ("20"); o banco guarda fração.
      rate = new Prisma.Decimal(commissionRate.replace(",", ".")).div(100).toDecimalPlaces(4);
    } catch {
      return { ok: false, error: "Comissão inválida." };
    }
    if (rate.isNegative() || rate.gte(1)) {
      return { ok: false, error: "Comissão precisa ficar entre 0% e 100%." };
    }
  }

  await prisma.affiliation.updateMany({
    where: { id: affiliationId, product: { sellerProfileId: scope.sellerProfileId } },
    data: {
      status: "ACTIVE",
      startedAt: new Date(),
      endedAt: null,
      ...(rate ? { commissionRate: rate } : {}),
    },
  });

  await common.events.record("affiliation.approved", {
    entityType: "Affiliation",
    entityId: affiliationId,
    metadata: { commissionRate: (rate ?? affiliation.commissionRate).toString() },
  });

  revalidatePath("/dashboard/afiliacoes");
  return { ok: true };
}

export async function rejectAffiliation(affiliationId: string): Promise<SimpleResult> {
  const { scope, common } = await requireSellerScope();
  const { count } = await scope.affiliations.setStatus(affiliationId, "REJECTED");
  if (count === 0) return { ok: false, error: "Afiliação não encontrada." };

  await common.events.record("affiliation.rejected", {
    entityType: "Affiliation",
    entityId: affiliationId,
  });

  revalidatePath("/dashboard/afiliacoes");
  return { ok: true };
}

/// Pausar suspende a divulgação sem apagar o histórico — o vínculo e as
/// comissões já geradas continuam de pé.
export async function pauseAffiliation(affiliationId: string): Promise<SimpleResult> {
  const { scope, common } = await requireSellerScope();
  const { count } = await scope.affiliations.setStatus(affiliationId, "PAUSED");
  if (count === 0) return { ok: false, error: "Afiliação não encontrada." };

  await common.events.record("affiliation.paused", {
    entityType: "Affiliation",
    entityId: affiliationId,
  });

  revalidatePath("/dashboard/afiliacoes");
  return { ok: true };
}

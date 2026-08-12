"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { Validator } from "@/lib/form";
import { DEFAULT_OFFER_RATE } from "@/lib/discovery";

/// Creator pede para promover um produto.
///
/// A taxa **não vem do formulário**. Ela é recalculada aqui a partir do produto
/// e da campanha ativa, porque o cliente poderia postar a taxa que quisesse — e
/// essa taxa é o que vai ser congelada na comissão depois. Preço e comissão são
/// decisão do seller; o creator aceita ou não.
export async function requestAffiliation(formData: FormData) {
  const { scope, common } = await requireCreatorScope();
  const v = new Validator(formData);
  const productId = v.id("productId", "Produto");
  if (!v.ok) throw new Error("Requisição inválida.");

  const product = await prisma.product.findFirst({
    where: { id: productId, status: "ACTIVE" },
    select: {
      id: true,
      campaignProducts: {
        where: { campaign: { status: "ACTIVE" } },
        select: {
          commissionRate: true,
          campaign: { select: { commissionRate: true } },
        },
        take: 1,
      },
    },
  });

  // Produto inativo ou inexistente responde igual: o creator não deveria
  // conseguir descobrir, pelo erro, que um produto existe mas está pausado.
  if (!product) throw new Error("Produto não disponível.");

  const cp = product.campaignProducts[0];
  const rate =
    cp?.commissionRate != null
      ? Number(cp.commissionRate.toString())
      : cp?.campaign.commissionRate != null
        ? Number(cp.campaign.commissionRate.toString())
        : DEFAULT_OFFER_RATE;

  await scope.affiliations.request(productId, String(rate));

  await common.events.record("AFFILIATION_REQUESTED", {
    entityType: "Product",
    entityId: productId,
    metadata: { rate },
  });

  revalidatePath("/dashboard/descobrir");
  revalidatePath("/dashboard/minhas-afiliacoes");
}

/// Creator encerra uma afiliação própria.
export async function endAffiliation(formData: FormData) {
  const { scope } = await requireCreatorScope();
  const v = new Validator(formData);
  const id = v.id("id", "Afiliação");
  if (!v.ok) throw new Error("Requisição inválida.");

  await scope.affiliations.end(id);

  revalidatePath("/dashboard/minhas-afiliacoes");
  revalidatePath("/dashboard/descobrir");
}

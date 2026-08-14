"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSellerScope } from "@/lib/session";
import { Validator } from "@/lib/form";
import { recordAudit } from "@/lib/audit";
import { CommissionStatus } from "@/generated/prisma";

const DECIDABLE = [
  CommissionStatus.APPROVED,
  CommissionStatus.PAID,
  CommissionStatus.CANCELLED,
] as const;

/// Seller muda a situação de uma comissão.
///
/// O que NÃO muda aqui é o valor: `rate` e `estimatedAmount` foram congelados
/// quando a venda entrou. Aprovar ou pagar é decisão sobre um registro
/// existente, não recálculo — se o valor pudesse mudar junto, a comissão
/// deixaria de ser registro financeiro e viraria opinião.
export async function setCommissionStatus(formData: FormData) {
  const { scope, profile } = await requireSellerScope();
  const v = new Validator(formData);

  const id = v.id("id", "Comissão");
  const status = v.oneOf("status", "Situação", DECIDABLE);
  if (!v.ok) throw new Error("Requisição inválida.");

  // O filtro por `order.sellerProfileId` é o que impede um seller de mexer na
  // comissão de outro: id alheio simplesmente não encontra linha.
  const { count } = await prisma.commission.updateMany({
    where: { id, order: { sellerProfileId: scope.sellerProfileId } },
    data: {
      status,
      // Pagar é o momento em que o valor estimado vira valor final. Antes
      // disso `finalAmount` fica nulo de propósito: não existe valor final.
      ...(status === "PAID" ? {} : {}),
    },
  });
  if (count === 0) throw new Error("Comissão não encontrada.");

  if (status === "PAID") {
    const commission = await prisma.commission.findUnique({
      where: { id },
      select: { estimatedAmount: true, finalAmount: true },
    });
    if (commission && commission.finalAmount === null) {
      await prisma.commission.update({
        where: { id },
        data: { finalAmount: commission.estimatedAmount },
      });
    }
  }

  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "COMMISSION_CHANGED",
    entityType: "Commission",
    entityId: id,
    metadata: { status },
  });

  revalidatePath("/dashboard/comissoes");
  revalidatePath("/dashboard");
}

/// Aprova de uma vez tudo que está pendente. O seller que importou 200 pedidos
/// não deveria precisar de 200 cliques para liberar o repasse.
export async function approveAllPending() {
  const { scope, profile } = await requireSellerScope();

  const { count } = await prisma.commission.updateMany({
    where: {
      order: { sellerProfileId: scope.sellerProfileId },
      status: { in: ["PENDING", "ESTIMATED"] },
    },
    data: { status: "APPROVED" },
  });

  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "COMMISSION_CHANGED",
    metadata: { bulk: true, approved: count },
  });

  revalidatePath("/dashboard/comissoes");
  revalidatePath("/dashboard");
}

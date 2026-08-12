"use server";

import { revalidatePath } from "next/cache";
import { requireSellerScope } from "@/lib/session";
import { Validator } from "@/lib/form";
import { AffiliationStatus } from "@/generated/prisma";

// Decisão do seller sobre quem pode promover seus produtos.
//
// `setStatus` do escopo já filtra por `product: { sellerProfileId }`, então um
// id de afiliação de outro seller simplesmente não encontra nada — não há como
// aprovar afiliação alheia nem por POST forjado.

const DECIDABLE = [
  AffiliationStatus.ACTIVE,
  AffiliationStatus.REJECTED,
  AffiliationStatus.PAUSED,
  AffiliationStatus.ENDED,
] as const;

export async function decideAffiliation(formData: FormData) {
  const { scope, common } = await requireSellerScope();
  const v = new Validator(formData);

  const id = v.id("id", "Afiliação");
  const status = v.oneOf("status", "Status", DECIDABLE);
  if (!v.ok) throw new Error("Requisição inválida.");

  const { count } = await scope.affiliations.setStatus(id, status);
  if (count === 0) throw new Error("Afiliação não encontrada.");

  await common.events.record("AFFILIATION_DECIDED", {
    entityType: "Affiliation",
    entityId: id,
    metadata: { status },
  });

  // A decisão muda a listagem de afiliações, o produto e a visão geral —
  // revalidar os três evita o seller aprovar e continuar vendo "pendente".
  revalidatePath("/dashboard/afiliacoes");
  revalidatePath("/dashboard/produtos", "layout");
  revalidatePath("/dashboard");
}

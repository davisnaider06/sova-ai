"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type { ActionState } from "@/lib/form";

// Ações do painel de administração.
//
// Toda função abre com `requireAdmin()`. Server Actions são alcançáveis por
// POST direto, então a checagem tem que estar dentro de cada uma — não basta a
// página ser restrita.

export async function setUserRole(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (role !== "ADMIN" && role !== "MEMBER") {
    return { status: "error", message: "Papel inválido.", errors: {} };
  }

  // Um admin não pode se rebaixar: se for o único, a plataforma fica sem
  // ninguém capaz de promover outro, e a saída seria editar o banco à mão.
  if (userId === admin.id && role === "MEMBER") {
    return {
      status: "error",
      message: "Você não pode remover o próprio acesso de administrador.",
      errors: {},
    };
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!target) return { status: "error", message: "Usuário não encontrado.", errors: {} };

  await prisma.user.update({ where: { id: userId }, data: { role } });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: role === "ADMIN" ? "ADMIN_GRANTED" : "ADMIN_REVOKED",
      entityType: "User",
      entityId: userId,
      metadata: { targetEmail: target.email },
    },
  });

  revalidatePath("/dashboard/admin");
  return {
    status: "success",
    message: role === "ADMIN" ? `${target.email} agora é administrador.` : `${target.email} voltou a ser membro.`,
  };
}

/// Libera ou revoga acesso na mão, sem passar pelo gateway.
///
/// Existe para os casos que o webhook não cobre: cortesia, teste, cliente que
/// pagou por fora, ou um pagamento que travou e o cliente não pode esperar.
/// Fica registrado no audit log porque liberar acesso de graça é decisão que
/// alguém vai querer auditar depois.
export async function setManualAccess(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const grant = String(formData.get("grant") ?? "") === "1";

  if (!email.includes("@")) {
    return { status: "error", message: "Informe um e-mail válido.", errors: {} };
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (grant) {
    await prisma.subscription.upsert({
      where: { email },
      create: {
        email,
        userId: user?.id ?? null,
        provider: "MANUAL",
        status: "ACTIVE",
        planName: "Liberação manual",
        startedAt: new Date(),
      },
      update: { status: "ACTIVE", canceledAt: null, currentPeriodEnd: null },
    });
  } else {
    const existing = await prisma.subscription.findUnique({ where: { email } });
    if (!existing) {
      return { status: "error", message: "Não há assinatura para este e-mail.", errors: {} };
    }
    await prisma.subscription.update({ where: { email }, data: { status: "EXPIRED" } });
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: grant ? "ACCESS_GRANTED_MANUALLY" : "ACCESS_REVOKED_MANUALLY",
      entityType: "Subscription",
      metadata: { email },
    },
  });

  revalidatePath("/dashboard/admin");
  return {
    status: "success",
    message: grant ? `Acesso liberado para ${email}.` : `Acesso revogado para ${email}.`,
  };
}

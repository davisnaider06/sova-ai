import "server-only";

import { prisma } from "@/lib/db";
import type { Subscription, User } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Quem pode entrar.
//
// O fluxo é o mesmo de qualquer SaaS por assinatura: a pessoa paga no gateway,
// depois cria a conta. Como as duas coisas acontecem em sistemas diferentes, o
// que amarra as pontas é o **e-mail** — o mesmo que ela usou no checkout.
//
// A regra de acesso mora aqui inteira, e não espalhada por página, porque
// "quem pode ver isso" é a pergunta mais cara de responder errado.
// ---------------------------------------------------------------------------

/// E-mails que entram como administradores, vindos do ambiente.
///
/// É só o *bootstrap*: sem isto o primeiro admin teria que ser criado editando
/// o banco à mão. Depois de existir um admin, ele promove os outros pela tela,
/// e o papel real vive em `User.role`.
export function adminEmailsFromEnv(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isBootstrapAdmin(email: string): boolean {
  return adminEmailsFromEnv().includes(email.trim().toLowerCase());
}

export type AccessState =
  | { allowed: true; reason: "admin" | "subscription" }
  | { allowed: false; reason: "no_subscription" | "expired" };

/// Decide se a conta pode usar a plataforma.
///
/// Admin passa sempre, de propósito: o dono não pode ficar trancado fora do
/// próprio produto porque o gateway oscilou ou porque o webhook atrasou.
///
/// Assinatura cancelada **continua valendo até o fim do período pago** — quem
/// pagou o mês tem direito ao mês. Só `EXPIRED`, ou uma data de fim já passada,
/// fecham a porta.
export function evaluateAccess(
  user: Pick<User, "role">,
  subscription: Subscription | null,
): AccessState {
  if (user.role === "ADMIN") return { allowed: true, reason: "admin" };
  if (!subscription) return { allowed: false, reason: "no_subscription" };
  if (subscription.status === "EXPIRED") return { allowed: false, reason: "expired" };

  const end = subscription.currentPeriodEnd;
  if (end && end.getTime() < Date.now()) return { allowed: false, reason: "expired" };

  return { allowed: true, reason: "subscription" };
}

/// Amarra uma assinatura já paga à conta recém-criada.
///
/// Chamado quando o usuário aparece pela primeira vez. Se ele pagou antes de se
/// cadastrar — a ordem normal — a assinatura já está no banco esperando, com o
/// `userId` nulo, e é aqui que ela ganha dono.
export async function linkSubscriptionByEmail(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();

  const orphan = await prisma.subscription.findFirst({
    where: { email: normalized, userId: null },
    select: { id: true },
  });
  if (!orphan) return null;

  return prisma.subscription.update({
    where: { id: orphan.id },
    data: { userId },
  });
}

export function findSubscriptionForUser(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

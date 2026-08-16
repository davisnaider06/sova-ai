import "server-only";

import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { creatorScope, profileScope, sellerScope } from "@/lib/scoped-db";
import { evaluateAccess, isBootstrapAdmin, linkSubscriptionByEmail } from "@/lib/subscription";
import type {
  CreatorProfile,
  Profile,
  ProfileType,
  SellerProfile,
  Subscription,
  User,
} from "@/generated/prisma";

// ---------------------------------------------------------------------------
// A ponte entre a sessão do Clerk e a identidade no nosso banco.
//
// O Clerk é dono da autenticação; o banco é dono do domínio. Toda página e
// server action deve entrar por aqui — nunca por `auth()` direto — porque é
// aqui que a sessão vira um Profile, e Profile é a âncora de todo o modelo.
//
// **Sobre desempenho.** Antes, uma navegação fazia quatro idas ao banco antes
// de renderizar o primeiro pixel: usuário, vínculo de assinatura, assinatura, e
// o perfil especializado. Sequenciais, e com o banco em São Paulo, cada uma
// custava um round trip inteiro.
//
// Agora é **uma consulta só**, trazendo tudo junto, embrulhada em `cache()` do
// React — que memoriza por requisição. Chamar `requireSellerScope()` depois de
// o layout já ter chamado `requireProfile()` custa zero: é o mesmo objeto.
// ---------------------------------------------------------------------------

export type SessionProfile = Profile & {
  creatorProfile: CreatorProfile | null;
  sellerProfile: SellerProfile | null;
};

export type SessionUser = User & {
  profiles: SessionProfile[];
  subscription: Subscription | null;
};

/// Tudo que a sessão precisa, numa única viagem ao banco.
const SESSION_INCLUDE = {
  profiles: { include: { creatorProfile: true, sellerProfile: true } },
  subscription: true,
} as const;

/// Garante que o usuário do Clerk existe no banco.
///
/// O webhook (`/api/webhooks/clerk`) é o caminho normal, mas ele depende de um
/// túnel público — em dev, sem ngrok, ele nunca chega. Sem esse fallback o
/// usuário logaria no Clerk e cairia num app que não sabe quem ele é. Com ele,
/// o webhook vira consistência (updates, deletes), não pré-requisito.
export const ensureUser = cache(async (): Promise<SessionUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: SESSION_INCLUDE,
  });

  if (existing) {
    // As duas correções abaixo são raras — só acontecem uma vez na vida de cada
    // conta. Ficam atrás de condições justamente para não custarem uma ida ao
    // banco em toda navegação, que era o caso antes.
    const precisaVincular = !existing.subscription;
    const precisaPromover = existing.role !== "ADMIN" && isBootstrapAdmin(existing.email);

    if (!precisaVincular && !precisaPromover) return existing;

    // A conta pode ter nascido antes de o pagamento cair. Se existe uma
    // assinatura órfã com este e-mail, é aqui que ela ganha dono.
    if (precisaVincular) await linkSubscriptionByEmail(existing.id, existing.email);

    if (precisaPromover) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    }

    return prisma.user.findUnique({ where: { id: userId }, include: SESSION_INCLUDE });
  }

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const created = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: clerkUser.imageUrl || null,
      // Bootstrap do administrador pelo ambiente. Sem isto, o primeiro admin
      // teria que ser criado editando o banco na mão.
      role: isBootstrapAdmin(email) ? "ADMIN" : "MEMBER",
    },
    include: SESSION_INCLUDE,
  });

  await linkSubscriptionByEmail(created.id, created.email);
  return prisma.user.findUnique({ where: { id: userId }, include: SESSION_INCLUDE });
});

export async function requireUser(): Promise<SessionUser> {
  const user = await ensureUser();
  if (!user) redirect("/login");
  return user;
}

/// Exige assinatura ativa (ou papel de admin) para seguir.
///
/// É o portão do produto pago. Quem não tem vai para `/assinatura`, que explica
/// a situação e leva ao checkout — em vez de um 403 seco, que só faria o
/// cliente que acabou de pagar achar que perdeu o dinheiro.
export async function requireSubscribedUser(): Promise<SessionUser> {
  const user = await requireUser();

  // A assinatura já veio junto do usuário — sem consulta extra aqui.
  if (!evaluateAccess(user, user.subscription).allowed) {
    redirect("/assinatura");
  }
  return user;
}

/// Exige papel de administrador. Usada pelas telas de faturamento e usuários.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/// O perfil ativo no switcher. Cai no primeiro perfil quando `activeProfileId`
/// aponta para nada — é o caso de quem acabou de criar o segundo papel, ou de
/// um perfil removido.
export function resolveActiveProfile(user: SessionUser): SessionProfile | null {
  if (user.profiles.length === 0) return null;
  return user.profiles.find((p) => p.id === user.activeProfileId) ?? user.profiles[0];
}

/// Usuário autenticado que ainda não escolheu papel vai para o onboarding.
/// Sem perfil não existe nada para mostrar: todo dado do domínio pendura em Profile.
///
/// A checagem de assinatura vem antes da de perfil, e a ordem importa: quem não
/// pagou não deveria nem passar pelo onboarding, senão preenche um cadastro
/// inteiro para descobrir no fim que não tem acesso.
export async function requireProfile(): Promise<{ user: SessionUser; profile: SessionProfile }> {
  const user = await requireSubscribedUser();
  const profile = resolveActiveProfile(user);
  if (!profile) redirect("/onboarding");
  return { user, profile };
}

export async function requireProfileOfType(type: ProfileType) {
  const { user, profile } = await requireProfile();
  if (profile.type !== type) {
    const other = user.profiles.find((p) => p.type === type);
    if (!other) redirect("/onboarding");
    return { user, profile: other };
  }
  return { user, profile };
}

/// Escopo de seller da sessão, pronto para consultar. Falha alto se o perfil
/// existir sem a linha de SellerProfile — isso seria dado inconsistente, não
/// um estado válido que a UI deva tentar renderizar.
export async function requireSellerScope() {
  const { user, profile } = await requireProfileOfType("SELLER");
  // Já veio no include da sessão — nenhuma consulta a mais.
  const seller = profile.sellerProfile;
  if (!seller) throw new Error(`Profile ${profile.id} é SELLER mas não tem SellerProfile.`);
  return { user, profile, scope: sellerScope(seller.id), common: profileScope(profile.id) };
}

export async function requireCreatorScope() {
  const { user, profile } = await requireProfileOfType("CREATOR");
  const creator = profile.creatorProfile;
  if (!creator) throw new Error(`Profile ${profile.id} é CREATOR mas não tem CreatorProfile.`);
  return { user, profile, scope: creatorScope(creator.id), common: profileScope(profile.id) };
}

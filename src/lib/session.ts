import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { creatorScope, profileScope, sellerScope } from "@/lib/scoped-db";
import type { Profile, ProfileType, User } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// A ponte entre a sessão do Clerk e a identidade no nosso banco.
//
// O Clerk é dono da autenticação; o banco é dono do domínio. Toda página e
// server action deve entrar por aqui — nunca por `auth()` direto — porque é
// aqui que a sessão vira um Profile, e Profile é a âncora de todo o modelo.
// ---------------------------------------------------------------------------

export type SessionUser = User & { profiles: Profile[] };

/// Garante que o usuário do Clerk existe no banco.
///
/// O webhook (`/api/webhooks/clerk`) é o caminho normal, mas ele depende de um
/// túnel público — em dev, sem ngrok, ele nunca chega. Sem esse fallback o
/// usuário logaria no Clerk e cairia num app que não sabe quem ele é. Com ele,
/// o webhook vira consistência (updates, deletes), não pré-requisito.
export async function ensureUser(): Promise<SessionUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { profiles: true },
  });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: clerkUser.imageUrl || null,
    },
    include: { profiles: true },
  });
}

export async function requireUser(): Promise<SessionUser> {
  const user = await ensureUser();
  if (!user) redirect("/login");
  return user;
}

/// O perfil ativo no switcher. Cai no primeiro perfil quando `activeProfileId`
/// aponta para nada — é o caso de quem acabou de criar o segundo papel, ou de
/// um perfil removido.
export function resolveActiveProfile(user: SessionUser): Profile | null {
  if (user.profiles.length === 0) return null;
  return user.profiles.find((p) => p.id === user.activeProfileId) ?? user.profiles[0];
}

/// Usuário autenticado que ainda não escolheu papel vai para o onboarding.
/// Sem perfil não existe nada para mostrar: todo dado do domínio pendura em Profile.
export async function requireProfile(): Promise<{ user: SessionUser; profile: Profile }> {
  const user = await requireUser();
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
  const seller = await prisma.sellerProfile.findUnique({ where: { profileId: profile.id } });
  if (!seller) throw new Error(`Profile ${profile.id} é SELLER mas não tem SellerProfile.`);
  return { user, profile, scope: sellerScope(seller.id), common: profileScope(profile.id) };
}

export async function requireCreatorScope() {
  const { user, profile } = await requireProfileOfType("CREATOR");
  const creator = await prisma.creatorProfile.findUnique({ where: { profileId: profile.id } });
  if (!creator) throw new Error(`Profile ${profile.id} é CREATOR mas não tem CreatorProfile.`);
  return { user, profile, scope: creatorScope(creator.id), common: profileScope(profile.id) };
}

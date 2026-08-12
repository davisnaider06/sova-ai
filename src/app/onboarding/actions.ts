"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { ProfileType } from "@/generated/prisma";

// Server Actions são alcançáveis por POST direto, não só pela nossa UI — por
// isso toda função aqui começa autenticando e valida a entrada, em vez de
// confiar no que o formulário mandou.

function parseProfileType(value: FormDataEntryValue | null): ProfileType {
  if (value === "CREATOR" || value === "SELLER") return value;
  throw new Error(`Papel inválido: ${String(value)}`);
}

/// Escolha inicial de papel (§5 da arquitetura). Cria o Profile e o perfil
/// especializado, e marca como ativo.
///
/// Não é limitação permanente: o mesmo usuário pode adicionar o outro papel
/// depois, e o switcher alterna entre eles. Por isso o papel vive em Profile,
/// nunca como uma coluna `role` no User.
export async function chooseRole(formData: FormData) {
  const user = await requireUser();
  const type = parseProfileType(formData.get("type"));

  const alreadyHad = user.profiles.some((p) => p.type === type);
  const displayName = user.name?.trim() || user.email.split("@")[0];

  // Upsert em vez de create: duplo clique no botão não deve estourar a
  // constraint (userId, type) na cara do usuário.
  const profile = await prisma.profile.upsert({
    where: { userId_type: { userId: user.id, type } },
    update: {},
    create: {
      userId: user.id,
      type,
      displayName,
      ...(type === "CREATOR"
        ? { creatorProfile: { create: {} } }
        : { sellerProfile: { create: {} } }),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { activeProfileId: profile.id },
  });

  if (!alreadyHad) {
    await prisma.event.create({
      data: {
        profileId: profile.id,
        eventType: "PROFILE_CREATED",
        entityType: "Profile",
        entityId: profile.id,
        metadata: { type },
      },
    });
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/// Troca o perfil ativo. Só aceita perfis do próprio usuário — o id vem do
/// formulário, e o formulário vem do cliente.
export async function switchProfile(formData: FormData) {
  const user = await requireUser();
  const profileId = String(formData.get("profileId") ?? "");

  const owned = user.profiles.some((p) => p.id === profileId);
  if (!owned) throw new Error("Perfil não pertence a este usuário.");

  await prisma.user.update({
    where: { id: user.id },
    data: { activeProfileId: profileId },
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

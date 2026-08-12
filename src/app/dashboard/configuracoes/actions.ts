"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireProfile, requireCreatorScope, requireSellerScope } from "@/lib/session";
import { CATEGORIES } from "@/lib/categories";
import { Validator, fail, succeed, type ActionState } from "@/lib/form";
import { CONFIDENCE_BY_SOURCE, METRIC_KEYS } from "@/lib/metrics";

/// Perfil do creator.
///
/// O ponto sutil está nas métricas: seguidores e views digitados aqui **não
/// são a verdade**, são uma declaração. Por isso cada um vira uma linha em
/// ProfileMetric com source=DECLARED e a confiança baixa que esse tipo de fonte
/// merece — e só depois é copiado para CreatorProfile, que é cache de vitrine.
///
/// Sem isso, o número digitado ficaria indistinguível de um número vindo do
/// OAuth, e o matching trataria os dois como iguais.
export async function saveCreatorProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { profile, common } = await requireCreatorScope();
  const v = new Validator(formData);

  const displayName = v.text("displayName", "Nome público", { min: 2, max: 80 });
  const bio = v.optionalText("bio", 600);
  const niches = v.many("niches", CATEGORIES);
  const followers = v.int("followersCount", "Seguidores");
  const averageViews = v.int("averageViews", "Views por vídeo");
  const engagementRate = v.percent("engagementRate", "Engajamento", { max: 100 });

  if (niches.length === 0) {
    v.errors.niches = "Escolha pelo menos um nicho — é o que liga você aos produtos certos.";
  }
  if (!v.ok) return fail(v.errors, "Confira os campos destacados.");

  const creator = await prisma.creatorProfile.update({
    where: { profileId: profile.id },
    data: {
      bio,
      niches,
      followersCount: followers,
      averageViews,
      engagementRate: engagementRate === null ? null : String(engagementRate),
    },
  });

  await prisma.profile.update({
    where: { id: profile.id },
    data: { displayName },
  });

  // Série append-only: cada salvamento é uma leitura nova, nunca um UPDATE.
  // É o que permite ver depois que o creator declarou 25k em agosto e 40k em
  // outubro — e desconfiar do salto.
  const declared: Array<[string, number | null, string | null]> = [
    [METRIC_KEYS.followers, followers, "seguidores"],
    [METRIC_KEYS.averageViews, averageViews, "views"],
    [METRIC_KEYS.engagementRate, engagementRate, null],
  ];

  await Promise.all(
    declared
      .filter(([, value]) => value !== null)
      .map(([key, value, unit]) =>
        common.metrics.record({
          key,
          value: String(value),
          unit,
          source: "DECLARED",
          confidence: String(CONFIDENCE_BY_SOURCE.DECLARED),
          calculationMethod: "informado no perfil",
        }),
      ),
  );

  revalidatePath("/dashboard/configuracoes");
  revalidatePath("/dashboard", "layout");
  return succeed(
    creator.niches.length > 0
      ? "Perfil salvo. Seus matches já usam esses nichos."
      : "Perfil salvo.",
  );
}

export async function saveSellerProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { profile } = await requireSellerScope();
  const v = new Validator(formData);

  const displayName = v.text("displayName", "Nome público", { min: 2, max: 80 });
  const companyName = v.optionalText("companyName", 120);
  const document = v.optionalText("document", 32);
  const businessType = v.optionalText("businessType", 80);

  if (!v.ok) return fail(v.errors, "Confira os campos destacados.");

  await prisma.sellerProfile.update({
    where: { profileId: profile.id },
    data: { companyName, document, businessType },
  });

  await prisma.profile.update({
    where: { id: profile.id },
    data: { displayName },
  });

  revalidatePath("/dashboard/configuracoes");
  revalidatePath("/dashboard", "layout");
  return succeed("Perfil salvo.");
}

/// Nome exibido, para quem ainda não tem perfil especializado preenchido.
export async function saveDisplayName(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { profile } = await requireProfile();
  const v = new Validator(formData);
  const displayName = v.text("displayName", "Nome público", { min: 2, max: 80 });
  if (!v.ok) return fail(v.errors);

  await prisma.profile.update({ where: { id: profile.id }, data: { displayName } });
  revalidatePath("/dashboard", "layout");
  return succeed("Nome atualizado.");
}

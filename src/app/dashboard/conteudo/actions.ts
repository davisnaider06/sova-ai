"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreatorScope } from "@/lib/session";
import { Validator, fail, succeed, type ActionState } from "@/lib/form";
import { ContentType } from "@/generated/prisma";

const TYPES = Object.values(ContentType);

/// Creator registra um conteúdo publicado.
///
/// Isto não é um álbum de links: a data de publicação é o que a atribuição usa
/// para decidir de quem é a venda dentro da janela. Um creator que não registra
/// o conteúdo depende de ser o único afiliado ativo para receber a comissão.
export async function saveContent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { scope, common } = await requireCreatorScope();
  const v = new Validator(formData);

  const productId = v.id("productId", "Produto");
  const url = v.url("url");
  const title = v.optionalText("title", 160);
  const contentType = v.oneOf("contentType", "Tipo", TYPES);
  const publishedRaw = v.optionalText("publishedAt", 32);

  if (!url) v.errors.url = "Cole o link do seu vídeo ou post.";

  const publishedAt = publishedRaw ? new Date(publishedRaw) : new Date();
  if (Number.isNaN(publishedAt.getTime())) {
    v.errors.publishedAt = "Data inválida.";
  } else if (publishedAt.getTime() > Date.now() + 86_400_000) {
    v.errors.publishedAt = "A data de publicação não pode estar no futuro.";
  }

  if (!v.ok) return fail(v.errors, "Confira os campos destacados.");

  // Só produtos em que o creator tem afiliação viva: registrar conteúdo de um
  // produto que ele não promove criaria um candidato de atribuição inválido.
  const affiliation = await scope.affiliations.findMany({
    where: { productId, status: { in: ["ACTIVE", "PAUSED"] } },
    take: 1,
  });
  if (affiliation.length === 0) {
    return fail(
      { productId: "Você não tem afiliação ativa neste produto." },
      "Peça a afiliação antes de registrar o conteúdo.",
    );
  }

  const content = await scope.contents.create({
    productId,
    url,
    title,
    contentType,
    publishedAt,
    source: "MANUAL",
  });

  await common.events.record("CONTENT_REGISTERED", {
    entityType: "Content",
    entityId: content.id,
    metadata: { productId },
  });

  revalidatePath("/dashboard/conteudo");
  return succeed("Conteúdo registrado. Ele já conta na atribuição das próximas vendas.");
}

export async function deleteContent(formData: FormData) {
  const { scope } = await requireCreatorScope();
  const v = new Validator(formData);
  const id = v.id("id", "Conteúdo");
  if (!v.ok) throw new Error("Requisição inválida.");

  // deleteMany com o filtro do creator: id de outro creator simplesmente não
  // encontra nada, em vez de apagar.
  await prisma.content.deleteMany({ where: { id, creatorProfileId: scope.creatorProfileId } });
  revalidatePath("/dashboard/conteudo");
}

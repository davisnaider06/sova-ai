"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { requireSellerScope } from "@/lib/session";
import { isValidCategory } from "@/lib/categories";

// ---------------------------------------------------------------------------
// Server actions do cadastro de produto.
//
// Toda ação entra por `requireSellerScope()`: é ele que resolve a sessão do
// Clerk num SellerProfile e devolve o escopo já filtrado. Nenhuma destas
// funções toca o `prisma` direto — se tocasse, o filtro de dono viraria
// responsabilidade de quem escreve a feature, que é exatamente o erro que a
// camada escopada existe para tornar impossível.
// ---------------------------------------------------------------------------

export type ActionResult =
  | { ok: true; productId: string }
  | { ok: false; errors: Record<string, string> };

/// Lê um campo de dinheiro do formulário aceitando o formato brasileiro.
/// Devolve null quando vazio — que é diferente de zero.
function parseMoney(raw: FormDataEntryValue | null): Prisma.Decimal | null {
  if (raw === null) return null;
  const text = String(raw).trim().replace(/\./g, "").replace(",", ".");
  if (text === "") return null;
  try {
    const value = new Prisma.Decimal(text);
    return value.isNegative() ? null : value;
  } catch {
    return null;
  }
}

/// Percentual digitado como "15" ou "15,5" vira a fração 0.15 / 0.155 que o
/// schema guarda em Decimal(5,4).
function parsePercent(raw: FormDataEntryValue | null): Prisma.Decimal | null {
  const value = parseMoney(raw);
  if (value === null) return null;
  return value.div(100).toDecimalPlaces(4);
}

function readProductFields(formData: FormData) {
  const errors: Record<string, string> = {};

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) errors.name = "Dê um nome ao produto.";
  if (name.length > 200) errors.name = "Nome muito longo (máximo 200 caracteres).";

  const category = String(formData.get("category") ?? "").trim();
  if (!category) errors.category = "Escolha uma categoria.";
  else if (!isValidCategory(category)) errors.category = "Categoria inválida.";

  const price = parseMoney(formData.get("price"));
  if (price === null) errors.price = "Informe o preço de venda.";
  else if (price.isZero()) errors.price = "O preço precisa ser maior que zero.";

  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();

  const stockRaw = String(formData.get("stockQuantity") ?? "").trim();
  const stockQuantity = stockRaw === "" ? null : Number.parseInt(stockRaw, 10);
  if (stockQuantity !== null && (Number.isNaN(stockQuantity) || stockQuantity < 0)) {
    errors.stockQuantity = "Estoque precisa ser um número inteiro.";
  }

  const statusRaw = String(formData.get("status") ?? "DRAFT");
  const status = (["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const).includes(
    statusRaw as never,
  )
    ? (statusRaw as "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED")
    : "DRAFT";

  return {
    errors,
    data: {
      name,
      category,
      price: price ?? new Prisma.Decimal(0),
      description: description || null,
      imageUrl: imageUrl || null,
      stockQuantity,
      status,
    },
  };
}

/// Campos de economia. São todos opcionais: o seller cadastra o produto agora
/// e preenche os custos depois, quando for calcular a comissão.
function readEconomicsFields(formData: FormData) {
  const productCost = parseMoney(formData.get("productCost"));
  if (productCost === null) return null;

  return {
    productCost,
    shippingCost: parseMoney(formData.get("shippingCost")) ?? new Prisma.Decimal(0),
    platformFee: parseMoney(formData.get("platformFee")) ?? new Prisma.Decimal(0),
    operationalCost: parseMoney(formData.get("operationalCost")) ?? new Prisma.Decimal(0),
    minimumMargin: parsePercent(formData.get("minimumMargin")),
    targetMargin: parsePercent(formData.get("targetMargin")),
  };
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const { scope, common } = await requireSellerScope();
  const { errors, data } = readProductFields(formData);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const product = await scope.products.create(data);

  const economics = readEconomicsFields(formData);
  if (economics) await scope.products.setEconomics(product.id, economics);

  await common.events.record("product.created", {
    entityType: "Product",
    entityId: product.id,
    metadata: { name: product.name, category: product.category },
  });

  revalidatePath("/dashboard/produtos");
  return { ok: true, productId: product.id };
}

export async function updateProduct(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { scope, common } = await requireSellerScope();
  const { errors, data } = readProductFields(formData);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // updateMany devolve count 0 tanto para "não existe" quanto para "não é seu",
  // e o chamador não consegue distinguir — que é o comportamento desejado.
  const { count } = await scope.products.update(productId, data);
  if (count === 0) return { ok: false, errors: { _: "Produto não encontrado." } };

  const economics = readEconomicsFields(formData);
  if (economics) await scope.products.setEconomics(productId, economics);

  await common.events.record("product.updated", {
    entityType: "Product",
    entityId: productId,
  });

  revalidatePath("/dashboard/produtos");
  revalidatePath(`/dashboard/produtos/${productId}`);
  return { ok: true, productId };
}

export async function deleteProduct(productId: string): Promise<void> {
  const { scope, common } = await requireSellerScope();
  const { count } = await scope.products.delete(productId);

  if (count > 0) {
    await common.events.record("product.deleted", {
      entityType: "Product",
      entityId: productId,
    });
  }

  revalidatePath("/dashboard/produtos");
  redirect("/dashboard/produtos");
}

/// Salva só a economia, a partir da tela da calculadora.
export async function saveEconomics(
  productId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const { scope } = await requireSellerScope();
  const economics = readEconomicsFields(formData);
  if (!economics) return { ok: false, error: "Informe ao menos o custo do produto." };

  const saved = await scope.products.setEconomics(productId, economics);
  if (!saved) return { ok: false, error: "Produto não encontrado." };

  revalidatePath(`/dashboard/produtos/${productId}`);
  return { ok: true };
}

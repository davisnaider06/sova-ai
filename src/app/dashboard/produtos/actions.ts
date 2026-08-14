"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSellerScope } from "@/lib/session";
import { CATEGORIES } from "@/lib/categories";
import { Validator, fail, succeed, type ActionState } from "@/lib/form";
import { recordAudit } from "@/lib/audit";
import { toDecimalString } from "@/lib/money";
import { ProductStatus } from "@/generated/prisma";

// Toda action aqui entra por `requireSellerScope()`. Isso não é cerimônia: o
// escopo é o que garante que o produto atualizado pertence a quem está pedindo.
// Nenhuma delas toca `prisma` direto — se tocasse, o filtro de tenant voltaria
// a depender de alguém lembrar.

const STATUSES = Object.values(ProductStatus);

function readProductForm(formData: FormData) {
  const v = new Validator(formData);
  return {
    v,
    data: {
      name: v.text("name", "Nome do produto", { min: 2, max: 120 }),
      description: v.optionalText("description", 2000),
      category: v.oneOf("category", "Categoria", CATEGORIES),
      price: v.money("price", "Preço", { required: true }),
      stockQuantity: v.int("stockQuantity", "Estoque"),
      status: v.oneOf("status", "Status", STATUSES),
      imageUrl: v.url("imageUrl"),
    },
  };
}

export async function createProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { scope, common, profile } = await requireSellerScope();
  const { v, data } = readProductForm(formData);

  // Preço zero passaria na validação de "obrigatório" (0 é um número), mas
  // produto sem preço quebra a calculadora de comissão inteira — divisão por
  // zero no ponto de equilíbrio. Barrar aqui é mais honesto que tratar depois.
  if (data.price !== null && data.price <= 0) {
    v.errors.price = "O preço precisa ser maior que zero.";
  }
  if (!v.ok) return fail(v.errors, "Confira os campos destacados.");

  const product = await scope.products.create({
    name: data.name,
    description: data.description,
    category: data.category,
    price: toDecimalString(data.price!),
    stockQuantity: data.stockQuantity,
    status: data.status,
    imageUrl: data.imageUrl,
    source: "MANUAL",
  });

  await common.events.record("PRODUCT_CREATED", {
    entityType: "Product",
    entityId: product.id,
    metadata: { category: data.category },
  });
  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "PRODUCT_CREATED",
    entityType: "Product",
    entityId: product.id,
    metadata: { name: data.name, category: data.category },
  });

  revalidatePath("/dashboard/produtos");
  redirect(`/dashboard/produtos/${product.id}`);
}

export async function updateProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { scope, profile } = await requireSellerScope();
  const { v, data } = readProductForm(formData);
  const id = v.id("id", "Produto");

  if (data.price !== null && data.price <= 0) {
    v.errors.price = "O preço precisa ser maior que zero.";
  }
  if (!v.ok) return fail(v.errors, "Confira os campos destacados.");

  const { count } = await scope.products.update(id, {
    name: data.name,
    description: data.description,
    category: data.category,
    price: toDecimalString(data.price!),
    stockQuantity: data.stockQuantity,
    status: data.status,
    imageUrl: data.imageUrl,
  });

  // count 0 significa "não existe OU não é seu" — e o chamador não precisa
  // saber qual dos dois. É o comportamento desenhado no scoped-db.
  if (count === 0) return fail({}, "Produto não encontrado.");

  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "PRODUCT_UPDATED",
    entityType: "Product",
    entityId: id,
    metadata: { name: data.name },
  });

  revalidatePath("/dashboard/produtos");
  revalidatePath(`/dashboard/produtos/${id}`);
  return succeed("Produto salvo.");
}

/// Custos do produto. Alimenta a calculadora de comissão — e é o que permite
/// dizer ao seller "essa comissão te deixa no prejuízo" antes de ele publicar.
export async function saveEconomics(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { scope, profile } = await requireSellerScope();
  const v = new Validator(formData);

  const productId = v.id("productId", "Produto");
  const productCost = v.money("productCost", "Custo do produto", { required: true });
  const shippingCost = v.money("shippingCost", "Frete");
  const platformFee = v.money("platformFee", "Taxa da plataforma");
  const operationalCost = v.money("operationalCost", "Custo operacional");
  const minimumMargin = v.percent("minimumMargin", "Margem mínima");
  const targetMargin = v.percent("targetMargin", "Margem alvo");

  if (
    minimumMargin !== null &&
    targetMargin !== null &&
    targetMargin < minimumMargin
  ) {
    v.errors.targetMargin = "A margem alvo não pode ser menor que a mínima.";
  }
  if (!v.ok) return fail(v.errors, "Confira os campos destacados.");

  const saved = await scope.products.setEconomics(productId, {
    productCost: toDecimalString(productCost!),
    shippingCost: toDecimalString(shippingCost ?? 0),
    platformFee: toDecimalString(platformFee ?? 0),
    operationalCost: toDecimalString(operationalCost ?? 0),
    minimumMargin: minimumMargin === null ? null : String(minimumMargin),
    targetMargin: targetMargin === null ? null : String(targetMargin),
  });

  if (!saved) return fail({}, "Produto não encontrado.");

  // Custo muda a comissão recomendada, que muda o que o creator recebe.
  // É das mudanças que mais vale poder rastrear depois.
  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "PRODUCT_ECONOMICS_CHANGED",
    entityType: "Product",
    entityId: productId,
    metadata: { productCost, shippingCost, platformFee, operationalCost },
  });

  revalidatePath(`/dashboard/produtos/${productId}`);
  return succeed("Custos salvos.");
}

/// Mudança rápida de status a partir da listagem, sem abrir o produto.
export async function setProductStatus(formData: FormData) {
  const { scope } = await requireSellerScope();
  const v = new Validator(formData);
  const id = v.id("id", "Produto");
  const status = v.oneOf("status", "Status", STATUSES);
  if (!v.ok) throw new Error("Requisição inválida.");

  await scope.products.update(id, { status });
  revalidatePath("/dashboard/produtos");
  revalidatePath(`/dashboard/produtos/${id}`);
}

/// Arquivar, não apagar.
///
/// Produto com pedido no histórico não pode sumir: OrderItem aponta para ele
/// com onDelete: Restrict, e um relatório de vendas com produto faltando é pior
/// que um produto arquivado na lista. Só apaga de verdade quem nunca vendeu.
export async function archiveProduct(formData: FormData) {
  const { scope, common, profile } = await requireSellerScope();
  const v = new Validator(formData);
  const id = v.id("id", "Produto");
  if (!v.ok) throw new Error("Requisição inválida.");

  await scope.products.update(id, { status: "ARCHIVED" });
  await common.events.record("PRODUCT_ARCHIVED", { entityType: "Product", entityId: id });
  await recordAudit({
    userId: profile.userId,
    profileId: profile.id,
    action: "PRODUCT_ARCHIVED",
    entityType: "Product",
    entityId: id,
  });

  revalidatePath("/dashboard/produtos");
  redirect("/dashboard/produtos");
}

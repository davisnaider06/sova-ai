import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { ProductForm } from "@/components/seller/product-form";
import { deleteProduct, updateProduct } from "@/app/dashboard/produtos/actions";
import { requireSellerScope } from "@/lib/session";

/// Fração (0.15) volta para o campo como "15".
function toPercentField(value: { toString(): string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return String(Number(value.toString()) * 100);
}

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { scope } = await requireSellerScope();

  const product = await scope.products.findByIdWithEconomics(id);
  if (!product) notFound();

  const economics = product.economics;

  async function submit(formData: FormData) {
    "use server";
    return updateProduct(id, formData);
  }

  async function remove() {
    "use server";
    await deleteProduct(id);
  }

  return (
    <>
      <Topbar title="Editar produto" subtitle={product.name} />
      <div className="px-3 py-5 sm:px-6">
        <ProductForm
          initial={{
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price.toString(),
            stockQuantity: product.stockQuantity?.toString(),
            imageUrl: product.imageUrl,
            status: product.status,
            productCost: economics?.productCost.toString(),
            shippingCost: economics?.shippingCost.toString(),
            operationalCost: economics?.operationalCost.toString(),
            minimumMargin: toPercentField(economics?.minimumMargin),
            targetMargin: toPercentField(economics?.targetMargin),
          }}
          onSubmit={submit}
          onDelete={remove}
        />
      </div>
    </>
  );
}

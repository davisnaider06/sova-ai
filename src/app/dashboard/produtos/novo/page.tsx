import { Topbar } from "@/components/layout/topbar";
import { ProductForm } from "@/components/seller/product-form";
import { createProduct } from "@/app/dashboard/produtos/actions";
import { requireSellerScope } from "@/lib/session";

export default async function NovoProdutoPage() {
  // Só para garantir que quem chegou aqui tem perfil de seller — o formulário
  // em si não precisa de dado nenhum.
  await requireSellerScope();

  async function submit(formData: FormData) {
    "use server";
    return createProduct(formData);
  }

  return (
    <>
      <Topbar title="Novo produto" subtitle="O que o creator vai promover" />
      <div className="px-3 py-5 sm:px-6">
        <ProductForm onSubmit={submit} />
      </div>
    </>
  );
}

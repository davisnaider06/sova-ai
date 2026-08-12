import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ProductForm } from "@/components/produtos/product-form";
import { requireSellerScope } from "@/lib/session";
import { createProduct } from "../actions";

export default async function NovoProdutoPage() {
  // Guarda de papel: a página inteira só existe para seller. Chamar o escopo
  // aqui garante o redirect antes de renderizar qualquer coisa.
  await requireSellerScope();

  return (
    <>
      <Topbar title="Novo produto" subtitle="Os custos você informa depois de salvar" />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
        <Link
          href="/dashboard/produtos"
          className="flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para produtos
        </Link>

        <ProductForm action={createProduct} submitLabel="Cadastrar produto" />
      </div>
    </>
  );
}

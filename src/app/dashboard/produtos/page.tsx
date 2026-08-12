import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSellerScope } from "@/lib/session";
import { toCents } from "@/lib/money";
import { ProductsList, type ProductRow } from "./products-list";

export default async function ProdutosPage() {
  const { scope } = await requireSellerScope();

  const [products, pendingByProduct] = await Promise.all([
    scope.products.listForIndex({ orderBy: { updatedAt: "desc" } }),
    scope.products.pendingAffiliationCounts(),
  ]);

  // Decimal do Prisma é instância de classe e não atravessa a fronteira para o
  // componente cliente. A conversão acontece aqui, na borda, e o cliente só vê
  // número — é a mesma regra do money.ts, aplicada ao transporte.
  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    priceCents: toCents(p.price),
    status: p.status,
    imageUrl: p.imageUrl,
    stockQuantity: p.stockQuantity,
    activeAffiliations: p._count.affiliations,
    pendingAffiliations: pendingByProduct.get(p.id) ?? 0,
    hasCosts: p.economics !== null,
  }));

  const active = rows.filter((r) => r.status === "ACTIVE").length;

  return (
    <>
      <Topbar
        title="Produtos"
        subtitle={
          rows.length === 0
            ? "Cadastre o que você vende para creators poderem promover"
            : `${rows.length} ${rows.length === 1 ? "produto" : "produtos"} · ${active} ativo${active === 1 ? "" : "s"}`
        }
      />

      <div className="flex flex-col gap-6 p-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum produto cadastrado ainda"
            description="O produto é o ponto de partida: sem ele não há afiliação, campanha nem comissão. Cadastre o primeiro — leva um minuto."
            action={{ href: "/dashboard/produtos/novo", label: "Cadastrar produto" }}
          />
        ) : (
          <>
            <div className="flex justify-end">
              <Button asChild size="sm">
                <Link href="/dashboard/produtos/novo">
                  <Plus className="h-4 w-4" />
                  Novo produto
                </Link>
              </Button>
            </div>
            <ProductsList products={rows} />
          </>
        )}
      </div>
    </>
  );
}

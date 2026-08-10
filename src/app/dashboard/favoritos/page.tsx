import { Heart } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ProductMiniCard } from "@/components/dashboard/product-mini-card";
import { getProducts } from "@/lib/data";

export const revalidate = 30;

export default async function FavoritosPage() {
  const products = await getProducts();
  const favorites = products.slice(0, 3);

  return (
    <>
      <Topbar title="Favoritos" subtitle="Produtos que você salvou para acompanhar" />

      <div className="p-6">
        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((p) => (
              <ProductMiniCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong py-20 text-center text-ink-muted">
            <Heart className="h-8 w-8" />
            <p className="text-sm">Você ainda não salvou nenhum produto.</p>
          </div>
        )}
      </div>
    </>
  );
}

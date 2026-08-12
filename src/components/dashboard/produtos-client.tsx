"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Input } from "@/components/ui/input";
import { ProductMiniCard } from "@/components/dashboard/product-mini-card";
import type { Product } from "@/lib/mock-data";

export function ProdutosClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "Todas" || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, category]);

  return (
    <>
      <Topbar title="Produtos" subtitle={`${products.length} produtos monitorados`} />

      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produto..."
              className="pl-11"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={
                  c === category
                    ? "rounded-full bg-selected px-4 py-2 text-xs font-medium text-selected-foreground"
                    : "rounded-full bg-surface-2 px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-surface-3"
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductMiniCard key={p.id} product={p} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-ink-muted">
              Nenhum produto encontrado.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

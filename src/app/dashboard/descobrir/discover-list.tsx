"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Package, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { MatchBreakdown, MatchScore } from "@/components/matching/match-score";
import { formatBRL, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ScoredProduct } from "@/lib/discovery";
import { requestAffiliation } from "./actions";

export function DiscoverList({ products }: { products: ScoredProduct[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = category === "Todas" || p.category === category;
      const matchesQuery =
        needle === "" ||
        p.name.toLowerCase().includes(needle) ||
        p.sellerName.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, category]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto ou seller..."
            className="pl-11"
          />
        </div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors",
                c === category
                  ? "bg-brand text-brand-foreground"
                  : "bg-surface-2 text-ink-secondary hover:bg-surface-3",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-muted">
          Nenhum produto corresponde a esse filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ScoredProduct }) {
  const commissionPerSale = Math.round(product.priceCents * product.commissionRate);

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Package className="h-5 w-5 text-ink-muted" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-primary">{product.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            {product.sellerName} · {product.category}
          </p>
          <MatchScore match={product.match} className="mt-2" />
        </div>
      </div>

      {product.description && (
        <p className="mt-3 line-clamp-2 text-xs text-ink-secondary">{product.description}</p>
      )}

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-ink-muted">Preço</p>
          <p className="text-base font-semibold tabular-nums text-ink-primary">
            {formatBRL(product.priceCents)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-ink-muted">
            Você ganha ({formatPercent(product.commissionRate, 0)})
          </p>
          <p className="text-base font-semibold tabular-nums text-brand-ink">
            {formatBRL(commissionPerSale)}
          </p>
        </div>
      </div>

      <MatchBreakdown match={product.match} />

      <div className="mt-4">
        <AffiliationAction
          productId={product.id}
          status={product.affiliationStatus}
        />
      </div>
    </Card>
  );
}

function AffiliationAction({
  productId,
  status,
}: {
  productId: string;
  status: string | null;
}) {
  if (status === "ACTIVE") {
    return (
      <Badge variant="good" className="w-full justify-center py-2">
        <Check className="h-3.5 w-3.5" />
        Você já promove este produto
      </Badge>
    );
  }

  if (status === "PENDING") {
    return (
      <Badge variant="warning" className="w-full justify-center py-2">
        <Clock className="h-3.5 w-3.5" />
        Aguardando aprovação do seller
      </Badge>
    );
  }

  if (status === "REJECTED") {
    return (
      <Badge variant="subtle" className="w-full justify-center py-2">
        Pedido recusado pelo seller
      </Badge>
    );
  }

  // PAUSED, ENDED ou nunca pedido: dá para (re)solicitar. O upsert do escopo
  // reativa o mesmo vínculo em vez de criar um segundo.
  return (
    <form action={requestAffiliation}>
      <input type="hidden" name="productId" value={productId} />
      <SubmitButton className="w-full" size="sm" pendingLabel="Enviando...">
        {status === null ? "Quero promover" : "Pedir novamente"}
      </SubmitButton>
    </form>
  );
}

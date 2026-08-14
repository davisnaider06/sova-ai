"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

const SORTS = [
  { key: "match", label: "Compatibilidade" },
  { key: "commission", label: "Você ganha mais" },
  { key: "rate", label: "Maior comissão" },
  { key: "price", label: "Menor preço" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

export function DiscoverList({ products }: { products: ScoredProduct[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [sort, setSort] = useState<SortKey>("match");
  const [minRate, setMinRate] = useState(0);
  const [onlyGoodMatch, setOnlyGoodMatch] = useState(false);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const list = products.filter((p) => {
      const matchesCategory = category === "Todas" || p.category === category;
      const matchesQuery =
        needle === "" ||
        p.name.toLowerCase().includes(needle) ||
        p.sellerName.toLowerCase().includes(needle);
      const matchesRate = p.commissionRate * 100 >= minRate;
      const matchesScore = !onlyGoodMatch || p.match.score >= 70;
      return matchesCategory && matchesQuery && matchesRate && matchesScore;
    });

    // A ordenação padrão é por compatibilidade porque é a promessa da tela.
    // As outras existem porque "quanto eu ganho" é uma pergunta legítima e
    // diferente de "o que combina comigo".
    const sorted = [...list];
    switch (sort) {
      case "commission":
        sorted.sort(
          (a, b) => b.priceCents * b.commissionRate - a.priceCents * a.commissionRate,
        );
        break;
      case "rate":
        sorted.sort((a, b) => b.commissionRate - a.commissionRate);
        break;
      case "price":
        sorted.sort((a, b) => a.priceCents - b.priceCents);
        break;
      default:
        sorted.sort((a, b) => b.match.score - a.match.score);
    }
    return sorted;
  }, [products, query, category, sort, minRate, onlyGoodMatch]);

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

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl bg-surface-2 px-4 py-3">
        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          Ordenar por
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-border-strong bg-surface-3 px-2.5 py-1.5 text-xs text-ink-primary outline-none focus-visible:border-brand"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          Comissão mínima
          <input
            type="range"
            min={0}
            max={40}
            step={5}
            value={minRate}
            onChange={(e) => setMinRate(Number(e.target.value))}
            className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-border-strong accent-brand"
          />
          <span className="w-9 tabular-nums text-ink-primary">{minRate}%</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-secondary">
          <input
            type="checkbox"
            checked={onlyGoodMatch}
            onChange={(e) => setOnlyGoodMatch(e.target.checked)}
            className="h-3.5 w-3.5 accent-brand"
          />
          Só match alto (70+)
        </label>

        <span className="ml-auto text-xs text-ink-muted">
          {filtered.length} de {products.length}
        </span>
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
          <Link
            href={`/dashboard/descobrir/${product.id}`}
            className="truncate text-sm font-medium text-ink-primary underline-offset-2 hover:underline"
          >
            {product.name}
          </Link>
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

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Package, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  status: string;
  imageUrl: string | null;
  stockQuantity: number | null;
  activeAffiliations: number;
  pendingAffiliations: number;
  hasCosts: boolean;
};

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "subtle" | "good" | "warning" | "critical" }
> = {
  ACTIVE: { label: "Ativo", variant: "good" },
  DRAFT: { label: "Rascunho", variant: "subtle" },
  PAUSED: { label: "Pausado", variant: "warning" },
  ARCHIVED: { label: "Arquivado", variant: "subtle" },
};

const FILTERS = [
  { key: "ALL", label: "Todos" },
  { key: "ACTIVE", label: "Ativos" },
  { key: "DRAFT", label: "Rascunhos" },
  { key: "PAUSED", label: "Pausados" },
  { key: "ARCHIVED", label: "Arquivados" },
];

export function ProductsList({ products }: { products: ProductRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesStatus = status === "ALL" || p.status === status;
      const matchesQuery =
        needle === "" ||
        p.name.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [products, query, status]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou categoria..."
            className="pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-medium transition-colors",
                f.key === status
                  ? "bg-brand text-brand-foreground"
                  : "bg-surface-2 text-ink-secondary hover:bg-surface-3",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-muted">
          Nenhum produto corresponde a esse filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ProductRow }) {
  const meta = STATUS_META[product.status] ?? STATUS_META.DRAFT;

  return (
    <Link href={`/dashboard/produtos/${product.id}`} className="group">
      <Card className="flex h-full flex-col p-4 transition-colors group-hover:border-brand/40">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
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
            <p className="mt-0.5 truncate text-xs text-ink-muted">{product.category}</p>
          </div>

          <Badge variant={meta.variant} className="shrink-0">
            {meta.label}
          </Badge>
        </div>

        <p className="mt-4 text-xl font-semibold tracking-tight text-ink-primary">
          {formatBRL(product.priceCents)}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {product.activeAffiliations} {product.activeAffiliations === 1 ? "creator" : "creators"}
          </span>

          {product.pendingAffiliations > 0 && (
            <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
              {product.pendingAffiliations} aguardando
            </Badge>
          )}

          {/* Sem custos a calculadora de comissão não roda — e afiliar creator
              sem saber a margem é como o seller descobre o prejuízo depois. */}
          {!product.hasCosts && (
            <span className="flex items-center gap-1.5 text-status-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              Sem custos
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

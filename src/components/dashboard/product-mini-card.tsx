import Link from "next/link";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { formatCurrencyBRL, formatCompactNumber, formatPercent, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductIcon } from "@/components/dashboard/product-icon";

const competitionVariant = {
  Baixa: "good",
  Média: "warning",
  Alta: "critical",
} as const;

export function ProductMiniCard({ product }: { product: Product }) {
  const positive = product.growth >= 0;
  return (
    <Link
      href={`/dashboard/produtos/${product.id}`}
      className="flex h-full w-full flex-col rounded-2xl border border-border-hairline bg-surface-1 p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2">
          <ProductIcon name={product.image} className="h-5 w-5" />
        </span>
        <Badge variant={competitionVariant[product.competition]}>{product.competition} conc.</Badge>
      </div>
      <p className="mt-3 text-sm font-semibold text-ink-primary line-clamp-2">{product.name}</p>
      <p className="text-xs text-ink-muted">{product.category}</p>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-ink-primary">{formatCurrencyBRL(product.price)}</span>
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            positive ? "text-[#4ade80]" : "text-[#f87171]",
          )}
        >
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {formatPercent(product.growth, { signed: true })}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border-hairline pt-3 text-xs text-ink-muted">
        <span>{formatCompactNumber(product.sales30d)} vendas/30d</span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {product.creators}
        </span>
      </div>
    </Link>
  );
}

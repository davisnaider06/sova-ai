import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/mock-data";
import { formatCurrencyBRL } from "@/lib/utils";
import { ProductIcon } from "@/components/dashboard/product-icon";

export function OpportunityCard({ product }: { product: Product }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-brand p-5 text-brand-foreground">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70">Opportunity Score</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">{product.opportunityScore}</p>
        </div>
        <Link
          href={`/dashboard/produtos/${product.id}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-foreground/10 transition-colors hover:bg-brand-foreground/20"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-foreground/10">
          <ProductIcon name={product.image} className="h-4 w-4 text-brand-foreground" />
        </span>
        <p className="mt-2 text-base font-semibold leading-snug">{product.name}</p>
        <p className="text-xs opacity-70">{product.category}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-brand-foreground/15 pt-4 text-xs">
        <div>
          <p className="opacity-70">Margem estimada</p>
          <p className="font-semibold">{product.margin}%</p>
        </div>
        <div>
          <p className="opacity-70">Preço sugerido</p>
          <p className="font-semibold">{formatCurrencyBRL(product.price)}</p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// KPI que sabe dizer quando NÃO tem o que comparar.
//
// O card antigo recebia `delta: number` e sempre desenhava a seta — o que
// obrigava a inventar um número quando não havia período anterior. Aqui `delta`
// é opcional, e a ausência aparece como ausência.

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <Card
      className={cn(
        "h-full p-5",
        href && "transition-colors hover:border-brand/40",
        accent && "border-brand/40",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-secondary">{label}</p>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accent ? "bg-brand/15 text-brand" : "bg-surface-2 text-ink-secondary",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>

      {delta !== null && delta !== undefined ? (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            delta >= 0 ? "text-status-good" : "text-status-critical",
          )}
        >
          {delta >= 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {Math.abs(delta).toFixed(1).replace(".", ",")}% vs. período anterior
        </div>
      ) : hint ? (
        <p className="mt-2 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </Card>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

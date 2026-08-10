import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: number;
  icon: LucideIcon;
}) {
  const positive = delta >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-secondary">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ink-secondary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>
      <div
        className={cn(
          "mt-2 inline-flex items-center gap-1 text-xs font-medium",
          positive ? "text-[#4ade80]" : "text-[#f87171]",
        )}
      >
        {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {Math.abs(delta).toFixed(1)}% vs. período anterior
      </div>
    </Card>
  );
}

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { history as HistoryType } from "@/lib/mock-data";
import { formatCurrencyBRL, cn } from "@/lib/utils";

export function ActivityList({ items }: { items: typeof HistoryType }) {
  return (
    <ul className="divide-y divide-border-hairline">
      {items.map((item) => {
        const positive = item.value >= 0;
        return (
          <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-secondary">
              {item.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-primary">{item.label}</p>
              <p className="text-xs text-ink-muted">{item.sub}</p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "flex items-center justify-end gap-0.5 text-sm font-semibold",
                  positive ? "text-[#4ade80]" : "text-ink-primary",
                )}
              >
                {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                {formatCurrencyBRL(Math.abs(item.value))}
              </p>
              <p className="text-xs text-ink-muted">{item.time}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

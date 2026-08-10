"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { formatCurrencyBRL } from "@/lib/utils";

type Point = { label: string; value: number };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-hairline bg-surface-2 px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-ink-primary">{formatCurrencyBRL(payload[0].value)}</p>
    </div>
  );
}

export function GmvAreaChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--brand)"
          strokeWidth={2}
          fill="url(#gmvFill)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--brand)", stroke: "var(--page)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

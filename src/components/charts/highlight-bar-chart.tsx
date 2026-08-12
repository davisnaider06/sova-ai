"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type Point = { label: string; value: number; highlight?: boolean };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-hairline bg-surface-2 px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-ink-primary">{payload[0].value}</p>
    </div>
  );
}

export function HighlightBarChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.highlight ? "var(--chart-brand)" : "var(--surface-3)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

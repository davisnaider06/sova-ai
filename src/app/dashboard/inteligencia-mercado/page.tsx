import { TrendingUp, TrendingDown } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GmvAreaChart } from "@/components/charts/gmv-area-chart";
import { gmvHistory } from "@/lib/mock-data";
import { getProducts, getMarketSignals } from "@/lib/data";
import { cn } from "@/lib/utils";

export const revalidate = 30;

export default async function InteligenciaMercadoPage() {
  const [products, marketSignals] = await Promise.all([getProducts(), getMarketSignals()]);
  const categoryRows = products.map((p) => ({
    category: p.category,
    demand: p.demand,
    competition: p.competition,
    growth: p.growth,
  }));

  return (
    <>
      <Topbar title="Inteligência de Mercado" subtitle="Sinais e tendências para decidir com dados" />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {marketSignals.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-start gap-3 p-5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    s.trend === "up" ? "bg-status-good/15 text-[#4ade80]" : "bg-status-critical/15 text-[#f87171]",
                  )}
                >
                  {s.trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink-primary">{s.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{s.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tendência geral de mercado (GMV agregado)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <GmvAreaChart data={gmvHistory["90d"]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorias monitoradas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 font-medium">Demanda</th>
                  <th className="pb-2 font-medium">Concorrência</th>
                  <th className="pb-2 font-medium text-right">Crescimento</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((row) => (
                  <tr key={row.category} className="border-b border-border-hairline last:border-0">
                    <td className="py-3 text-ink-primary">{row.category}</td>
                    <td className="py-3 text-ink-secondary">{row.demand}</td>
                    <td className="py-3 text-ink-secondary">{row.competition}</td>
                    <td
                      className={cn(
                        "py-3 text-right font-medium",
                        row.growth >= 0 ? "text-[#4ade80]" : "text-[#f87171]",
                      )}
                    >
                      {row.growth >= 0 ? "+" : ""}
                      {row.growth.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

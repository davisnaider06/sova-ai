import { Trophy, TrendingUp, TrendingDown, Crown } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getProducts, getTopSellers } from "@/lib/data";
import { formatCurrencyBRL, formatCompactNumber, formatPercent, cn } from "@/lib/utils";
import { ProductIcon } from "@/components/dashboard/product-icon";

const medalColor = ["text-[#facc15]", "text-[#cbd5e1]", "text-[#d97706]"];

export const revalidate = 30;

export default async function RankingsPage() {
  const [products, topSellers] = await Promise.all([getProducts(), getTopSellers()]);
  const topProductsByGmv = [...products]
    .map((p) => ({ ...p, gmv: Math.round(p.price * p.sales30d) }))
    .sort((a, b) => b.gmv - a.gmv);

  return (
    <>
      <Topbar title="Rankings" subtitle="Quem está vendendo mais na TikTok Shop agora" />

      <div className="p-6">
        <Tabs defaultValue="produtos">
          <TabsList>
            <TabsTrigger value="produtos">Top Produtos</TabsTrigger>
            <TabsTrigger value="vendedores">Top Vendedores</TabsTrigger>
          </TabsList>

          <TabsContent value="produtos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-brand" /> Produtos por GMV estimado
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border-hairline text-left text-xs text-ink-muted">
                      <th className="pb-3 font-medium">#</th>
                      <th className="pb-3 font-medium">Produto</th>
                      <th className="pb-3 font-medium">Categoria</th>
                      <th className="pb-3 font-medium text-right">GMV estimado</th>
                      <th className="pb-3 font-medium text-right">Crescimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsByGmv.map((p, i) => {
                      const positive = p.growth >= 0;
                      return (
                        <tr key={p.id} className="border-b border-border-hairline last:border-0">
                          <td className="py-3">
                            <span className={cn("text-sm font-semibold", i < 3 ? medalColor[i] : "text-ink-muted")}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
                                <ProductIcon name={p.image} className="h-4 w-4" />
                              </span>
                              <span className="font-medium text-ink-primary">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-ink-secondary">{p.category}</td>
                          <td className="py-3 text-right font-semibold text-ink-primary">
                            {formatCurrencyBRL(p.gmv)}
                          </td>
                          <td
                            className={cn(
                              "py-3 text-right font-medium",
                              positive ? "text-[#4ade80]" : "text-[#f87171]",
                            )}
                          >
                            {formatPercent(p.growth, { signed: true })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendedores">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {topSellers.map((s) => {
                const positive = s.growth >= 0;
                return (
                  <Card key={s.id}>
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-brand/15 text-base text-brand">{s.avatar}</AvatarFallback>
                        </Avatar>
                        {s.rank <= 3 && (
                          <Crown className={cn("absolute -right-1 -top-1 h-4 w-4", medalColor[s.rank - 1])} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink-muted">#{s.rank}</span>
                          <p className="truncate text-sm font-semibold text-ink-primary">{s.storeName}</p>
                        </div>
                        <p className="text-xs text-ink-muted">{s.name}</p>
                        <Badge variant="subtle" className="mt-1.5">{s.category}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-ink-primary">{formatCompactNumber(s.gmv)}</p>
                        <p
                          className={cn(
                            "flex items-center justify-end gap-1 text-xs font-medium",
                            positive ? "text-[#4ade80]" : "text-[#f87171]",
                          )}
                        >
                          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatPercent(s.growth, { signed: true })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

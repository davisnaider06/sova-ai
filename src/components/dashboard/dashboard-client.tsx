"use client";

import { useState } from "react";
import Link from "next/link";
import { DollarSign, ShoppingCart, Wallet, ArrowRight } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { GmvAreaChart } from "@/components/charts/gmv-area-chart";
import { HighlightBarChart } from "@/components/charts/highlight-bar-chart";
import { ProductMiniCard } from "@/components/dashboard/product-mini-card";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { ActivityList } from "@/components/dashboard/activity-list";
import {
  kpis,
  gmvHistory,
  productivityBars,
  history,
  type TimeRange,
  type Product,
  type MarketSignal,
} from "@/lib/mock-data";
import { formatCurrencyBRL, formatPercent } from "@/lib/utils";

export function DashboardClient({
  products,
  marketSignals,
}: {
  products: Product[];
  marketSignals: MarketSignal[];
}) {
  const [range, setRange] = useState<TimeRange>("30d");
  const bestOpportunity = products.reduce((a, b) => (a.opportunityScore > b.opportunityScore ? a : b));

  return (
    <>
      <Topbar title="Dashboard" subtitle="Visão geral da sua loja na TikTok Shop" />

      <div className="flex flex-col gap-6 p-6">
        <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)}>
          <TabsList>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="90d">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="GMV" value={formatCurrencyBRL(kpis.gmv.value)} delta={kpis.gmv.delta} icon={DollarSign} />
          <KpiCard label="Pedidos" value={kpis.orders.value.toLocaleString("pt-BR")} delta={kpis.orders.delta} icon={ShoppingCart} />
          <KpiCard label="Lucro estimado" value={formatCurrencyBRL(kpis.profit.value)} delta={kpis.profit.delta} icon={Wallet} />
          <KpiCard label="Conversão" value={`${kpis.conversion.value.toFixed(1)}%`} delta={kpis.conversion.delta} icon={ArrowRight} />
        </div>

        {/* GMV chart + Opportunity */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>GMV consolidado</CardTitle>
                <p className="mt-1 text-xs text-ink-muted">
                  {range === "7d" ? "Últimos 7 dias" : range === "30d" ? "Últimos 30 dias" : "Últimos 90 dias"}
                </p>
              </div>
              <p className="text-2xl font-semibold text-ink-primary">{formatCurrencyBRL(kpis.gmv.value)}</p>
            </CardHeader>
            <CardContent className="h-64 pt-4">
              <GmvAreaChart data={gmvHistory[range]} />
            </CardContent>
          </Card>

          <OpportunityCard product={bestOpportunity} />
        </div>

        {/* Produtos em alta */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Produtos em alta</CardTitle>
            <Link href="/dashboard/produtos" className="text-xs font-medium text-brand-ink hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent>
            <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 scrollbar-none">
              {products.map((p) => (
                <div key={p.id} className="w-64 shrink-0">
                  <ProductMiniCard product={p} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom row: bar chart + activity + signals */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Produtividade mensal</CardTitle>
              <p className="text-xs text-ink-muted">Produtos analisados por mês</p>
            </CardHeader>
            <CardContent className="h-52 pt-4">
              <HighlightBarChart data={productivityBars} />
            </CardContent>
          </Card>

          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <p className="text-xs text-ink-muted">Movimentações recentes</p>
            </CardHeader>
            <CardContent>
              <ActivityList items={history} />
            </CardContent>
          </Card>

          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Inteligência de mercado</CardTitle>
              <p className="text-xs text-ink-muted">Sinais da última semana</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {marketSignals.map((s) => (
                <div key={s.id} className="rounded-xl border border-border-hairline bg-surface-2 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink-primary">{s.title}</p>
                    <span
                      className={
                        s.trend === "up"
                          ? "text-xs font-semibold text-[#4ade80]"
                          : "text-xs font-semibold text-[#f87171]"
                      }
                    >
                      {formatPercent(s.trend === "up" ? 12 : -12, { signed: true })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{s.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

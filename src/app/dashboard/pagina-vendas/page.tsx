"use client";

import { useState } from "react";
import { Sparkles, Check, Star, Copy, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PrototypeNotice } from "@/components/ui/prototype-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trendingProducts, generateSalesPage } from "@/lib/mock-data";
import { formatCurrencyBRL } from "@/lib/utils";
import { ProductIcon } from "@/components/dashboard/product-icon";

type SalesPage = ReturnType<typeof generateSalesPage>;

export default function PaginaVendasPage() {
  const [productId, setProductId] = useState(trendingProducts[0].id);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<SalesPage | null>(null);

  function generate() {
    setLoading(true);
    setPage(null);
    setTimeout(() => {
      setPage(generateSalesPage(productId));
      setLoading(false);
    }, 1200);
  }

  return (
    <>
      <Topbar title="Página de Vendas IA" subtitle="Monte uma oferta e página de vendas prontas em segundos" />

      <div className="flex flex-col gap-6 p-6">
        <PrototypeNotice what="A geração de copy ainda não está ligada a um modelo de IA, e os produtos listados são de exemplo." />
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Escolha um produto" />
              </SelectTrigger>
              <SelectContent>
                {trendingProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <ProductIcon name={p.image} className="h-3.5 w-3.5" /> {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generate} disabled={loading} size="lg">
              {loading ? "Montando oferta..." : "Gerar página de vendas"} <Sparkles className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border-hairline bg-surface-1 py-20 text-center">
            <Sparkles className="h-6 w-6 animate-pulse text-brand" />
            <p className="text-sm text-ink-secondary">Montando oferta, headline, bullets e prova social...</p>
          </div>
        )}

        {page && !loading && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Preview */}
            <Card className="overflow-hidden xl:col-span-2">
              <div className="flex items-center gap-2 border-b border-border-hairline px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-status-critical/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-status-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-status-good/70" />
                <span className="ml-3 rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-muted">
                  Preview da página de vendas
                </span>
              </div>

              <div className="flex flex-col items-center gap-6 bg-surface-0 px-6 py-10 text-center">
                <Badge>{page.urgency}</Badge>
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
                  <ProductIcon name={page.product.image} className="h-8 w-8" />
                </span>
                <h1 className="max-w-lg text-balance text-2xl font-semibold tracking-tight text-ink-primary">
                  {page.headline}
                </h1>
                <p className="max-w-md text-sm text-ink-secondary">{page.subheadline}</p>

                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-brand text-brand" />
                  ))}
                  <span className="ml-1 text-xs text-ink-muted">+2.400 avaliações</span>
                </div>

                <ul className="flex flex-col gap-2 text-left">
                  {page.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-ink-secondary">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15">
                        <Check className="h-3 w-3 text-brand" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="rounded-2xl bg-surface-2 px-8 py-5">
                  <p className="text-xs text-ink-muted line-through">{formatCurrencyBRL(page.originalPrice)}</p>
                  <p className="text-3xl font-semibold text-ink-primary">{formatCurrencyBRL(page.price)}</p>
                  <Badge variant="good" className="mt-1">{page.discountPercent}% OFF</Badge>
                </div>

                <Button size="lg" className="w-full max-w-xs">
                  {page.ctaText}
                </Button>

                <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Compra 100% segura e garantida
                </p>

                <div className="grid w-full gap-3 border-t border-border-hairline pt-6 sm:grid-cols-3">
                  {page.testimonials.map((t) => (
                    <div key={t.name} className="rounded-xl bg-surface-2 p-3 text-left">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-brand text-brand" />
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-ink-secondary">&quot;{t.text}&quot;</p>
                      <p className="mt-1 text-xs font-medium text-ink-primary">{t.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Copy blocks */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Copy pronta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CopyBlock label="Headline" text={page.headline} />
                  <CopyBlock label="Subheadline" text={page.subheadline} />
                  <CopyBlock label="CTA" text={page.ctaText} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Preço sugerido</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-ink-muted">De {formatCurrencyBRL(page.originalPrice)}</p>
                    <p className="text-xl font-semibold text-ink-primary">Por {formatCurrencyBRL(page.price)}</p>
                  </div>
                  <Badge variant="good">{page.discountPercent}% OFF</Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">{label}</p>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 text-xs text-brand hover:underline"
        >
          <Copy className="h-3 w-3" /> {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p className="mt-1 rounded-xl bg-surface-2 p-3 text-sm text-ink-secondary">{text}</p>
    </div>
  );
}

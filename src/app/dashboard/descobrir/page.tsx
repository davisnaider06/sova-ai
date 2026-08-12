"use client";

import { useState } from "react";
import {
  Link2,
  Sparkles,
  TrendingUp,
  Users2,
  DollarSign,
  Flame,
  Hash,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { analyzeProductLink } from "@/lib/mock-data";
import { formatCurrencyBRL, formatCompactNumber } from "@/lib/utils";
import { ProductIcon } from "@/components/dashboard/product-icon";

type Analysis = ReturnType<typeof analyzeProductLink>;

export default function DescobrirPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult(analyzeProductLink(url));
      setLoading(false);
    }, 1400);
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <>
      <Topbar title="Descobrir Produtos" subtitle="Cole o link de um produto e receba a análise completa em segundos" />

      <div className="flex flex-col gap-6 p-6">
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleAnalyze} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Cole aqui o link do produto (TikTok Shop, AliExpress, Shopee...)"
                  className="pl-11"
                />
              </div>
              <Button type="submit" size="lg" disabled={loading || !url.trim()}>
                {loading ? "Analisando..." : "Analisar com IA"} <Sparkles className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border-hairline bg-surface-1 py-20 text-center">
            <Sparkles className="h-6 w-6 animate-pulse text-brand-ink" />
            <p className="text-sm text-ink-secondary">
              Analisando volume de vendas, concorrência, vídeos virais e gerando roteiro...
            </p>
          </div>
        )}

        {!loading && !result && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong py-20 text-center text-ink-muted">
            <Link2 className="h-8 w-8" />
            <p className="text-sm">Cole um link acima para ver a mágica acontecer.</p>
          </div>
        )}

        {result && !loading && (
          <div className="flex flex-col gap-4">
            {/* Overview */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
                    <ProductIcon name={result.image} className="h-7 w-7" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-ink-primary">{result.name}</h2>
                    <p className="text-sm text-ink-muted">{result.category}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={result.demand === "Alta" ? "good" : "warning"}>Demanda {result.demand}</Badge>
                      <Badge variant={result.competition === "Baixa" ? "good" : result.competition === "Média" ? "warning" : "critical"}>
                        Concorrência {result.competition}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col justify-center rounded-2xl bg-selected p-5 text-selected-foreground">
                <p className="text-xs font-medium opacity-70">Opportunity Score</p>
                <p className="text-4xl font-semibold">{result.opportunityScore}/100</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <MetricTile icon={TrendingUp} label="Volume de vendas" value={`${formatCompactNumber(result.salesVolume)}/mês`} />
              <MetricTile icon={DollarSign} label="Preço sugerido" value={formatCurrencyBRL(result.priceSuggested)} />
              <MetricTile icon={Flame} label="Margem estimada" value={`${result.marginEstimated}%`} />
              <MetricTile icon={Users2} label="Previsão de lucro" value={formatCurrencyBRL(result.profitForecast)} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-ink" /> Roteiro sugerido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap rounded-xl bg-surface-2 p-4 text-sm text-ink-secondary">
                    {result.script}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => copy(result.script, "script")}
                  >
                    {copied === "script" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "script" ? "Copiado" : "Copiar roteiro"}
                  </Button>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Legenda pronta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="rounded-xl bg-surface-2 p-4 text-sm text-ink-secondary">{result.caption}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => copy(result.caption, "caption")}>
                      {copied === "caption" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === "caption" ? "Copiado" : "Copiar legenda"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-brand-ink" /> Hashtags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {result.hashtags.map((h) => (
                      <Badge key={h} variant="subtle">
                        {h}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vídeos virais de referência</CardTitle>
                <p className="text-xs text-ink-muted">Formatos com maior potencial de viralização para este produto</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {result.viralVideos.map((v) => (
                  <div key={v.id} className="rounded-xl border border-border-hairline bg-surface-2 p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="subtle">{v.format}</Badge>
                      <span className="text-xs text-ink-muted">{v.duration}</span>
                    </div>
                    <p className="mt-3 text-sm text-ink-primary">&quot;{v.hook}&quot;</p>
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-ink">
                      <Flame className="h-3 w-3" /> {v.virality}% viralidade
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Descrição otimizada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="rounded-xl bg-surface-2 p-4 text-sm text-ink-secondary">{result.description}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function MetricTile({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <Card className="p-4">
      <Icon className="h-4 w-4 text-brand-ink" />
      <p className="mt-2 text-lg font-semibold text-ink-primary">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </Card>
  );
}

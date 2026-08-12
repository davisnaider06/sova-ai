import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductById } from "@/lib/data";
import { formatCurrencyBRL, formatCompactNumber, formatPercent, cn } from "@/lib/utils";
import { ProductIcon } from "@/components/dashboard/product-icon";

const competitionVariant = { Baixa: "good", Média: "warning", Alta: "critical" } as const;

export default async function ProdutoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const positive = product.growth >= 0;

  return (
    <>
      <Topbar title={product.name} subtitle={product.category} />

      <div className="flex flex-col gap-6 p-6">
        <Link href="/dashboard/produtos" className="flex w-fit items-center gap-2 text-sm text-ink-muted hover:text-ink-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar para produtos
        </Link>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="flex items-start gap-4 p-6">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
                <ProductIcon name={product.image} className="h-9 w-9" />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-ink-primary">{product.name}</h1>
                <p className="text-sm text-ink-muted">{product.category}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={product.demand === "Alta" ? "good" : "warning"}>Demanda {product.demand}</Badge>
                  <Badge variant={competitionVariant[product.competition]}>Concorrência {product.competition}</Badge>
                  <Badge
                    className={cn(
                      "flex items-center gap-1",
                      positive ? "text-[#4ade80]" : "text-[#f87171]",
                    )}
                    variant="subtle"
                  >
                    {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {formatPercent(product.growth, { signed: true })}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col justify-center rounded-2xl bg-selected p-6 text-selected-foreground">
            <p className="text-xs font-medium opacity-70">Opportunity Score</p>
            <p className="text-4xl font-semibold">{product.opportunityScore}/100</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Preço sugerido" value={formatCurrencyBRL(product.price)} />
          <StatTile label="Margem estimada" value={`${product.margin}%`} />
          <StatTile label="Vendas / 30 dias" value={formatCompactNumber(product.sales30d)} />
          <StatTile label="Criadores promovendo" value={product.creators.toString()} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Próximo passo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard/descobrir">
                <Sparkles className="h-4 w-4" /> Gerar roteiro para este produto
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/conteudo-ia">Criar vídeo com IA</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-lg font-semibold text-ink-primary">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </Card>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommissionCalculator } from "@/components/seller/commission-calculator";
import { requireSellerScope } from "@/lib/session";
import { categoryLabel } from "@/lib/categories";
import { formatMoney } from "@/lib/commission";
import { TIKTOK_SHOP_BR } from "@/lib/platform-fees";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  ARCHIVED: "Arquivado",
};

/// Percentual guardado como fração (0.15) volta para a tela como "15".
function toPercentField(value: { toString(): string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return String(Number(value.toString()) * 100);
}

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scope } = await requireSellerScope();

  const product = await scope.products.findByIdWithEconomics(id);
  if (!product) notFound();

  const economics = product.economics;

  return (
    <>
      <Topbar title={product.name} subtitle={categoryLabel(product.category)} />

      <div className="space-y-5 px-3 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard/produtos"
            className="flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Produtos
          </Link>
          <Button asChild variant="outline">
            <Link href={`/dashboard/produtos/${product.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-ink-primary">
                    {product.name}
                  </h2>
                  <Badge variant={product.status === "ACTIVE" ? "default" : "subtle"}>
                    {STATUS_LABEL[product.status] ?? product.status}
                  </Badge>
                </div>
                {product.description && (
                  <p className="mt-2 max-w-2xl text-sm text-ink-secondary">{product.description}</p>
                )}
                <p className="mt-3 text-sm text-ink-muted">
                  {categoryLabel(product.category)}
                  {product.stockQuantity !== null && ` · ${product.stockQuantity} em estoque`}
                </p>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-ink-primary">
                {formatMoney(product.price.toString())}
              </p>
            </div>
          </CardContent>
        </Card>

        {!economics ? (
          <Card>
            <CardHeader>
              <CardTitle>Quanto pagar de comissão</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-secondary">
                Faltam seus custos para calcular. Sem eles não dá para saber quanto sobra — e
                comissão chutada é margem perdida.
              </p>
              <Button asChild className="mt-4">
                <Link href={`/dashboard/produtos/${product.id}/editar`}>Informar custos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CommissionCalculator
            initial={{
              price: product.price.toString(),
              productCost: economics.productCost.toString(),
              shippingCost: economics.shippingCost.toString(),
              operationalCost: economics.operationalCost.toString(),
              minimumMargin: toPercentField(economics.minimumMargin),
              targetMargin: toPercentField(economics.targetMargin),
              feeScheduleId: TIKTOK_SHOP_BR.id,
            }}
          />
        )}
      </div>
    </>
  );
}

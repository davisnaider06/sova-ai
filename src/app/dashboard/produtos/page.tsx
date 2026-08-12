import Link from "next/link";
import { Package, Plus, AlertTriangle } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSellerScope } from "@/lib/session";
import { categoryLabel } from "@/lib/categories";
import { analyzeCommission, formatMoney, formatRate } from "@/lib/commission";
import { TIKTOK_SHOP_BR } from "@/lib/platform-fees";
import { prisma } from "@/lib/db";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  ARCHIVED: "Arquivado",
};

export default async function ProdutosPage() {
  const { scope } = await requireSellerScope();

  // A economia vem junto porque a lista mostra a comissão recomendada de cada
  // produto — sem ela seria uma query por linha.
  const products = await prisma.product.findMany({
    where: { sellerProfileId: scope.sellerProfileId },
    include: { economics: true, _count: { select: { affiliations: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Topbar title="Produtos" subtitle="O catálogo que os creators podem promover" />

      <div className="px-3 py-5 sm:px-6">
        {products.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-ink-muted">
                {products.length} {products.length === 1 ? "produto" : "produtos"}
              </p>
              <Button asChild>
                <Link href="/dashboard/produtos/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo produto
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const economics = product.economics;
                const analysis = economics
                  ? analyzeCommission({
                      price: product.price.toString(),
                      productCost: economics.productCost.toString(),
                      shippingCost: economics.shippingCost.toString(),
                      operationalCost: economics.operationalCost.toString(),
                      feeSchedule: TIKTOK_SHOP_BR,
                      minimumMargin: economics.minimumMargin?.toString() ?? null,
                      targetMargin: economics.targetMargin?.toString() ?? null,
                    })
                  : null;

                return (
                  <Link key={product.id} href={`/dashboard/produtos/${product.id}`}>
                    <Card className="h-full transition-shadow hover:shadow-lg">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-primary">{product.name}</p>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {categoryLabel(product.category)}
                            </p>
                          </div>
                          <Badge variant={product.status === "ACTIVE" ? "default" : "subtle"}>
                            {STATUS_LABEL[product.status] ?? product.status}
                          </Badge>
                        </div>

                        <p className="mt-4 text-2xl font-semibold tracking-tight text-ink-primary">
                          {formatMoney(product.price.toString())}
                        </p>

                        <div className="mt-4 border-t border-border-hairline pt-3 text-sm">
                          {!analysis ? (
                            <p className="text-xs text-ink-muted">
                              Sem custos cadastrados — comissão não calculada.
                            </p>
                          ) : analysis.status === "LOSS" ? (
                            <p className="flex items-center gap-1.5 text-xs text-status-critical">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              Dá prejuízo antes da comissão
                            </p>
                          ) : analysis.status === "NO_ROOM" ? (
                            <p className="flex items-center gap-1.5 text-xs text-ink-secondary">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              Sem espaço para comissão
                            </p>
                          ) : (
                            <p className="text-xs text-ink-secondary">
                              Comissão recomendada{" "}
                              <strong className="text-ink-primary">
                                {formatRate(analysis.recommendedRate)}
                              </strong>{" "}
                              · teto {formatRate(analysis.maxRate)}
                            </p>
                          )}

                          {product._count.affiliations > 0 && (
                            <p className="mt-1.5 text-xs text-ink-muted">
                              {product._count.affiliations}{" "}
                              {product._count.affiliations === 1 ? "creator" : "creators"} promovendo
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/// Primeiro login de cliente novo cai aqui. É a tela mais importante do
/// produto para quem nunca usou — se ela não disser o que fazer, o cadastro
/// morre no zero.
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-selected/10">
          <Package className="h-6 w-6 text-ink-secondary" />
        </span>
        <p className="mt-5 text-lg font-medium text-ink-primary">Nenhum produto ainda</p>
        <p className="mt-2 max-w-sm text-sm text-ink-muted">
          Cadastre o primeiro produto para calcular a comissão que cabe na sua margem e abrir para
          creators promoverem.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/produtos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar produto
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

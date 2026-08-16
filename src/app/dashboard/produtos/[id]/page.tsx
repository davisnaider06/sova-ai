import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, Users } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductForm } from "@/components/produtos/product-form";
import { CommissionCalculator } from "@/components/produtos/commission-calculator";
import { requireSellerScope } from "@/lib/session";
import { formatBRL, formatPercent, toCents, toPercent } from "@/lib/money";
import { DEFAULT_MINIMUM_MARGIN, DEFAULT_TARGET_MARGIN } from "@/lib/pricing";
import { updateProduct } from "../actions";
import { EconomicsForm } from "./economics-form";
import { ProductAffiliations } from "./product-affiliations";

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { scope } = await requireSellerScope();

  // Em paralelo, não em série: as duas consultas são independentes, e esperar
  // a primeira para só então pedir a segunda dobrava a espera. No caso de id
  // inexistente gastamos uma consulta à toa — que devolve vazio e é rara.
  const [product, affiliations] = await Promise.all([
    scope.products.findByIdWithEconomics(id),
    scope.affiliations.listForProduct(id),
  ]);
  if (!product) notFound();

  const priceCents = toCents(product.price);
  const economics = product.economics;

  const costs = {
    productCost: toCents(economics?.productCost),
    shippingCost: toCents(economics?.shippingCost),
    platformFee: toCents(economics?.platformFee),
    operationalCost: toCents(economics?.operationalCost),
  };

  const minimumMargin = economics?.minimumMargin
    ? Number(economics.minimumMargin.toString())
    : DEFAULT_MINIMUM_MARGIN;
  const targetMargin = economics?.targetMargin
    ? Number(economics.targetMargin.toString())
    : DEFAULT_TARGET_MARGIN;

  // Maior taxa efetivamente praticada nas afiliações vivas: é ela que a
  // calculadora compara com o teto, não a taxa teórica do produto.
  const activeRates = affiliations
    .filter((a) => a.status === "ACTIVE")
    .map((a) => Number(a.commissionRate.toString()));
  const currentRate = activeRates.length > 0 ? Math.max(...activeRates) : null;

  const pendingCount = affiliations.filter((a) => a.status === "PENDING").length;

  return (
    <>
      <Topbar title={product.name} subtitle={product.category} />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6">
        <Link
          href="/dashboard/produtos"
          className="flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para produtos
        </Link>

        <Card className="flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="h-6 w-6 text-ink-muted" />
            )}
          </span>

          <Summary label="Preço" value={formatBRL(priceCents)} />
          <Summary
            label="Custos"
            value={economics ? formatBRL(costs.productCost + costs.shippingCost + costs.platformFee + costs.operationalCost) : "—"}
            hint={economics ? undefined : "não informados"}
          />
          <Summary
            label="Creators ativos"
            value={String(affiliations.filter((a) => a.status === "ACTIVE").length)}
          />
          <Summary
            label="Comissão praticada"
            value={currentRate !== null ? formatPercent(currentRate) : "—"}
          />
        </Card>

        <Tabs defaultValue={economics ? "comissao" : "dados"}>
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="comissao">Custos e comissão</TabsTrigger>
            <TabsTrigger value="creators">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Creators
                {pendingCount > 0 && (
                  <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                    {pendingCount}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <ProductForm
              action={updateProduct}
              submitLabel="Salvar alterações"
              values={{
                id: product.id,
                name: product.name,
                description: product.description ?? "",
                category: product.category,
                price: (priceCents / 100).toFixed(2).replace(".", ","),
                stockQuantity: product.stockQuantity?.toString() ?? "",
                status: product.status,
                imageUrl: product.imageUrl ?? "",
              }}
            />
          </TabsContent>

          <TabsContent value="comissao">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
              <EconomicsForm
                productId={product.id}
                priceCents={priceCents}
                values={{
                  productCost: economics ? centsToInput(costs.productCost) : "",
                  shippingCost: economics ? centsToInput(costs.shippingCost) : "",
                  platformFee: economics ? centsToInput(costs.platformFee) : "",
                  operationalCost: economics ? centsToInput(costs.operationalCost) : "",
                  minimumMargin: economics?.minimumMargin
                    ? String(toPercent(economics.minimumMargin))
                    : String(DEFAULT_MINIMUM_MARGIN * 100),
                  targetMargin: economics?.targetMargin
                    ? String(toPercent(economics.targetMargin))
                    : String(DEFAULT_TARGET_MARGIN * 100),
                }}
              />

              {economics ? (
                <CommissionCalculator
                  priceCents={priceCents}
                  costs={costs}
                  minimumMargin={minimumMargin}
                  targetMargin={targetMargin}
                  currentRate={currentRate}
                />
              ) : (
                <Card className="flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-sm font-medium text-ink-primary">
                    Informe os custos ao lado
                  </p>
                  <p className="mt-1.5 max-w-xs text-sm text-ink-muted">
                    A comissão recomendada sai da diferença entre o preço e o que
                    esse produto custa para você. Sem os custos, qualquer número
                    aqui seria chute.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="creators">
            <ProductAffiliations
              affiliations={affiliations.map((a) => ({
                id: a.id,
                status: a.status,
                commissionRate: Number(a.commissionRate.toString()),
                creatorName: a.creatorProfile.profile.displayName,
                followers: a.creatorProfile.followersCount,
                niches: a.creatorProfile.niches,
                createdAt: a.createdAt.toISOString(),
              }))}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function Summary({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight text-ink-primary">{value}</p>
      {hint && <p className="text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

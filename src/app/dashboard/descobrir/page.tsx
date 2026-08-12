import { Compass } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { ProductDiscoveryCard } from "@/components/creator/product-discovery-card";
import { requireCreatorScope } from "@/lib/session";
import { prisma } from "@/lib/db";
import { analyzeCommission } from "@/lib/commission";
import { TIKTOK_SHOP_BR } from "@/lib/platform-fees";
import { estimateEarnings } from "@/lib/creator-earnings";
import { requestAffiliation } from "@/app/dashboard/afiliacoes/actions";

// Funcionalidades #2 e #3 do lado creator: produtos que combinam com o público
// dele, e quanto cada um paga — antes de gravar.
export default async function DescobrirPage() {
  const { scope, profile } = await requireCreatorScope();

  const creator = await prisma.creatorProfile.findUnique({
    where: { profileId: profile.id },
  });

  const [products, myAffiliations] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: { economics: true, sellerProfile: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    scope.affiliations.findMany({}),
  ]);

  const affiliatedProductIds = new Set(myAffiliations.map((a) => a.productId));
  const niches = creator?.niches ?? [];

  const cards = products.map((product) => {
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

    const rate = analysis?.recommendedRate ?? null;

    const earnings = estimateEarnings({
      price: product.price.toString(),
      commissionRate: rate?.toString() ?? 0,
      averageViews: creator?.averageViews ?? null,
      basis: creator?.averageViews ? "DECLARED" : "INFERRED",
    });

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      imageUrl: product.imageUrl,
      sellerName: product.sellerProfile.profile.displayName,
      commissionRate: rate?.toString() ?? null,
      perSale: earnings.perSale.toString(),
      estimatedLow: earnings.estimatedLow?.toString() ?? null,
      estimatedHigh: earnings.estimatedHigh?.toString() ?? null,
      basis: earnings.basis,
      // Sinal simples de afinidade: a categoria do produto está entre os nichos
      // declarados pelo creator. É `DECLARED`, e a UI diz isso — não é match
      // baseado em performance, que só existe depois de haver venda.
      matchesNiche: niches.includes(product.category),
      alreadyRequested: affiliatedProductIds.has(product.id),
    };
  });

  // Produtos do nicho declarado primeiro, depois os que pagam mais por venda.
  cards.sort((a, b) => {
    if (a.matchesNiche !== b.matchesNiche) return a.matchesNiche ? -1 : 1;
    return Number(b.perSale) - Number(a.perSale);
  });

  async function request(productId: string) {
    "use server";
    return requestAffiliation(productId);
  }

  return (
    <>
      <Topbar
        title="Descobrir produtos"
        subtitle="O que vende para quem te assiste, e quanto paga"
      />

      <div className="px-3 py-5 sm:px-6">
        {cards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-selected/10">
                <Compass className="h-6 w-6 text-ink-secondary" />
              </span>
              <p className="mt-5 text-lg font-medium text-ink-primary">
                Nenhum produto disponível ainda
              </p>
              <p className="mt-2 max-w-sm text-sm text-ink-muted">
                Assim que uma loja publicar um produto ativo, ele aparece aqui com a comissão e o
                quanto você ganha por venda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {niches.length === 0 && (
              <div className="mb-4 rounded-xl bg-selected/[0.05] p-4 text-sm text-ink-secondary">
                Você ainda não escolheu seus nichos. Sem isso, a ordem abaixo é só por quanto o
                produto paga — não por combinar com o seu público.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <ProductDiscoveryCard key={card.id} product={card} onRequest={request} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { Package, Users } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import { requireSellerScope } from "@/lib/session";
import { discoverCreatorsFor, DEFAULT_OFFER_RATE } from "@/lib/discovery";
import { toCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CreatorsList } from "./creators-list";

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>;
}) {
  const { produto } = await searchParams;
  const { scope } = await requireSellerScope();

  const products = await scope.products.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  if (products.length === 0) {
    return (
      <>
        <Topbar title="Encontrar creators" subtitle="Busque quem combina com cada produto" />
        <div className="p-6">
          <EmptyState
            icon={Package}
            title="Publique um produto primeiro"
            description="A busca de creators é sempre em relação a um produto — é o que permite pontuar nicho, histórico e oferta. Sem produto ativo não há o que comparar."
            action={{ href: "/dashboard/produtos", label: "Ver produtos" }}
          />
        </div>
      </>
    );
  }

  const selected = products.find((p) => p.id === produto) ?? products[0];

  // A taxa ofertada entra no score do creator (componente "oferta"), então ela
  // precisa ser a real: a da afiliação já praticada, se houver.
  const existing = await scope.affiliations.listForProduct(selected.id);
  const activeRates = existing
    .filter((a) => a.status === "ACTIVE")
    .map((a) => Number(a.commissionRate.toString()));

  // Campanha ativa que já inclui este produto: quando existe, a busca vira
  // também a porta de convite, onde o seller já está olhando para os creators
  // certos com o match na frente.
  const campaignProduct = await prisma.campaignProduct.findFirst({
    where: {
      productId: selected.id,
      campaign: { status: "ACTIVE", sellerProfileId: scope.sellerProfileId },
    },
    select: { campaign: { select: { id: true, name: true } } },
  });
  const campaign = campaignProduct?.campaign ?? null;

  const [creators, invited] = await Promise.all([
    discoverCreatorsFor({
      id: selected.id,
      category: selected.category,
      priceCents: toCents(selected.price),
      commissionRate: activeRates.length > 0 ? Math.max(...activeRates) : DEFAULT_OFFER_RATE,
    }),
    campaign
      ? prisma.campaignCreator.findMany({
          where: { campaignId: campaign.id },
          select: { creatorProfileId: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <Topbar
        title="Encontrar creators"
        subtitle={`${creators.length} ${creators.length === 1 ? "creator avaliado" : "creators avaliados"} para ${selected.name}`}
      />

      <div className="flex flex-col gap-5 p-6">
        {/* Seletor de produto: navegação por link, sem estado de cliente — o
            match é calculado no servidor e cada produto é uma URL própria. */}
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/creators?produto=${p.id}`}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors",
                p.id === selected.id
                  ? "bg-brand text-brand-foreground"
                  : "bg-surface-2 text-ink-secondary hover:bg-surface-3",
              )}
            >
              {p.name}
            </Link>
          ))}
        </div>

        {creators.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum creator cadastrado ainda"
            description="Conforme creators entrarem na plataforma, eles aparecem aqui pontuados contra este produto."
          />
        ) : (
          <CreatorsList
            creators={creators}
            productId={selected.id}
            productCategory={selected.category}
            campaign={campaign}
            invitedIds={invited.map((i) => i.creatorProfileId)}
          />
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { Check, Clock, Package, Users } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { MatchBreakdown, MatchScore } from "@/components/matching/match-score";
import { requireSellerScope } from "@/lib/session";
import { discoverCreatorsFor, DEFAULT_OFFER_RATE } from "@/lib/discovery";
import { formatCompactNumber, formatPercent, toCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { enableCreator } from "./actions";

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
  const bestExisting = await scope.affiliations.listForProduct(selected.id);
  const activeRates = bestExisting
    .filter((a) => a.status === "ACTIVE")
    .map((a) => Number(a.commissionRate.toString()));

  const creators = await discoverCreatorsFor({
    id: selected.id,
    category: selected.category,
    priceCents: toCents(selected.price),
    commissionRate: activeRates.length > 0 ? Math.max(...activeRates) : DEFAULT_OFFER_RATE,
  });

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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {creators.map((c) => (
              <Card key={c.creatorProfileId} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-primary">
                      {c.displayName}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {c.followers !== null
                        ? `${formatCompactNumber(c.followers)} seguidores`
                        : "Audiência não informada"}
                      {c.engagementRate !== null &&
                        ` · ${formatPercent(c.engagementRate)} engajamento`}
                    </p>
                  </div>
                  <MatchScore match={c.match} />
                </div>

                {c.bio && (
                  <p className="mt-3 line-clamp-2 text-xs text-ink-secondary">{c.bio}</p>
                )}

                {c.niches.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.niches.slice(0, 3).map((n) => (
                      <Badge
                        key={n}
                        variant={n === selected.category ? "default" : "subtle"}
                        className="px-2 py-0.5 text-[10px]"
                      >
                        {n}
                      </Badge>
                    ))}
                    {c.niches.length > 3 && (
                      <Badge variant="subtle" className="px-2 py-0.5 text-[10px]">
                        +{c.niches.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <MatchBreakdown match={c.match} />

                <div className="mt-4">
                  {c.affiliationStatus === "ACTIVE" ? (
                    <Badge variant="good" className="w-full justify-center py-2">
                      <Check className="h-3.5 w-3.5" />
                      Já promove este produto
                    </Badge>
                  ) : c.affiliationStatus === "PENDING" ? (
                    <Badge variant="warning" className="w-full justify-center py-2">
                      <Clock className="h-3.5 w-3.5" />
                      Pediu — aguardando você
                    </Badge>
                  ) : (
                    <form action={enableCreator}>
                      <input type="hidden" name="productId" value={selected.id} />
                      <input type="hidden" name="creatorProfileId" value={c.creatorProfileId} />
                      <SubmitButton
                        className="w-full"
                        size="sm"
                        variant="outline"
                        pendingLabel="Habilitando..."
                      >
                        Habilitar para promover
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

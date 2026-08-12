import "server-only";

import { prisma } from "@/lib/db";
import { toCents } from "@/lib/money";
import {
  matchCreatorToProduct,
  type CreatorSignals,
  type MatchResult,
  type ProductSignals,
} from "@/lib/matching";

// ---------------------------------------------------------------------------
// Descoberta — a única leitura que atravessa o tenant de propósito.
//
// O `scoped-db` existe para impedir que um seller leia dado de outro. Aqui é
// diferente: o catálogo de produtos ativos é público para creators, e a busca
// de creators é pública para sellers. É o marketplace.
//
// Por isso mora num módulo separado, com nome próprio, em vez de virar uma
// exceção dentro do escopo. Exceção dentro do escopo é como o escopo deixa de
// valer para tudo. Aqui, o que limita a leitura está explícito em cada função:
// só produto ACTIVE, só campo de vitrine, nunca custo nem token.
// ---------------------------------------------------------------------------

export type ScoredProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  priceCents: number;
  imageUrl: string | null;
  commissionRate: number;
  sellerName: string;
  match: MatchResult;
  /// Situação da afiliação deste creator com este produto, se já existir.
  affiliationStatus: string | null;
};

export type ScoredCreator = {
  creatorProfileId: string;
  displayName: string;
  bio: string | null;
  niches: string[];
  followers: number | null;
  engagementRate: number | null;
  match: MatchResult;
  affiliationStatus: string | null;
};

/// Monta os sinais de um creator a partir do banco.
///
/// O histórico por categoria sai de vendas reais atribuídas a ele — não de um
/// campo que alguém preencheu. É o único componente do match com procedência
/// PLATFORM, e é por isso que ele pesa o que pesa.
export async function loadCreatorSignals(creatorProfileId: string): Promise<CreatorSignals> {
  const [creator, externalAccount, items] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: {
        niches: true,
        followersCount: true,
        averageViews: true,
        engagementRate: true,
        profile: { select: { id: true } },
      },
    }),
    prisma.externalAccount.findFirst({
      where: {
        profile: { creatorProfile: { id: creatorProfileId } },
        status: "ACTIVE",
      },
      select: { id: true },
    }),
    // Linhas de pedido atribuídas a este creator, com a categoria do produto.
    // Agregação em memória: o Prisma não agrupa atravessando relação, e o
    // volume por creator é pequeno. Quando deixar de ser, isto vira uma view
    // materializada — mas não antes de existir o problema.
    prisma.orderItem.findMany({
      where: {
        order: {
          attributedAffiliation: { creatorProfileId },
          orderStatus: { notIn: ["CANCELLED", "RETURNED"] },
        },
      },
      select: {
        totalAmount: true,
        orderId: true,
        product: { select: { category: true } },
      },
    }),
  ]);

  const categoryHistory: CreatorSignals["categoryHistory"] = {};
  const ordersByCategory: Record<string, Set<string>> = {};

  for (const item of items) {
    const category = item.product.category;
    categoryHistory[category] ??= { gmvCents: 0, orders: 0 };
    categoryHistory[category].gmvCents += toCents(item.totalAmount);
    (ordersByCategory[category] ??= new Set()).add(item.orderId);
  }
  for (const [category, orderIds] of Object.entries(ordersByCategory)) {
    categoryHistory[category].orders = orderIds.size;
  }

  return {
    niches: creator?.niches ?? [],
    followers: creator?.followersCount ?? null,
    averageViews: creator?.averageViews ?? null,
    engagementRate: creator?.engagementRate
      ? Number(creator.engagementRate.toString())
      : null,
    categoryHistory,
    hasConnectedAccount: externalAccount !== null,
  };
}

/// Catálogo pontuado para um creator: todos os produtos ativos do marketplace,
/// com o match calculado e a situação da afiliação dele em cada um.
export async function discoverProductsFor(
  creatorProfileId: string,
  options: { category?: string; take?: number } = {},
): Promise<ScoredProduct[]> {
  const signals = await loadCreatorSignals(creatorProfileId);

  const [products, affiliations] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(options.category ? { category: options.category } : {}),
      },
      // Nada de `economics` aqui: custo do seller não é dado de vitrine e não
      // pode vazar para o outro lado do marketplace.
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        imageUrl: true,
        sellerProfile: {
          select: { profile: { select: { displayName: true } } },
        },
        // Taxa efetivamente ofertada: a maior comissão ativa deste produto.
        affiliations: {
          where: { status: "ACTIVE" },
          select: { commissionRate: true },
          orderBy: { commissionRate: "desc" },
          take: 1,
        },
        campaignProducts: {
          where: { campaign: { status: "ACTIVE" } },
          select: {
            commissionRate: true,
            campaign: { select: { commissionRate: true } },
          },
          take: 1,
        },
      },
      take: options.take ?? 200,
    }),
    prisma.affiliation.findMany({
      where: { creatorProfileId },
      select: { productId: true, status: true },
    }),
  ]);

  const statusByProduct = new Map(affiliations.map((a) => [a.productId, a.status]));

  return products
    .map((p): ScoredProduct => {
      const commissionRate = offeredRate(p);
      const productSignals: ProductSignals = {
        category: p.category,
        priceCents: toCents(p.price),
        commissionRate,
      };

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        priceCents: toCents(p.price),
        imageUrl: p.imageUrl,
        commissionRate,
        sellerName: p.sellerProfile.profile.displayName,
        match: matchCreatorToProduct(signals, productSignals),
        affiliationStatus: statusByProduct.get(p.id) ?? null,
      };
    })
    .sort((a, b) => b.match.score - a.match.score);
}

/// A busca do lado seller: creators pontuados contra um produto específico.
export async function discoverCreatorsFor(
  product: { id: string; category: string; priceCents: number; commissionRate: number },
  options: { take?: number } = {},
): Promise<ScoredCreator[]> {
  const creators = await prisma.creatorProfile.findMany({
    where: { profile: { status: "ACTIVE" } },
    select: {
      id: true,
      bio: true,
      niches: true,
      followersCount: true,
      engagementRate: true,
      profile: { select: { displayName: true } },
      affiliations: {
        where: { productId: product.id },
        select: { status: true },
        take: 1,
      },
    },
    take: options.take ?? 100,
  });

  const productSignals: ProductSignals = {
    category: product.category,
    priceCents: product.priceCents,
    commissionRate: product.commissionRate,
  };

  const scored = await Promise.all(
    creators.map(async (c): Promise<ScoredCreator> => {
      const signals = await loadCreatorSignals(c.id);
      return {
        creatorProfileId: c.id,
        displayName: c.profile.displayName,
        bio: c.bio,
        niches: c.niches,
        followers: c.followersCount,
        engagementRate: c.engagementRate ? Number(c.engagementRate.toString()) : null,
        match: matchCreatorToProduct(signals, productSignals),
        affiliationStatus: c.affiliations[0]?.status ?? null,
      };
    }),
  );

  return scored.sort((a, b) => b.match.score - a.match.score);
}

/// Taxa ofertada de um produto, na ordem de precedência do domínio:
/// campanha ativa sobrepõe produto, e a afiliação já negociada sobrepõe as duas.
/// Sem nenhuma, cai no padrão de mercado — explicitado como constante para não
/// virar número mágico no meio da query.
export const DEFAULT_OFFER_RATE = 0.15;

function offeredRate(p: {
  affiliations: Array<{ commissionRate: unknown }>;
  campaignProducts: Array<{
    commissionRate: unknown;
    campaign: { commissionRate: unknown };
  }>;
}): number {
  const fromAffiliation = p.affiliations[0]?.commissionRate;
  if (fromAffiliation != null) return Number(String(fromAffiliation));

  const cp = p.campaignProducts[0];
  if (cp?.commissionRate != null) return Number(String(cp.commissionRate));
  if (cp?.campaign.commissionRate != null) return Number(String(cp.campaign.commissionRate));

  return DEFAULT_OFFER_RATE;
}

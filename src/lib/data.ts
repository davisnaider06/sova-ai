import { prisma } from "@/lib/db";
import type { Product, TopSeller, MarketSignal } from "@/lib/mock-data";

// Camada de acesso a dados: lê do Neon (via Prisma) e devolve exatamente o
// mesmo formato que os componentes já esperavam de mock-data.ts, então nada
// na UI precisou mudar além de trocar o import.

const levelFromDb = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta" } as const;
const trendFromDb = { UP: "up", DOWN: "down" } as const;

export async function getProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ orderBy: { opportunityScore: "desc" } });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    image: p.image,
    price: p.price,
    margin: p.margin,
    sales30d: p.salesVolume,
    creators: p.creators,
    competition: levelFromDb[p.competition],
    demand: levelFromDb[p.demand],
    opportunityScore: p.opportunityScore,
    growth: p.growth,
  }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    image: p.image,
    price: p.price,
    margin: p.margin,
    sales30d: p.salesVolume,
    creators: p.creators,
    competition: levelFromDb[p.competition],
    demand: levelFromDb[p.demand],
    opportunityScore: p.opportunityScore,
    growth: p.growth,
  };
}

export async function getTopSellers(): Promise<TopSeller[]> {
  const rows = await prisma.topSeller.findMany({ orderBy: { rank: "asc" } });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    storeName: s.storeName,
    avatar: s.avatar,
    category: s.category,
    gmv: s.gmv,
    growth: s.growth,
    rank: s.rank,
  }));
}

export async function getMarketSignals(): Promise<MarketSignal[]> {
  const rows = await prisma.marketSignal.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    detail: m.detail,
    trend: trendFromDb[m.trend],
  }));
}

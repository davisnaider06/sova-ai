import {
  trendingProducts,
  topSellers,
  marketSignals,
  type Product,
  type TopSeller,
  type MarketSignal,
} from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// ATENÇÃO — este arquivo é temporariamente um stub.
//
// Antes, ele lia Product/TopSeller/MarketSignal do Neon. Esses modelos saíram
// do schema no Sprint 1: eram de outro produto (pesquisa de produto + gerador
// de copy, de um lado só), não uma versão inicial da Creator Commerce Platform.
// Ver DECISOES-E-PLANO.md §7.
//
// A decisão foi "manter a casca, jogar o miolo fora": as 13 páginas de
// dashboard continuam renderizando — agora sobre mock — enquanto o domínio
// novo é construído por baixo. Cada página migra para o domínio real no sprint
// que a cobre (produtos no Sprint 2, discovery no Sprint 3, e assim por diante),
// e some daqui.
//
// A assinatura async foi mantida de propósito: as páginas já fazem await, então
// a troca para as queries reais não mexe em nenhum componente.
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<Product[]> {
  return [...trendingProducts].sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export async function getProductById(id: string): Promise<Product | null> {
  return trendingProducts.find((p) => p.id === id) ?? null;
}

export async function getTopSellers(): Promise<TopSeller[]> {
  return [...topSellers].sort((a, b) => a.rank - b.rank);
}

export async function getMarketSignals(): Promise<MarketSignal[]> {
  return marketSignals;
}

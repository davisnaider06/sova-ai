// Dados simulados para o MVP do Sova AI.
// Estrutura pensada para ser trocada por chamadas reais de API sem mudar os componentes.

export type TimeRange = "7d" | "30d" | "90d";

export const kpis = {
  gmv: { value: 128450, delta: 18.4, label: "GMV" },
  orders: { value: 3214, delta: 9.2, label: "Pedidos" },
  profit: { value: 41230, delta: -3.1, label: "Lucro estimado" },
  conversion: { value: 4.8, delta: 1.6, label: "Conversão" },
};

export const gmvHistory: Record<TimeRange, { label: string; value: number }[]> = {
  "7d": [
    { label: "Seg", value: 14200 },
    { label: "Ter", value: 15800 },
    { label: "Qua", value: 13950 },
    { label: "Qui", value: 17200 },
    { label: "Sex", value: 21100 },
    { label: "Sáb", value: 24800 },
    { label: "Dom", value: 21400 },
  ],
  "30d": Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1}`,
    value: Math.round(3000 + Math.random() * 6000 + i * 120),
  })),
  "90d": Array.from({ length: 12 }, (_, i) => ({
    label: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i],
    value: Math.round(60000 + Math.random() * 40000 + i * 3000),
  })),
};

export const productivityBars = [
  { label: "Jan", value: 42 },
  { label: "Fev", value: 58 },
  { label: "Mar", value: 51 },
  { label: "Abr", value: 67 },
  { label: "Mai", value: 74, highlight: true },
  { label: "Jun", value: 61 },
];

export type Product = {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  margin: number;
  sales30d: number;
  creators: number;
  competition: "Baixa" | "Média" | "Alta";
  demand: "Baixa" | "Média" | "Alta";
  opportunityScore: number;
  growth: number;
};

export const trendingProducts: Product[] = [
  {
    id: "p1",
    name: "Mini massageador de pescoço",
    category: "Saúde & Bem-estar",
    image: "heart-pulse",
    price: 79.9,
    margin: 62,
    sales30d: 18400,
    creators: 214,
    competition: "Média",
    demand: "Alta",
    opportunityScore: 87,
    growth: 34.2,
  },
  {
    id: "p2",
    name: "Organizador de cabos magnético",
    category: "Casa & Escritório",
    image: "magnet",
    price: 39.9,
    margin: 71,
    sales30d: 12980,
    creators: 132,
    competition: "Baixa",
    demand: "Alta",
    opportunityScore: 92,
    growth: 51.7,
  },
  {
    id: "p3",
    name: "Luz de LED para unhas",
    category: "Beleza",
    image: "sparkle",
    price: 54.9,
    margin: 58,
    sales30d: 9840,
    creators: 301,
    competition: "Alta",
    demand: "Alta",
    opportunityScore: 68,
    growth: 12.4,
  },
  {
    id: "p4",
    name: "Suporte retrátil para celular",
    category: "Acessórios",
    image: "smartphone",
    price: 29.9,
    margin: 74,
    sales30d: 21500,
    creators: 189,
    competition: "Média",
    demand: "Alta",
    opportunityScore: 81,
    growth: 22.9,
  },
  {
    id: "p5",
    name: "Garrafa térmica motivacional",
    category: "Fitness",
    image: "glass-water",
    price: 64.9,
    margin: 55,
    sales30d: 15230,
    creators: 264,
    competition: "Alta",
    demand: "Média",
    opportunityScore: 59,
    growth: -4.1,
  },
  {
    id: "p6",
    name: "Mini impressora fotográfica",
    category: "Eletrônicos",
    image: "printer",
    price: 149.9,
    margin: 41,
    sales30d: 7120,
    creators: 98,
    competition: "Baixa",
    demand: "Média",
    opportunityScore: 76,
    growth: 28.6,
  },
];

export const bestOpportunity = trendingProducts.reduce((a, b) =>
  a.opportunityScore > b.opportunityScore ? a : b,
);

export const history = [
  { id: "h1", label: "Nike Store", sub: "Compra", value: -145.9, time: "Hoje, 20 Mar", avatar: "N" },
  { id: "h2", label: "Repasse TikTok Shop", sub: "Recebimento", value: 3820.4, time: "Hoje, 20 Mar", avatar: "T" },
  { id: "h3", label: "Ads Manager", sub: "Investimento em anúncios", value: -620.0, time: "Ontem, 19 Mar", avatar: "A" },
  { id: "h4", label: "Fornecedor CN Express", sub: "Reposição de estoque", value: -1290.0, time: "Ontem, 19 Mar", avatar: "F" },
  { id: "h5", label: "Repasse TikTok Shop", sub: "Recebimento", value: 2910.75, time: "18 Mar", avatar: "T" },
];

export const calendarActivity = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  level: Math.floor(Math.random() * 4), // 0-3 intensity
}));

export type Influencer = {
  id: string;
  name: string;
  handle: string;
  niche: string;
  followers: string;
  engagement: number;
  avgViews: string;
  match: number;
  avatar: string;
};

export const influencers: Influencer[] = [
  { id: "i1", name: "Bia Ferraz", handle: "@biaferraz", niche: "Beleza", followers: "482K", engagement: 7.2, avgViews: "180K", match: 94, avatar: "B" },
  { id: "i2", name: "Lucas Meireles", handle: "@lucasmeireles", niche: "Tech", followers: "312K", engagement: 5.8, avgViews: "95K", match: 88, avatar: "L" },
  { id: "i3", name: "Duda Prado", handle: "@dudaprado", niche: "Casa", followers: "205K", engagement: 9.1, avgViews: "140K", match: 91, avatar: "D" },
  { id: "i4", name: "Rafa Costa", handle: "@rafacosta.fit", niche: "Fitness", followers: "674K", engagement: 4.6, avgViews: "210K", match: 79, avatar: "R" },
  { id: "i5", name: "Nina Alves", handle: "@ninalves", niche: "Lifestyle", followers: "129K", engagement: 11.3, avgViews: "88K", match: 85, avatar: "N" },
];

export type AiInfluencer = {
  id: string;
  name: string;
  style: string;
  voice: string;
  status: "Pronta" | "Gerando" | "Rascunho";
  avatar: string;
};

export const aiInfluencers: AiInfluencer[] = [
  { id: "ai1", name: "Sofia AI", style: "Casual jovem", voice: "Feminina PT-BR", status: "Pronta", avatar: "S" },
  { id: "ai2", name: "Théo AI", style: "Tech reviewer", voice: "Masculina PT-BR", status: "Pronta", avatar: "T" },
  { id: "ai3", name: "Luna AI", style: "Lifestyle premium", voice: "Feminina PT-BR", status: "Gerando", avatar: "L" },
];

export const viralScripts = [
  {
    id: "s1",
    hook: "Eu não sabia que existia isso até ontem…",
    format: "Unboxing + reação",
    duration: "18s",
    virality: 89,
  },
  {
    id: "s2",
    hook: "3 motivos pra você parar de comprar [produto genérico]",
    format: "Lista rápida",
    duration: "24s",
    virality: 82,
  },
  {
    id: "s3",
    hook: "POV: você descobre esse produto 1 ano atrasado",
    format: "POV / storytelling",
    duration: "15s",
    virality: 91,
  },
];

export type MarketSignal = { id: string; title: string; detail: string; trend: "up" | "down" };

export const marketSignals: MarketSignal[] = [
  { id: "m1", title: "Categoria Beleza em alta", detail: "+38% de buscas na última semana", trend: "up" as const },
  { id: "m2", title: "Saturação em Fitness", detail: "Concorrência subiu 21% no mês", trend: "down" as const },
  { id: "m3", title: "Hashtag #tiktokmademebuyit voltando a crescer", detail: "+120% de vídeos novos em 7 dias", trend: "up" as const },
  { id: "m4", title: "CPM médio de anúncios caiu", detail: "-9% em relação ao mês passado", trend: "up" as const },
];

export type TopSeller = {
  id: string;
  name: string;
  storeName: string;
  avatar: string;
  category: string;
  gmv: number;
  growth: number;
  rank: number;
};

export const topSellers: TopSeller[] = [
  { id: "ts1", name: "Camila Duarte", storeName: "Bela Store", avatar: "C", category: "Beleza", gmv: 284900, growth: 42.1, rank: 1 },
  { id: "ts2", name: "Rodrigo Farias", storeName: "TechNow BR", avatar: "R", category: "Eletrônicos", gmv: 231500, growth: 18.7, rank: 2 },
  { id: "ts3", name: "Rocha Store BR", storeName: "Rocha Store BR", avatar: "MR", category: "Acessórios", gmv: 198200, growth: 27.4, rank: 3 },
  { id: "ts4", name: "Juliana Prado", storeName: "Casa Prática", avatar: "J", category: "Casa & Escritório", gmv: 176400, growth: -5.2, rank: 4 },
  { id: "ts5", name: "Marcos Vinicius", storeName: "FitLife Shop", avatar: "M", category: "Fitness", gmv: 152800, growth: 9.8, rank: 5 },
  { id: "ts6", name: "Bianca Torres", storeName: "Glow Beauty", avatar: "B", category: "Beleza", gmv: 138900, growth: 33.6, rank: 6 },
];

export const topProductsByGmv = [...trendingProducts]
  .map((p) => ({ ...p, gmv: Math.round(p.price * p.sales30d) }))
  .sort((a, b) => b.gmv - a.gmv);

export const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 67,
    tagline: "Pra quem está começando a vender",
    features: [
      "Pesquisa de produtos ilimitada",
      "Roteiros de vídeo com IA (10/mês)",
      "Dashboard de métricas essenciais",
      "Suporte por comunidade",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 97,
    tagline: "Para quem já vende e quer escalar",
    highlighted: true,
    features: [
      "Tudo do Starter",
      "Roteiros de vídeo com IA (ilimitado)",
      "Análise de concorrência avançada",
      "Influenciadores IA (3 avatares)",
      "Inteligência de mercado em tempo real",
      "Suporte prioritário",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: 197,
    tagline: "Para operações e agências",
    features: [
      "Tudo do Pro",
      "Múltiplas lojas conectadas",
      "Influenciadores IA ilimitados",
      "Geração de página de vendas com IA",
      "Gestor de conta dedicado",
    ],
  },
];

export function generateSalesPage(productId: string) {
  const product = trendingProducts.find((p) => p.id === productId) ?? trendingProducts[0];
  const originalPrice = Math.round(product.price * 1.6 * 100) / 100;
  return {
    product,
    headline: `${product.name}: o achado que está lotando o carrinho de todo mundo`,
    subheadline: `Mais de ${formatCompactNumberSafe(product.sales30d)} pessoas já compraram nos últimos 30 dias — envio rápido e estoque limitado.`,
    bullets: [
      `Resolve o problema na hora, sem complicação`,
      `Avaliado por milhares de clientes na TikTok Shop`,
      `Envio rápido e rastreável`,
      `Garantia de satisfação ou seu dinheiro de volta`,
    ],
    price: product.price,
    originalPrice,
    discountPercent: Math.round((1 - product.price / originalPrice) * 100),
    ctaText: "Quero o meu com desconto",
    urgency: "Oferta de lançamento válida enquanto durar o estoque",
    testimonials: [
      { name: "Fernanda A.", text: "Chegou rapidinho e é ainda melhor do que parecia no vídeo!" },
      { name: "Pedro L.", text: "Melhor custo-benefício que já comprei pela TikTok Shop." },
      { name: "Camila S.", text: "Já comprei o segundo de presente, recomendo demais." },
    ],
  };
}

function formatCompactNumberSafe(value: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function analyzeProductLink(url: string) {
  // Simula uma análise de IA a partir de um link colado pelo usuário.
  const seed = url.length % trendingProducts.length;
  const base = trendingProducts[seed];
  return {
    input: url,
    name: base.name,
    category: base.category,
    image: base.image,
    priceSuggested: base.price,
    marginEstimated: base.margin,
    salesVolume: base.sales30d,
    competition: base.competition,
    demand: base.demand,
    opportunityScore: base.opportunityScore,
    profitForecast: Math.round(base.price * base.sales30d * (base.margin / 100) * 0.02),
    viralVideos: viralScripts,
    hashtags: ["#tiktokshop", "#achadinhos", "#tiktokmademebuyit", `#${base.category.toLowerCase().replace(/[^a-z]/g, "")}`],
    script: `Hook: "${viralScripts[0].hook}"\n\nCena 1: Mostre o problema que o produto resolve em 2s.\nCena 2: Unboxing rápido, close no detalhe que mais impressiona.\nCena 3: Demonstração de uso real.\nCena 4: Resultado + reação genuína.\nCTA: "Link na vitrine, corre que costuma esgotar."`,
    caption: `Gente, achei ISSO e não consegui não comprar. ${base.name} tá com preço de lançamento, corre! #tiktokshop`,
    description: `${base.name} — ideal para quem busca praticidade no dia a dia. Alta demanda, avaliações positivas e envio rápido.`,
  };
}

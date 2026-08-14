// ---------------------------------------------------------------------------
// Seed de demonstração.
//
// Constrói um marketplace inteiro e coerente: sellers com produtos e custos,
// creators com nichos e audiência, afiliações em vários estados, conteúdo
// publicado, pedidos e comissões.
//
// Duas decisões que importam:
//
// 1. **A atribuição dos pedidos usa `decideAttribution`, a mesma função da
//    aplicação.** Gerar as comissões com uma regra paralela aqui produziria uma
//    demonstração que não bate com o que o software faz — e é assim que se
//    apresenta um número que some quando o cliente clica.
//
// 2. **Usuários de demonstração têm id com prefixo `demo_`.** O id de User é o
//    id do Clerk (`user_...`). O prefixo separado garante que nenhum registro
//    fabricado aqui colida com uma conta real.
//
// Uso:
//   npx prisma db seed                          → só o ecossistema de demonstração
//   SEED_USER_ID=user_xxx npx prisma db seed    → e também dá os dois papéis a você
//
// O id do Clerk está em Clerk > Users. Rodar de novo é seguro: tudo é upsert
// por chave estável, e os pedidos são idempotentes por externalOrderId.
// ---------------------------------------------------------------------------

import { PrismaClient, Prisma } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import { decideAttribution } from "../src/lib/attribution";

const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));
const rate = (n: number) => new Prisma.Decimal(n.toFixed(4));

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

// --- Catálogo de demonstração ---------------------------------------------

type SeedProduct = {
  key: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  shipping: number;
  feeRate: number;
};

type SeedSeller = {
  key: string;
  name: string;
  company: string;
  products: SeedProduct[];
};

const SELLERS: SeedSeller[] = [
  {
    key: "nutri",
    name: "NutriForce",
    company: "NutriForce Suplementos LTDA",
    products: [
      {
        key: "creatina",
        name: "Creatina Monohidratada 300g",
        description:
          "Creatina pura, sem sabor, com laudo de pureza. Para quem treina forte e quer resultado consistente.",
        category: "Saúde e suplementos",
        price: 129.9,
        cost: 48,
        shipping: 14,
        feeRate: 0.06,
      },
      {
        key: "whey",
        name: "Whey Protein Concentrado 900g",
        description: "24g de proteína por dose, sabor baunilha. Dissolve fácil e não empelota.",
        category: "Saúde e suplementos",
        price: 189.9,
        cost: 82,
        shipping: 18,
        feeRate: 0.06,
      },
      {
        key: "colageno",
        name: "Colágeno Verisol + Vitamina C",
        description: "Colágeno hidrolisado com vitamina C para pele, cabelo e unhas. 30 doses.",
        category: "Beleza e cuidados pessoais",
        price: 97.0,
        cost: 34,
        shipping: 12,
        feeRate: 0.06,
      },
    ],
  },
  {
    key: "casa",
    name: "Casa Viva",
    company: "Casa Viva Utilidades ME",
    products: [
      {
        key: "organizador",
        name: "Kit 6 Organizadores de Geladeira",
        description: "Transparentes, empilháveis, livres de BPA. Cabe em qualquer prateleira.",
        category: "Casa e cozinha",
        price: 79.9,
        cost: 27,
        shipping: 16,
        feeRate: 0.05,
      },
      {
        key: "panela",
        name: "Panela Antiaderente 24cm Indução",
        description: "Revestimento cerâmico, funciona em indução. Não solta o antiaderente.",
        category: "Casa e cozinha",
        price: 159.9,
        cost: 71,
        shipping: 22,
        feeRate: 0.05,
      },
    ],
  },
  {
    key: "glow",
    name: "Glow Lab",
    company: "Glow Lab Cosméticos",
    products: [
      {
        key: "serum",
        name: "Sérum Facial Vitamina C 30ml",
        description: "10% de vitamina C estabilizada. Uniformiza o tom sem irritar pele sensível.",
        category: "Beleza e cuidados pessoais",
        price: 119.9,
        cost: 31,
        shipping: 10,
        feeRate: 0.06,
      },
      {
        key: "protetor",
        name: "Protetor Solar Facial FPS 60 Toque Seco",
        description: "Não deixa a pele oleosa e não marca de branco. Serve de base para maquiagem.",
        category: "Beleza e cuidados pessoais",
        price: 89.9,
        cost: 29,
        shipping: 10,
        feeRate: 0.06,
      },
    ],
  },
];

type SeedCreator = {
  key: string;
  name: string;
  bio: string;
  niches: string[];
  followers: number;
  avgViews: number;
  engagement: number;
};

const CREATORS: SeedCreator[] = [
  {
    key: "joana",
    name: "Joana Fit",
    bio: "Treino e suplementação para quem está começando. Sem fórmula mágica.",
    niches: ["Saúde e suplementos", "Fitness e esportes"],
    followers: 128_000,
    avgViews: 42_000,
    engagement: 0.058,
  },
  {
    key: "marcos",
    name: "Marcos Treina",
    bio: "Powerlifting e nutrição esportiva. Vídeos de bastidores de treino.",
    niches: ["Fitness e esportes", "Saúde e suplementos"],
    followers: 54_000,
    avgViews: 18_000,
    engagement: 0.041,
  },
  {
    key: "bia",
    name: "Bia Skincare",
    bio: "Rotina de skin care sem enrolação, para pele oleosa e sensível.",
    niches: ["Beleza e cuidados pessoais"],
    followers: 216_000,
    avgViews: 88_000,
    engagement: 0.062,
  },
  {
    key: "carol",
    name: "Carol Organiza",
    bio: "Organização de casa em apartamento pequeno. Antes e depois todo sábado.",
    niches: ["Casa e cozinha"],
    followers: 74_000,
    avgViews: 31_000,
    engagement: 0.049,
  },
  {
    key: "rafa",
    name: "Rafa Cozinha",
    bio: "Receita rápida pra quem chega cansado. Panela suja é permitida.",
    niches: ["Casa e cozinha", "Alimentos e bebidas"],
    followers: 31_000,
    avgViews: 12_000,
    engagement: 0.037,
  },
  {
    key: "novato",
    name: "Pedro Começando",
    bio: "Comecei essa semana. Bora aprender junto.",
    niches: ["Saúde e suplementos"],
    followers: 1_800,
    avgViews: 600,
    engagement: 0.071,
  },
];

// Afiliações: [creator, produto, status, taxa]
const AFFILIATIONS: Array<[string, string, "ACTIVE" | "PENDING" | "PAUSED" | "REJECTED", number]> = [
  ["joana", "creatina", "ACTIVE", 0.2],
  ["joana", "whey", "ACTIVE", 0.18],
  ["marcos", "whey", "ACTIVE", 0.18],
  ["marcos", "creatina", "PENDING", 0.2],
  ["bia", "serum", "ACTIVE", 0.25],
  ["bia", "protetor", "ACTIVE", 0.22],
  ["bia", "colageno", "ACTIVE", 0.2],
  ["carol", "organizador", "ACTIVE", 0.18],
  ["carol", "panela", "PENDING", 0.15],
  ["rafa", "panela", "ACTIVE", 0.15],
  ["novato", "creatina", "PENDING", 0.2],
  ["rafa", "organizador", "REJECTED", 0.18],
];

// Conteúdo: [creator, produto, dias atrás, título]
const CONTENTS: Array<[string, string, number, string]> = [
  ["joana", "creatina", 22, "Como eu tomo creatina todo dia (e o que mudou)"],
  ["joana", "creatina", 6, "Respondendo as dúvidas de creatina de vocês"],
  ["joana", "whey", 12, "Meu shake pós-treino de 2 minutos"],
  ["marcos", "whey", 9, "Testei o whey mais barato que achei"],
  ["bia", "serum", 15, "Vitamina C: como usar sem descamar a pele"],
  ["bia", "serum", 3, "1 mês usando vitamina C — antes e depois"],
  ["bia", "protetor", 8, "Protetor solar que não marca de branco"],
  ["carol", "organizador", 11, "Organizei a geladeira inteira em 20 minutos"],
  ["rafa", "panela", 5, "Panela de indução barata funciona? testei"],
];

// Pedidos: [produto, dias atrás, quantidade, status, creator declarado ou null]
const ORDERS: Array<[string, number, number, string, string | null]> = [
  ["creatina", 20, 1, "DELIVERED", "Joana Fit"],
  ["creatina", 18, 2, "DELIVERED", "Joana Fit"],
  ["creatina", 14, 1, "DELIVERED", null],
  ["creatina", 5, 1, "DELIVERED", "Joana Fit"],
  ["creatina", 4, 3, "DELIVERED", "Joana Fit"],
  ["creatina", 2, 1, "SHIPPED", "Joana Fit"],
  ["whey", 19, 1, "DELIVERED", "Joana Fit"],
  ["whey", 11, 1, "DELIVERED", "Joana Fit"],
  ["whey", 8, 2, "DELIVERED", "Marcos Treina"],
  ["whey", 7, 1, "DELIVERED", "Marcos Treina"],
  ["whey", 3, 1, "CONFIRMED", "Marcos Treina"],
  ["serum", 16, 1, "DELIVERED", "Bia Skincare"],
  ["serum", 13, 2, "DELIVERED", "Bia Skincare"],
  ["serum", 12, 1, "DELIVERED", "Bia Skincare"],
  ["serum", 2, 4, "DELIVERED", "Bia Skincare"],
  ["serum", 1, 2, "CONFIRMED", "Bia Skincare"],
  ["protetor", 7, 1, "DELIVERED", "Bia Skincare"],
  ["protetor", 6, 3, "DELIVERED", "Bia Skincare"],
  ["colageno", 10, 1, "DELIVERED", null],
  ["organizador", 10, 2, "DELIVERED", "Carol Organiza"],
  ["organizador", 9, 1, "DELIVERED", "Carol Organiza"],
  ["organizador", 4, 1, "DELIVERED", "Carol Organiza"],
  ["panela", 4, 1, "DELIVERED", "Rafa Cozinha"],
  ["panela", 3, 1, "SHIPPED", null],
  ["panela", 21, 1, "CANCELLED", null],

  // Os dois casos que a atribuição precisa saber recusar — sem eles a
  // demonstração passa a impressão de que tudo sempre tem dono.
  //
  // Empate: whey tem Joana e Marcos ativos, e nesta data nenhum dos dois tinha
  // publicado ainda. Fica sem atribuição, para decisão manual.
  ["whey", 25, 1, "DELIVERED", null],
  // Venda anterior a qualquer afiliação: orgânica de verdade.
  ["colageno", 34, 1, "DELIVERED", null],
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Configure DATABASE_URL em .env.local antes de rodar o seed.");
  }

  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

  // --- Sellers e produtos -------------------------------------------------
  const sellerIds = new Map<string, string>();
  const productIds = new Map<string, string>();

  for (const seller of SELLERS) {
    const userId = `demo_seller_${seller.key}`;

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${seller.key}@demo.sova.ai`, name: seller.name },
    });

    const profile = await prisma.profile.upsert({
      where: { userId_type: { userId, type: "SELLER" } },
      update: { displayName: seller.name },
      create: {
        userId,
        type: "SELLER",
        displayName: seller.name,
        sellerProfile: { create: { companyName: seller.company, businessType: "Marca própria" } },
      },
      include: { sellerProfile: true },
    });

    const sellerProfileId = profile.sellerProfile!.id;
    sellerIds.set(seller.key, sellerProfileId);

    for (const p of seller.products) {
      const product = await prisma.product.upsert({
        where: {
          source_externalProductId: { source: "MANUAL", externalProductId: `demo-${p.key}` },
        },
        update: { price: dec(p.price), status: "ACTIVE" },
        create: {
          sellerProfileId,
          name: p.name,
          description: p.description,
          category: p.category,
          price: dec(p.price),
          stockQuantity: 250,
          status: "ACTIVE",
          source: "MANUAL",
          externalProductId: `demo-${p.key}`,
        },
      });

      productIds.set(p.key, product.id);

      await prisma.productEconomics.upsert({
        where: { productId: product.id },
        update: {},
        create: {
          productId: product.id,
          productCost: dec(p.cost),
          shippingCost: dec(p.shipping),
          platformFee: dec(p.price * p.feeRate),
          operationalCost: dec(3),
          minimumMargin: rate(0.12),
          targetMargin: rate(0.25),
        },
      });
    }
  }

  // --- Creators -----------------------------------------------------------
  const creatorIds = new Map<string, string>();
  const creatorNames = new Map<string, string>();

  for (const c of CREATORS) {
    const userId = `demo_creator_${c.key}`;

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${c.key}@demo.sova.ai`, name: c.name },
    });

    const profile = await prisma.profile.upsert({
      where: { userId_type: { userId, type: "CREATOR" } },
      update: { displayName: c.name },
      create: {
        userId,
        type: "CREATOR",
        displayName: c.name,
        creatorProfile: {
          create: {
            bio: c.bio,
            niches: c.niches,
            followersCount: c.followers,
            averageViews: c.avgViews,
            engagementRate: rate(c.engagement),
          },
        },
      },
      include: { creatorProfile: true },
    });

    const creatorProfileId = profile.creatorProfile!.id;
    creatorIds.set(c.key, creatorProfileId);
    creatorNames.set(c.key, c.name);

    // Métricas com procedência: o que o creator declarou vale menos que o que
    // seria medido. O seed grava isso explicitamente em vez de deixar implícito.
    const existing = await prisma.profileMetric.count({
      where: { profileId: profile.id, key: "followers" },
    });
    if (existing === 0) {
      await prisma.profileMetric.createMany({
        data: [
          {
            profileId: profile.id,
            key: "followers",
            value: dec(c.followers),
            unit: "seguidores",
            source: "DECLARED",
            confidence: rate(0.3),
            calculationMethod: "informado no perfil",
          },
          {
            profileId: profile.id,
            key: "avg_views",
            value: dec(c.avgViews),
            unit: "views",
            source: "DECLARED",
            confidence: rate(0.3),
            calculationMethod: "informado no perfil",
          },
        ],
      });
    }
  }

  // --- Afiliações ---------------------------------------------------------
  for (const [creatorKey, productKey, status, commissionRate] of AFFILIATIONS) {
    const creatorProfileId = creatorIds.get(creatorKey)!;
    const productId = productIds.get(productKey)!;

    await prisma.affiliation.upsert({
      where: { creatorProfileId_productId: { creatorProfileId, productId } },
      update: {},
      create: {
        creatorProfileId,
        productId,
        commissionRate: rate(commissionRate),
        status,
        // Começa antes do pedido mais antigo, senão a atribuição descarta tudo
        // por "afiliação não estava ativa na data".
        startedAt: status === "PENDING" ? null : daysAgo(30),
      },
    });
  }

  // --- Conteúdo -----------------------------------------------------------
  for (const [creatorKey, productKey, days, title] of CONTENTS) {
    const creatorProfileId = creatorIds.get(creatorKey)!;
    const productId = productIds.get(productKey)!;
    const externalContentId = `demo-${creatorKey}-${productKey}-${days}`;

    await prisma.content.upsert({
      where: { source_externalContentId: { source: "MANUAL", externalContentId } },
      update: {},
      create: {
        creatorProfileId,
        productId,
        contentType: "VIDEO",
        title,
        url: `https://www.tiktok.com/@${creatorKey}/video/${7_400_000_000 + days}`,
        publishedAt: daysAgo(days),
        source: "MANUAL",
        externalContentId,
      },
    });
  }

  // --- Pedidos, atribuição e comissões ------------------------------------
  let ordersCreated = 0;
  let commissionsCreated = 0;

  for (const [index, [productKey, days, quantity, status, declaredCreator]] of ORDERS.entries()) {
    const externalOrderId = `DEMO-${String(1000 + index)}`;

    const already = await prisma.order.findUnique({
      where: { source_externalOrderId: { source: "CSV_IMPORT", externalOrderId } },
      select: { id: true },
    });
    if (already) continue;

    const productId = productIds.get(productKey)!;
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { price: true, sellerProfileId: true },
    });

    const unitPrice = Number(product.price.toString());
    const total = unitPrice * quantity;
    const placedAt = daysAgo(days);

    const candidates = await prisma.affiliation.findMany({
      where: { productId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        commissionRate: true,
        creatorProfileId: true,
        creatorProfile: {
          select: {
            profile: { select: { displayName: true } },
            contents: {
              where: { productId, publishedAt: { not: null, lte: placedAt } },
              orderBy: { publishedAt: "desc" },
              take: 1,
              select: { publishedAt: true },
            },
          },
        },
      },
    });

    // A MESMA função da aplicação decide. Se a regra mudar, a demonstração
    // muda junto — que é o ponto.
    const decision = decideAttribution({
      placedAt,
      declaredCreatorHandle: declaredCreator,
      candidates: candidates.map((a) => ({
        affiliationId: a.id,
        creatorProfileId: a.creatorProfileId,
        creatorHandle: a.creatorProfile.profile.displayName,
        startedAt: a.startedAt,
        endedAt: a.endedAt,
        status: a.status,
        lastContentAt: a.creatorProfile.contents[0]?.publishedAt ?? null,
      })),
    });

    const attributed = candidates.find((a) => a.id === decision.affiliationId) ?? null;
    const commissionRate = attributed ? Number(attributed.commissionRate.toString()) : 0;
    const commissionCents = attributed ? Math.round(total * 100 * commissionRate) : 0;

    await prisma.order.create({
      data: {
        sellerProfileId: product.sellerProfileId,
        orderStatus: status as never,
        paymentStatus: status === "CANCELLED" ? "FAILED" : "PAID",
        totalAmount: dec(total),
        creatorCommission: dec(commissionCents / 100),
        netRevenue: dec(total - commissionCents / 100),
        source: "CSV_IMPORT",
        externalOrderId,
        syncedAt: new Date(),
        placedAt,
        attributedAffiliationId: decision.affiliationId,
        attributedAt: decision.affiliationId ? placedAt : null,
        attributionWindowDays: decision.windowDays,
        items: {
          create: [
            {
              productId,
              quantity,
              unitPrice: dec(unitPrice),
              totalAmount: dec(total),
            },
          ],
        },
        ...(attributed && commissionCents > 0 && status !== "CANCELLED"
          ? {
              commissions: {
                create: {
                  creatorProfileId: attributed.creatorProfileId,
                  affiliationId: attributed.id,
                  rate: rate(commissionRate),
                  estimatedAmount: dec(commissionCents / 100),
                  status: status === "DELIVERED" ? "APPROVED" : "PENDING",
                },
              },
            }
          : {}),
      },
    });

    ordersCreated++;
    if (attributed && commissionCents > 0 && status !== "CANCELLED") commissionsCreated++;
  }

  // --- Campanha de exemplo ------------------------------------------------
  const glowSellerId = sellerIds.get("glow")!;
  const existingCampaign = await prisma.campaign.findFirst({
    where: { sellerProfileId: glowSellerId, name: "Verão — linha facial" },
    select: { id: true },
  });

  if (!existingCampaign) {
    await prisma.campaign.create({
      data: {
        sellerProfileId: glowSellerId,
        name: "Verão — linha facial",
        description:
          "Empurrar sérum e protetor juntos até o fim de janeiro, com comissão acima do padrão.",
        status: "ACTIVE",
        startAt: daysAgo(20),
        endAt: daysAgo(-40),
        commissionRate: rate(0.28),
        targetSales: 300,
        budget: dec(15_000),
        products: {
          create: [
            { productId: productIds.get("serum")! },
            { productId: productIds.get("protetor")! },
          ],
        },
        creators: {
          create: [{ creatorProfileId: creatorIds.get("bia")!, status: "ACCEPTED", acceptedAt: daysAgo(18) }],
        },
      },
    });
  }

  // --- Liga os pedidos existentes à campanha ------------------------------
  //
  // Os pedidos são criados antes da campanha, então precisam ser vinculados
  // depois. Mesma regra da ingestão: só entra pedido de produto da campanha,
  // dentro da janela dela — senão a campanha exibiria resultado que não gerou.
  const campanha = await prisma.campaign.findFirst({
    where: { sellerProfileId: glowSellerId, name: "Verão — linha facial" },
    select: { id: true, startAt: true, endAt: true, products: { select: { productId: true } } },
  });

  if (campanha) {
    const alvo = campanha.products.map((p) => p.productId);
    const { count: vinculados } = await prisma.order.updateMany({
      where: {
        campaignId: null,
        items: { some: { productId: { in: alvo } } },
        ...(campanha.startAt ? { placedAt: { gte: campanha.startAt } } : {}),
        ...(campanha.endAt ? { placedAt: { lte: campanha.endAt } } : {}),
      },
      data: { campaignId: campanha.id },
    });

    if (vinculados > 0) {
      await prisma.commission.updateMany({
        where: { campaignId: null, order: { campaignId: campanha.id } },
        data: { campaignId: campanha.id },
      });
      console.log(`✓ ${vinculados} pedidos vinculados à campanha de demonstração.`);
    }
  }

  // --- Perfis para a sua conta real ---------------------------------------
  const userId = process.env.SEED_USER_ID;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.warn(
        `\n⚠ SEED_USER_ID=${userId} não existe no banco ainda. Faça login uma vez na ` +
          `aplicação e rode o seed de novo — o ensureUser() cria o registro no primeiro acesso.`,
      );
    } else {
      const seller = await prisma.profile.upsert({
        where: { userId_type: { userId, type: "SELLER" } },
        update: {},
        create: {
          userId,
          type: "SELLER",
          displayName: user.name ?? "Minha loja",
          sellerProfile: { create: { companyName: user.name ?? "Minha loja" } },
        },
        include: { sellerProfile: true },
      });

      await prisma.profile.upsert({
        where: { userId_type: { userId, type: "CREATOR" } },
        update: {},
        create: {
          userId,
          type: "CREATOR",
          displayName: user.name ?? "Meu perfil de creator",
          creatorProfile: {
            create: {
              bio: "Perfil de teste com os dois papéis.",
              niches: ["Saúde e suplementos", "Casa e cozinha"],
              followersCount: 12_500,
              averageViews: 4_200,
              engagementRate: rate(0.044),
            },
          },
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { activeProfileId: seller.id },
      });

      console.log(`✓ Seus dois perfis (seller + creator) prontos para ${user.email}.`);
    }
  } else {
    console.log(
      "\nDica: rode com SEED_USER_ID=user_xxxxx para receber os dois papéis na sua conta.",
    );
  }

  const counts = {
    sellers: SELLERS.length,
    produtos: productIds.size,
    creators: CREATORS.length,
    afiliacoes: AFFILIATIONS.length,
    conteudos: CONTENTS.length,
    pedidos: ordersCreated,
    comissoes: commissionsCreated,
  };

  console.log("\n✓ Seed concluído:", counts);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

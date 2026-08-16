// Seed de demonstração.
//
//   npx prisma db seed
//
// **Apaga tudo e recria.** É um seed de vitrine, para olhar as telas com dado
// plausível — não um seed incremental.
//
// O ponto delicado: `User.id` **é** o id do Clerk. Inventar um id aqui faria o
// `ensureUser()` tentar criar outra linha no primeiro login e bater na
// constraint de e-mail único — a conta ficaria quebrada de um jeito difícil de
// diagnosticar. Por isso o id do dono vem de `OWNER_CLERK_ID`, lido do painel
// do Clerk, e não de um cuid gerado.

import { PrismaClient, Prisma } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

const OWNER_EMAIL = "davisnaider06@gmail.com";
const OWNER_CLERK_ID = process.env.OWNER_CLERK_ID ?? "user_3HjRZLr99MbzJ5T7SkhBlmackAN";

const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));
const rate = (n: number) => new Prisma.Decimal(n.toFixed(4));
const dias = (n: number) => new Date(Date.now() - n * 86_400_000);

/// Aleatoriedade com semente fixa: o seed roda duas vezes e produz os mesmos
/// números. Sem isso, comparar duas execuções de uma tela vira adivinhação.
let semente = 42;
function rnd() {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
}
const entre = (a: number, b: number) => Math.floor(rnd() * (b - a + 1)) + a;
const escolha = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];

const CATALOGO = [
  { nome: "Mini massageador de pescoço", cat: "Saúde e suplementos", preco: 79.9, custo: 28 },
  { nome: "Creatina monohidratada 300g", cat: "Saúde e suplementos", preco: 129.9, custo: 52 },
  { nome: "Kit skincare vitamina C", cat: "Beleza e cuidados pessoais", preco: 89.9, custo: 31 },
  { nome: "Luminária de mesa LED touch", cat: "Casa e cozinha", preco: 64.9, custo: 22 },
  { nome: "Fone bluetooth esportivo", cat: "Eletrônicos e acessórios", preco: 149.9, custo: 58 },
  { nome: "Legging alta compressão", cat: "Moda feminina", preco: 99.9, custo: 34 },
  { nome: "Garrafa térmica 1L", cat: "Fitness e esportes", preco: 74.9, custo: 26 },
  { nome: "Organizador de gaveta 6 peças", cat: "Casa e cozinha", preco: 49.9, custo: 16 },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Configure DATABASE_URL em .env.local.");

  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

  // --- Limpeza ------------------------------------------------------------
  // Ordem importa: filhos antes dos pais, porque nem toda FK é Cascade.
  console.log("Limpando...");
  await prisma.commission.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.contentPerformance.deleteMany();
  await prisma.content.deleteMany();
  await prisma.campaignCreator.deleteMany();
  await prisma.campaignProduct.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.affiliation.deleteMany();
  await prisma.productEconomics.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tikTokVideo.deleteMany();
  await prisma.externalAccount.deleteMany();
  await prisma.profileMetric.deleteMany();
  await prisma.event.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.job.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // --- Dono ---------------------------------------------------------------
  console.log("Criando o dono...");
  const dono = await prisma.user.create({
    data: {
      id: OWNER_CLERK_ID,
      email: OWNER_EMAIL,
      name: "Davi Snaider",
      role: "ADMIN",
      subscription: {
        create: {
          email: OWNER_EMAIL,
          provider: "MANUAL",
          status: "ACTIVE",
          planName: "Anual",
          startedAt: dias(40),
          currentPeriodEnd: dias(-325),
        },
      },
      // Os dois papéis, para dar para alternar no switcher e ver as duas
      // experiências sem criar uma segunda conta.
      profiles: {
        create: [
          {
            type: "SELLER",
            displayName: "Atlas Store",
            sellerProfile: {
              create: { companyName: "Atlas Assessoria", businessType: "MEI", sellerScore: dec(78) },
            },
          },
          {
            type: "CREATOR",
            displayName: "Davi Snaider",
            creatorProfile: {
              create: {
                bio: "Testo produtos de casa e bem-estar e mostro o que realmente funciona.",
                niches: ["Casa e cozinha", "Saúde e suplementos"],
                followersCount: 28400,
                engagementRate: new Prisma.Decimal("0.0620"),
                averageViews: 18500,
                creatorScore: dec(82),
              },
            },
          },
        ],
      },
    },
    include: { profiles: { include: { sellerProfile: true, creatorProfile: true } } },
  });

  const seller = dono.profiles.find((p) => p.type === "SELLER")!;
  const creator = dono.profiles.find((p) => p.type === "CREATOR")!;
  const sellerId = seller.sellerProfile!.id;
  const creatorId = creator.creatorProfile!.id;

  // --- Métricas do creator, com procedência ------------------------------
  await prisma.profileMetric.createMany({
    data: [
      { profileId: creator.id, key: "followers", value: dec(28400), unit: "seguidores", source: "DECLARED", confidence: new Prisma.Decimal("0.30") },
      { profileId: creator.id, key: "avg_views", value: dec(18500), unit: "views", source: "DECLARED", confidence: new Prisma.Decimal("0.30") },
      { profileId: creator.id, key: "gmv", category: "Casa e cozinha", value: dec(1284000), unit: "centavos", source: "PLATFORM", confidence: new Prisma.Decimal("0.95") },
    ],
  });

  // --- Produtos -----------------------------------------------------------
  console.log("Criando produtos...");
  const produtos = [];
  for (const p of CATALOGO) {
    produtos.push(
      await prisma.product.create({
        data: {
          sellerProfileId: sellerId,
          name: p.nome,
          category: p.cat,
          description: `${p.nome} — item de giro rápido, com boa margem para trabalhar com creators.`,
          price: dec(p.preco),
          stockQuantity: entre(40, 900),
          status: "ACTIVE",
          source: "MANUAL",
          economics: {
            create: {
              productCost: dec(p.custo),
              shippingCost: dec(12),
              // Tabela do TikTok BR: 10% + R$ 4 abaixo de R$ 50, 6% + R$ 6 acima.
              platformFee: dec(p.preco >= 50 ? p.preco * 0.06 + 6 : p.preco * 0.1 + 4),
              operationalCost: dec(3),
              minimumMargin: rate(0.15),
              targetMargin: rate(0.3),
            },
          },
        },
      }),
    );
  }

  // --- Afiliações ---------------------------------------------------------
  const afiliados = produtos.slice(0, 5);
  const afiliacoes = [];
  for (const [i, produto] of afiliados.entries()) {
    afiliacoes.push(
      await prisma.affiliation.create({
        data: {
          creatorProfileId: creatorId,
          productId: produto.id,
          commissionRate: rate(escolha([0.12, 0.15, 0.18, 0.2])),
          status: i === 4 ? "PENDING" : "ACTIVE",
          startedAt: i === 4 ? null : dias(35 - i * 4),
        },
      }),
    );
  }
  const ativas = afiliacoes.filter((a) => a.status === "ACTIVE");

  // --- Campanha -----------------------------------------------------------
  const campanha = await prisma.campaign.create({
    data: {
      sellerProfileId: sellerId,
      name: "Casa & Bem-estar — Agosto",
      description: "Empurrão nos produtos de maior margem antes do fim do mês.",
      status: "ACTIVE",
      startAt: dias(20),
      endAt: dias(-10),
      commissionRate: rate(0.2),
      targetSales: 300,
      budget: dec(4000),
      products: { create: afiliados.slice(0, 3).map((p) => ({ productId: p.id, commissionRate: rate(0.2) })) },
      creators: { create: [{ creatorProfileId: creatorId, status: "ACCEPTED", acceptedAt: dias(19) }] },
    },
  });

  // --- Pedidos, comissões -------------------------------------------------
  console.log("Criando pedidos...");
  let totalPedidos = 0;
  for (let d = 55; d >= 0; d--) {
    const quantos = entre(0, 3);
    for (let n = 0; n < quantos; n++) {
      const afiliacao = escolha(ativas);
      const produto = produtos.find((p) => p.id === afiliacao.productId)!;
      const qtd = entre(1, 2);
      const preco = Number(produto.price);
      const total = preco * qtd;
      const taxa = preco >= 50 ? total * 0.06 + 6 : total * 0.1 + 4;
      const comissaoRate = Number(afiliacao.commissionRate);
      const comissao = total * comissaoRate;
      const cancelado = rnd() < 0.06;

      const pedido = await prisma.order.create({
        data: {
          sellerProfileId: sellerId,
          campaignId: rnd() < 0.4 ? campanha.id : null,
          orderStatus: cancelado ? "CANCELLED" : "DELIVERED",
          paymentStatus: cancelado ? "REFUNDED" : "PAID",
          fulfillmentStatus: cancelado ? "RETURNED" : "DELIVERED",
          totalAmount: dec(total),
          platformFee: dec(taxa),
          creatorCommission: dec(comissao),
          refundAmount: dec(cancelado ? total : 0),
          netRevenue: dec(cancelado ? 0 : total - taxa - comissao),
          estimatedProfit: dec(cancelado ? 0 : total - taxa - comissao - 28 * qtd),
          attributedAffiliationId: afiliacao.id,
          attributedAt: dias(d),
          attributionWindowDays: 7,
          source: "CSV_IMPORT",
          externalOrderId: `demo-${d}-${n}`,
          placedAt: dias(d),
          items: {
            create: [{ productId: produto.id, quantity: qtd, unitPrice: dec(preco), totalAmount: dec(total) }],
          },
        },
      });
      totalPedidos++;

      if (!cancelado) {
        await prisma.commission.create({
          data: {
            creatorProfileId: creatorId,
            orderId: pedido.id,
            affiliationId: afiliacao.id,
            campaignId: pedido.campaignId,
            rate: rate(comissaoRate),
            estimatedAmount: dec(comissao),
            finalAmount: d > 15 ? dec(comissao) : null,
            status: d > 15 ? "PAID" : d > 5 ? "APPROVED" : "ESTIMATED",
          },
        });
      }
    }
  }

  // --- Conteúdo -----------------------------------------------------------
  for (const [i, afiliacao] of ativas.entries()) {
    const produto = produtos.find((p) => p.id === afiliacao.productId)!;
    const views = entre(8000, 92000);
    const conteudo = await prisma.content.create({
      data: {
        creatorProfileId: creatorId,
        productId: produto.id,
        campaignId: i < 2 ? campanha.id : null,
        contentType: "VIDEO",
        title: `Testei o ${produto.name.toLowerCase()} por 7 dias`,
        url: `https://www.tiktok.com/@davisnaider/video/74${entre(10000000, 99999999)}`,
        publishedAt: dias(30 - i * 5),
        source: "PLATFORM",
        views,
        likes: Math.round(views * 0.07),
        comments: Math.round(views * 0.004),
        shares: Math.round(views * 0.011),
        clicks: Math.round(views * 0.031),
        orders: entre(4, 40),
        gmv: dec(entre(400, 4200)),
        commission: dec(entre(60, 700)),
        lastPerformanceAt: dias(1),
      },
    });
    await prisma.contentPerformance.create({
      data: {
        contentId: conteudo.id,
        views,
        clicks: Math.round(views * 0.031),
        orders: entre(4, 40),
        gmv: dec(entre(400, 4200)),
        commission: dec(entre(60, 700)),
        source: "PLATFORM",
        recordedAt: dias(1),
      },
    });
  }

  // --- Outros assinantes, para o painel de admin não ficar vazio ----------
  console.log("Criando assinantes de exemplo...");
  const outros = [
    { email: "juliana.ramos@exemplo.com", nome: "Juliana Ramos", plano: "Mensal", cents: 14700, status: "ACTIVE" as const, dia: 3 },
    { email: "marcos.lima@exemplo.com", nome: "Marcos Lima", plano: "Trimestral", cents: 29700, status: "ACTIVE" as const, dia: 12 },
    { email: "carla.souza@exemplo.com", nome: "Carla Souza", plano: "Anual", cents: 59700, status: "ACTIVE" as const, dia: 26 },
    { email: "pedro.alves@exemplo.com", nome: "Pedro Alves", plano: "Mensal", cents: 14700, status: "CANCELED" as const, dia: 48 },
    { email: "renata.dias@exemplo.com", nome: "Renata Dias", plano: "Mensal", cents: 14700, status: "EXPIRED" as const, dia: 70 },
  ];

  for (const [i, o] of outros.entries()) {
    const u = await prisma.user.create({
      data: { id: `user_demo_${i}`, email: o.email, name: o.nome, role: "MEMBER" },
    });
    const assinatura = await prisma.subscription.create({
      data: {
        email: o.email,
        userId: u.id,
        provider: "HUBLA",
        externalId: `sub_demo_${i}`,
        status: o.status,
        planName: o.plano,
        startedAt: dias(o.dia),
        canceledAt: o.status === "CANCELED" ? dias(5) : null,
      },
    });
    if (o.status !== "EXPIRED") {
      await prisma.payment.create({
        data: {
          subscriptionId: assinatura.id,
          email: o.email,
          provider: "HUBLA",
          externalId: `inv_demo_${i}`,
          amountCents: o.cents,
          status: "paid",
          paidAt: dias(o.dia),
        },
      });
    }
  }

  // Um pagamento do próprio dono, para o total do mês não sair zerado.
  const assinaturaDono = await prisma.subscription.findUnique({ where: { email: OWNER_EMAIL } });
  await prisma.payment.create({
    data: {
      subscriptionId: assinaturaDono!.id,
      email: OWNER_EMAIL,
      provider: "HUBLA",
      externalId: "inv_demo_owner",
      amountCents: 59700,
      status: "paid",
      paidAt: dias(40),
    },
  });

  const [pagamentos, receita] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.aggregate({ _sum: { amountCents: true } }),
  ]);

  console.log(`
Pronto.
  dono            ${OWNER_EMAIL}  (ADMIN, assinatura ativa, perfis SELLER + CREATOR)
  produtos        ${produtos.length}
  afiliações      ${afiliacoes.length} (${ativas.length} ativas, 1 pendente)
  campanha        1
  pedidos         ${totalPedidos}
  assinantes      ${outros.length + 1}
  faturamento     R$ ${((receita._sum.amountCents ?? 0) / 100).toFixed(2)} em ${pagamentos} pagamentos
`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

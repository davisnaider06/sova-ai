// Seed de desenvolvimento do domínio novo (Sprint 1).
//
// O seed antigo populava Product/TopSeller/MarketSignal, modelos que saíram do
// schema. No domínio novo não existe produto sem seller, e não existe seller
// sem User — e User vem do Clerk, não daqui. Então o seed é opt-in:
//
//   SEED_USER_ID=user_xxxxx npx prisma db seed
//
// Pegue o id em Clerk > Users (começa com "user_"). Sem a variável, o seed não
// faz nada — é o comportamento certo, não um erro.
//
// O que ele cria: um SellerProfile de demonstração para esse usuário, com os
// produtos de mock-data.ts e a economia de cada um, para dar o que clicar na
// calculadora de comissão recomendada do Sprint 2.

import { PrismaClient, Prisma } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import { trendingProducts } from "../src/lib/mock-data";

const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Configure DATABASE_URL em .env.local antes de rodar o seed.");
  }

  const userId = process.env.SEED_USER_ID;
  if (!userId) {
    console.log(
      "SEED_USER_ID não definido — nada a fazer.\n" +
        "Uso: SEED_USER_ID=user_xxxxx npx prisma db seed",
    );
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(
      `Usuário ${userId} não existe no banco. Faça login uma vez com o webhook do ` +
        `Clerk configurado para ele ser sincronizado, ou confira o id no painel do Clerk.`,
    );
  }

  const profile = await prisma.profile.upsert({
    where: { userId_type: { userId, type: "SELLER" } },
    update: {},
    create: {
      userId,
      type: "SELLER",
      displayName: user.name ?? "Loja de demonstração",
      sellerProfile: { create: { companyName: "Loja de demonstração" } },
    },
    include: { sellerProfile: true },
  });

  const sellerProfileId = profile.sellerProfile!.id;

  for (const p of trendingProducts) {
    // margin em mock-data é percentual (62 = 62%), então o custo é o
    // complemento: preço × (1 − margem).
    const productCost = p.price * (1 - p.margin / 100);

    await prisma.product.upsert({
      where: { source_externalProductId: { source: "MANUAL", externalProductId: `demo-${p.id}` } },
      update: {},
      create: {
        sellerProfileId,
        name: p.name,
        category: p.category,
        price: dec(p.price),
        status: "ACTIVE",
        source: "MANUAL",
        externalProductId: `demo-${p.id}`,
        metadata: { icon: p.image },
        economics: {
          create: {
            productCost: dec(productCost),
            shippingCost: dec(12),
            platformFee: dec(p.price * 0.05),
            minimumMargin: new Prisma.Decimal("0.15"),
            targetMargin: new Prisma.Decimal("0.30"),
          },
        },
      },
    });
  }

  console.log(
    `Seed concluído: SellerProfile ${sellerProfileId} com ${trendingProducts.length} produtos.`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

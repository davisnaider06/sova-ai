// Popula o banco Neon com os dados de referência (produtos, top vendedores,
// sinais de mercado). Rode depois de configurar DATABASE_URL e `prisma db push`:
//   npx prisma db seed

import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import { trendingProducts, topSellers, marketSignals } from "../src/lib/mock-data";

const levelMap = { Baixa: "BAIXA", Média: "MEDIA", Alta: "ALTA" } as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Configure DATABASE_URL em .env.local antes de rodar o seed.");
  }
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

  await prisma.product.deleteMany();
  await prisma.topSeller.deleteMany();
  await prisma.marketSignal.deleteMany();

  await prisma.product.createMany({
    data: trendingProducts.map((p) => ({
      name: p.name,
      category: p.category,
      image: p.image,
      price: p.price,
      margin: p.margin,
      salesVolume: p.sales30d,
      creators: p.creators,
      competition: levelMap[p.competition],
      demand: levelMap[p.demand],
      opportunityScore: p.opportunityScore,
      growth: p.growth,
    })),
  });

  await prisma.topSeller.createMany({
    data: topSellers.map((s) => ({
      name: s.name,
      storeName: s.storeName,
      avatar: s.avatar,
      category: s.category,
      gmv: s.gmv,
      growth: s.growth,
      rank: s.rank,
    })),
  });

  await prisma.marketSignal.createMany({
    data: marketSignals.map((m) => ({
      title: m.title,
      detail: m.detail,
      trend: m.trend === "up" ? "UP" : "DOWN",
    })),
  });

  console.log("Seed concluído.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

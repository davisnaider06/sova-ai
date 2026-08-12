// Script de diagnóstico — resumo do que existe no banco.
//   npx tsx scripts/probe-db.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const [users, profiles, products, affiliations, orders, commissions] = await Promise.all([
    prisma.user.count(),
    prisma.profile.count(),
    prisma.product.count(),
    prisma.affiliation.count(),
    prisma.order.count(),
    prisma.commission.count(),
  ]);

  console.log("CONTAGENS:", { users, profiles, products, affiliations, orders, commissions });

  const attributed = await prisma.order.count({ where: { attributedAffiliationId: { not: null } } });
  console.log(`\nATRIBUIÇÃO: ${attributed}/${orders} pedidos com creator`);

  const events = await prisma.event.findMany({
    where: { eventType: "ORDER_IMPORTED" },
    orderBy: { occurredAt: "desc" },
    take: 5,
    select: { metadata: true },
  });
  if (events.length > 0) {
    console.log("\nÚLTIMAS RAZÕES DE ATRIBUIÇÃO (importação):");
    for (const e of events) {
      const m = e.metadata as Record<string, unknown> | null;
      console.log(`  ${m?.externalOrderId}: ${m?.attributionReason}`);
    }
  }

  const orphans = await prisma.order.findMany({
    where: { attributedAffiliationId: null },
    select: { externalOrderId: true, placedAt: true, attributionWindowDays: true },
  });
  console.log(`\nSEM ATRIBUIÇÃO (${orphans.length}):`);
  for (const o of orphans) {
    console.log(`  ${o.externalOrderId} · ${o.placedAt.toLocaleDateString("pt-BR")} · janela ${o.attributionWindowDays}d`);
  }

  const topCreators = await prisma.commission.groupBy({
    by: ["creatorProfileId"],
    _sum: { estimatedAmount: true },
    _count: { _all: true },
  });
  console.log("\nCOMISSÕES POR CREATOR:");
  for (const row of topCreators) {
    const c = await prisma.creatorProfile.findUnique({
      where: { id: row.creatorProfileId },
      select: { profile: { select: { displayName: true } } },
    });
    console.log(
      `  ${c?.profile.displayName}: ${row._count._all} vendas · R$ ${row._sum.estimatedAmount?.toString()}`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});

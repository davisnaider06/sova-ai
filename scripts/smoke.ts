// Smoke test da camada de dados: roda as consultas mais pesadas das páginas
// contra o banco populado, sem browser. Pega erro de runtime em query, Decimal
// e agregação — que typecheck não pega.
//
//   npx tsx scripts/smoke.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// O módulo de db da aplicação é um singleton próprio; aqui injetamos o nosso
// para não depender do alias "@/" fora do bundler do Next.
(globalThis as { prisma?: unknown }).prisma = prisma;

let failures = 0;

async function check(name: string, fn: () => Promise<string>) {
  try {
    const detail = await fn();
    console.log(`  ✓ ${name} — ${detail}`);
  } catch (error) {
    failures++;
    console.error(`  ✗ ${name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const seller = await prisma.sellerProfile.findFirstOrThrow({
    where: { profile: { displayName: "NutriForce" } },
    select: { id: true, profileId: true },
  });
  const creator = await prisma.creatorProfile.findFirstOrThrow({
    where: { profile: { displayName: "Joana Fit" } },
    select: { id: true, profileId: true },
  });

  console.log("\nDASHBOARD DO SELLER");
  const { loadSellerStats, loadCreatorStats } = await import("../src/lib/dashboard-stats");

  await check("loadSellerStats", async () => {
    const s = await loadSellerStats(seller.id);
    if (s.series.length !== 30) throw new Error(`série com ${s.series.length} pontos, esperava 30`);
    return `GMV ${(s.gmvCents / 100).toFixed(2)} · ${s.orders} pedidos · ${s.activeCreators} creators · top ${s.topProducts.length}`;
  });

  console.log("\nDASHBOARD DO CREATOR");
  await check("loadCreatorStats", async () => {
    const s = await loadCreatorStats(creator.id);
    return `ganhou ${(s.earnedCents / 100).toFixed(2)} · ${s.attributedOrders} vendas · ${s.activeAffiliations} afiliações`;
  });

  console.log("\nDESCOBERTA E MATCHING");
  const { discoverProductsFor, discoverCreatorsFor, loadCreatorSignals } = await import(
    "../src/lib/discovery"
  );

  await check("loadCreatorSignals", async () => {
    const sig = await loadCreatorSignals(creator.id);
    const cats = Object.keys(sig.categoryHistory);
    if (cats.length === 0) throw new Error("creator com vendas deveria ter histórico por categoria");
    return `${sig.followers} seguidores · histórico em ${cats.join(", ")}`;
  });

  await check("discoverProductsFor (creator → produtos)", async () => {
    const list = await discoverProductsFor(creator.id);
    if (list.length === 0) throw new Error("nenhum produto ativo encontrado");
    const top = list[0];
    if (top.match.components.length === 0) throw new Error("match sem componentes");
    return `${list.length} produtos · topo "${top.name}" score ${top.match.score} conf. ${top.match.confidenceLevel}`;
  });

  await check("matching usa histórico quando existe", async () => {
    const list = await discoverProductsFor(creator.id);
    const suplemento = list.find((p) => p.category === "Saúde e suplementos");
    if (!suplemento) throw new Error("nenhum produto de suplementos no catálogo");
    const hasHistory = suplemento.match.components.some((c) => c.key === "historico");
    if (!hasHistory) throw new Error("Joana vendeu suplementos mas o match não usou o histórico");
    return `componente de histórico presente (${suplemento.match.headline})`;
  });

  await check("creator novo recebe confiança baixa", async () => {
    const novato = await prisma.creatorProfile.findFirstOrThrow({
      where: { profile: { displayName: "Pedro Começando" } },
      select: { id: true },
    });
    const list = await discoverProductsFor(novato.id);
    const top = list[0];
    if (top.match.confidenceLevel !== "baixa") {
      throw new Error(`esperava confiança baixa, veio ${top.match.confidenceLevel}`);
    }
    if (top.match.improves.length === 0) throw new Error("deveria sugerir como melhorar");
    return `score ${top.match.score}, confiança baixa, ${top.match.improves.length} sugestões`;
  });

  await check("discoverCreatorsFor (seller → creators)", async () => {
    const product = await prisma.product.findFirstOrThrow({
      where: { sellerProfileId: seller.id, category: "Saúde e suplementos" },
      select: { id: true, category: true, price: true },
    });
    const list = await discoverCreatorsFor({
      id: product.id,
      category: product.category,
      priceCents: Math.round(Number(product.price.toString()) * 100),
      commissionRate: 0.2,
    });
    if (list.length === 0) throw new Error("nenhum creator avaliado");
    return `${list.length} creators · topo "${list[0].displayName}" score ${list[0].match.score}`;
  });

  console.log("\nINTEGRIDADE DO DOMÍNIO");

  // Commission.affiliationId é obrigatório no schema, então órfã é impossível.
  // O que pode dar errado é a comissão ser creditada a um creator diferente do
  // que detém a afiliação — aí o dinheiro vai para a pessoa errada.
  await check("comissão é creditada a quem detém a afiliação", async () => {
    const rows = await prisma.commission.findMany({
      select: { id: true, creatorProfileId: true, affiliation: { select: { creatorProfileId: true } } },
    });
    for (const r of rows) {
      if (r.creatorProfileId !== r.affiliation.creatorProfileId) {
        throw new Error(`comissão ${r.id} creditada a creator diferente do da afiliação`);
      }
    }
    return `${rows.length} comissões conferidas`;
  });

  await check("taxa da comissão bate com o valor gravado", async () => {
    const commissions = await prisma.commission.findMany({
      include: { order: { select: { totalAmount: true } } },
      take: 50,
    });
    for (const c of commissions) {
      const expected = Math.round(
        Number(c.order.totalAmount.toString()) * 100 * Number(c.rate.toString()),
      );
      const actual = Math.round(Number(c.estimatedAmount.toString()) * 100);
      if (Math.abs(expected - actual) > 1) {
        throw new Error(`comissão ${c.id}: esperava ${expected} centavos, gravado ${actual}`);
      }
    }
    return `${commissions.length} comissões conferidas`;
  });

  await check("pedido cancelado não gera comissão", async () => {
    const bad = await prisma.commission.count({
      where: { order: { orderStatus: { in: ["CANCELLED", "RETURNED"] } } },
    });
    if (bad > 0) throw new Error(`${bad} comissões em pedidos cancelados`);
    return "nenhuma";
  });

  await check("todo pedido atribuído gravou a janela usada", async () => {
    const missing = await prisma.order.count({
      where: { attributedAffiliationId: { not: null }, attributionWindowDays: null },
    });
    if (missing > 0) throw new Error(`${missing} pedidos sem janela gravada`);
    return "auditável";
  });

  await prisma.$disconnect();

  console.log(failures === 0 ? "\n✓ Smoke test passou.\n" : `\n✗ ${failures} falha(s).\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});

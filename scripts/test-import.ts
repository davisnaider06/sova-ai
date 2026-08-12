// Testa a importação de CSV ponta a ponta contra o banco real, incluindo a
// idempotência (roda o mesmo arquivo duas vezes).
//
//   npx tsx --conditions=react-server scripts/test-import.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
(globalThis as { prisma?: unknown }).prisma = prisma;

// Planilha propositalmente suja: BOM, ponto-e-vírgula, data brasileira, vírgula
// decimal, produto referenciado pelo nome, aspas com vírgula dentro, uma linha
// com produto inexistente e uma linha sem data.
const CSV = `﻿pedido_id;data;produto;quantidade;preço unitário;total;status;creator
IMP-9001;05/08/2026;Creatina Monohidratada 300g;1;129,90;129,90;Entregue;Joana Fit
IMP-9002;06/08/2026;"Whey Protein Concentrado 900g";2;189,90;379,80;Enviado;Marcos Treina
IMP-9002;06/08/2026;Creatina Monohidratada 300g;1;129,90;129,90;Enviado;Marcos Treina
IMP-9003;07/08/2026;Produto Que Nao Existe;1;50,00;50,00;Entregue;
IMP-9004;;Creatina Monohidratada 300g;1;129,90;129,90;Entregue;
IMP-9005;08/08/2026;Sérum Facial Vitamina C 30ml;3;119,90;359,70;Entregue;Bia Skincare
`;

async function main() {
  const { importOrdersCsv } = await import("../src/lib/integration/orders-import");

  const seller = await prisma.sellerProfile.findFirstOrThrow({
    where: { profile: { displayName: "NutriForce" } },
    select: { id: true },
  });

  console.log("\n--- 1ª importação ---");
  const first = await importOrdersCsv(seller.id, CSV);
  console.log(first);

  console.log("\n--- 2ª importação (mesmo arquivo) ---");
  const second = await importOrdersCsv(seller.id, CSV);
  console.log(second);

  // --- Verificações -------------------------------------------------------
  const problems: string[] = [];

  if (first.ordersCreated === 0) problems.push("primeira importação não criou nada");
  if (second.ordersCreated !== 0) {
    problems.push(`reimportar criou ${second.ordersCreated} pedidos — idempotência falhou`);
  }
  if (second.ordersSkipped !== first.ordersCreated) {
    problems.push(
      `reimportar pulou ${second.ordersSkipped}, esperava ${first.ordersCreated}`,
    );
  }
  // Três linhas devem falhar: sem data, produto inexistente, e o produto que
  // pertence a OUTRO seller — este último é o isolamento de tenant aparecendo
  // como erro de linha, que é exatamente o comportamento desejado.
  if (first.errors.length !== 3) {
    problems.push(
      `esperava 3 linhas com erro (sem data, produto inexistente, produto de outro seller), veio ${first.errors.length}`,
    );
  }

  // O pedido IMP-9002 tem duas linhas: precisa virar UM Order com DOIS itens.
  const multi = await prisma.order.findUnique({
    where: { source_externalOrderId: { source: "CSV_IMPORT", externalOrderId: "IMP-9002" } },
    include: { items: true },
  });
  if (!multi) {
    problems.push("IMP-9002 não foi criado");
  } else if (multi.items.length !== 2) {
    problems.push(`IMP-9002 tem ${multi.items.length} itens, esperava 2`);
  }

  // O produto de outro seller (Sérum, da Glow Lab) não pode entrar no catálogo
  // da NutriForce — deve virar erro de linha, não pedido.
  const alheio = await prisma.order.findUnique({
    where: { source_externalOrderId: { source: "CSV_IMPORT", externalOrderId: "IMP-9005" } },
    select: { id: true },
  });
  if (alheio) problems.push("IMP-9005 importou produto de outro seller");

  console.log("\n--- Erros reportados ---");
  for (const e of first.errors) console.log(`  linha ${e.line}: ${e.message}`);

  // Limpeza: este script suja o banco de demonstração.
  const created = await prisma.order.findMany({
    where: { externalOrderId: { startsWith: "IMP-9" } },
    select: { id: true },
  });
  await prisma.commission.deleteMany({ where: { orderId: { in: created.map((o) => o.id) } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: created.map((o) => o.id) } } });
  await prisma.order.deleteMany({ where: { id: { in: created.map((o) => o.id) } } });
  console.log(`\nLimpeza: ${created.length} pedidos de teste removidos.`);

  await prisma.$disconnect();

  if (problems.length > 0) {
    console.error("\n✗ PROBLEMAS:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("\n✓ Importação ponta a ponta OK.\n");
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});

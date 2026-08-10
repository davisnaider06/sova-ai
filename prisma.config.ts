import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "prisma/config";

// Neon: usa a conexão direta (sem -pooler) para migrations quando disponível,
// caindo para DATABASE_URL se DIRECT_URL não estiver configurada.
// Lido via process.env (em vez do helper `env()`) porque em dev, antes de a
// connection string do Neon existir, essas variáveis ficam vazias — e
// `prisma generate` precisa funcionar mesmo sem banco configurado ainda.
const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: connectionUrl,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

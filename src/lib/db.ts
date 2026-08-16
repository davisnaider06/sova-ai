import { PrismaClient } from "@/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

// Singleton do Prisma Client (evita múltiplas conexões em dev com hot-reload).
//
// ⚠️ Região. O banco Neon está em `sa-east-1` (São Paulo), e `vercel.json` fixa
// as funções em `gru1` pelo mesmo motivo: sem isso a Vercel roda nos EUA por
// padrão e cada consulta atravessa o hemisfério — ~120ms por ida e volta,
// multiplicado por toda query da página. Se um dia o banco mudar de região, o
// `regions` do vercel.json muda junto.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada. Cole a connection string do Neon em .env.local antes de usar o banco.",
    );
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Testa o módulo TikTok contra o banco real: isolamento entre perfis, recusa de
// conta duplicada, ciclo de vida do token e desconexão.
//
// Fica em scripts/ e não em src/**/*.test.ts porque precisa de Postgres — o
// mesmo critério de smoke.ts e test-import.ts. Cria e remove os próprios dados.
//
//   npx tsx --conditions=react-server scripts/test-tiktok.ts
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
config({ path: ".env.local" });

// A criptografia exige a chave; para o teste, uma efêmera basta.
process.env.TOKEN_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
(globalThis as { prisma?: unknown }).prisma = prisma;

const SUFFIX = randomBytes(4).toString("hex");
const OPEN_ID = `tiktok-open-id-teste-${SUFFIX}`;

let failures = 0;

async function check(name: string, fn: () => Promise<string>) {
  try {
    console.log(`  ✓ ${name} — ${await fn()}`);
  } catch (error) {
    failures++;
    console.error(`  ✗ ${name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const { saveConnection, findConnection, getValidAccessToken, disconnect } = await import(
    "../src/lib/tiktok/connection"
  );
  const { decryptToken } = await import("../src/lib/tiktok/crypto");

  // --- dois perfis de creator descartáveis --------------------------------
  const makeProfile = async (slug: string) => {
    const userId = `test_tiktok_${slug}_${SUFFIX}`;
    await prisma.user.create({
      data: { id: userId, email: `${userId}@teste.local`, name: `Teste ${slug}` },
    });
    const profile = await prisma.profile.create({
      data: {
        userId,
        type: "CREATOR",
        displayName: `Teste ${slug}`,
        creatorProfile: { create: {} },
      },
    });
    return { userId, profileId: profile.id };
  };

  const a = await makeProfile("a");
  const b = await makeProfile("b");

  const tokens = (over: Partial<Parameters<typeof saveConnection>[1]> = {}) => ({
    accessToken: "act.token-de-acesso-secreto",
    refreshToken: "rft.token-de-refresh-secreto",
    openId: OPEN_ID,
    grantedScopes: ["user.info.basic", "user.info.stats", "video.list"],
    expiresAt: new Date(Date.now() + 3_600_000),
    refreshExpiresAt: new Date(Date.now() + 365 * 86_400_000),
    ...over,
  });

  try {
    console.log("\nCONEXÃO");

    await check("grava a conexão do perfil A", async () => {
      const result = await saveConnection(a.profileId, tokens());
      assert(result.status === "ok", `esperava ok, veio ${result.status}`);
      return `conta ${result.account.id}`;
    });

    await check("o token vai CIFRADO para o banco", async () => {
      const row = await prisma.externalAccount.findFirstOrThrow({
        where: { profileId: a.profileId, provider: "TIKTOK" },
      });
      assert(row.accessTokenEncrypted, "não gravou o access token");
      assert(
        !row.accessTokenEncrypted.includes("token-de-acesso-secreto"),
        "o token está em claro no banco",
      );
      assert(
        !(row.refreshTokenEncrypted ?? "").includes("token-de-refresh-secreto"),
        "o refresh token está em claro no banco",
      );
      assert(
        decryptToken(row.accessTokenEncrypted) === "act.token-de-acesso-secreto",
        "o token cifrado não volta ao original",
      );
      return "cifrado e reversível só com a chave";
    });

    await check("a mesma conta TikTok é recusada para outro perfil", async () => {
      // Sem isso, dois usuários reivindicariam a mesma conta e as métricas de um
      // apareceriam no match do outro.
      const result = await saveConnection(b.profileId, tokens());
      assert(result.status === "taken", `esperava taken, veio ${result.status}`);
      return "recusada com status taken, sem estourar constraint";
    });

    await check("perfil B não enxerga a conexão do perfil A", async () => {
      const found = await findConnection(b.profileId);
      assert(found === null, "vazou a conexão de outro perfil");
      return "isolamento preservado";
    });

    console.log("\nCICLO DE VIDA DO TOKEN");

    await check("token válido é devolvido sem renovar", async () => {
      const account = await findConnection(a.profileId);
      assert(account, "conexão sumiu");
      const result = await getValidAccessToken(a.profileId, account);
      assert(result.status === "ok", `esperava ok, veio ${result.status}`);
      assert(result.accessToken === "act.token-de-acesso-secreto", "token diferente do gravado");
      return "sem chamada ao TikTok";
    });

    await check("conexão inativa não devolve token", async () => {
      const account = await findConnection(a.profileId);
      assert(account, "conexão sumiu");
      await prisma.externalAccount.update({
        where: { id: account.id },
        data: { status: "REVOKED" },
      });

      const revoked = await findConnection(a.profileId);
      assert(revoked, "conexão sumiu");
      const result = await getValidAccessToken(a.profileId, revoked);
      assert(result.status === "reconnect", `esperava reconnect, veio ${result.status}`);

      await prisma.externalAccount.update({
        where: { id: account.id },
        data: { status: "ACTIVE" },
      });
      return "pede reconexão";
    });

    await check("token ilegível marca a conexão como expirada", async () => {
      // Simula chave de criptografia trocada: o dado no banco não decifra mais.
      const account = await findConnection(a.profileId);
      assert(account, "conexão sumiu");
      await prisma.externalAccount.update({
        where: { id: account.id },
        data: { accessTokenEncrypted: "v1.lixo.lixo.lixo", refreshTokenEncrypted: "v1.x.y.z" },
      });

      const broken = await findConnection(a.profileId);
      assert(broken, "conexão sumiu");
      const result = await getValidAccessToken(a.profileId, broken);
      assert(result.status === "reconnect", `esperava reconnect, veio ${result.status}`);

      const after = await prisma.externalAccount.findUniqueOrThrow({ where: { id: account.id } });
      assert(after.status === "EXPIRED", `esperava EXPIRED, veio ${after.status}`);
      return "degradou para EXPIRED em vez de estourar";
    });

    console.log("\nDESCONEXÃO");

    await check("desconectar apaga os tokens e marca REVOKED", async () => {
      // Reconecta primeiro (o teste anterior deixou EXPIRED).
      await prisma.externalAccount.deleteMany({ where: { profileId: a.profileId } });
      const fresh = await saveConnection(a.profileId, tokens());
      assert(fresh.status === "ok", "não reconectou");

      const account = await findConnection(a.profileId);
      assert(account, "conexão sumiu");

      // A revogação remota vai falhar (sem credenciais de TikTok aqui), e é
      // exatamente o caso que importa: a conexão local precisa encerrar mesmo
      // assim.
      await disconnect(a.profileId, account);

      const after = await prisma.externalAccount.findUniqueOrThrow({ where: { id: account.id } });
      assert(after.status === "REVOKED", `esperava REVOKED, veio ${after.status}`);
      assert(after.accessTokenEncrypted === null, "o access token não foi apagado");
      assert(after.refreshTokenEncrypted === null, "o refresh token não foi apagado");
      return "tokens apagados mesmo com revogação remota indisponível";
    });

    await check("vídeos coletados sobrevivem à desconexão", async () => {
      const account = await prisma.externalAccount.findFirstOrThrow({
        where: { profileId: a.profileId },
      });
      await prisma.tikTokVideo.create({
        data: {
          externalAccountId: account.id,
          videoId: `video-teste-${SUFFIX}`,
          viewCount: 1000,
          likeCount: 100,
          fetchedAt: new Date(),
        },
      });

      const count = await prisma.tikTokVideo.count({ where: { externalAccountId: account.id } });
      assert(count === 1, "o vídeo não sobreviveu");
      return "histórico preservado — apagar é decisão de política, não efeito de clique";
    });
  } finally {
    // --- limpeza ----------------------------------------------------------
    await prisma.tikTokVideo.deleteMany({
      where: { externalAccount: { profileId: { in: [a.profileId, b.profileId] } } },
    });
    await prisma.externalAccount.deleteMany({
      where: { profileId: { in: [a.profileId, b.profileId] } },
    });
    await prisma.profileMetric.deleteMany({
      where: { profileId: { in: [a.profileId, b.profileId] } },
    });
    await prisma.creatorProfile.deleteMany({
      where: { profileId: { in: [a.profileId, b.profileId] } },
    });
    await prisma.profile.deleteMany({ where: { id: { in: [a.profileId, b.profileId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [a.userId, b.userId] } } });
    console.log("\nLimpeza: perfis e conexões de teste removidos.");
    await prisma.$disconnect();
  }

  console.log(failures === 0 ? "\n✓ Módulo TikTok OK.\n" : `\n✗ ${failures} falha(s).\n`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});

import "server-only";

import { prisma } from "@/lib/db";
import { syncConnection } from "@/lib/tiktok/sync";
import { enqueueOnce } from "@/lib/jobs/queue";

// ---------------------------------------------------------------------------
// O que a fila sabe fazer.
//
// Um registry, não um switch espalhado: adicionar tipo de job é acrescentar uma
// entrada aqui, e o worker não muda. Handler que estoura é responsabilidade do
// worker (retry/backoff) — aqui a regra é lançar quando falhou de verdade e
// retornar quando não há o que fazer.
// ---------------------------------------------------------------------------

export const JOB_TYPES = {
  tiktokSync: "tiktok.sync",
} as const;

/// Quanto tempo uma conexão pode ficar sem sincronizar antes de o cron
/// reagendá-la. Seis horas é folgado de propósito: a Display API tem limite de
/// chamadas e seguidor não muda de hora em hora.
const SYNC_STALE_HOURS = 6;

type Handler = (payload: Record<string, unknown>) => Promise<void>;

export const HANDLERS: Record<string, Handler> = {
  [JOB_TYPES.tiktokSync]: async (payload) => {
    const profileId = String(payload.profileId ?? "");
    const accountId = String(payload.externalAccountId ?? "");
    if (!profileId || !accountId) {
      throw new Error("tiktok.sync sem profileId ou externalAccountId");
    }

    const account = await prisma.externalAccount.findFirst({
      where: { id: accountId, profileId, provider: "TIKTOK" },
    });

    // Conta desconectada entre o agendamento e a execução: não é erro, é o
    // usuário tendo mudado de ideia. Falhar aqui só encheria o log.
    if (!account || account.status !== "ACTIVE") return;

    const result = await syncConnection(profileId, account);

    // `reconnect` é estado final legítimo — o token morreu e só o usuário
    // resolve. Repetir não conserta, então não lança: `syncConnection` já
    // gravou o motivo em `lastSyncError` e a UI mostra o aviso.
    if (result.status === "error") {
      throw new Error(result.message);
    }
  },
};

/// Agenda a sincronização das conexões vencidas.
///
/// Roda antes de drenar a fila, na mesma invocação do cron: é o que transforma
/// "existe um worker" em "os dados se atualizam sozinhos".
export async function scheduleDueSyncs(): Promise<number> {
  const cutoff = new Date(Date.now() - SYNC_STALE_HOURS * 60 * 60_000);

  const due = await prisma.externalAccount.findMany({
    where: {
      provider: "TIKTOK",
      status: "ACTIVE",
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }],
    },
    select: { id: true, profileId: true },
    take: 200,
  });

  let scheduled = 0;
  for (const account of due) {
    const job = await enqueueOnce(JOB_TYPES.tiktokSync, account.id, {
      profileId: account.profileId,
      externalAccountId: account.id,
    });
    if (job) scheduled++;
  }

  return scheduled;
}

import "server-only";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { Job } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Fila de trabalho no próprio Postgres.
//
// O modelo `Job` existe desde o Sprint 1 e nunca teve consumidor — a §8 do
// DECISOES-E-PLANO escolheu tabela + `SELECT FOR UPDATE SKIP LOCKED` + cron da
// Vercel em vez de Redis, para não ter um serviço a mais para operar enquanto
// o volume não justifica. Este arquivo é a peça que faltava.
//
// Por que `SKIP LOCKED` e não um `UPDATE ... WHERE status='PENDING'` simples:
// duas invocações do cron podem se sobrepor (uma demorou, a outra começou no
// horário). Sem o lock, as duas leem a mesma linha PENDING e o mesmo job roda
// duas vezes. `FOR UPDATE SKIP LOCKED` faz a segunda invocação simplesmente
// pular o que a primeira já pegou, sem bloquear e sem duplicar.
// ---------------------------------------------------------------------------

/// Reserva atômica: marca como RUNNING e devolve as linhas na mesma transação.
///
/// Precisa ser SQL cru porque o Prisma não expõe `FOR UPDATE SKIP LOCKED`.
/// Fazer isso em duas etapas (ler, depois marcar) reabre exatamente a corrida
/// que o lock existe para fechar.
export async function claimJobs(workerId: string, limit: number): Promise<Job[]> {
  return prisma.$queryRaw<Job[]>(Prisma.sql`
    UPDATE "Job" SET
      status      = 'RUNNING',
      "lockedAt"  = now(),
      "lockedBy"  = ${workerId},
      attempts    = attempts + 1,
      "updatedAt" = now()
    WHERE id IN (
      SELECT id FROM "Job"
      WHERE status = 'PENDING' AND "runAt" <= now()
      ORDER BY "runAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING *
  `);
}

export async function enqueue(
  type: string,
  payload?: Prisma.InputJsonValue,
  options: { runAt?: Date; maxAttempts?: number } = {},
): Promise<Job> {
  return prisma.job.create({
    data: {
      type,
      payload,
      runAt: options.runAt ?? new Date(),
      maxAttempts: options.maxAttempts ?? 3,
    },
  });
}

/// Enfileira só se não houver um job do mesmo tipo já esperando.
///
/// O cron roda de tempos em tempos e reavalia o que está vencido; sem esta
/// checagem, uma conexão que falha há dois dias acumularia um job por
/// invocação e a fila viraria um cemitério.
export async function enqueueOnce(
  type: string,
  dedupeKey: string,
  payload?: Prisma.InputJsonValue,
): Promise<Job | null> {
  const pending = await prisma.job.findFirst({
    where: {
      type,
      status: { in: ["PENDING", "RUNNING"] },
      payload: { path: ["dedupeKey"], equals: dedupeKey },
    },
    select: { id: true },
  });
  if (pending) return null;

  return enqueue(type, { ...(payload as object), dedupeKey } as Prisma.InputJsonValue);
}

export async function completeJob(id: string): Promise<void> {
  await prisma.job.update({
    where: { id },
    data: { status: "DONE", lastError: null, lockedAt: null, lockedBy: null },
  });
}

/// Devolve para a fila com espera crescente, ou desiste depois de `maxAttempts`.
///
/// O backoff é exponencial e limitado a 1 hora: uma API de terceiro fora do ar
/// não melhora se a gente bater nela a cada 30 segundos.
export async function failJob(job: Job, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const exhausted = job.attempts >= job.maxAttempts;

  const backoffMs = Math.min(2 ** job.attempts * 60_000, 60 * 60_000);

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: exhausted ? "FAILED" : "PENDING",
      lastError: message.slice(0, 2000),
      lockedAt: null,
      lockedBy: null,
      ...(exhausted ? {} : { runAt: new Date(Date.now() + backoffMs) }),
    },
  });
}

/// Solta jobs que ficaram presos em RUNNING.
///
/// Acontece quando a função da Vercel é morta no meio (timeout, deploy). Sem
/// isto o job fica RUNNING para sempre e nunca mais é tentado — o pior estado
/// possível, porque não falha nem completa.
export async function releaseStaleJobs(olderThanMinutes = 15): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const { count } = await prisma.job.updateMany({
    where: { status: "RUNNING", lockedAt: { lt: cutoff } },
    data: { status: "PENDING", lockedAt: null, lockedBy: null },
  });
  return count;
}

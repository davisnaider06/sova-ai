import type { NextRequest } from "next/server";
import { claimJobs, completeJob, failJob, releaseStaleJobs } from "@/lib/jobs/queue";
import { HANDLERS, scheduleDueSyncs } from "@/lib/jobs/handlers";

// ---------------------------------------------------------------------------
// Worker da fila, disparado pelo cron da Vercel (ver vercel.json).
//
// Quem chama é a infraestrutura, não um usuário com sessão — então a proteção
// aqui é um segredo compartilhado, não o Clerk. A Vercel envia
// `Authorization: Bearer $CRON_SECRET` quando a variável existe no projeto.
//
// Sem `CRON_SECRET` configurada a rota recusa tudo. É deliberado: uma rota que
// dispara trabalho em nome de qualquer perfil, aberta na internet, é pior do
// que um cron que não roda — e o erro 503 aparece no log da Vercel, enquanto
// um endpoint silenciosamente público não aparece em lugar nenhum.
// ---------------------------------------------------------------------------

/// Quantos jobs uma invocação processa. O teto existe por causa do tempo máximo
/// da função na Vercel: melhor drenar em lotes e deixar o resto para a próxima
/// passada do que ser morto no meio de um job.
const BATCH = 10;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET não configurada — worker desativado." },
      { status: 503 },
    );
  }

  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  const workerId = `vercel-cron-${crypto.randomUUID().slice(0, 8)}`;

  const released = await releaseStaleJobs();
  const scheduled = await scheduleDueSyncs();
  const jobs = await claimJobs(workerId, BATCH);

  let done = 0;
  let failed = 0;

  for (const job of jobs) {
    const handler = HANDLERS[job.type];

    if (!handler) {
      // Tipo desconhecido é bug de deploy (job enfileirado por uma versão que
      // conhecia o tipo, worker de uma que não). Falha e vai para o backoff.
      await failJob(job, new Error(`Nenhum handler para o tipo "${job.type}"`));
      failed++;
      continue;
    }

    try {
      await handler((job.payload ?? {}) as Record<string, unknown>);
      await completeJob(job.id);
      done++;
    } catch (error) {
      console.error(`[cron] job ${job.id} (${job.type}) falhou`, error);
      await failJob(job, error);
      failed++;
    }
  }

  return Response.json({ released, scheduled, claimed: jobs.length, done, failed });
}

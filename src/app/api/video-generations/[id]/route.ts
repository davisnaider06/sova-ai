import { NextResponse, type NextRequest } from "next/server";
import { requireCreatorScope } from "@/lib/session";
import { checkVideoTaskStatus } from "@/lib/ai/creator-video";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Status de uma geração de vídeo, para o cliente consultar em polling.
//
// Geração de vídeo na Runway leva minutos — não dá para o creator ficar numa
// Server Action travada esperando. `submitVideo` (Server Action) só cria o
// registro e devolve o id; esta rota é o que o componente cliente pergunta a
// cada alguns segundos até `status` sair de "RUNNING"/"PENDING".
//
// A consulta à Runway só acontece enquanto o registro ainda está em
// andamento — uma vez terminado (SUCCEEDED/FAILED), a rota responde do banco
// direto, sem gastar chamada de API à toa.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Rate limit por IP além do geral de sessão (já coberto por ensureUser) —
  // é um polling, pode ser chamado com frequência, mas não sem limite.
  const rateLimit = await checkRateLimit("video-generation-status", getClientIp(request), 60, "1 m");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "muitas requisições" }, { status: 429 });
  }

  const { id } = await params;
  const { scope } = await requireCreatorScope();

  const generation = await scope.videoGenerations.findById(id);
  if (!generation) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  if (
    (generation.status === "PENDING" || generation.status === "RUNNING") &&
    generation.externalTaskId
  ) {
    const result = await checkVideoTaskStatus(generation.externalTaskId);

    if (result.status === "ok") {
      if (result.data.status === "succeeded") {
        await scope.videoGenerations.update(id, {
          status: "SUCCEEDED",
          outputUrl: result.data.outputUrl,
        });
        return NextResponse.json({ status: "SUCCEEDED", outputUrl: result.data.outputUrl });
      }
      if (result.data.status === "failed") {
        await scope.videoGenerations.update(id, {
          status: "FAILED",
          errorMessage: result.data.message,
        });
        return NextResponse.json({ status: "FAILED", errorMessage: result.data.message });
      }
      // pending/running: nada muda no banco, só informa o estado atual.
      return NextResponse.json({ status: result.data.status === "pending" ? "PENDING" : "RUNNING" });
    }

    // Erro consultando a Runway (rede, chave revogada etc): mantém o registro
    // como está e informa o estado salvo — o próximo poll tenta de novo.
  }

  return NextResponse.json({
    status: generation.status,
    outputUrl: generation.outputUrl,
    errorMessage: generation.errorMessage,
  });
}

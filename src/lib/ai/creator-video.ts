import "server-only";

import { describeRunwayError, getRunway } from "@/lib/ai/runway-client";
import type { VideoScript } from "@/lib/ai/video-script";
import type { RunwayResult } from "@/lib/ai/runway-result";

// ---------------------------------------------------------------------------
// Vídeo do creator — recipe `productUgc` da Runway.
//
// O roteiro que o Claude já escreveu vira a direção criativa (`userConcept`):
// a Runway não está inventando um vídeo do zero, está filmando o roteiro que
// já existe. É o mesmo produto (o roteiro) alimentando duas ferramentas.
//
// Geração de vídeo não é síncrono como a de roteiro/imagem — leva minutos.
// Esta função só SUBMETE a task e devolve o id; quem chama guarda esse id e
// consulta o status depois (ver checkVideoTaskStatus). Nenhuma escrita no
// banco acontece aqui — isso é responsabilidade de quem chama, com o escopo
// certo (ver src/app/dashboard/conteudo-ia/actions.ts).
// ---------------------------------------------------------------------------

export type SubmitVideoInput = {
  characterImage: string; // data URI base64 da foto do creator
  productImage: string; // URL http(s) da foto do produto
  productName: string;
  productDescription: string | null;
  script: VideoScript;
};

export type SubmitVideoResult = { taskId: string };

function creativeDirectionFrom(script: VideoScript): string {
  const scenes = script.scenes
    .map((s, i) => `${i + 1}. ${s.title}: ${s.action}`)
    .join(" ");
  return [
    `Gancho de abertura: "${script.hook}"`,
    `Cenas, em ordem: ${scenes}`,
    `Chamada para ação final: "${script.cta}"`,
    `Tom e ritmo: ${script.narration}`,
  ].join(" — ");
}

export async function submitCreatorVideo(
  input: SubmitVideoInput,
): Promise<RunwayResult<SubmitVideoResult>> {
  const client = getRunway();
  if (!client) return { status: "not_configured" };

  try {
    const task = await client.recipes.productUgc({
      characterImage: { uri: input.characterImage },
      productImage: { uri: input.productImage },
      version: "unsafe-latest",
      audio: true,
      duration: 15,
      ratio: "1080:1920",
      productInfo: [input.productName, input.productDescription].filter(Boolean).join(" — "),
      userConcept: creativeDirectionFrom(input.script),
    });

    return { status: "ok", data: { taskId: task.id } };
  } catch (error) {
    console.error("[ai] falha ao submeter geração de vídeo", error);
    return { status: "error", message: describeRunwayError(error) };
  }
}

export type VideoTaskStatus =
  | { status: "pending" | "running" }
  | { status: "succeeded"; outputUrl: string }
  | { status: "failed"; message: string };

/// Consulta o estado atual de uma task já submetida. Não bloqueia — é uma
/// leitura só, pensada para ser chamada repetidamente (polling) pelo
/// endpoint de status, nunca para esperar a task terminar dentro de uma
/// Server Action.
export async function checkVideoTaskStatus(taskId: string): Promise<RunwayResult<VideoTaskStatus>> {
  const client = getRunway();
  if (!client) return { status: "not_configured" };

  try {
    const task = await client.tasks.retrieve(taskId);

    switch (task.status) {
      case "PENDING":
      case "THROTTLED":
        return { status: "ok", data: { status: "pending" } };
      case "RUNNING":
        return { status: "ok", data: { status: "running" } };
      case "SUCCEEDED":
        return { status: "ok", data: { status: "succeeded", outputUrl: task.output[0] } };
      case "FAILED":
        return { status: "ok", data: { status: "failed", message: task.failure } };
      case "CANCELLED":
        return { status: "ok", data: { status: "failed", message: "Geração cancelada." } };
    }
  } catch (error) {
    console.error("[ai] falha ao consultar status da geração de vídeo", error);
    return { status: "error", message: describeRunwayError(error) };
  }
}

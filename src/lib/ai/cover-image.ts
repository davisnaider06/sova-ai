import "server-only";

import { IMAGE_MODEL, describeOpenAiError, getOpenAi, type OpenAiResult } from "@/lib/ai/openai-client";

// ---------------------------------------------------------------------------
// Imagem de capa para o vídeo que o creator vai gravar.
//
// Gerada a partir do mesmo roteiro que o Claude já escreveu — o hook e a
// primeira cena viram a instrução visual, para a capa combinar com o que o
// vídeo promete, em vez de ser uma imagem genérica do produto.
// ---------------------------------------------------------------------------

export type CoverImageContext = {
  productName: string;
  productDescription: string | null;
  category: string;
  hook: string;
  firstSceneAction: string;
};

/// PNG em base64, pronto para `data:image/png;base64,${data}` ou para enviar
/// como `input_reference`/`productImage` para a geração de vídeo depois.
export async function generateCoverImage(
  context: CoverImageContext,
): Promise<OpenAiResult<string>> {
  const client = getOpenAi();
  if (!client) return { status: "not_configured" };

  const prompt = [
    `Capa de vídeo curto vertical (estilo TikTok) para um produto de e-commerce.`,
    `Produto: ${context.productName} (categoria: ${context.category}).`,
    context.productDescription ? `Descrição: ${context.productDescription}.` : null,
    `A imagem deve capturar este momento de abertura do vídeo: "${context.hook}".`,
    `Cena: ${context.firstSceneAction}.`,
    `Foto realista, estilo conteúdo gerado por usuário (UGC), boa iluminação, sem texto sobreposto, sem logotipo, sem marca d'água.`,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await client.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size: "1024x1536",
      quality: "high",
    });

    const image = response.data?.[0];
    if (!image?.b64_json) {
      return { status: "error", message: "A resposta veio sem imagem." };
    }

    return { status: "ok", data: image.b64_json };
  } catch (error) {
    console.error("[ai] falha ao gerar imagem de capa", error);
    return { status: "error", message: describeOpenAiError(error) };
  }
}

import "server-only";

import { AI_MODEL, describeAiError, getAnthropic, type AiResult } from "@/lib/ai/client";
import { formatBRL, formatPercent } from "@/lib/money";

// ---------------------------------------------------------------------------
// Assistente de conteúdo do creator (§39 da arquitetura).
//
// Gera um roteiro de vídeo para um produto que o creator **já promove**. A
// amarração com a afiliação não é burocracia: é o que faz o prompt receber
// produto, categoria, preço e comissão reais em vez de adjetivos genéricos —
// e é o que impede a tela de virar um gerador de texto solto que qualquer
// chatbot faz igual.
// ---------------------------------------------------------------------------

export type VideoScript = {
  hook: string;
  scenes: Array<{ title: string; action: string; onScreenText: string }>;
  caption: string;
  cta: string;
  hashtags: string[];
  narration: string;
};

/// Schema do JSON estruturado.
///
/// A API valida a resposta contra ele, então o retorno é garantidamente
/// parseável — não há regex de extração nem retry de parse. Note as restrições
/// da feature: todo objeto precisa de `required` completo e
/// `additionalProperties: false`, e limites numéricos de tamanho não são
/// suportados (por isso o comprimento é pedido no prompt, não no schema).
const SCRIPT_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string", description: "A primeira frase do vídeo, para segurar nos 2 primeiros segundos." },
    scenes: {
      type: "array",
      description: "De 3 a 5 cenas, na ordem de gravação.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Nome curto da cena. Ex: 'Gancho', 'Demonstração'." },
          action: { type: "string", description: "O que o creator faz e fala nesta cena." },
          onScreenText: { type: "string", description: "Texto que aparece na tela durante a cena." },
        },
        required: ["title", "action", "onScreenText"],
        additionalProperties: false,
      },
    },
    caption: { type: "string", description: "Legenda do post." },
    cta: { type: "string", description: "Chamada para ação final, direcionando à vitrine." },
    hashtags: {
      type: "array",
      description: "De 4 a 6 hashtags, com o #.",
      items: { type: "string" },
    },
    narration: { type: "string", description: "Orientação de tom, ritmo e trilha." },
  },
  required: ["hook", "scenes", "caption", "cta", "hashtags", "narration"],
  additionalProperties: false,
} as const;

const SYSTEM = `Você escreve roteiros de vídeo curto para creators brasileiros que vendem pelo TikTok Shop.

Escreva em português do Brasil, na voz do creator — primeira pessoa, informal, do jeito que se fala. Nada de linguagem publicitária ("imperdível", "revolucionário", "não perca").

O roteiro é para um vídeo de 30 a 60 segundos. Cada cena precisa ser gravável por uma pessoa sozinha com um celular: descreva o que a câmera vê e o que a pessoa diz, não conceitos abstratos.

Ancore o roteiro no problema concreto que o produto resolve para o público daquele creator. Se a descrição do produto não deixar claro qual é o problema, escolha o mais provável para a categoria e seja específico — um roteiro genérico não converte.

Não invente número que não foi informado: nada de "aprovado por 9 em cada 10", percentual de desconto, prazo de entrega ou resultado em X dias.`;

export type ScriptContext = {
  productName: string;
  productDescription: string | null;
  category: string;
  priceCents: number;
  commissionRate: number;
  creatorNiches: string[];
  followers: number | null;
  /// Instrução livre do creator ("focar em quem treina de manhã").
  angle?: string | null;
};

export async function generateVideoScript(
  context: ScriptContext,
): Promise<AiResult<VideoScript>> {
  const client = getAnthropic();
  if (!client) return { status: "not_configured" };

  const perSale = Math.round(context.priceCents * context.commissionRate);

  const brief = [
    `Produto: ${context.productName}`,
    `Categoria: ${context.category}`,
    `Preço: ${formatBRL(context.priceCents)}`,
    `Comissão do creator: ${formatPercent(context.commissionRate, 0)} (${formatBRL(perSale)} por venda)`,
    context.productDescription
      ? `Descrição do vendedor: ${context.productDescription}`
      : "Descrição do vendedor: não informada.",
    context.creatorNiches.length > 0
      ? `Nichos do creator: ${context.creatorNiches.join(", ")}`
      : "Nichos do creator: não informados.",
    context.followers !== null
      ? `Audiência do creator: ${context.followers} seguidores`
      : "Audiência do creator: não informada.",
    context.angle ? `Ângulo pedido pelo creator: ${context.angle}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    // `effort: medium` é o botão de custo desta tela. A geração é curta e
    // delimitada pelo schema; se a qualidade decepcionar, subir para "high" é
    // a primeira alavanca — antes de mexer no prompt.
    const response = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      // Os classificadores de segurança podem recusar; com fallback a
      // requisição é reexecutada em outro modelo do lado do servidor em vez de
      // devolver recusa. Se a conta não tiver o beta liberado, a API responde
      // 400 e `describeAiError` mostra a mensagem — aí basta remover estas
      // duas linhas.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCRIPT_SCHEMA },
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Escreva o roteiro para este produto.\n\n${brief}`,
        },
      ],
    });

    // Checar a recusa ANTES de ler o conteúdo: numa recusa o array vem vazio
    // (ou parcial), e indexar content[0] aqui estouraria.
    if (response.stop_reason === "refusal") {
      return {
        status: "refused",
        reason:
          "O modelo recusou gerar este roteiro. Revise a descrição do produto e tente de novo.",
      };
    }

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { status: "error", message: "A resposta veio sem conteúdo de texto." };
    }

    return { status: "ok", data: JSON.parse(text.text) as VideoScript };
  } catch (error) {
    console.error("[ai] falha ao gerar roteiro", error);
    return { status: "error", message: describeAiError(error) };
  }
}

// ---------------------------------------------------------------------------
// Serviço de atribuição.
//
// A pergunta que ele responde: o creator postou no dia 1, a venda entrou no dia
// 20 — a comissão é de quem?
//
// Duas decisões de desenho, ambas do DECISOES-E-PLANO.md §8:
//
// 1. **A janela é explícita e gravada.** O pedido guarda
//    `attributionWindowDays`, então dá para auditar depois com que regra aquela
//    venda foi atribuída — inclusive se a regra mudar no futuro.
//
// 2. **A decisão é gravada, nunca calculada na leitura.** Se o dashboard
//    recalculasse a atribuição a cada abertura, o número mudaria sozinho quando
//    uma afiliação fosse encerrada. Comissão que muda de dono depois de paga é
//    disputa com o creator, não bug de tela.
//
// Esta camada é pura: recebe fatos, devolve uma decisão. Quem grava é o
// chamador. É o que permite testá-la sem banco.
// ---------------------------------------------------------------------------

export const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 7;

export type AttributionCandidate = {
  affiliationId: string;
  creatorProfileId: string;
  /// Identificador do creator na fonte externa (@handle), quando existir.
  creatorHandle: string | null;
  /// Vigência da afiliação. `startedAt` nulo = nunca ativada.
  startedAt: Date | null;
  endedAt: Date | null;
  status: string;
  /// Publicação mais recente deste creator para o produto, se houver.
  lastContentAt: Date | null;
};

export type AttributionInput = {
  placedAt: Date;
  /// Creator informado pela própria fonte (coluna do CSV, campo do webhook).
  declaredCreatorHandle: string | null;
  candidates: AttributionCandidate[];
  windowDays?: number;
};

export type AttributionDecision = {
  affiliationId: string | null;
  /// Por que essa decisão — em português, para aparecer na tela do pedido.
  reason: string;
  windowDays: number;
};

export function decideAttribution(input: AttributionInput): AttributionDecision {
  const windowDays = input.windowDays ?? DEFAULT_ATTRIBUTION_WINDOW_DAYS;
  const { placedAt, candidates, declaredCreatorHandle } = input;

  const eligible = candidates.filter((c) => wasActiveAt(c, placedAt));

  if (eligible.length === 0) {
    return {
      affiliationId: null,
      reason: candidates.length === 0
        ? "Venda orgânica — nenhum creator afiliado a este produto"
        : "Nenhuma afiliação estava ativa na data do pedido",
      windowDays,
    };
  }

  // 1. A fonte disse de quem é. É o sinal mais forte que existe: o marketplace
  //    já fez a atribuição dele, e discordar disso sem motivo seria inventar.
  if (declaredCreatorHandle) {
    const handle = normalizeHandle(declaredCreatorHandle);
    const named = eligible.find(
      (c) => c.creatorHandle && normalizeHandle(c.creatorHandle) === handle,
    );
    if (named) {
      return {
        affiliationId: named.affiliationId,
        reason: `Creator informado na origem (${declaredCreatorHandle})`,
        windowDays,
      };
    }
  }

  // 2. Conteúdo publicado dentro da janela. Entre vários, o mais recente —
  //    é o que provavelmente motivou a compra.
  const withinWindow = eligible
    .filter((c) => c.lastContentAt !== null && daysBetween(c.lastContentAt, placedAt) <= windowDays)
    .sort((a, b) => b.lastContentAt!.getTime() - a.lastContentAt!.getTime());

  if (withinWindow.length > 0) {
    const winner = withinWindow[0];
    const days = Math.floor(daysBetween(winner.lastContentAt!, placedAt));
    return {
      affiliationId: winner.affiliationId,
      reason:
        days === 0
          ? "Conteúdo publicado no mesmo dia da venda"
          : `Conteúdo publicado ${days} ${days === 1 ? "dia" : "dias"} antes da venda (janela de ${windowDays})`,
      windowDays,
    };
  }

  // 3. Sem sinal de conteúdo, um único candidato ativo resolve sozinho.
  if (eligible.length === 1) {
    return {
      affiliationId: eligible[0].affiliationId,
      reason: "Único creator afiliado ativo na data do pedido",
      windowDays,
    };
  }

  // 4. Vários candidatos e nenhum sinal para desempatar.
  //
  //    Escolher um aqui seria sortear a comissão de alguém. Deixar sem
  //    atribuição é a resposta honesta: o pedido fica visível como pendente e
  //    alguém decide manualmente — muito melhor que pagar o creator errado e
  //    descobrir na reclamação.
  return {
    affiliationId: null,
    reason: `${eligible.length} creators ativos e nenhum conteúdo na janela — atribuição precisa de decisão manual`,
    windowDays,
  };
}

function wasActiveAt(c: AttributionCandidate, at: Date): boolean {
  // REJECTED e PENDING nunca geram comissão, mesmo que as datas batam.
  if (c.status !== "ACTIVE" && c.status !== "PAUSED" && c.status !== "ENDED") return false;
  if (c.startedAt === null) return false;
  if (c.startedAt > at) return false;
  if (c.endedAt !== null && c.endedAt < at) return false;
  return true;
}

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 86_400_000;
}

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

/// Comissão a partir de uma atribuição.
///
/// A `rate` é congelada aqui, no momento da criação, e nunca mais lida da
/// afiliação. Se o seller subir a comissão de 15% para 20% amanhã, a venda de
/// ontem continua valendo 15% — registro financeiro é imutável (§8 do plano).
export function commissionFor(
  gmvCents: number,
  rate: number,
): { rate: number; amountCents: number } {
  return { rate, amountCents: Math.round(gmvCents * rate) };
}

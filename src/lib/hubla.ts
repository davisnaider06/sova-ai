import "server-only";

// ---------------------------------------------------------------------------
// Leitura do payload da Hubla.
//
// A documentação pública lista os nomes dos eventos, mas **não publica o schema
// completo do corpo**. Então este arquivo é deliberadamente tolerante: procura
// cada informação em vários caminhos plausíveis e devolve null quando não acha,
// em vez de estourar.
//
// Isso não é chute permanente. Todo evento recebido é gravado inteiro em
// `WebhookEvent.payload`; depois da primeira venda real, dá para abrir o corpo
// que a Hubla mandou de verdade e apertar estes caminhos para os certos.
//
// Enquanto isso, a regra é: se não deu para extrair o e-mail, o evento é
// registrado com erro e **não** libera acesso a ninguém. Errar para o lado de
// não liberar é recuperável; o contrário, não.
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

function pick(source: unknown, path: string): unknown {
  let node: unknown = source;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Json)[key];
  }
  return node;
}

function firstString(source: unknown, paths: string[]): string | null {
  for (const path of paths) {
    const value = pick(source, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(source: unknown, paths: string[]): number | null {
  for (const path of paths) {
    const value = pick(source, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

export type HublaEvent = {
  type: string;
  email: string | null;
  name: string | null;
  subscriptionId: string | null;
  invoiceId: string | null;
  planName: string | null;
  amountCents: number | null;
  currency: string;
  paidAt: Date | null;
  periodEnd: Date | null;
};

/// O nome do evento. `type` é o campo documentado; os outros são rede de
/// segurança para variações de versão do webhook.
export function readEventType(body: unknown): string {
  return firstString(body, ["type", "event", "event.type", "data.type"]) ?? "desconhecido";
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/// Valores monetários chegam ora em reais ("97.00"), ora em centavos (9700).
/// Sem saber qual, a heurística é: número com casa decimal é reais; inteiro
/// grande é centavos. Registrado aqui porque é a suposição mais frágil deste
/// arquivo, e a primeira a conferir contra um evento real.
function toCents(raw: number | null): number | null {
  if (raw === null) return null;
  return Number.isInteger(raw) && Math.abs(raw) >= 1000
    ? raw
    : Math.round(raw * 100);
}

export function parseHublaEvent(body: unknown): HublaEvent {
  const email = firstString(body, [
    "event.user.email",
    "event.userEmail",
    "data.user.email",
    "user.email",
    "data.buyer.email",
    "buyer.email",
    "event.customer.email",
    "customer.email",
    "email",
  ]);

  const amount = firstNumber(body, [
    "event.invoice.amount",
    "event.invoice.total",
    "data.invoice.amount",
    "invoice.amount",
    "event.totalAmount",
    "data.totalAmount",
    "totalAmount",
    "amount",
  ]);

  return {
    type: readEventType(body),
    email: email ? email.toLowerCase() : null,
    name: firstString(body, [
      "event.user.name",
      "data.user.name",
      "user.name",
      "buyer.name",
      "customer.name",
    ]),
    subscriptionId: firstString(body, [
      "event.subscription.id",
      "data.subscription.id",
      "subscription.id",
      "event.subscriptionId",
      "subscriptionId",
    ]),
    invoiceId: firstString(body, [
      "event.invoice.id",
      "data.invoice.id",
      "invoice.id",
      "event.invoiceId",
      "invoiceId",
      "id",
    ]),
    planName: firstString(body, [
      "event.product.name",
      "data.product.name",
      "product.name",
      "event.products.0.name",
      "products.0.name",
      "event.offer.name",
    ]),
    amountCents: toCents(amount),
    currency: firstString(body, ["event.invoice.currency", "invoice.currency", "currency"]) ?? "BRL",
    paidAt:
      toDate(pick(body, "event.invoice.paidAt")) ??
      toDate(pick(body, "invoice.paidAt")) ??
      toDate(pick(body, "event.paidAt")) ??
      toDate(pick(body, "paidAt")),
    periodEnd:
      toDate(pick(body, "event.subscription.currentPeriodEnd")) ??
      toDate(pick(body, "subscription.currentPeriodEnd")) ??
      toDate(pick(body, "event.subscription.expiresAt")) ??
      toDate(pick(body, "event.expiresAt")) ??
      toDate(pick(body, "expiresAt")),
  };
}

/// Como cada evento da Hubla mexe na assinatura.
///
/// Nomes conferidos na documentação da Hubla (14/08/2026). Evento fora desta
/// lista é registrado e ignorado — não é erro, é só assunto que não é nosso.
export const EVENT_EFFECT: Record<
  string,
  "activate" | "cancel" | "expire" | "past_due" | "payment" | "refund"
> = {
  "invoice.payment_succeeded": "payment",
  "invoice.payment_failed": "past_due",
  "invoice.refunded": "refund",
  "invoice.expired": "expire",
  "subscription.created": "activate",
  "subscription.activated": "activate",
  "subscription.expired": "expire",
  "subscription.desativada": "cancel",
  "subscription.renovacao-desativada": "cancel",
  "subscription.renovacao-ativada": "activate",
  "membro.acesso-concedido": "activate",
  "membro.acesso-removido": "expire",
};

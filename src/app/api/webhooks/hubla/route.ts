import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { EVENT_EFFECT, parseHublaEvent, readEventType } from "@/lib/hubla";
import type { Prisma, SubscriptionStatus } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Webhook da Hubla — é ele que libera o acesso depois do pagamento.
//
// Cadastrar em: Hubla → Integrações → Webhooks → Adicionar regra
//   URL: https://SEU-DOMINIO/api/webhooks/hubla
//   Eventos: assinatura e fatura (ver EVENT_EFFECT em src/lib/hubla.ts)
// e colar o token gerado em HUBLA_WEBHOOK_TOKEN.
//
// Duas decisões que valem explicação:
//
// 1. **Grava primeiro, processa depois.** O corpo inteiro vai para
//    `WebhookEvent` antes de qualquer lógica. Se o parsing falhar, o evento não
//    se perde — fica no banco para ser relido quando o formato for ajustado.
//
// 2. **Responde 200 mesmo quando não entende o evento.** Devolver erro faria a
//    Hubla reentregar para sempre um evento que nunca vamos processar. Falha de
//    verdade (banco fora) devolve 500, aí a reentrega ajuda.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const expected = process.env.HUBLA_WEBHOOK_TOKEN;
  if (!expected) {
    console.error("[hubla] HUBLA_WEBHOOK_TOKEN não configurada");
    return Response.json({ error: "webhook não configurado" }, { status: 503 });
  }

  // A Hubla não documenta publicamente qual cabeçalho carrega o token, então
  // aceitamos os formatos plausíveis. Todos comparados contra o mesmo segredo.
  const auth = req.headers.get("authorization");
  const presented =
    req.headers.get("x-hubla-token") ??
    req.headers.get("x-hubla-signature") ??
    (auth?.startsWith("Bearer ") ? auth.slice(7) : auth);

  if (presented !== expected) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "corpo inválido" }, { status: 400 });
  }

  const idempotencyKey = req.headers.get("x-hubla-idempotency");
  const eventType = readEventType(body);

  // Idempotência: a mesma entrega processada duas vezes não pode virar dois
  // pagamentos. A constraint única resolve na origem.
  if (idempotencyKey) {
    const seen = await prisma.webhookEvent.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (seen) return Response.json({ ok: true, duplicate: true });
  }

  const record = await prisma.webhookEvent.create({
    data: {
      provider: "HUBLA",
      eventType,
      idempotencyKey,
      payload: body as Prisma.InputJsonValue,
    },
  });

  try {
    const result = await handleEvent(body, eventType);
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: { processedAt: new Date(), error: result.skipped ?? null },
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[hubla] falha processando ${eventType}`, error);
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: { error: message.slice(0, 2000) },
    });
    return Response.json({ error: "falha ao processar" }, { status: 500 });
  }
}

type HandleResult = { effect?: string; skipped?: string };

async function handleEvent(body: unknown, eventType: string): Promise<HandleResult> {
  const effect = EVENT_EFFECT[eventType];
  if (!effect) return { skipped: `evento sem efeito mapeado: ${eventType}` };

  const event = parseHublaEvent(body);
  if (!event.email) {
    // Sem e-mail não há como saber de quem é a assinatura. Registrar e seguir
    // é melhor do que liberar para alguém errado.
    return { skipped: "payload sem e-mail identificável" };
  }

  const statusByEffect: Record<string, SubscriptionStatus | undefined> = {
    activate: "ACTIVE",
    payment: "ACTIVE",
    past_due: "PAST_DUE",
    cancel: "CANCELED",
    expire: "EXPIRED",
    refund: "EXPIRED",
  };

  const status = statusByEffect[effect];

  // Amarra a uma conta que já exista com este e-mail. Se ainda não existir,
  // `userId` fica nulo e `ensureUser()` faz o vínculo no primeiro acesso.
  const user = await prisma.user.findUnique({
    where: { email: event.email },
    select: { id: true },
  });

  const subscription = await prisma.subscription.upsert({
    where: { email: event.email },
    create: {
      email: event.email,
      userId: user?.id ?? null,
      provider: "HUBLA",
      externalId: event.subscriptionId,
      status: status ?? "ACTIVE",
      planName: event.planName,
      startedAt: event.paidAt ?? new Date(),
      currentPeriodEnd: event.periodEnd,
      canceledAt: effect === "cancel" ? new Date() : null,
    },
    update: {
      ...(user?.id ? { userId: user.id } : {}),
      ...(event.subscriptionId ? { externalId: event.subscriptionId } : {}),
      ...(status ? { status } : {}),
      ...(event.planName ? { planName: event.planName } : {}),
      ...(event.periodEnd ? { currentPeriodEnd: event.periodEnd } : {}),
      canceledAt: effect === "cancel" ? new Date() : undefined,
    },
  });

  // Só fatura paga vira dinheiro na página de faturamento. `activate` sem
  // fatura é liberação de acesso, não receita — contar as duas coisas juntas
  // inflaria o faturamento com eventos que não moveram dinheiro.
  if (effect === "payment" && event.amountCents !== null) {
    const externalId = event.invoiceId ?? `${event.email}-${event.paidAt?.toISOString() ?? Date.now()}`;
    await prisma.payment.upsert({
      where: { externalId },
      create: {
        subscriptionId: subscription.id,
        email: event.email,
        provider: "HUBLA",
        externalId,
        amountCents: event.amountCents,
        currency: event.currency,
        status: "paid",
        paidAt: event.paidAt ?? new Date(),
      },
      update: {},
    });
  }

  if (effect === "refund" && event.invoiceId) {
    await prisma.payment.updateMany({
      where: { externalId: event.invoiceId },
      data: { status: "refunded" },
    });
  }

  return { effect };
}

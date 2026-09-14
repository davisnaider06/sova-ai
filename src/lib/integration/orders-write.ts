import "server-only";

import { prisma } from "@/lib/db";
import { toDecimalString } from "@/lib/money";
import type { DataSource, OrderStatus, PaymentStatus } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Escrita de um pedido já resolvido — a parte que CSV e Affiliate Creator API
// compartilham de verdade.
//
// Extraído de `orders-import.ts` (Sprint 5, CSV) para a integração com a API
// entrar como um segundo adapter chamando a mesma função de domínio, em vez de
// duplicar a transação inteira — exatamente o desenho previsto em
// [[Sova - Decisoes e Plano]] §5: "Integration Layer → Normalizer → Domain".
//
// O que fica de fora, de propósito: como decidir o produto e a atribuição. CSV
// resolve isso linha a linha, com fuzzy match de nome e heurística de janela
// (`decideAttribution`); a API resolve com o creator já conhecido com certeza
// (é dono do access token) — são lógicas diferentes o bastante para não valer
// forçar uma interface comum. O que as duas produzem no fim é o mesmo formato,
// e é isso que esta função grava.
// ---------------------------------------------------------------------------

export type ResolvedOrderItem = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

export type ResolvedAttribution = {
  affiliationId: string | null;
  /// Nula quando `affiliationId` é nulo — venda orgânica não tem taxa a congelar.
  creatorProfileId: string | null;
  rate: number;
  /// Para a Event de auditoria — por que essa decisão, em português.
  reason: string;
  windowDays: number | null;
};

export type OrderWriteInput = {
  sellerProfileId: string;
  campaignId: string | null;
  externalOrderId: string;
  source: DataSource;
  placedAt: Date;
  status: OrderStatus;
  items: ResolvedOrderItem[];
  attribution: ResolvedAttribution;
};

export type OrderWriteResult =
  | { skipped: true }
  | {
      skipped: false;
      items: number;
      gmvCents: number;
      attributed: boolean;
      commissionCents: number;
    };

export function paymentFor(status: OrderStatus): PaymentStatus {
  switch (status) {
    case "DELIVERED":
    case "SHIPPED":
    case "CONFIRMED":
      return "PAID";
    case "RETURNED":
      return "REFUNDED";
    case "CANCELLED":
      return "FAILED";
    default:
      return "PENDING";
  }
}

/// Grava pedido, itens, comissão (se atribuído) e o evento de auditoria numa
/// transação só. Idempotente por `(source, externalOrderId)` — reimportar ou
/// ressincronizar o mesmo pedido não duplica venda nem comissão.
export async function writeOrder(input: OrderWriteInput): Promise<OrderWriteResult> {
  const existing = await prisma.order.findUnique({
    where: {
      source_externalOrderId: { source: input.source, externalOrderId: input.externalOrderId },
    },
    select: { id: true },
  });
  if (existing) return { skipped: true };

  const gmvCents = input.items.reduce((acc, i) => acc + i.totalCents, 0);
  const commissionCents = input.attribution.affiliationId
    ? Math.round(gmvCents * input.attribution.rate)
    : 0;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        sellerProfileId: input.sellerProfileId,
        campaignId: input.campaignId,
        orderStatus: input.status,
        paymentStatus: paymentFor(input.status),
        totalAmount: toDecimalString(gmvCents),
        creatorCommission: toDecimalString(commissionCents),
        netRevenue: toDecimalString(gmvCents - commissionCents),
        source: input.source,
        externalOrderId: input.externalOrderId,
        syncedAt: new Date(),
        placedAt: input.placedAt,
        // Decisão gravada, nunca recalculada na leitura (§8 do plano).
        attributedAffiliationId: input.attribution.affiliationId,
        attributedAt: input.attribution.affiliationId ? new Date() : null,
        attributionWindowDays: input.attribution.windowDays,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: toDecimalString(i.unitPriceCents),
            totalAmount: toDecimalString(i.totalCents),
          })),
        },
      },
      select: { id: true },
    });

    if (input.attribution.affiliationId && input.attribution.creatorProfileId && commissionCents > 0) {
      await tx.commission.create({
        data: {
          creatorProfileId: input.attribution.creatorProfileId,
          orderId: order.id,
          affiliationId: input.attribution.affiliationId,
          campaignId: input.campaignId,
          // Taxa congelada agora — se a afiliação mudar amanhã, este registro não muda junto.
          rate: String(input.attribution.rate),
          estimatedAmount: toDecimalString(commissionCents),
          status: input.status === "DELIVERED" ? "APPROVED" : "PENDING",
        },
      });
    }

    await tx.event.create({
      data: {
        eventType: "ORDER_IMPORTED",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          externalOrderId: input.externalOrderId,
          source: input.source,
          attributionReason: input.attribution.reason,
          windowDays: input.attribution.windowDays,
          gmvCents,
          commissionCents,
        },
      },
    });
  });

  return {
    skipped: false,
    items: input.items.length,
    gmvCents,
    attributed: input.attribution.affiliationId !== null,
    commissionCents,
  };
}

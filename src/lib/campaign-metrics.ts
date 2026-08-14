import "server-only";

import { prisma } from "@/lib/db";
import { toCents } from "@/lib/money";
import { OrderStatus, type Prisma } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Resultado de campanha (§45) e lucro real (§40).
//
// Sobre o ROI: a palavra é ambígua o bastante para virar número sem significado
// se não for definida. Aqui ele é **GMV gerado ÷ comissões pagas** — "para cada
// R$ 1 de comissão, quanto entrou de venda". É a razão que responde a decisão
// que o seller realmente toma numa campanha: subir ou não a comissão.
//
// A UI mostra o rótulo junto para não deixar a interpretação por conta do
// leitor.
// ---------------------------------------------------------------------------

const REALIZED: Prisma.EnumOrderStatusFilter = {
  notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED],
};

export type CampaignMetrics = {
  gmvCents: number;
  orders: number;
  commissionCents: number;
  /// Lucro depois de custo do produto e comissão. Null quando algum produto
  /// envolvido não tem custos cadastrados — meio lucro é pior que lucro nenhum.
  estimatedProfitCents: number | null;
  /// GMV ÷ comissões. Null quando não houve comissão (não dá para dividir por
  /// zero, e "infinito" não é resposta útil).
  roi: number | null;
  activeCreators: number;
};

export async function loadCampaignMetrics(
  campaignIds: string[],
): Promise<Map<string, CampaignMetrics>> {
  const out = new Map<string, CampaignMetrics>();
  if (campaignIds.length === 0) return out;

  const orders = await prisma.order.findMany({
    where: { campaignId: { in: campaignIds }, orderStatus: REALIZED },
    select: {
      campaignId: true,
      totalAmount: true,
      creatorCommission: true,
      attributedAffiliation: { select: { creatorProfileId: true } },
      items: {
        select: {
          quantity: true,
          totalAmount: true,
          product: {
            select: { economics: { select: { productCost: true, shippingCost: true, platformFee: true, operationalCost: true } } },
          },
        },
      },
    },
  });

  const acc = new Map<
    string,
    {
      gmv: number;
      orders: number;
      commission: number;
      cost: number;
      costKnown: boolean;
      creators: Set<string>;
    }
  >();

  for (const id of campaignIds) {
    acc.set(id, { gmv: 0, orders: 0, commission: 0, cost: 0, costKnown: true, creators: new Set() });
  }

  for (const order of orders) {
    const entry = acc.get(order.campaignId!);
    if (!entry) continue;

    entry.gmv += toCents(order.totalAmount);
    entry.commission += toCents(order.creatorCommission);
    entry.orders += 1;
    if (order.attributedAffiliation) {
      entry.creators.add(order.attributedAffiliation.creatorProfileId);
    }

    for (const item of order.items) {
      const e = item.product.economics;
      if (!e) {
        // Um produto sem custos contamina o lucro do conjunto inteiro. Marcar
        // como desconhecido é mais honesto que somar zero e exibir um lucro
        // inflado que o seller vai acreditar.
        entry.costKnown = false;
        continue;
      }
      const unitCost =
        toCents(e.productCost) +
        toCents(e.shippingCost) +
        toCents(e.platformFee) +
        toCents(e.operationalCost);
      entry.cost += unitCost * item.quantity;
    }
  }

  for (const [id, e] of acc) {
    out.set(id, {
      gmvCents: e.gmv,
      orders: e.orders,
      commissionCents: e.commission,
      estimatedProfitCents: e.costKnown ? e.gmv - e.cost - e.commission : null,
      roi: e.commission > 0 ? e.gmv / e.commission : null,
      activeCreators: e.creators.size,
    });
  }

  return out;
}

/// Lucro estimado e ROI do seller inteiro, no período. Mesmas regras do
/// cálculo por campanha, para os dois números baterem entre as telas.
export async function loadSellerProfit(
  sellerProfileId: string,
  since: Date,
): Promise<{ estimatedProfitCents: number | null; roi: number | null; commissionCents: number }> {
  const orders = await prisma.order.findMany({
    where: { sellerProfileId, placedAt: { gte: since }, orderStatus: REALIZED },
    select: {
      totalAmount: true,
      creatorCommission: true,
      items: {
        select: {
          quantity: true,
          product: {
            select: { economics: { select: { productCost: true, shippingCost: true, platformFee: true, operationalCost: true } } },
          },
        },
      },
    },
  });

  let gmv = 0;
  let commission = 0;
  let cost = 0;
  let costKnown = true;

  for (const order of orders) {
    gmv += toCents(order.totalAmount);
    commission += toCents(order.creatorCommission);
    for (const item of order.items) {
      const e = item.product.economics;
      if (!e) {
        costKnown = false;
        continue;
      }
      cost +=
        (toCents(e.productCost) +
          toCents(e.shippingCost) +
          toCents(e.platformFee) +
          toCents(e.operationalCost)) *
        item.quantity;
    }
  }

  return {
    estimatedProfitCents: costKnown ? gmv - cost - commission : null,
    roi: commission > 0 ? gmv / commission : null,
    commissionCents: commission,
  };
}

/// Ranking de creators por GMV gerado para este seller (§40).
export async function loadTopCreators(
  sellerProfileId: string,
  since: Date,
  take = 5,
): Promise<Array<{ creatorProfileId: string; name: string; gmvCents: number; orders: number; commissionCents: number }>> {
  const orders = await prisma.order.findMany({
    where: {
      sellerProfileId,
      placedAt: { gte: since },
      orderStatus: REALIZED,
      attributedAffiliationId: { not: null },
    },
    select: {
      totalAmount: true,
      creatorCommission: true,
      attributedAffiliation: {
        select: {
          creatorProfileId: true,
          creatorProfile: { select: { profile: { select: { displayName: true } } } },
        },
      },
    },
  });

  const byCreator = new Map<
    string,
    { name: string; gmvCents: number; orders: number; commissionCents: number }
  >();

  for (const o of orders) {
    const a = o.attributedAffiliation;
    if (!a) continue;
    const entry = byCreator.get(a.creatorProfileId) ?? {
      name: a.creatorProfile.profile.displayName,
      gmvCents: 0,
      orders: 0,
      commissionCents: 0,
    };
    entry.gmvCents += toCents(o.totalAmount);
    entry.commissionCents += toCents(o.creatorCommission);
    entry.orders += 1;
    byCreator.set(a.creatorProfileId, entry);
  }

  return [...byCreator.entries()]
    .map(([creatorProfileId, v]) => ({ creatorProfileId, ...v }))
    .sort((a, b) => b.gmvCents - a.gmvCents)
    .slice(0, take);
}

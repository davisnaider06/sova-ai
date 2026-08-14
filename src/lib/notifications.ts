import "server-only";

import { prisma } from "@/lib/db";
import { toCents } from "@/lib/money";
import { formatBRL } from "@/lib/money";
import type { Profile } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Notificações (§50).
//
// Derivadas do estado do domínio, não de uma tabela de notificações.
//
// A escolha não é preguiça: uma tabela exigiria estado de "lida", e estado de
// lida cria a categoria de notificação que continua na tela depois de resolvida
// — o seller aprova a afiliação e o aviso fica lá até ele clicar em "marcar
// como lida". Derivando do estado, o aviso **some quando o motivo dele some**,
// que é o comportamento correto.
//
// A contrapartida é não ter histórico de notificação. Não faz falta: o
// histórico do que aconteceu está em `Event` e `AuditLog`, com mais detalhe.
// ---------------------------------------------------------------------------

export type NotificationItem = {
  id: string;
  title: string;
  detail?: string;
  href: string;
  /// Exige uma ação de quem está vendo. É o que conta no contador do sino —
  /// avisar sobre coisa que não pede nada treina o usuário a ignorar o sino.
  actionable: boolean;
  tone: "action" | "good" | "neutral";
};

export type NotificationFeed = {
  items: NotificationItem[];
  actionableCount: number;
};

const RECENT_DAYS = 7;

export async function loadNotifications(profile: Profile): Promise<NotificationFeed> {
  const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);
  const items =
    profile.type === "SELLER"
      ? await sellerNotifications(profile.id, since)
      : await creatorNotifications(profile.id, since);

  return {
    items,
    actionableCount: items.filter((i) => i.actionable).length,
  };
}

async function sellerNotifications(profileId: string, since: Date): Promise<NotificationItem[]> {
  const seller = await prisma.sellerProfile.findUnique({
    where: { profileId },
    select: { id: true },
  });
  if (!seller) return [];

  const [pendingAffiliations, pendingCommissions, productsWithoutCosts, recentOrders] =
    await Promise.all([
      prisma.affiliation.count({
        where: { status: "PENDING", product: { sellerProfileId: seller.id } },
      }),
      prisma.commission.aggregate({
        where: {
          order: { sellerProfileId: seller.id },
          status: { in: ["PENDING", "ESTIMATED"] },
        },
        _count: { _all: true },
        _sum: { estimatedAmount: true },
      }),
      prisma.product.count({
        where: { sellerProfileId: seller.id, status: "ACTIVE", economics: { is: null } },
      }),
      prisma.order.count({
        where: {
          sellerProfileId: seller.id,
          placedAt: { gte: since },
          attributedAffiliationId: { not: null },
        },
      }),
    ]);

  const items: NotificationItem[] = [];

  if (pendingAffiliations > 0) {
    items.push({
      id: "affiliations-pending",
      title:
        pendingAffiliations === 1
          ? "1 creator quer promover seus produtos"
          : `${pendingAffiliations} creators querem promover seus produtos`,
      detail: "Cada dia parado é venda que não acontece.",
      href: "/dashboard/afiliacoes",
      actionable: true,
      tone: "action",
    });
  }

  if (pendingCommissions._count._all > 0) {
    items.push({
      id: "commissions-pending",
      title: `${pendingCommissions._count._all} ${pendingCommissions._count._all === 1 ? "comissão aguarda" : "comissões aguardam"} sua aprovação`,
      detail: `${formatBRL(toCents(pendingCommissions._sum.estimatedAmount))} no total.`,
      href: "/dashboard/comissoes",
      actionable: true,
      tone: "action",
    });
  }

  if (productsWithoutCosts > 0) {
    items.push({
      id: "products-without-costs",
      title: `${productsWithoutCosts} ${productsWithoutCosts === 1 ? "produto ativo sem custos" : "produtos ativos sem custos"}`,
      detail: "Sem custos a comissão recomendada não roda, e a margem fica no escuro.",
      href: "/dashboard/produtos",
      actionable: true,
      tone: "action",
    });
  }

  if (recentOrders > 0) {
    items.push({
      id: "recent-attributed",
      title: `${recentOrders} ${recentOrders === 1 ? "venda de creator" : "vendas de creators"} nos últimos ${RECENT_DAYS} dias`,
      href: "/dashboard/pedidos",
      actionable: false,
      tone: "good",
    });
  }

  return items;
}

async function creatorNotifications(profileId: string, since: Date): Promise<NotificationItem[]> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { profileId },
    select: { id: true, niches: true },
  });
  if (!creator) return [];

  const [invites, approved, newCommissions, activeProducts] = await Promise.all([
    prisma.campaignCreator.count({
      where: { creatorProfileId: creator.id, status: "INVITED", campaign: { status: "ACTIVE" } },
    }),
    prisma.affiliation.count({
      where: { creatorProfileId: creator.id, status: "ACTIVE", startedAt: { gte: since } },
    }),
    prisma.commission.aggregate({
      where: { creatorProfileId: creator.id, createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { estimatedAmount: true },
    }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
  ]);

  const items: NotificationItem[] = [];

  if (invites > 0) {
    items.push({
      id: "campaign-invites",
      title:
        invites === 1
          ? "Você recebeu um convite de campanha"
          : `Você recebeu ${invites} convites de campanha`,
      detail: "Campanhas costumam pagar comissão acima do padrão.",
      href: "/dashboard/campanhas",
      actionable: true,
      tone: "action",
    });
  }

  if (creator.niches.length === 0) {
    items.push({
      id: "profile-incomplete",
      title: "Escolha seus nichos",
      detail: "É o sinal de maior peso no seu match. Sem ele, a descoberta fica no chute.",
      href: "/dashboard/configuracoes",
      actionable: true,
      tone: "action",
    });
  }

  if (newCommissions._count._all > 0) {
    items.push({
      id: "new-commissions",
      title: `${newCommissions._count._all} ${newCommissions._count._all === 1 ? "nova comissão" : "novas comissões"}`,
      detail: `${formatBRL(toCents(newCommissions._sum.estimatedAmount))} nos últimos ${RECENT_DAYS} dias.`,
      href: "/dashboard/comissoes",
      actionable: false,
      tone: "good",
    });
  }

  if (approved > 0) {
    items.push({
      id: "affiliations-approved",
      title: `${approved} ${approved === 1 ? "afiliação aprovada" : "afiliações aprovadas"} nesta semana`,
      href: "/dashboard/minhas-afiliacoes",
      actionable: false,
      tone: "good",
    });
  }

  if (activeProducts > 0 && creator.niches.length > 0) {
    items.push({
      id: "catalog",
      title: `${activeProducts} ${activeProducts === 1 ? "produto disponível" : "produtos disponíveis"} para promover`,
      href: "/dashboard/descobrir",
      actionable: false,
      tone: "neutral",
    });
  }

  return items;
}

import "server-only";

import { prisma } from "@/lib/db";
import { profileScope } from "@/lib/scoped-db";
import { decideAttribution, DEFAULT_ATTRIBUTION_WINDOW_DAYS } from "@/lib/attribution";
import { writeOrder } from "@/lib/integration/orders-write";
import { getValidAccessToken } from "@/lib/tiktok-shop/connection";
import { getTikTokShopConfig } from "@/lib/tiktok-shop/config";
import {
  getCreatorProfile,
  parseTikTokShopAmountCents,
  searchCreatorAffiliateOrders,
  type AffiliateOrder,
} from "@/lib/tiktok-shop/creator-api";
import { OrderStatus } from "@/generated/prisma";
import type { ExternalAccount } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Adapter de ingestão — Affiliate Creator API do TikTok Shop.
//
// É o segundo adapter previsto em [[Sova - Decisoes e Plano]] §5: mesma
// normalização, mesmo `writeOrder`, nenhuma linha de Order/Affiliation/
// Commission muda por causa deste arquivo — só a fonte do dado bruto muda.
//
// Diferença central para o CSV, que molda todo o desenho abaixo: aqui o
// creator é conhecido com CERTEZA (é dono do access_token que autorizou a
// chamada). Não existe "handle declarado" para adivinhar de quem é a venda —
// a pergunta que resta é só "este produto está no catálogo da Sova, e este
// creator tem afiliação com ele?". Pedidos de lojas ou produtos que a Sova
// não conhece são ignorados, de propósito: a API devolve TODO pedido afiliado
// do creator em qualquer loja do TikTok Shop, não só as que usam a Sova.
//
// Sem ProfileMetric novo aqui: o sinal `CONNECTED` que este módulo produz é o
// próprio Order/Commission gravado com `source: "TIKTOK"` — é ele que
// alimenta o componente "histórico" do matching (`src/lib/matching.ts`), que
// já é o de maior peso e não distingue a origem da venda, só se ela aconteceu.
// ---------------------------------------------------------------------------

const MAX_PAGES = 20;
const PAGE_SIZE = 50;

export type SyncOrdersResult =
  | { status: "reconnect"; reason: string }
  | { status: "not_configured" }
  | {
      status: "ok";
      pagesRead: number;
      ordersSeen: number;
      ordersCreated: number;
      ordersSkipped: number;
      ordersIgnored: number; // não bateram com nenhum produto do catálogo
      gmvCents: number;
      commissionCents: number;
      attributed: number;
      errors: string[];
    };

export async function syncCreatorAffiliateOrders(
  profileId: string,
  creatorProfileId: string,
  creatorDisplayName: string,
  account: ExternalAccount,
  options: { windowDays?: number } = {},
): Promise<SyncOrdersResult> {
  const config = getTikTokShopConfig();
  if (!config) return { status: "not_configured" };

  const token = await getValidAccessToken(profileId, account);
  if (token.status === "reconnect") {
    await markSyncError(profileId, account.id, token.reason);
    return { status: "reconnect", reason: token.reason };
  }

  const creds = { appKey: config.appKey, appSecret: config.appSecret, accessToken: token.accessToken };
  const windowDays = options.windowDays ?? DEFAULT_ATTRIBUTION_WINDOW_DAYS;

  // Retrato do perfil, igual ao Login Kit faz no sync — não bloqueia o resto
  // se falhar (scope `creator.affiliate.info` pode não ter sido concedido).
  const profileInfo = await getCreatorProfile(creds);
  if (profileInfo.status === "ok") {
    await profileScope(profileId).externalAccounts.update(account.id, {
      metadata: {
        username: profileInfo.data.username,
        selectionRegion: profileInfo.data.selection_region,
        permissions: profileInfo.data.permissions,
        capturedAt: new Date().toISOString(),
      } as never,
    });
  }

  const result = {
    pagesRead: 0,
    ordersSeen: 0,
    ordersCreated: 0,
    ordersSkipped: 0,
    ordersIgnored: 0,
    gmvCents: 0,
    commissionCents: 0,
    attributed: 0,
    errors: [] as string[],
  };

  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await searchCreatorAffiliateOrders(creds, {
      pageSize: PAGE_SIZE,
      pageToken,
    });

    if (response.status !== "ok") {
      const message = `O TikTok Shop recusou a busca de pedidos: ${response.message}`;
      result.errors.push(message);
      await markSyncError(profileId, account.id, message);
      return { status: "ok", ...result };
    }

    result.pagesRead++;
    result.ordersSeen += response.data.orders.length;

    for (const order of response.data.orders) {
      try {
        const outcome = await importOneAffiliateOrder(order, creatorProfileId, creatorDisplayName, windowDays);
        if (outcome === "ignored") {
          result.ordersIgnored++;
          continue;
        }
        if (outcome.skipped) {
          result.ordersSkipped++;
          continue;
        }
        result.ordersCreated++;
        result.gmvCents += outcome.gmvCents;
        result.commissionCents += outcome.commissionCents;
        if (outcome.attributed) result.attributed++;
      } catch (error) {
        result.errors.push(
          `Pedido ${order.id}: ${error instanceof Error ? error.message : "falha ao importar"}`,
        );
      }
    }

    pageToken = response.data.next_page_token;
    if (!pageToken) break;
  }

  await profileScope(profileId).externalAccounts.update(account.id, {
    syncStatus: result.errors.length > 0 ? "ERROR" : "OK",
    lastSyncedAt: new Date(),
    lastSyncError: result.errors[0] ?? null,
  });

  return { status: "ok", ...result };
}

async function markSyncError(profileId: string, accountId: string, message: string) {
  await profileScope(profileId).externalAccounts.update(accountId, {
    syncStatus: "ERROR",
    lastSyncedAt: new Date(),
    lastSyncError: message,
  });
}

type ImportOutcome = "ignored" | { skipped: true } | { skipped: false; gmvCents: number; commissionCents: number; attributed: boolean };

async function importOneAffiliateOrder(
  order: AffiliateOrder,
  creatorProfileId: string,
  creatorDisplayName: string,
  windowDays: number,
): Promise<ImportOutcome> {
  const productIds = [...new Set(order.skus.map((s) => s.product_id))];

  // Cruza com o catálogo da Sova por `externalProductId` — a mesma chave que
  // o CSV usa. Sem filtro de vendedor: o creator pode ter afiliação com
  // qualquer seller cadastrado, e é isso que decide se o pedido interessa.
  const products = await prisma.product.findMany({
    where: { externalProductId: { in: productIds } },
    select: { id: true, externalProductId: true, sellerProfileId: true },
  });
  if (products.length === 0) return "ignored";

  const bySourceId = new Map(products.map((p) => [p.externalProductId, p]));

  const matchedSkus = order.skus.filter((s) => bySourceId.has(s.product_id));
  if (matchedSkus.length === 0) return "ignored";

  // Um Order só tem um `sellerProfileId` — se os itens batidos vierem de
  // vendedores diferentes (carrinho misto, raro no TikTok Shop), a Sova não
  // tem como representar isso hoje. Falha visível é melhor que gravar o
  // pedido no vendedor errado.
  const sellerIds = new Set(matchedSkus.map((s) => bySourceId.get(s.product_id)!.sellerProfileId));
  if (sellerIds.size > 1) {
    throw new Error("itens batidos pertencem a mais de um vendedor da Sova — não importado");
  }
  const sellerProfileId = [...sellerIds][0];

  // Mesma restrição para moeda: `Order.currency` é um campo só.
  const currencies = new Set(matchedSkus.map((s) => s.price.currency));
  if (currencies.size > 1) {
    throw new Error("itens batidos vêm em moedas diferentes — não importado");
  }

  const items = matchedSkus.map((s) => {
    const product = bySourceId.get(s.product_id)!;
    const totalCents = parseTikTokShopAmountCents(s.price) ?? 0;
    const quantity = s.quantity > 0 ? s.quantity : 1;
    return {
      productId: product.id,
      quantity,
      unitPriceCents: Math.round(totalCents / quantity),
      totalCents,
    };
  });

  const placedAt = new Date(order.create_time * 1000);
  const status = mapAffiliateOrderStatus(order.status);

  // Afiliações deste creator com os produtos batidos — não com outros
  // creators, porque este pedido já chegou atribuído: veio da API do PRÓPRIO
  // creator, autenticado. `decideAttribution` ainda decide a janela (a
  // afiliação pode ter sido encerrada antes da venda), e o handle declarado
  // resolve o empate raro de mais de um produto elegível no mesmo pedido.
  const affiliations = await prisma.affiliation.findMany({
    where: { creatorProfileId, productId: { in: items.map((i) => i.productId) } },
    select: { id: true, status: true, startedAt: true, endedAt: true, commissionRate: true, creatorProfileId: true },
  });

  const decision = decideAttribution({
    placedAt,
    declaredCreatorHandle: creatorDisplayName,
    windowDays,
    candidates: affiliations.map((a) => ({
      affiliationId: a.id,
      creatorProfileId: a.creatorProfileId,
      creatorHandle: creatorDisplayName,
      startedAt: a.startedAt,
      endedAt: a.endedAt,
      status: a.status,
      // Sem sinal de conteúdo aqui — a atribuição já vem confirmada pela API,
      // o `lastContentAt` do CSV existe para adivinhar quem é; aqui já se sabe.
      lastContentAt: null,
    })),
  });

  const attributed = affiliations.find((a) => a.id === decision.affiliationId) ?? null;
  const rate = attributed ? Number(attributed.commissionRate.toString()) : 0;

  const campaign = await prisma.campaign.findFirst({
    where: {
      sellerProfileId,
      status: { in: ["ACTIVE", "PAUSED", "ENDED"] },
      products: { some: { productId: { in: items.map((i) => i.productId) } } },
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: placedAt } }] },
        { OR: [{ endAt: null }, { endAt: { gte: placedAt } }] },
      ],
    },
    orderBy: { startAt: "desc" },
    select: { id: true },
  });

  const result = await writeOrder({
    sellerProfileId,
    campaignId: campaign?.id ?? null,
    externalOrderId: order.id,
    source: "TIKTOK",
    placedAt,
    status,
    items,
    attribution: {
      affiliationId: decision.affiliationId,
      creatorProfileId: attributed?.creatorProfileId ?? null,
      rate,
      reason: decision.reason,
      windowDays: decision.windowDays,
    },
  });

  if (result.skipped) return { skipped: true };
  return {
    skipped: false,
    gmvCents: result.gmvCents,
    commissionCents: result.commissionCents,
    attributed: result.attributed,
  };
}

/// Mapeamento best-effort: a doc oficial mostra "SETTLED" como exemplo de
/// `status`, sem publicar a lista fechada de valores. Ajustar quando o
/// primeiro pedido real chegar e o valor de verdade for conferido — mesma
/// postura tolerante que `src/lib/hubla.ts` já adota para payload sem schema
/// publicado.
function mapAffiliateOrderStatus(raw: string): OrderStatus {
  const s = raw.trim().toUpperCase();
  if (s === "SETTLED" || s === "COMPLETED") return OrderStatus.DELIVERED;
  if (s.includes("CANCEL") || s === "INVALID" || s === "VOID") return OrderStatus.CANCELLED;
  if (s.includes("REFUND") || s.includes("RETURN")) return OrderStatus.RETURNED;
  if (s.includes("SHIP")) return OrderStatus.SHIPPED;
  return OrderStatus.PENDING;
}

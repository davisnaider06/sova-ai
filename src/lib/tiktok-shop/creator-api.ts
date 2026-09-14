import { tiktokShopGet, tiktokShopPost, type TikTokShopApiResult } from "@/lib/tiktok-shop/client";

// ---------------------------------------------------------------------------
// Endpoints da Affiliate Creator API usados pela Sova.
//
// Paths, scopes e formato de resposta conferidos na API Reference oficial
// (Affiliate creator > Get Creator Profile / Search Creator Affiliate Orders),
// logada, em 14/09/2026 — não deduzidos pelo nome do endpoint.
// ---------------------------------------------------------------------------

export type CreatorCredentials = {
  appKey: string;
  appSecret: string;
  accessToken: string;
};

/// Resposta de `GET /affiliate_creator/202508/profiles`.
/// Required scope: `creator.affiliate.info` (ou `creator.video.write`).
export type CreatorProfileData = {
  avatar: { width: number; height: number; url: string };
  username: string;
  /// País de venda declarado no TikTok Shop — cruza com o cadastro da Sova.
  selection_region: string;
  register_region: string;
  seller_type: string;
  permissions: string[];
  user_type: string;
  creator_user_open_id: string;
};

export function getCreatorProfile(
  creds: CreatorCredentials,
): Promise<TikTokShopApiResult<CreatorProfileData>> {
  return tiktokShopGet<CreatorProfileData>({
    path: "/affiliate_creator/202508/profiles",
    appKey: creds.appKey,
    appSecret: creds.appSecret,
    accessToken: creds.accessToken,
  });
}

/// Um valor monetário do jeito que a API devolve: string (não sempre limpa —
/// a doc mostra exemplos com símbolo de moeda embutido, tipo "Rp9.900") mais o
/// código da moeda ao lado. `parseTikTokShopAmount` isola o número.
export type TikTokShopMoney = { amount: string; currency: string };

export type AffiliateOrderSku = {
  id: string;
  product_id: string;
  product_name: string;
  campaign_id?: string;
  open_collaboration_id?: string;
  target_collaboration_id?: string;
  shop_name?: string;
  quantity: number;
  price: TikTokShopMoney;
  /// Comissão efetivamente paga — é o número que importa para a Commission da
  /// Sova. `estimated_commission` existe para pedidos ainda não liquidados.
  actual_commission?: TikTokShopMoney;
  estimated_commission?: TikTokShopMoney;
  commission_rate?: number;
  trace_info?: { id: string; type: string };
};

export type AffiliateOrder = {
  id: string;
  create_time: number;
  delivery_time?: number;
  /// Valores confirmados na doc: PROCESSING, SETTLED, entre outros — a Sova só
  /// distingue liquidado de não liquidado, então tratamos como string aberta
  /// em vez de fechar um enum que a TikTok pode estender sem aviso.
  status: string;
  skus: AffiliateOrderSku[];
};

export type SearchAffiliateOrdersData = {
  orders: AffiliateOrder[];
  next_page_token?: string;
  total_count: number;
};

export type SearchAffiliateOrdersParams = {
  pageSize?: number;
  pageToken?: string;
  /// Unix timestamp (segundos). Filtra por data de criação do pedido.
  createTimeGe?: number;
  createTimeLt?: number;
};

/// `POST /affiliate_creator/202410/orders/search`.
/// Required scope: `creator.affiliate_collaboration.read`.
///
/// Devolve pedido + produto por SKU, com a comissão real paga — é o dado que
/// falta pro sinal `CONNECTED` existir sem depender de CSV. A doc é explícita:
/// isto retorna pedidos de qualquer loja com a qual o creator tenha
/// colaboração afiliada, não só lojas cadastradas na Sova — o cruzamento com o
/// catálogo próprio acontece em `tiktok-shop-sync.ts`, não aqui.
export function searchCreatorAffiliateOrders(
  creds: CreatorCredentials,
  params: SearchAffiliateOrdersParams = {},
): Promise<TikTokShopApiResult<SearchAffiliateOrdersData>> {
  const query: Record<string, string> = {
    page_size: String(params.pageSize ?? 50),
  };
  if (params.pageToken) query.page_token = params.pageToken;

  const body: Record<string, unknown> = {};
  if (params.createTimeGe !== undefined) body.create_time_ge = params.createTimeGe;
  if (params.createTimeLt !== undefined) body.create_time_lt = params.createTimeLt;

  return tiktokShopPost<SearchAffiliateOrdersData>({
    path: "/affiliate_creator/202410/orders/search",
    appKey: creds.appKey,
    appSecret: creds.appSecret,
    accessToken: creds.accessToken,
    query,
    body,
  });
}

/// Isola o número de um valor monetário da API, mesmo quando vem com símbolo
/// de moeda grudado (a doc mostra "Rp9.900" em pelo menos um exemplo). Nunca
/// inventa conversão de moeda — quem chama decide o que fazer se a moeda não
/// bater com a esperada.
export function parseTikTokShopAmountCents(money: TikTokShopMoney | undefined): number | null {
  if (!money) return null;
  const cleaned = money.amount.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

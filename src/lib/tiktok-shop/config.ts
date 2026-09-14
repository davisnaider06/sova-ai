// ---------------------------------------------------------------------------
// Configuração do módulo TikTok Shop — Affiliate Creator API.
//
// **Não é o mesmo app do `src/lib/tiktok/`.** Aquele é o Login Kit
// (developers.tiktok.com), audiência e vídeo. Este é um app registrado no
// TikTok Shop Partner Center (partner.tiktokshop.com), categoria "Customer
// Engagement > Creator collaborations" — outra chave, outro portal, outro
// domínio de autorização, outro algoritmo de assinatura. Ver
// [[Sova - Especificacao Integracao API TikTok]] no segundo cérebro.
//
// Endpoints e scopes conferidos na doc oficial logada em 14/09/2026 (Developer
// Guide > Authorization, API Reference > Affiliate creator) — não deduzidos.
// ---------------------------------------------------------------------------

export const TIKTOK_SHOP_ENDPOINTS = {
  /// Autorização do lado creator. Único domínio para todo mercado (não varia
  /// por US/ROW como a autorização de seller/partner).
  creatorAuthorize: "https://shop.tiktok.com/alliance/creator/auth",
  /// Endpoints de token — GET, não POST. Mesmo domínio para todo mercado.
  tokenGet: "https://auth.tiktok-shops.com/api/v2/token/get",
  tokenRefresh: "https://auth.tiktok-shops.com/api/v2/token/refresh",
  /// Base das chamadas de negócio, assinadas com HMAC-SHA256.
  apiBase: "https://open-api.tiktokglobalshop.com",
} as const;

/// Scopes que a aplicação pede ao creator.
///
/// `creator.affiliate.info` cobre o perfil declarado (Get Creator Profile).
/// `creator.affiliate_collaboration.read` cobre o histórico de pedido —
/// exatamente o sinal `CONNECTED` que falta hoje sem CSV.
export const TIKTOK_SHOP_SCOPES = [
  "creator.affiliate.info",
  "creator.affiliate_collaboration.read",
] as const;

export type TikTokShopScope = (typeof TIKTOK_SHOP_SCOPES)[number];

/// `user_type` esperado na resposta de token para uma autorização de creator.
/// 0 = Seller, 1 = Creator, 3 = Partner (TAP) — ver "Authorization overview"
/// da doc oficial. Receber outro valor aqui é sinal de link de autorização
/// errado (ex.: usou o de seller sem querer), não erro transitório.
export const CREATOR_USER_TYPE = 1;

export type TikTokShopConfig = {
  appKey: string;
  appSecret: string;
  redirectUri: string;
};

/// Devolve null em vez de estourar: sem as chaves, a tela de conexão aparece
/// como "não configurada" e o resto do SaaS segue funcionando — mesma regra
/// de isolamento do módulo `tiktok/config.ts`.
export function getTikTokShopConfig(): TikTokShopConfig | null {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY;
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET;
  const redirectUri = process.env.TIKTOK_SHOP_REDIRECT_URI;

  if (!appKey || !appSecret || !redirectUri) return null;
  return { appKey, appSecret, redirectUri };
}

export function isTikTokShopConfigured(): boolean {
  return getTikTokShopConfig() !== null;
}

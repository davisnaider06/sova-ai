// ---------------------------------------------------------------------------
// Configuração do módulo TikTok.
//
// Tudo que é endpoint, scope ou nome de campo do TikTok mora aqui. O resto do
// módulo importa daqui, e o resto do SaaS não importa nada disto — se o TikTok
// mudar um endpoint ou renomear um scope, o estrago fica dentro deste arquivo.
//
// Endpoints e campos foram conferidos na documentação oficial (13/08/2026), não
// deduzidos. Ver TIKTOK-INTEGRACAO.md para as fontes de cada um.
// ---------------------------------------------------------------------------

/// Superfície de OAuth: **Login Kit / Display API**, a conta do creator.
///
/// Não confundir com a API do TikTok Shop, que é outra autorização, outro
/// portal e outro conjunto de dados (produtos, pedidos, GMV). Este módulo não
/// toca no Shop — ver §12 do SAAS_TIKTOK_SHOP_CNPJ_OAUTH_IA.md.
export const TIKTOK_ENDPOINTS = {
  authorize: "https://www.tiktok.com/v2/auth/authorize/",
  token: "https://open.tiktokapis.com/v2/oauth/token/",
  revoke: "https://open.tiktokapis.com/v2/oauth/revoke/",
  userInfo: "https://open.tiktokapis.com/v2/user/info/",
  videoList: "https://open.tiktokapis.com/v2/video/list/",
} as const;

/// Scopes que a aplicação pede.
///
/// Nenhum deles dá venda, comissão ou GMV — isso é do lado do Shop. O que estes
/// entregam é audiência e conteúdo, que é o que a análise de conta precisa.
export const TIKTOK_SCOPES = [
  "user.info.basic", // open_id, avatar, display_name
  "user.info.profile", // bio, link do perfil, verificação, username
  "user.info.stats", // seguidores, seguindo, curtidas, nº de vídeos
  "video.list", // vídeos públicos do próprio usuário
] as const;

export type TikTokScope = (typeof TIKTOK_SCOPES)[number];

/// Campos de perfil pedidos ao `/v2/user/info/`, agrupados pelo scope que cada
/// um exige. Pedir um campo sem o scope correspondente faz a chamada inteira
/// falhar, então a lista é montada a partir dos scopes concedidos, não fixa.
export const USER_FIELDS_BY_SCOPE: Record<string, readonly string[]> = {
  "user.info.basic": ["open_id", "union_id", "avatar_url", "display_name"],
  "user.info.profile": ["bio_description", "profile_deep_link", "is_verified", "username"],
  "user.info.stats": ["follower_count", "following_count", "likes_count", "video_count"],
};

/// Campos do objeto de vídeo pedidos ao `/v2/video/list/`. Todos sob `video.list`.
export const VIDEO_FIELDS = [
  "id",
  "create_time",
  "title",
  "video_description",
  "duration",
  "cover_image_url",
  "share_url",
  "embed_link",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
] as const;

/// Teto por página imposto pela API. Pedir mais que isso é erro.
export const VIDEO_PAGE_MAX = 20;

/// Quantos vídeos o sync busca de uma vez.
///
/// A sincronização roda dentro da requisição HTTP (o projeto não tem worker),
/// então o teto existe para a ação não estourar o tempo da função na Vercel.
/// Quando houver fila, isto vira o tamanho do lote e o teto some.
export const SYNC_VIDEO_LIMIT = 60;

export type TikTokConfig = {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
};

/// Lê a configuração do ambiente.
///
/// Devolve null em vez de estourar: sem as chaves, a integração aparece como
/// "não configurada" e o resto do SaaS segue funcionando — que é a regra de
/// isolamento do módulo.
export function getTikTokConfig(): TikTokConfig | null {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !clientSecret || !redirectUri) return null;
  return { clientKey, clientSecret, redirectUri };
}

export function isTikTokConfigured(): boolean {
  return getTikTokConfig() !== null;
}

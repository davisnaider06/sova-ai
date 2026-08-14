import { TIKTOK_ENDPOINTS, USER_FIELDS_BY_SCOPE } from "@/lib/tiktok/config";
import { tiktokGet, type TikTokApiResult } from "@/lib/tiktok/client";

// ---------------------------------------------------------------------------
// Perfil do usuário — GET /v2/user/info/
//
// Cada campo exige um scope, e pedir um campo sem o scope correspondente faz a
// chamada inteira falhar. Por isso a lista de campos é montada a partir dos
// scopes que o usuário **realmente concedeu**, não de uma constante fixa: ele
// pode desmarcar `user.info.stats` na tela de autorização, e nesse caso pedir
// `follower_count` derrubaria também o nome e o avatar.
// ---------------------------------------------------------------------------

/// Retrato do perfil como o TikTok devolve. Campos opcionais porque a presença
/// de cada um depende do scope concedido.
export type TikTokUserInfo = {
  open_id?: string;
  union_id?: string;
  avatar_url?: string;
  display_name?: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  username?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
};

/// Campos pedíveis com os scopes concedidos.
export function fieldsForScopes(grantedScopes: readonly string[]): string[] {
  const granted = new Set(grantedScopes);
  const fields = new Set<string>();

  for (const [scope, scopeFields] of Object.entries(USER_FIELDS_BY_SCOPE)) {
    if (!granted.has(scope)) continue;
    for (const field of scopeFields) fields.add(field);
  }

  // `open_id` é a chave que casa a conexão com a conta; sem ele a resposta não
  // serve para nada. Vem de `user.info.basic`, que é sempre concedido.
  fields.add("open_id");
  return [...fields];
}

export async function fetchUserInfo(
  accessToken: string,
  grantedScopes: readonly string[],
): Promise<TikTokApiResult<TikTokUserInfo>> {
  const result = await tiktokGet<{ user: TikTokUserInfo }>(
    TIKTOK_ENDPOINTS.userInfo,
    accessToken,
    fieldsForScopes(grantedScopes),
  );

  if (result.status !== "ok") return result;
  return { status: "ok", data: result.data.user ?? {} };
}

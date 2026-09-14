import { createHmac } from "node:crypto";

// ---------------------------------------------------------------------------
// Assinatura HMAC-SHA256 das chamadas ao TikTok Shop.
//
// Algoritmo copiado da doc oficial ("Sign your API request", conferida em
// 14/09/2026), não reinventado: TikTok Shop usa o `app_secret` como chave
// simétrica, e um desvio de um caractere no formato do string a assinar (ordem
// dos parâmetros, corpo reformatado) faz toda chamada devolver "signature is
// invalid" sem dizer o motivo. Passos, na ordem que a doc define:
//
//   1. tira `sign` e `access_token` dos query params
//   2. ordena as chaves restantes em ordem alfabética
//   3. concatena {chave}{valor} de cada uma, sem separador
//   4. prefixa com o path da requisição (sem host nem query string)
//   5. se o corpo não for multipart/form-data, acrescenta os bytes exatos do
//      corpo — reserializar o JSON muda espaço/ordem/escape e quebra o hash
//   6. envolve o string com o app_secret nas duas pontas
//   7. HMAC-SHA256 do resultado, em hexadecimal
// ---------------------------------------------------------------------------

export type SignInput = {
  /// Path da requisição, sem host nem query string. Ex.: "/affiliate_creator/202410/orders/search".
  path: string;
  /// Query params que vão na URL, JÁ SEM `sign` nem `access_token`.
  query: Record<string, string>;
  /// Corpo exato que será enviado (string já serializada), ou null para GET
  /// sem corpo. Precisa ser o mesmo texto que sai na requisição — assinar um
  /// objeto e depois `JSON.stringify` de novo no fetch pode gerar bytes
  /// diferentes (ordem de chave, espaço) e invalidar a assinatura.
  body: string | null;
  appSecret: string;
};

export function signTikTokShopRequest({ path, query, body, appSecret }: SignInput): string {
  const sortedKeys = Object.keys(query).sort();
  const paramString = sortedKeys.map((key) => `${key}${query[key]}`).join("");

  let input = `${path}${paramString}`;
  if (body) input += body;

  input = `${appSecret}${input}${appSecret}`;

  return createHmac("sha256", appSecret).update(input, "utf8").digest("hex");
}

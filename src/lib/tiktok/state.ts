import "server-only";

import { cookies } from "next/headers";
import { generateState, statesMatch } from "@/lib/tiktok/oauth";

// ---------------------------------------------------------------------------
// Proteção de CSRF do fluxo OAuth.
//
// O `state` guardado em cookie httpOnly e conferido no callback. Sem isso, um
// terceiro consegue induzir um usuário logado a completar uma autorização que
// ele não iniciou — e a conta TikTok do atacante acabaria vinculada ao perfil
// da vítima.
//
// Não há tabela para isso de propósito: o state vive segundos, é de uso único
// e não interessa a ninguém depois. Cookie httpOnly resolve sem migration.
// ---------------------------------------------------------------------------

const COOKIE = "tiktok_oauth_state";
const MAX_AGE_SECONDS = 600; // 10 minutos: tempo de sobra para autorizar

export async function issueState(): Promise<string> {
  const state = generateState();
  const jar = await cookies();

  jar.set(COOKIE, state, {
    httpOnly: true, // fora do alcance de qualquer script na página
    sameSite: "lax", // precisa sobreviver ao retorno vindo do domínio do TikTok
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return state;
}

/// Confere o state do callback contra o cookie e o consome.
///
/// Uso único: o cookie é apagado na verificação, com ou sem sucesso. Um state
/// que continuasse valendo depois de usado permitiria repetir o callback.
export async function consumeState(received: string | null): Promise<boolean> {
  const jar = await cookies();
  const expected = jar.get(COOKIE)?.value ?? null;

  jar.delete(COOKIE);

  return statesMatch(expected, received);
}

import "server-only";

import { cookies } from "next/headers";
import { generateState, statesMatch } from "@/lib/tiktok-shop/oauth";

// ---------------------------------------------------------------------------
// Proteção de CSRF do fluxo OAuth do creator na Affiliate Creator API.
//
// Cookie separado do `tiktok_oauth_state` (Login Kit): os dois fluxos podem
// rodar em paralelo — nada impede o creator de abrir "conectar TikTok" e
// "conectar TikTok Shop" na mesma sessão — e um único cookie faria o segundo
// clique invalidar o state do primeiro.
// ---------------------------------------------------------------------------

const COOKIE = "tiktok_shop_oauth_state";
const MAX_AGE_SECONDS = 600; // 10 minutos: tempo de sobra para autorizar

export async function issueState(): Promise<string> {
  const state = generateState();
  const jar = await cookies();

  jar.set(COOKIE, state, {
    httpOnly: true,
    sameSite: "lax", // precisa sobreviver ao retorno vindo do domínio do TikTok
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return state;
}

export async function consumeState(received: string | null): Promise<boolean> {
  const jar = await cookies();
  const expected = jar.get(COOKIE)?.value ?? null;

  jar.delete(COOKIE);

  return statesMatch(expected, received);
}

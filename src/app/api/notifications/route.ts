import { NextResponse } from "next/server";
import { ensureUser, resolveActiveProfile } from "@/lib/session";
import { loadNotifications } from "@/lib/notifications";

// O sino vive no Topbar, que é renderizado por cada página. Threadar as
// notificações por todas elas seria mudar dezenas de assinaturas para um dado
// que não pertence a nenhuma. Uma rota própria resolve com um fetch só.
//
// `ensureUser` em vez de `requireUser`: aqui um visitante sem sessão recebe uma
// lista vazia, não um redirect — redirecionar um fetch de fundo levaria o
// usuário para o login no meio de outra coisa.
export async function GET() {
  const user = await ensureUser();
  if (!user) return NextResponse.json({ items: [], actionableCount: 0 });

  const profile = resolveActiveProfile(user);
  if (!profile) return NextResponse.json({ items: [], actionableCount: 0 });

  const feed = await loadNotifications(profile);
  return NextResponse.json(feed, {
    // Sino não é dado histórico: sempre refletir o estado atual.
    headers: { "Cache-Control": "no-store" },
  });
}

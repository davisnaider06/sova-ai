import { clerkMiddleware } from "@clerk/nextjs/server";

// No Next 16 o antigo `middleware.ts` virou `proxy.ts` — mesmo comportamento,
// nome novo.
//
// Aqui o middleware **não protege rota nenhuma por path**, de propósito.
//
// A versão anterior usava `createRouteMatcher(["/dashboard(.*)", ...])` +
// `auth.protect()`. O Clerk depreciou esse padrão, e o motivo é bom: casar
// caminho por regex é uma segunda definição de roteamento, mantida à mão, que
// diverge de como o Next realmente resolve as requisições. Quando diverge, o
// que sobra é recurso protegido alcançável — e ninguém percebe, porque o
// middleware "está lá".
//
// A proteção real mora onde o dado é lido:
//
//   - `/dashboard/*`  → o layout chama `requireProfile()`
//   - `/onboarding`   → a página chama `requireUser()`
//   - Server Actions  → cada uma abre com `requireUser/Seller/CreatorScope()`
//   - Webhook Clerk   → valida a assinatura Svix no próprio handler, porque
//                       quem chama é o Clerk, não um usuário com sessão
//
// Isso não é redundância removida: é a checagem passando a viver junto do
// acesso que ela protege. Uma rota nova nasce protegida porque não existe como
// ler dado do domínio sem passar por `src/lib/session.ts`.
//
// O `clerkMiddleware()` continua necessário — é ele que popula o contexto de
// sessão que `auth()` lê dentro dos Server Components.
export default clerkMiddleware();

export const config = {
  matcher: [
    // `/preview` fica de fora: é a galeria de componentes de desenvolvimento,
    // não lê dado nenhum, e passar por aqui faria o Clerk desviar o primeiro
    // acesso para o handshake de dev-browser — que um navegador headless não
    // tem como completar, tornando a rota inútil para revisar o visual.
    "/((?!_next|preview|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

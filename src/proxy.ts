import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// No Next 16 o antigo `middleware.ts` virou `proxy.ts` — mesmo comportamento,
// nome novo.

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

// Webhooks são chamados pelo Clerk, não por um usuário logado — exigir sessão
// aqui derrubaria todas as entregas. A autenticidade vem da assinatura Svix,
// verificada dentro do handler.
const isPublicApiRoute = createRouteMatcher(["/api/webhooks(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicApiRoute(req)) return;
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

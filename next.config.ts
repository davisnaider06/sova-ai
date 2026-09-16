import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// CSP sem nonce (a app não força dynamic rendering em tudo, então nonce por
// requisição não é viável sem reescrever o roteamento — ver
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
// `'unsafe-inline'` fica em script/style por causa disso; o resto do CSP ainda
// fecha a superfície que importa: nada de fonte externa, nada em iframe de
// terceiro, sem plugin/object.
//
// Domínios do Clerk liberados porque a instância roda em *.clerk.accounts.dev
// (ver security-audit-saas.md — item pendente de migrar pra produção) e o
// dev-browser sync usa um iframe/fetch cross-domain pra isso.
// ---------------------------------------------------------------------------
// React usa eval() em dev pra reconstruir stack trace do servidor no
// navegador (não usa em produção — ver doc do CSP citada acima). Sem isso o
// `next dev` local quebra o overlay de erro, então a permissão é só de dev.
const isDev = process.env.NODE_ENV !== "production";

// Domínios exigidos pelo Clerk em si (https://clerk.com/docs/security/clerk-csp):
// challenges.cloudflare.com é o CAPTCHA (bot protection) que o widget de
// sign-up carrega; *.protect.clerk.com é o tráfego de proteção contra fraude.
// Sem os dois o formulário de cadastro trava com "CAPTCHA failed to load".
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://*.protect.clerk.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.protect.clerk.com:*",
  "frame-src https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://*.protect.clerk.com",
  // O vídeo gerado (Runway) é servido de um domínio de CDN deles que não é
  // fixo/documentado publicamente — `https:` genérico aqui em vez de listar
  // um host específico que pode mudar e quebrar a reprodução sem aviso.
  "media-src 'self' https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      // A importação de pedidos sobe a planilha inteira por Server Action, e o
      // limite padrão (1 MB) estoura num export de alguns milhares de linhas.
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;

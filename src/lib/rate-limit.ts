import "server-only";

import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Rate limit centralizado, do mesmo jeito que auth em session.ts: a checagem
// mora onde o acesso acontece, não espalhada rota por rota — quem chama
// `requireUser()` já ganha o limite geral de graça.
//
// Backend é o Upstash Redis (REST, sem TCP, funciona em edge/serverless). Sem
// as variáveis de ambiente configuradas, o limitador roda em modo aberto: loga
// um aviso uma vez e deixa passar. É a mesma filosofia de `getAnthropic()` em
// src/lib/ai/client.ts — "não configurado" é um estado normal do produto, não
// motivo para a aplicação inteira parar de responder.
// ---------------------------------------------------------------------------

let redis: Redis | null | undefined;
let warned = false;

/// A integração de Upstash pelo marketplace da Vercel aplica o prefixo
/// customizado (`UPSTASH_REDIS_REST`) em cima do nome que o Upstash já usa por
/// padrão (`KV_REST_API_URL`/`KV_REST_API_TOKEN`) — o resultado não é
/// renomeável na UI (variável de integração, só "Manage Connection"). Aceita
/// os dois formatos: o gerado pela integração e o "limpo" de um banco criado
/// direto em upstash.com e colado à mão (é o que `.env.example` documenta).
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redis = null;
  } else {
    redis = new Redis({ url, token });
  }
  return redis;
}

export function isRateLimitConfigured(): boolean {
  return getRedis() !== null;
}

/// Um limitador por "balde" — cada bucket tem sua própria janela e teto, e o
/// mesmo identificador (ex: userId) pode estourar um sem afetar o outro.
const limiters = new Map<string, Ratelimit>();

function getLimiter(bucket: string, limit: number, window: `${number} ${"s" | "m" | "h"}`) {
  const client = getRedis();
  if (!client) return null;

  const existing = limiters.get(bucket);
  if (existing) return existing;

  const created = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
    prefix: `sova-ratelimit:${bucket}`,
  });
  limiters.set(bucket, created);
  return created;
}

/// IP do cliente a partir dos headers que a Vercel injeta. Não é à prova de
/// spoofing vindo de fora da borda da Vercel, mas a Vercel sobrescreve
/// `x-forwarded-for` na entrada — o valor aqui é o da conexão real, não um
/// header que o chamador conseguiria forjar direto.
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

export class RateLimitError extends Error {
  constructor(
    message = "Muitas requisições em pouco tempo. Aguarde um instante e tente de novo.",
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/// Checa e consome uma unidade do limite. Não lança — quem chama decide o que
/// fazer com `allowed: false` (redirect, erro de formulário, resposta 429).
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  window: `${number} ${"s" | "m" | "h"}`,
): Promise<RateLimitResult> {
  const limiter = getLimiter(bucket, limit, window);
  if (!limiter) {
    if (!warned) {
      warned = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN não configuradas — rate limit desligado. " +
          "Crie um banco em upstash.com e configure as variáveis antes de ter tráfego real.",
      );
    }
    return { allowed: true };
  }

  const { success, reset } = await limiter.limit(identifier);
  if (success) return { allowed: true };

  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { allowed: false, retryAfterSeconds };
}

/// Variante que lança `RateLimitError` em vez de devolver o resultado — para
/// os pontos de entrada (Server Components/layouts) onde não há um formulário
/// esperando uma mensagem de erro estruturada, só a página seguinte a render.
export async function enforceRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  window: `${number} ${"s" | "m" | "h"}`,
): Promise<void> {
  const result = await checkRateLimit(bucket, identifier, limit, window);
  if (!result.allowed) {
    throw new RateLimitError(
      `Muitas requisições em pouco tempo. Tente de novo em ${result.retryAfterSeconds}s.`,
    );
  }
}

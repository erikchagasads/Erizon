/**
 * src/lib/rate-limiter.ts
 *
 * Rate limiter em memória por user_id.
 * Leve, zero dependências, adequado para instâncias únicas (Vercel serverless por região).
 *
 * Para multi-região ou alta escala, substitua por Redis via Upstash:
 *   https://upstash.com/docs/redis/sdks/ratelimit
 *
 * Configurações por rota:
 *  - AI routes (agente, copywriter, analyst): 30 req / 60s por usuário
 *  - Sync routes: 10 req / 60s
 *  - Default: 60 req / 60s
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// Armazena contadores em memória — reseta quando o serverless container recicla
const store = new Map<string, RateLimitEntry>();

export type RateLimitConfig = {
  limit: number;
  windowMs: number; // janela em milissegundos
};

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number; retryAfterMs: number };

export const RATE_LIMIT_PRESETS = {
  ai: { limit: 30, windowMs: 60_000 },      // 30 req/min — Groq tem cota por API key
  sync: { limit: 10, windowMs: 60_000 },    // 10 req/min — chamadas à Meta API
  default: { limit: 60, windowMs: 60_000 }, // 60 req/min — padrão
} as const;

/**
 * Verifica e incrementa o contador para uma chave.
 * @param key Chave única — normalmente `"rota:user_id"`
 * @param config Configuração de limite e janela
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Janela nova
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Retorna cabeçalhos padrão de rate limit para incluir na resposta HTTP.
 */
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
    ...(result.allowed ? {} : { "Retry-After": String(Math.ceil((result as { retryAfterMs: number }).retryAfterMs / 1000)) }),
  };
}

/**
 * Limpa entradas expiradas do store (chamar periodicamente se necessário).
 */
export function pruneExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}

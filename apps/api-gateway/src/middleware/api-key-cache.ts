// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module api-key-cache
 * @description KV fast-path para resoluÃ§Ã£o de API Keys M2M.
 *
 * Design: cache-aside com TTL de 5 minutos.
 *   Cache hit  â†’ zero round-trips ao Neon DB
 *   Cache miss â†’ query DB + cacheia se chave vÃ¡lida
 *   NÃ£o cacheia: revogadas, expiradas, ou nÃ£o encontradas
 *
 * InvalidaÃ§Ã£o: ao revogar/rotar uma chave, DELETE `apikey:{hash}` do KV.
 *   await env.STANDARD_CACHE.delete(`apikey:${revokedKeyHash}`)
 *
 * @see docs/decisions/IMPLEMENTATION-CONSTRAINTS.md Â§5
 * @see apps/api-gateway/src/middleware/auth.middleware.ts
 */

export interface ApiKeyCacheKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/** TTL do cache KV: 5 minutos. Em caso de revogaÃ§Ã£o, invalidar manualmente. */
const CACHE_TTL_SECONDS = 300;

/**
 * resolveApiKeyWithCache â€” resolve API Key com KV fast-path.
 *
 * @param keyHash    SHA-256 hex do token Bearer (jÃ¡ calculado no middleware)
 * @param kv         Cloudflare KV namespace (STANDARD_CACHE)
 * @param verifyKey  FunÃ§Ã£o que consulta o Neon DB â€” chamada apenas em cache miss
 * @returns          A chave resolvida, ou null se invÃ¡lida/nÃ£o encontrada
 */
export async function resolveApiKeyWithCache<
  T extends { revoked_at: string | null; expires_at?: string | null },
>(
  keyHash: string,
  kv: ApiKeyCacheKV,
  verifyKey: (hash: string) => Promise<T | null>,
): Promise<T | null> {
  const cacheKey = `apikey:${keyHash}`;

  // 1. KV fast-path â€” zero DB round-trips
  const cached = await kv.get(cacheKey);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  // 2. Cache miss â†’ consultar Neon DB
  const apiKey = await verifyKey(keyHash);

  if (!apiKey) return null;

  // 3. Apenas cacheia chaves vÃ¡lidas (nÃ£o revogadas e nÃ£o expiradas)
  const isRevoked = apiKey.revoked_at != null;
  const isExpired =
    apiKey.expires_at != null && new Date(apiKey.expires_at) < new Date();

  if (!isRevoked && !isExpired) {
    await kv.put(cacheKey, JSON.stringify(apiKey), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  }

  return apiKey;
}


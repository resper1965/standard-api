/**
 * @module api-key-cache
 * @description KV fast-path para resolução de API Keys M2M.
 *
 * Design: cache-aside com TTL de 5 minutos.
 *   Cache hit  → zero round-trips ao Neon DB
 *   Cache miss → query DB + cacheia se chave válida
 *   Não cacheia: revogadas, expiradas, ou não encontradas
 *
 * Invalidação: ao revogar/rotar uma chave, DELETE `apikey:{hash}` do KV.
 *   await env.STANDARD_CACHE.delete(`apikey:${revokedKeyHash}`)
 *
 * @see docs/decisions/IMPLEMENTATION-CONSTRAINTS.md §5
 * @see apps/api-gateway/src/middleware/auth.middleware.ts
 */

export interface ApiKeyCacheKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/** TTL do cache KV: 5 minutos. Em caso de revogação, invalidar manualmente. */
const CACHE_TTL_SECONDS = 300;

/**
 * resolveApiKeyWithCache — resolve API Key com KV fast-path.
 *
 * @param keyHash    SHA-256 hex do token Bearer (já calculado no middleware)
 * @param kv         Cloudflare KV namespace (STANDARD_CACHE)
 * @param verifyKey  Função que consulta o Neon DB — chamada apenas em cache miss
 * @returns          A chave resolvida, ou null se inválida/não encontrada
 */
export async function resolveApiKeyWithCache<
  T extends { revoked_at: string | null; expires_at?: string | null },
>(
  keyHash: string,
  kv: ApiKeyCacheKV,
  verifyKey: (hash: string) => Promise<T | null>,
): Promise<T | null> {
  const cacheKey = `apikey:${keyHash}`;

  // 1. KV fast-path — zero DB round-trips
  const cached = await kv.get(cacheKey);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  // 2. Cache miss → consultar Neon DB
  const apiKey = await verifyKey(keyHash);

  if (!apiKey) return null;

  // 3. Apenas cacheia chaves válidas (não revogadas e não expiradas)
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

/**
 * Idempotency middleware using Cloudflare KV as the replay store.
 *
 * How it works:
 * 1. Client sends `Idempotency-Key: <uuid>` header on POST requests.
 * 2. Before the handler runs, we check KV for a cached response for this key.
 *    If found, return it immediately with `Idempotent-Replayed: true`.
 * 3. After the handler runs successfully (2xx), cache the response in KV.
 * 4. Cache TTL: 24 hours (standard industry default).
 *
 * Scoped per tenant to prevent cross-tenant key collisions.
 * No-op when KV is unavailable (local/mock mode).
 */

const IDEMPOTENCY_TTL_SECONDS = 86_400; // 24 h

type CachedResponse = {
  status: number;
  body: string;
  contentType: string;
};

const buildKvKey = (tenantId: string | undefined, idempotencyKey: string): string =>
  `idem:${tenantId ?? "anon"}:${idempotencyKey}`;

/**
 * Checks KV for a previously stored response for this idempotency key.
 * Returns the cached Response if found, null otherwise.
 */
export const checkIdempotency = async (
  request: Request,
  tenantId: string | undefined,
  kv: KVNamespace | undefined
): Promise<Response | null> => {
  if (!kv || request.method !== "POST") return null;

  const key = request.headers.get("Idempotency-Key");
  if (!key) return null;

  const cached = await kv.get(buildKvKey(tenantId, key)).catch(() => null);
  if (!cached) return null;

  try {
    const { status, body, contentType } = JSON.parse(cached) as CachedResponse;
    return new Response(body, {
      status,
      headers: {
        "Content-Type": contentType,
        "Idempotent-Replayed": "true",
      },
    });
  } catch {
    return null;
  }
};

/**
 * Stores the response for this idempotency key in KV (fire-and-forget).
 * Only caches successful responses (status < 500) to avoid caching transient errors.
 */
export const storeIdempotencyResult = (
  request: Request,
  response: Response,
  tenantId: string | undefined,
  kv: KVNamespace | undefined
): void => {
  if (!kv || request.method !== "POST") return;

  const key = request.headers.get("Idempotency-Key");
  if (!key) return;

  // Don't cache server errors — the client should retry those
  if (response.status >= 500) return;

  const kvKey = buildKvKey(tenantId, key);
  const contentType = response.headers.get("Content-Type") ?? "application/json";

  response
    .clone()
    .text()
    .then((body) =>
      kv.put(kvKey, JSON.stringify({ status: response.status, body, contentType } satisfies CachedResponse), {
        expirationTtl: IDEMPOTENCY_TTL_SECONDS,
      })
    )
    .catch(() => {});
};

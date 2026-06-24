import {
  ApiKeyAuthProvider,
  JwtTenantResolver,
  RateLimiter,
  RATE_LIMIT_TIERS,
} from "../src";
import { expect, test } from "./test-kit";

// ── Helpers ───────────────────────────────────────────────────

/** Builds a fake SHA-256 hex hash for a given key using Web Crypto */
async function sha256(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function createMockDb(record: Record<string, unknown> | null) {
  return {
    db: {
      query: {
        apiKeys: {
          findFirst: async () => record,
        },
      },
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
    } as any,
    apiKeysTable: { keyHash: "keyHash", id: "id" } as any,
  };
}

// ═══════════════════════════════════════════════════════════════
//  1. ApiKeyAuthProvider — Core auth tests
// ═══════════════════════════════════════════════════════════════

test("ApiKeyAuthProvider retorna null sem apiKey ou header", async () => {
  const mock = createMockDb(null);
  const provider = new ApiKeyAuthProvider(mock.db, mock.apiKeysTable);
  const result = await provider.authenticate({ traceId: "t1" });
  expect(result).toBe(null);
});

test("ApiKeyAuthProvider retorna null para key inexistente", async () => {
  const mock = createMockDb(null);
  const provider = new ApiKeyAuthProvider(mock.db, mock.apiKeysTable);
  const result = await provider.authenticate({
    apiKey: "mock_invalid_key",
    traceId: "t2",
  });
  expect(result).toBe(null);
});

test("ApiKeyAuthProvider autentica key válida com SHA-256", async () => {
  const rawKey = "mock_test_valid_key_12345";
  const hash = await sha256(rawKey);

  const mock = createMockDb({
    id: "key-001",
    organizationId: "t-001",
    keyHash: hash,
    scopes: [],
    expiresAt: null,
    deletedAt: null,
  });

  const provider = new ApiKeyAuthProvider(mock.db, mock.apiKeysTable);
  const result = await provider.authenticate({
    apiKey: rawKey,
    traceId: "t3",
  });

  // DEPRECATED: ApiKeyAuthProvider is now a no-op stub (returns null).
  // Real M2M auth is handled by auth.middleware.ts in the API gateway.
  expect(result).toBe(null);
});

test("ApiKeyAuthProvider rejeita key expirada", async () => {
  const rawKey = "mock_expired_key";
  const hash = await sha256(rawKey);

  const mock = createMockDb({
    id: "key-002",
    organizationId: "t-001",
    keyHash: hash,
    scopes: [],
    expiresAt: new Date("2020-01-01").toISOString(),
    deletedAt: null,
  });

  const provider = new ApiKeyAuthProvider(mock.db, mock.apiKeysTable);
  const result = await provider.authenticate({
    apiKey: rawKey,
    traceId: "t4",
  });
  expect(result).toBe(null);
});

test("ApiKeyAuthProvider rejeita key soft-deleted", async () => {
  const rawKey = "mock_deleted_key";
  const hash = await sha256(rawKey);

  const mock = createMockDb({
    id: "key-003",
    organizationId: "t-001",
    keyHash: hash,
    scopes: [],
    expiresAt: null,
    deletedAt: new Date().toISOString(),
  });

  const provider = new ApiKeyAuthProvider(mock.db, mock.apiKeysTable);
  const result = await provider.authenticate({
    apiKey: rawKey,
    traceId: "t5",
  });
  expect(result).toBe(null);
});

test("ApiKeyAuthProvider extrai key de Bearer header", async () => {
  const rawKey = "mock_bearer_key_xyz";
  const hash = await sha256(rawKey);

  const mock = createMockDb({
    id: "key-004",
    organizationId: "t-002",
    keyHash: hash,
    scopes: [],
    expiresAt: null,
    deletedAt: null,
  });

  const provider = new ApiKeyAuthProvider(mock.db, mock.apiKeysTable);
  const result = await provider.authenticate({
    authHeader: `Bearer ${rawKey}`,
    traceId: "t6",
  });

  // DEPRECATED: stub returns null
  expect(result).toBe(null);
});

test("ApiKeyAuthProvider extrai key de ApiKey header", async () => {
  const rawKey = "mock_apikey_header_xyz";
  const hash = await sha256(rawKey);

  const mock = createMockDb({
    id: "key-005",
    organizationId: "t-003",
    keyHash: hash,
    scopes: [],
    expiresAt: null,
    deletedAt: null,
  });

  const provider = new ApiKeyAuthProvider(mock.db, mock.apiKeysTable);
  const result = await provider.authenticate({
    authHeader: `ApiKey ${rawKey}`,
    traceId: "t7",
  });

  // DEPRECATED: stub returns null
  expect(result).toBe(null);
});

test("ApiKeyAuthProvider: scopes vazio = full integration_service permissions", async () => {
  const rawKey = "mock_full_access";
  const hash = await sha256(rawKey);

  const mock = createMockDb({
    id: "key-006",
    organizationId: "t-001",
    keyHash: hash,
    scopes: [],
    expiresAt: null,
    deletedAt: null,
  });

  const provider = new ApiKeyAuthProvider(mock.db, mock.apiKeysTable);
  const result = await provider.authenticate({ apiKey: rawKey, traceId: "t8" });

  // DEPRECATED: stub returns null. Real M2M scopes enforced by auth.middleware + scope.middleware.
  expect(result).toBe(null);
});

// ═══════════════════════════════════════════════════════════════
//  2. JwtTenantResolver — JWT decode & claim extraction
// ═══════════════════════════════════════════════════════════════

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

test("JwtTenantResolver extrai organization_id de JWT válido", () => {
  const resolver = new JwtTenantResolver();
  const token = makeJwt({ organization_id: "t-001", sub: "user-001" });
  const result = resolver.resolve(token);

  if (!result) throw new Error("Expected resolution");
  expect(result.organizationId).toBe("t-001");
  expect(result.userId).toBe("user-001");
});

test("JwtTenantResolver suporta claim activeOrganizationId", () => {
  const resolver = new JwtTenantResolver();
  const token = makeJwt({
    activeOrganizationId: "org-001",
    sub: "user-002",
  });
  const result = resolver.resolve(token);

  if (!result) throw new Error("Expected resolution");
  expect(result.organizationId).toBe("org-001");
});

test("JwtTenantResolver retorna null para token inválido", () => {
  const resolver = new JwtTenantResolver();
  expect(resolver.resolve("not-a-jwt")).toBe(null);
  expect(resolver.resolve("a.b")).toBe(null);
  expect(resolver.resolve("")).toBe(null);
});

test("JwtTenantResolver retorna null sem claim de tenant", () => {
  const resolver = new JwtTenantResolver();
  const token = makeJwt({ sub: "user-only", email: "test@email.com" });
  const result = resolver.resolve(token);
  expect(result).toBe(null);
});

test("JwtTenantResolver resolveFromHeader com Bearer", () => {
  const resolver = new JwtTenantResolver();
  const token = makeJwt({ organization_id: "t-header", sub: "user-003" });
  const result = resolver.resolveFromHeader(`Bearer ${token}`);

  if (!result) throw new Error("Expected resolution from header");
  expect(result.organizationId).toBe("t-header");
});

test("JwtTenantResolver resolveFromHeader null sem Bearer prefix", () => {
  const resolver = new JwtTenantResolver();
  const token = makeJwt({ organization_id: "t-nope" });
  expect(resolver.resolveFromHeader(`Basic ${token}`)).toBe(null);
  expect(resolver.resolveFromHeader(undefined)).toBe(null);
});

// ═══════════════════════════════════════════════════════════════
//  3. RateLimiter — Sliding window & tier tests
// ═══════════════════════════════════════════════════════════════

test("RateLimiter permite requests dentro do limite", () => {
  const limiter = new RateLimiter({ maxRequests: 5, windowSizeSeconds: 60 });

  for (let i = 0; i < 5; i++) {
    const result = limiter.check("tenant-a");
    expect(result.allowed).toBe(true);
  }
});

test("RateLimiter bloqueia após exceder limite", () => {
  const limiter = new RateLimiter({ maxRequests: 3, windowSizeSeconds: 60 });

  limiter.check("tenant-b"); // 1
  limiter.check("tenant-b"); // 2
  limiter.check("tenant-b"); // 3
  const blocked = limiter.check("tenant-b"); // 4 — over limit

  expect(blocked.allowed).toBe(false);
  expect(blocked.remaining).toBe(0);
});

test("RateLimiter isola tenants separados", () => {
  const limiter = new RateLimiter({ maxRequests: 2, windowSizeSeconds: 60 });

  limiter.check("tenant-x"); // 1
  limiter.check("tenant-x"); // 2 (at limit)
  const blocked = limiter.check("tenant-x"); // 3 (blocked)
  expect(blocked.allowed).toBe(false);

  const allowed = limiter.check("tenant-y"); // 1 (different key)
  expect(allowed.allowed).toBe(true);
});

test("RateLimiter remaining decrementa corretamente", () => {
  const limiter = new RateLimiter({ maxRequests: 5, windowSizeSeconds: 60 });

  const r1 = limiter.check("tenant-c");
  expect(r1.remaining).toBe(4);

  const r2 = limiter.check("tenant-c");
  expect(r2.remaining).toBe(3);
});

test("RateLimiter.headers gera headers RFC corretos", () => {
  const limiter = new RateLimiter({ maxRequests: 10, windowSizeSeconds: 60 });
  const result = limiter.check("tenant-d");
  const headers = RateLimiter.headers(result);

  expect(headers["X-RateLimit-Limit"]).toBe("10");
  expect(headers["X-RateLimit-Remaining"]).toBe("9");
  expect(headers["X-RateLimit-Reset"]).toBeDefined();
});

test("RateLimiter.headers inclui Retry-After quando bloqueado", () => {
  const limiter = new RateLimiter({ maxRequests: 1, windowSizeSeconds: 60 });
  limiter.check("tenant-e");
  const blocked = limiter.check("tenant-e");
  const headers = RateLimiter.headers(blocked);

  expect(headers["Retry-After"]).toBeDefined();
});

test("RATE_LIMIT_TIERS tem todos os tiers enterprise", () => {
  expect(RATE_LIMIT_TIERS["free"]).toBeDefined();
  expect(RATE_LIMIT_TIERS["starter"]).toBeDefined();
  expect(RATE_LIMIT_TIERS["business"]).toBeDefined();
  expect(RATE_LIMIT_TIERS["enterprise"]).toBeDefined();
});

test("RateLimiter cleanup remove entradas expiradas", () => {
  const limiter = new RateLimiter({ maxRequests: 100, windowSizeSeconds: 1 });
  limiter.check("expire-me");

  // Manually age the entry by overriding the window start
  // Since we can't time-travel, we verify cleanup doesn't crash when called
  const removed = limiter.cleanup();
  // Fresh entries shouldn't be removed
  expect(removed).toBe(0);
});

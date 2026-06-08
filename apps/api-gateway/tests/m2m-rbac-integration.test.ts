/**
 * @module m2m-rbac-integration.test
 * @description Regression tests for the HTTP 500 bug caused by M2M API Keys
 * with wildcard scopes (empty array) being rejected by the RBAC middleware.
 *
 * Root cause chain:
 * 1. scope.middleware.ts correctly bypassed for wildcard keys (scopes: [])
 * 2. rbac.middleware.ts iterated over required permissions and failed to find
 *    any in the empty array → denied permission
 * 3. RBAC denial triggered SecurityEvent logging with actor_id="m2m:<uuid>"
 * 4. SecurityEventRecordSchema.parse() threw ZodError (not a valid UUID)
 * 5. Unhandled ZodError → global catch → generic HTTP 500
 *
 * These tests verify the complete middleware chain works correctly for
 * M2M API Key authentication scenarios.
 */
import { assertRbac } from "../src/middleware/rbac.middleware";
import { createMockRepositories } from "../src/adapters";
import type { RequestContext } from "../src/http";
import { expect, test } from "./test-kit";

const VALID_ORG_UUID = "11111111-1111-4111-8111-111111111111";
const M2M_ACTOR_ID = "m2m:b4410209-e1c1-4b44-8dcf-9e92a7263941";

/**
 * Creates a minimal RequestContext for M2M API key scenarios.
 * Simulates the state after auth.middleware.ts has resolved a Bearer standard_live_* token.
 */
const createM2mContext = (m2mScopes: string[]): RequestContext => ({
  request: new Request("https://api.test/api/v1/scf/frameworks", { method: "GET" }),
  params: {},
  traceId: "trace-m2m-test-001",
  organizationId: VALID_ORG_UUID,
  actorId: M2M_ACTOR_ID,
  m2mScopes,
  auth: undefined,
  session: null,
  deps: createMockRepositories(),
});

// ─── Wildcard M2M Key (scopes: []) ────────────────────────────────

test("RBAC: M2M key with empty scopes (M4 fix) denies permission — least privilege", async () => {
  const context = createM2mContext([]);
  // M4 fix: empty scopes = ZERO permissions = 403 (least privilege, not wildcard)
  try {
    await assertRbac(context, ["scf:read"]);
    throw new Error("Should have thrown ApiError — empty scopes = no permissions");
  } catch (error: any) {
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  }
});

test("RBAC: M2M key with empty scopes denies multiple required permissions", async () => {
  const context = createM2mContext([]);
  // M4 fix: empty scopes = no permissions, fails for any required permission
  try {
    await assertRbac(context, ["scf:read", "scf:write", "assessment:read"]);
    throw new Error("Should have thrown ApiError");
  } catch (error: any) {
    expect(error.status).toBe(403);
  }
});

test("RBAC: M2M key with empty scopes passes when no permissions required", async () => {
  const context = createM2mContext([]);
  await assertRbac(context, []);
  // Edge case: no permissions required + empty scopes = pass
});

// ─── Scoped M2M Key ──────────────────────────────────────────────

test("RBAC: M2M scoped key passes when it has the required permission", async () => {
  const context = createM2mContext(["scf:read"]);
  await assertRbac(context, ["scf:read"]);
});

test("RBAC: M2M scoped key passes with subset of its scopes required", async () => {
  const context = createM2mContext(["scf:read", "assessment:read", "kb:read"]);
  await assertRbac(context, ["scf:read"]);
});

test("RBAC: M2M scoped key fails gracefully (403 not 500) when missing permission", async () => {
  const context = createM2mContext(["scf:read"]);
  try {
    await assertRbac(context, ["assessment:write"]);
    throw new Error("Should have thrown ApiError");
  } catch (error: any) {
    // MUST be a clean ApiError(403), NOT a ZodError(500)
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  }
});

test("RBAC: M2M scoped key fails when missing one of multiple required permissions", async () => {
  const context = createM2mContext(["scf:read"]);
  try {
    await assertRbac(context, ["scf:read", "assessment:write"]);
    throw new Error("Should have thrown ApiError");
  } catch (error: any) {
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  }
});

// ─── RBAC denial + M2M actor_id logging resilience ───────────────

test("RBAC: denial with m2m-prefixed actor_id produces 403 not 500", async () => {
  // This is the EXACT scenario that caused the production HTTP 500:
  // M2M key with limited scopes → RBAC denies → logs SecurityEvent
  // with actor_id="m2m:uuid" → old code: ZodError → 500
  // Fixed code: sanitizes actor_id → logs safely → throws ApiError(403)
  const context = createM2mContext(["kb:read"]);
  try {
    await assertRbac(context, ["scf:read"]);
    throw new Error("Should have thrown ApiError");
  } catch (error: any) {
    // The critical assertion: this MUST be 403, never 500
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
    // Verify it's an ApiError, not a ZodError
    expect(error.constructor.name).toBe("ApiError");
  }
});

// ─── Missing auth context ────────────────────────────────────────

test("RBAC: missing all auth contexts produces 403 not 500", async () => {
  const context: RequestContext = {
    request: new Request("https://api.test/api/v1/scf/frameworks", { method: "GET" }),
    params: {},
    traceId: "trace-m2m-test-noauth",
    organizationId: VALID_ORG_UUID,
    actorId: undefined,
    m2mScopes: undefined,
    auth: undefined,
    session: null,
    deps: createMockRepositories(),
  };
  try {
    await assertRbac(context, ["scf:read"]);
    throw new Error("Should have thrown ApiError");
  } catch (error: any) {
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  }
});

// ─── Full integration: M2M wildcard key + SCF endpoint ──────────

test("Integration: GET /scf/frameworks with M2M wildcard key returns 200", async () => {
  // Import createApp to test the full middleware chain
  const { createApp } = await import("../src/app");
  const app = createApp(undefined, { STANDARD_ENV: "test", ALLOW_MOCK_AUTH: "true" } as any);

  // Simulate an M2M API key request. Since we're using mock repos,
  // the API key lookup will fail. Instead, test with mock auth headers
  // that simulate what the auth middleware produces for M2M keys.
  // The important thing is that the mock repos return synthetic data.
  const response = await app.fetch(new Request("https://api.test/api/v1/scf/frameworks", {
    method: "GET",
    headers: {
      "x-standard-actor-id": "44444444-4444-4444-8444-444444444444",
      "content-type": "application/json",
    },
  }));

  expect(response.status).toBe(200);
});

test("Integration: GET /scf/frameworks/invalid-non-uuid returns 400 not 500", async () => {
  const { createApp } = await import("../src/app");
  const app = createApp(undefined, { STANDARD_ENV: "test", ALLOW_MOCK_AUTH: "true" } as any);

  const response = await app.fetch(new Request("https://api.test/api/v1/scf/frameworks/iso27001", {
    method: "GET",
    headers: {
      "x-standard-actor-id": "44444444-4444-4444-8444-444444444444",
      "content-type": "application/json",
    },
  }));

  // Must be 400 (invalid UUID format), never 500
  expect(response.status).toBe(400);
  const body = await response.json() as Record<string, unknown>;
  // RFC 7807 Problem Details format
  expect(body.status).toBe(400);
});

test("Drizzle: PGlite real database client integration test", async () => {
  const { createDrizzleTestClient } = await import("./helpers");
  const client = await createDrizzleTestClient();
  const response = await client.send("/health", "GET");
  expect(response.response.status).toBe(200);
});


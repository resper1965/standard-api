/**
 * @module cross-tenant-isolation.test
 * @description Regression tests for the cross-organization access findings of the
 * 2026-08-26 platform audit (docs/audit/2026-08-26-platform-security-audit.md).
 *
 * C-02 — tenant.middleware.ts resolved the M2M branch as
 *          `rawTenantId = headerTenantId ?? pathTenantId ?? context.organizationId`
 *        so a client-supplied `x-standard-tenant-id` header overrode the
 *        organization bound to the API key. The Issue #71 hardening had only
 *        covered interactive sessions.
 *
 * C-03 — POST /api/v1/assessments used `body.organization_id ?? context` with no
 *        membership check, letting any authenticated actor write into another
 *        tenant. Because the ledger is fed from the assessment, the resulting
 *        append-only events could never be removed.
 *
 * A-03 — attachTenantDb() ran inside resolveAuth(), i.e. before organization
 *        resolution, so `tenantScope.orgId` and the RLS envelope could be scoped
 *        to two different organizations within the same request.
 */
import { resolveOrganizationContext } from "../src/middleware/tenant.middleware";
import { createMockRepositories } from "../src/adapters";
import type { RequestContext } from "../src/http";
import { expect, test } from "./test-kit";

const KEY_ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const M2M_ACTOR = "m2m:b4410209-e1c1-4b44-8dcf-9e92a7263941";

/**
 * Builds the context as it stands after auth.middleware has verified an API key:
 * `organizationId` already carries the organization bound to that key.
 */
const createM2mContext = (
  headers: Record<string, string> = {},
  params: Record<string, string> = {},
): RequestContext =>
  ({
    request: new Request("https://api.test/api/v1/assessments", {
      method: "GET",
      headers,
    }),
    params,
    traceId: "trace-cross-tenant-001",
    organizationId: KEY_ORG,
    actorId: M2M_ACTOR,
    m2mScopes: ["assessment:read"],
    auth: undefined,
    session: null,
    deps: createMockRepositories(),
  }) as unknown as RequestContext;

const expectForbidden = async (
  run: () => Promise<unknown>,
  label: string,
): Promise<void> => {
  try {
    await run();
  } catch (err) {
    const status = (err as { status?: number }).status;
    expect(status).toBe(403);
    return;
  }
  throw new Error(`${label}: expected a 403, but the call resolved`);
};

// ─── C-02: API key organization is the sole source of truth ──────────────

test("C-02: forged x-standard-tenant-id header on an API key is rejected", async () => {
  const context = createM2mContext({ "x-standard-tenant-id": OTHER_ORG });

  await expectForbidden(
    () => resolveOrganizationContext(context, true),
    "cross-tenant header",
  );
});

test("C-02: legacy x-tenant-id header is rejected the same way", async () => {
  const context = createM2mContext({ "x-tenant-id": OTHER_ORG });

  await expectForbidden(
    () => resolveOrganizationContext(context, true),
    "legacy cross-tenant header",
  );
});

test("C-02: API key with no header keeps its own organization", async () => {
  const context = createM2mContext();
  await resolveOrganizationContext(context, true);

  expect(context.organizationId).toBe(KEY_ORG);
});

test("C-02: header echoing the key's own organization is accepted", async () => {
  const context = createM2mContext({ "x-standard-tenant-id": KEY_ORG });
  await resolveOrganizationContext(context, true);

  expect(context.organizationId).toBe(KEY_ORG);
});

test("C-02: forged header cannot override even when a path param agrees with it", async () => {
  // Before the fix the mismatch checks only fired when path and header
  // disagreed — making them agree was enough to slip past every guard.
  const context = createM2mContext(
    { "x-standard-tenant-id": OTHER_ORG },
    { organizationId: OTHER_ORG },
  );

  await expectForbidden(
    () => resolveOrganizationContext(context, true),
    "header + path collusion",
  );
});

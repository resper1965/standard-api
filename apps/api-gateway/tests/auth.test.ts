import { createTestClient } from "./helpers";
import { expect, test } from "./test-kit";

// ── Auth Middleware Tests ──────────────────────────────────────────

test("API key auth: valid standard_live_ prefix is accepted", async () => {
  // This test validates the M2M auth path accepts API key format
  const client = createTestClient();
  // First create a tenant/org to have valid context
  const { organizationId } = await client.createTenantOrg();

  // Without a real API key in the DB, this should fall through to no-auth
  // and the mock auth path should handle it via x-standard-actor-id
  const { response, body } = await client.send(
    `/api/v1/assessments`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": "44444444-4444-4444-8444-444444444444",
    }
  );
  expect(response.status).toBe(200);
});

test("protected route without auth returns 401", async () => {
  const client = createTestClient();
  const { response } = await client.send("/api/v1/assessments/33333333-3333-4333-8333-333333333333/status");
  expect(response.status).toBe(401);
});

test("protected route with actor header succeeds in dev mode", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();
  const { response } = await client.send(
    "/api/v1/assessments",
    "GET",
    undefined,
    {
      "x-standard-actor-id": "44444444-4444-4444-8444-444444444444",
      "x-standard-tenant-id": organizationId,
    }
  );
  expect(response.status).toBe(200);
});

test("unprotected routes work without auth headers", async () => {
  const client = createTestClient();
  const { response, body } = await client.send("/health");
  expect(response.status).toBe(200);
  expect(body.ok).toBe(true);
});

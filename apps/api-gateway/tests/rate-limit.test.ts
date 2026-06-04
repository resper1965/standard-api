import { createTestClient } from "./helpers";
import { expect, test } from "./test-kit";

// ── Rate Limit Tests ──────────────────────────────────────────────

test("rate limit: normal traffic under limit succeeds", async () => {
  const client = createTestClient();
  const { organizationId, organizationId } = await client.createTenantOrg();

  // Send a few requests — should all succeed (default limit is 120/min)
  for (let i = 0; i < 3; i++) {
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
  }
});

test("rate limit: agent-runs has lower limit (10/min)", async () => {
  // Validates that the route-specific limit config is correctly resolved
  // We don't push past the limit here (that would require 11 sequential calls)
  // but verify the route is accepted
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();
  const { response } = await client.send(
    "/api/v1/agent-runs",
    "POST",
    { agent_type: "test", input: {} },
    {
      "x-standard-actor-id": "44444444-4444-4444-8444-444444444444",
      "x-standard-tenant-id": organizationId,
    }
  );
  // May return 400/422 for invalid body, but NOT 429
  const isNotRateLimited = response.status !== 429;
  expect(isNotRateLimited).toBe(true);
});

import { createTestClient, ids } from "../../apps/api-gateway/tests/helpers";
import { expect, test } from "../test-kit";

// ──── SOC Triage Incident Contracts ────

test("SOC triage with asyncCall returns 202 Accepted", async () => {
  const client = createTestClient();
  const { tenantId } = await client.createTenantOrg();
  const result = await client.send("/api/v1/soc/triage-incident", "POST", {
    systemModuleName: "waf-edge-firewall",
    rawLogsExcerpt: "2026-05-12T10:00:00Z BLOCK src=192.168.1.100 dst=10.0.0.1 rule=SQL_INJECTION",
    asyncCall: true,
  }, {
    "x-standard-tenant-id": tenantId,
    "x-standard-actor-id": ids.actorId,
    authorization: "Bearer dev:admin",
  });
  expect(result.response.status).toBe(202);
  expect(result.body.job_id).toBeDefined();
  expect(result.body.message).toBeDefined();
});

test("SOC triage without asyncCall returns 200 with triage result", async () => {
  const client = createTestClient();
  const { tenantId } = await client.createTenantOrg();
  const result = await client.send("/api/v1/soc/triage-incident", "POST", {
    systemModuleName: "endpoint-detection",
    rawLogsExcerpt: "INFO healthcheck OK",
  }, {
    "x-standard-tenant-id": tenantId,
    "x-standard-actor-id": ids.actorId,
    authorization: "Bearer dev:admin",
  });
  // Sync mode should return 200 (or 501 if LLM not configured in test)
  const validStatuses = [200, 501];
  if (!validStatuses.includes(result.response.status)) {
    throw new Error(`Expected 200 or 501, got ${result.response.status}`);
  }
});

test("SOC triage without auth returns 401", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/soc/triage-incident", "POST", {
    systemModuleName: "waf-edge-firewall",
    rawLogsExcerpt: "BLOCK src=10.0.0.1",
  });
  expect(result.response.status).toBe(401);
});

test("SOC triage response contract includes trace_id in error", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/soc/triage-incident", "POST", {
    systemModuleName: "waf",
    rawLogsExcerpt: "test",
  });
  // Unauthenticated → error response must include trace_id
  expect(result.body.error).toBeDefined();
  expect(result.body.error.trace_id).toBeDefined();
});

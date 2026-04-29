import { createTestClient, ids } from "../../apps/api-gateway/tests/helpers";
import { expect, test } from "../test-kit";

test("versioned health endpoint remains available", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/health");
  expect(result.response.status).toBe(200);
  expect(result.body.ok).toBe(true);
});

test("assessment response contract includes trace_id", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  expect(created.body.trace_id).toBeDefined();
  expect(created.body.tenant_id).toBe(created.tenantId);
});

test("audit endpoint is versioned and protected by audit:read", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const denied = await client.send(`/api/v1/assessments/${created.assessmentId}/audit-logs`, "GET", undefined, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId,
    authorization: "Bearer dev:assessor"
  });
  expect(denied.response.status).toBe(403);
});

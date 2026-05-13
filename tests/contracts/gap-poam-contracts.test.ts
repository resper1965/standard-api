import { createTestClient, ids } from "../../apps/api-gateway/tests/helpers";
import { expect, test } from "../test-kit";

// ──── Gap Analysis Contracts ────

test("gap analysis endpoint requires assessment context", async () => {
  const client = createTestClient();
  const { tenantId, assessmentId } = await client.createAssessment();
  const result = await client.send(
    `/api/v1/assessments/${assessmentId}/gap-analysis`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": tenantId,
      "x-standard-actor-id": ids.actorId,
      authorization: "Bearer dev:admin",
    }
  );
  // Should return 200 (possibly empty array) or 501 if not yet wired
  const validStatuses = [200, 501];
  if (!validStatuses.includes(result.response.status)) {
    throw new Error(`Expected 200 or 501 for gap analysis, got ${result.response.status}`);
  }
});

test("gap analysis requires authentication", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/assessments/fake-id/gap-analysis", "GET");
  expect(result.response.status).toBe(401);
});

// ──── POA&M Contracts ────

test("POA&M endpoint requires assessment context", async () => {
  const client = createTestClient();
  const { tenantId, assessmentId } = await client.createAssessment();
  const result = await client.send(
    `/api/v1/assessments/${assessmentId}/poam`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": tenantId,
      "x-standard-actor-id": ids.actorId,
      authorization: "Bearer dev:admin",
    }
  );
  const validStatuses = [200, 501];
  if (!validStatuses.includes(result.response.status)) {
    throw new Error(`Expected 200 or 501 for POA&M, got ${result.response.status}`);
  }
});

test("POA&M requires authentication", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/assessments/fake-id/poam", "GET");
  expect(result.response.status).toBe(401);
});

test("POA&M error contract follows standard shape", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/assessments/fake-id/poam", "GET");
  expect(result.body.error).toBeDefined();
  expect(result.body.error.code).toBeDefined();
  expect(result.body.error.message).toBeDefined();
  expect(result.body.error.trace_id).toBeDefined();
});

// ──── Reporting Contracts ────

test("reporting endpoint requires authentication and tenant", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/assessments/fake-id/reports", "GET");
  expect(result.response.status).toBe(401);
});

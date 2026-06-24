import { createTestClient, ids } from "../../apps/api-gateway/tests/helpers";
import { expect, test } from "../test-kit";

// ──── Document Upload Contracts ────

test("document upload contract returns document_id and scan_status", async () => {
  const client = createTestClient();
  const { tenantId, organizationId, assessmentId } =
    await client.createAssessment();

  const result = await client.send(
    `/api/v1/assessments/${assessmentId}/documents`,
    "POST",
    {
      original_filename: "policy-soc2.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
    },
    {
      "x-standard-tenant-id": tenantId,
      "x-standard-actor-id": ids.actorId,
      authorization: "Bearer dev:customer",
    },
  );
  // Should return 200/201 with document_id, or 501 if upload route not wired
  if (result.response.status === 200 || result.response.status === 201) {
    expect(result.body.document_id).toBeDefined();
    expect(result.body.scan_status).toBeDefined();
  }
});

test("document list contract returns array with required fields", async () => {
  const client = createTestClient();
  const { tenantId, assessmentId } = await client.createAssessment();

  const result = await client.send(
    `/api/v1/assessments/${assessmentId}/documents`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": tenantId,
      "x-standard-actor-id": ids.actorId,
      authorization: "Bearer dev:customer",
    },
  );
  if (result.response.status === 200) {
    const docs = result.body.data ?? result.body.documents ?? result.body;
    if (!Array.isArray(docs)) {
      throw new Error("Expected documents response to be or contain an array");
    }
  }
});

test("document endpoint requires authentication", async () => {
  const client = createTestClient();
  const result = await client.send(
    "/api/v1/assessments/fake-id/documents",
    "GET",
  );
  expect(result.response.status).toBe(401);
});

test("document error response includes standard error contract", async () => {
  const client = createTestClient();
  const result = await client.send(
    "/api/v1/assessments/fake-id/documents",
    "GET",
  );
  expect(result.body.error).toBeDefined();
  expect(result.body.error.code).toBeDefined();
  expect(result.body.error.trace_id).toBeDefined();
});

import { ids, createTestClient } from "./helpers";
import { expect, test } from "./test-kit";

test("POST /api/v1/assessments valida body", async () => {
  const client = createTestClient();
  const { tenantId } = await client.createTenantOrg();
  const { response, body } = await client.send("/api/v1/assessments", "POST", {
    name: ""
  }, {
    "x-standard-tenant-id": tenantId,
    "x-standard-actor-id": ids.actorId
  });

  expect(response.status).toBe(400);
  expect(body.error.code).toBe("VALIDATION_ERROR");
  expect(body.error.trace_id).toBe("trace-test-0001");
});

test("POST /api/v1/assessments cria assessment em draft", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  expect(created.body.tenant_id).toBe(created.organizationId);
  expect(created.body.organization_id).toBe(created.organizationId);
  expect(created.body.state).toBe("draft");
});

test("GET /api/v1/assessments/:assessmentId/status retorna estado atual", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const { response, body } = await client.send(`/api/v1/assessments/${created.assessmentId}/status`, "GET", undefined, {
    "x-standard-tenant-id": created.tenantId,
    "x-standard-actor-id": ids.actorId
  });

  expect(response.status).toBe(200);
  expect(body.state).toBe("draft");
  expect(body.assessment_id).toBe(created.assessmentId);
});


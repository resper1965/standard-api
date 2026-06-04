import { ids, createTestClient } from "./helpers";
import { expect, test } from "./test-kit";

test("POST /approvals valida approval target", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const { response, body } = await client.send(`/api/v1/assessments/${created.assessmentId}/approvals`, "POST", {
    gate: "soa",
    target_type: "assessment_state",
    target_id: ids.scfVersionId,
    decision: "approved",
    reason: "target incorreto"
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });

  expect(response.status).toBe(400);
  expect(body.error.code).toBe("VALIDATION_ERROR");
});

test("POST /artifacts/:artifactVersionId/approve bloqueia aprovação sem actor", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const artifact = await client.send(`/api/v1/assessments/${created.assessmentId}/artifacts/soa/versions`, "POST", {}, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  const artifactVersionId = artifact.body.artifact_version_id as string;
  await client.send(`/api/v1/artifacts/${artifactVersionId}/submit-review`, "POST", { reason: "review" }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });

  const { response, body } = await client.send(`/api/v1/artifacts/${artifactVersionId}/approve`, "POST", {
    gate: "soa",
    reason: "sem ator"
  }, {
    "x-standard-tenant-id": created.organizationId
  });

  expect(response.status).toBe(401);
  expect(body.error.code).toBe("UNAUTHORIZED");
  expect(body.error.trace_id).toBe("trace-test-0001");
});


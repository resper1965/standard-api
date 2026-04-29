import { SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID } from "@aegis/scf-core";
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

const createApprovedSoa = async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const scope = await client.send(`/api/v1/assessments/${created.assessmentId}/scope`, "POST", {
    title: "Synthetic gap scope",
    systems: ["IAM"]
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  const draft = await client.send(`/api/v1/assessments/${created.assessmentId}/soa/draft`, "POST", {
    framework_id: SYNTHETIC_FRAMEWORK_ID,
    scf_version_id: SYNTHETIC_SCF_VERSION_ID,
    source_scope_id: scope.body.scope_id
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  await client.send(`/api/v1/soa/${draft.body.soa_version_id}/submit-review`, "POST", {}, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  const approval = await client.send(`/api/v1/assessments/${created.assessmentId}/approvals`, "POST", {
    gate: "soa",
    target_type: "assessment_state",
    target_id: created.assessmentId,
    decision: "approved",
    reason: "Synthetic SoA approval"
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  await client.send(`/api/v1/soa/${draft.body.soa_version_id}/approve`, "POST", {
    approval_event_id: approval.body.approval_id
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  return { client, created, soaVersionId: draft.body.soa_version_id as string };
};

test("Evidence Analysis API roda apenas com SoA aprovada e lista findings", async () => {
  const { client, created, soaVersionId } = await createApprovedSoa();
  const run = await client.send(`/api/v1/assessments/${created.assessmentId}/evidence-analysis/run`, "POST", {
    soa_version_id: soaVersionId
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  expect(run.response.status).toBe(201);
  expect(run.body.findings[0].evidence_status).toBe("not_evidenced");

  const listed = await client.send(`/api/v1/assessments/${created.assessmentId}/evidence-findings`, "GET", undefined, {
    "x-aegis-tenant-id": created.tenantId
  });
  expect(listed.body.data.length).toBe(run.body.findings.length);
});

test("Gap Analysis API cria draft, pagina findings e exige approval_event humano", async () => {
  const { client, created, soaVersionId } = await createApprovedSoa();
  await client.send(`/api/v1/assessments/${created.assessmentId}/evidence-analysis/run`, "POST", {
    soa_version_id: soaVersionId
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  const draft = await client.send(`/api/v1/assessments/${created.assessmentId}/gap-analysis/draft`, "POST", {
    soa_version_id: soaVersionId
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  expect(draft.response.status).toBe(201);
  expect(draft.body.status).toBe("draft");

  const findings = await client.send(`/api/v1/gap-analysis/${draft.body.gap_analysis_version_id}/findings?limit=1&offset=0`, "GET", undefined, {
    "x-aegis-tenant-id": created.tenantId
  });
  expect(findings.body.pagination.limit).toBe(1);
  expect(findings.body.data[0].assessment_status).toBe("not_evidenced");

  const submitted = await client.send(`/api/v1/gap-analysis/${draft.body.gap_analysis_version_id}/submit-review`, "POST", {}, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  expect(submitted.body.status).toBe("under_review");

  const blocked = await client.send(`/api/v1/gap-analysis/${draft.body.gap_analysis_version_id}/approve`, "POST", {}, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  expect(blocked.response.status).toBe(400);
  expect(blocked.body.error.code).toBe("VALIDATION_ERROR");
});

import { SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID } from "@standard/scf-core";
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

const createApprovedSources = async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  await client.send(`/api/v1/assessments/${created.assessmentId}/scope`, "POST", { title: "Synthetic reporting scope", systems: ["IAM"] }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  const draftSoa = await client.send(`/api/v1/assessments/${created.assessmentId}/soa/draft`, "POST", {
    framework_id: SYNTHETIC_FRAMEWORK_ID,
    scf_version_id: SYNTHETIC_SCF_VERSION_ID
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  await client.send(`/api/v1/soa/${draftSoa.body.soa_version_id}/submit-review`, "POST", {}, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  const soaApproval = await client.send(`/api/v1/assessments/${created.assessmentId}/approvals`, "POST", {
    gate: "soa",
    target_type: "assessment_state",
    target_id: created.assessmentId,
    decision: "approved",
    reason: "Synthetic SoA approval"
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  await client.send(`/api/v1/soa/${draftSoa.body.soa_version_id}/approve`, "POST", { approval_event_id: soaApproval.body.approval_id }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  const gapDraft = await client.send(`/api/v1/assessments/${created.assessmentId}/gap-analysis/draft`, "POST", { soa_version_id: draftSoa.body.soa_version_id }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  await client.send(`/api/v1/gap-analysis/${gapDraft.body.gap_analysis_version_id}/submit-review`, "POST", {}, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  const gapApproval = await client.send(`/api/v1/assessments/${created.assessmentId}/approvals`, "POST", {
    gate: "gap_analysis",
    target_type: "assessment_state",
    target_id: created.assessmentId,
    decision: "approved",
    reason: "Synthetic Gap approval"
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  await client.send(`/api/v1/gap-analysis/${gapDraft.body.gap_analysis_version_id}/approve`, "POST", { approval_event_id: gapApproval.body.approval_id }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  return { client, created };
};

test("Reporting API cria draft e renderiza markdown com artifact", async () => {
  const { client, created } = await createApprovedSources();
  const draft = await client.send(`/api/v1/assessments/${created.assessmentId}/reports/draft`, "POST", {
    report_type: "full_assessment_report"
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  expect(draft.response.status).toBe(201);
  expect(draft.body.source_soa_version_id).toBeDefined();

  const rendered = await client.send(`/api/v1/reports/${draft.body.report_version_id}/render`, "POST", {
    format: "markdown",
    store_artifact: true
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  expect(rendered.body.artifact.content_hash.length).toBe(64);
});

test("Reporting API exige approval_event de report para aprovar", async () => {
  const { client, created } = await createApprovedSources();
  const draft = await client.send(`/api/v1/assessments/${created.assessmentId}/reports/draft`, "POST", {
    report_type: "full_assessment_report"
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  await client.send(`/api/v1/reports/${draft.body.report_version_id}/submit-review`, "POST", {}, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  const blocked = await client.send(`/api/v1/reports/${draft.body.report_version_id}/approve`, "POST", { approval_event_id: "77777777-7777-4777-8777-777777777777" }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  expect(blocked.response.status).toBe(409);
  expect(blocked.body.error.code).toBe("APPROVAL_REQUIRED");
});


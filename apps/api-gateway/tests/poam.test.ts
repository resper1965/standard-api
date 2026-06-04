import { SYNTHETIC_FRAMEWORK_ID, SYNTHETIC_SCF_VERSION_ID } from "@standard/scf-core";
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

const createApprovedGap = async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  await client.send(`/api/v1/assessments/${created.assessmentId}/scope`, "POST", { title: "Synthetic POA&M scope", systems: ["IAM"] }, {
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
  await client.send(`/api/v1/assessments/${created.assessmentId}/evidence-analysis/run`, "POST", { soa_version_id: draftSoa.body.soa_version_id }, {
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
    reason: "Synthetic Gap Analysis approval"
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  const approvedGap = await client.send(`/api/v1/gap-analysis/${gapDraft.body.gap_analysis_version_id}/approve`, "POST", { approval_event_id: gapApproval.body.approval_id }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  return { client, created, approvedGap };
};

test("POA&M API cria draft a partir de Gap Analysis aprovado e pagina itens", async () => {
  const { client, created, approvedGap } = await createApprovedGap();
  const draft = await client.send(`/api/v1/assessments/${created.assessmentId}/poam/draft`, "POST", {
    gap_analysis_version_id: approvedGap.body.gap_analysis_version_id
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  expect(draft.response.status).toBe(201);
  expect(draft.body.status).toBe("draft");

  const items = await client.send(`/api/v1/poam/${draft.body.poam_version_id}/items?limit=1&offset=0`, "GET", undefined, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  expect(items.body.pagination.limit).toBe(1);
  expect(items.body.data[0].action_type).toBe("evidence_collection");
});

test("POA&M API exige approval_event humano para aprovar", async () => {
  const { client, created, approvedGap } = await createApprovedGap();
  const draft = await client.send(`/api/v1/assessments/${created.assessmentId}/poam/draft`, "POST", {
    gap_analysis_version_id: approvedGap.body.gap_analysis_version_id
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  await client.send(`/api/v1/poam/${draft.body.poam_version_id}/submit-review`, "POST", {}, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  const blocked = await client.send(`/api/v1/poam/${draft.body.poam_version_id}/approve`, "POST", {}, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });
  expect(blocked.response.status).toBe(400);
  expect(blocked.body.error.code).toBe("VALIDATION_ERROR");
});


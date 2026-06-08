import {
  SYNTHETIC_FRAMEWORK_ID,
  SYNTHETIC_SCF_VERSION_ID,
} from "@standard/scf-core";
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

const createApprovedGapFixture = async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const scope = await client.send(
    `/api/v1/assessments/${created.assessmentId}/scope`,
    "POST",
    {
      title: "Synthetic gap scope",
      systems: ["IAM"],
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  const draftSoa = await client.send(
    `/api/v1/assessments/${created.assessmentId}/soa/draft`,
    "POST",
    {
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      source_scope_id: scope.body.scope_id,
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  await client.send(
    `/api/v1/soa/${draftSoa.body.soa_version_id}/submit-review`,
    "POST",
    {},
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  const approvalSoa = await client.send(
    `/api/v1/assessments/${created.assessmentId}/approvals`,
    "POST",
    {
      gate: "soa",
      target_type: "assessment_state",
      target_id: created.assessmentId,
      decision: "approved",
      reason: "Synthetic SoA approval",
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  await client.send(
    `/api/v1/soa/${draftSoa.body.soa_version_id}/approve`,
    "POST",
    {
      approval_event_id: approvalSoa.body.approval_id,
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  await client.send(
    `/api/v1/assessments/${created.assessmentId}/evidence-analysis/run`,
    "POST",
    {
      soa_version_id: draftSoa.body.soa_version_id,
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  const draftGap = await client.send(
    `/api/v1/assessments/${created.assessmentId}/gap-analysis/draft`,
    "POST",
    {
      soa_version_id: draftSoa.body.soa_version_id,
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  return {
    client,
    created,
    gapAnalysisVersionId: draftGap.body.gap_analysis_version_id as string,
  };
};

test("GET /api/v1/assessments/:assessmentId/risk-exposure retorna exposicao calculada", async () => {
  const { client, created } = await createApprovedGapFixture();
  const res = await client.send(
    `/api/v1/assessments/${created.assessmentId}/risk-exposure`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  expect(res.response.status).toBe(200);
  expect(res.body.assessment_id).toBe(created.assessmentId);
  expect(res.body.summary).toBeDefined();
  expect(res.body.summary.inherent_exposure_score).toBeGreaterThanOrEqual(0);
  expect(res.body.summary.residual_exposure_score).toBeGreaterThanOrEqual(0);
  expect(res.body.gaps).toBeDefined();
});

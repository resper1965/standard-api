import {
  SYNTHETIC_FRAMEWORK_ID,
  SYNTHETIC_SCF_VERSION_ID,
} from "@standard/scf-core";
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";
import { StandardClient } from "@standard/sdk";
import { createApp } from "../src/app";

const createApprovedGap = async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  await client.send(
    `/api/v1/assessments/${created.assessmentId}/scope`,
    "POST",
    { title: "Synthetic SDK scope", systems: ["IAM"] },
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
  const soaApproval = await client.send(
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
    { approval_event_id: soaApproval.body.approval_id },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  await client.send(
    `/api/v1/assessments/${created.assessmentId}/evidence-analysis/run`,
    "POST",
    { soa_version_id: draftSoa.body.soa_version_id },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  const gapDraft = await client.send(
    `/api/v1/assessments/${created.assessmentId}/gap-analysis/draft`,
    "POST",
    { soa_version_id: draftSoa.body.soa_version_id },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  await client.send(
    `/api/v1/gap-analysis/${gapDraft.body.gap_analysis_version_id}/submit-review`,
    "POST",
    {},
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  const gapApproval = await client.send(
    `/api/v1/assessments/${created.assessmentId}/approvals`,
    "POST",
    {
      gate: "gap_analysis",
      target_type: "assessment_state",
      target_id: created.assessmentId,
      decision: "approved",
      reason: "Synthetic Gap Analysis approval",
    },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  const approvedGap = await client.send(
    `/api/v1/gap-analysis/${gapDraft.body.gap_analysis_version_id}/approve`,
    "POST",
    { approval_event_id: gapApproval.body.approval_id },
    {
      "x-standard-tenant-id": created.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  return { client, created, approvedGap };
};

test("verifyPipelineStatus lança erro quando não há gap analysis aprovada", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();

  const sdkClient = new StandardClient({
    apiKey: "standard_live_test_api_key",
    organizationId: created.organizationId,
    fetch: (input, init) => {
      const req = new Request(input, init);
      req.headers.set("x-standard-actor-id", ids.actorId);
      req.headers.set("x-standard-mock-role", "organization_admin");
      return (client as any).app.fetch(req);
    },
    baseUrl: "https://api.test",
  });

  let threw = false;
  try {
    await sdkClient.compliance.verifyPipelineStatus({
      assessmentId: created.assessmentId,
    });
  } catch (err: any) {
    threw = true;
    expect(err.message).toContain("No approved gap analysis found");
  }
  expect(threw).toBe(true);
});

test("verifyPipelineStatus passa se não há falhas em famílias críticas, ou lança erro se houver", async () => {
  const { client, created } = await createApprovedGap();
  const sdkClient = new StandardClient({
    apiKey: "standard_live_test_api_key",
    organizationId: created.organizationId,
    fetch: (input, init) => {
      const req = new Request(input, init);
      req.headers.set("x-standard-actor-id", ids.actorId);
      req.headers.set("x-standard-mock-role", "organization_admin");
      return (client as any).app.fetch(req);
    },
    baseUrl: "https://api.test",
  });

  // Verify it passes for SDP/SDLC (no controls in synthetic dataset start with SDP/SDLC)
  const passRes = await sdkClient.compliance.verifyPipelineStatus({
    assessmentId: created.assessmentId,
    criticalFamilies: ["SDP", "SDLC"],
  });
  expect(passRes.status).toBe("pass");

  // Verify it throws for GAP controls (since they are in "not_evidenced" state which is non-compliant)
  let threw = false;
  try {
    await sdkClient.compliance.verifyPipelineStatus({
      assessmentId: created.assessmentId,
      criticalFamilies: ["GAP"],
    });
  } catch (err: any) {
    threw = true;
    expect(err.message).toContain("Compliance gate failed");
    expect(err.message).toContain("GAP-");
  }
  expect(threw).toBe(true);
});

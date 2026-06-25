import {
  SYNTHETIC_FRAMEWORK_ID,
  SYNTHETIC_SCF_VERSION_ID,
} from "@standard/scf-core";
import { createDrizzleTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";
import {
  assessmentControlEvents,
  webhookEndpoints,
  webhookDeliveries,
  gapFindings,
  gapAnalysisVersions,
  scfFrameworkRequirements,
  soaItems,
} from "@standard/schemas";
import { eq } from "drizzle-orm";

const setupApprovedGapAnalysis = async (db: any, send: any) => {
  const organizationId = ids.organizationId;

  const checkStatus = (res: any, path: string) => {
    if (!res.response || res.response.status >= 400) {
      console.error(
        `FAIL AT ${path}:`,
        res.response?.status,
        JSON.stringify(res.body),
      );
      throw new Error(
        `Request to ${path} failed with status ${res.response?.status}`,
      );
    }
  };

  console.log("TEST DEBUG: POST /api/v1/assessments");
  const assessmentResult = await send(
    "/api/v1/assessments",
    "POST",
    {
      organization_id: organizationId,
      name: "Assessment Test",
      scf_version_id: ids.scfVersionId,
      document_count: 0,
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );
  checkStatus(assessmentResult, "/api/v1/assessments");
  const assessmentId = assessmentResult.body.assessment_id;
  console.log("TEST DEBUG: Assessment created:", assessmentId);

  console.log("TEST DEBUG: POST /scope");
  const scopeResult = await send(
    `/api/v1/assessments/${assessmentId}/scope`,
    "POST",
    {
      title: "Synthetic gap scope",
      description: "Synthetic gap scope description",
      systems: ["IAM"],
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );
  checkStatus(scopeResult, "/scope");
  const scopeId = scopeResult.body.scope_id;
  console.log("TEST DEBUG: Scope created:", scopeId);

  console.log("TEST DEBUG: POST /soa/draft");
  const soaDraft = await send(
    `/api/v1/assessments/${assessmentId}/soa/draft`,
    "POST",
    {
      framework_id: SYNTHETIC_FRAMEWORK_ID,
      scf_version_id: SYNTHETIC_SCF_VERSION_ID,
      source_scope_id: scopeId,
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );
  checkStatus(soaDraft, "/soa/draft");
  const soaVersionId = soaDraft.body.soa_version_id;
  console.log("TEST DEBUG: SoA draft created:", soaVersionId);

  console.log("TEST DEBUG: POST /submit-review");
  const submitReviewResult = await send(
    `/api/v1/soa/${soaVersionId}/submit-review`,
    "POST",
    {},
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );
  checkStatus(submitReviewResult, "/submit-review");
  console.log("TEST DEBUG: SoA submitted for review");

  console.log("TEST DEBUG: POST /approvals");
  const approval = await send(
    `/api/v1/assessments/${assessmentId}/approvals`,
    "POST",
    {
      gate: "soa",
      target_type: "assessment_state",
      target_id: assessmentId,
      decision: "approved",
      reason: "Synthetic SoA approval",
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );
  checkStatus(approval, "/approvals");
  console.log("TEST DEBUG: SoA approval created");

  console.log("TEST DEBUG: POST /approve");
  const approveResult = await send(
    `/api/v1/soa/${soaVersionId}/approve`,
    "POST",
    {
      approval_event_id: approval.body.approval_id,
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );
  checkStatus(approveResult, "/approve");
  console.log("TEST DEBUG: SoA approved");

  console.log("TEST DEBUG: POST /evidence-analysis/run");
  const runResult = await send(
    `/api/v1/assessments/${assessmentId}/evidence-analysis/run`,
    "POST",
    {
      soa_version_id: soaVersionId,
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );
  checkStatus(runResult, "/evidence-analysis/run");
  console.log("TEST DEBUG: Evidence analysis run");

  console.log("TEST DEBUG: POST /gap-analysis/draft");
  const gapDraft = await send(
    `/api/v1/assessments/${assessmentId}/gap-analysis/draft`,
    "POST",
    {
      soa_version_id: soaVersionId,
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );
  checkStatus(gapDraft, "/gap-analysis/draft");
  const gapVersionId = gapDraft.body.gap_analysis_version_id;
  console.log("TEST DEBUG: Gap Analysis draft created:", gapVersionId);

  const frameworkRequirementId = crypto.randomUUID();
  await db.insert(scfFrameworkRequirements).values({
    id: frameworkRequirementId,
    organizationId,
    scfVersionId: SYNTHETIC_SCF_VERSION_ID,
    scfFrameworkId: SYNTHETIC_FRAMEWORK_ID,
    requirementCode: "REQ-01",
    title: "Test Requirement",
  });

  const soaItemId = crypto.randomUUID();
  await db.insert(soaItems).values({
    id: soaItemId,
    organizationId,
    assessmentId,
    soaVersionId,
    frameworkId: SYNTHETIC_FRAMEWORK_ID,
    frameworkRequirementId,
    scfVersionId: SYNTHETIC_SCF_VERSION_ID,
    scfFrameworkRequirementId: frameworkRequirementId,
    applicability: "applicable",
    applicabilityStatus: "validated",
    implementationStatus: "implemented",
  });

  const findingId = crypto.randomUUID();
  await db.insert(gapFindings).values({
    id: findingId,
    organizationId,
    assessmentId,
    gapAnalysisVersionId: gapVersionId,
    soaVersionId,
    soaItemId,
    frameworkId: SYNTHETIC_FRAMEWORK_ID,
    frameworkRequirementId,
    scfVersionId: SYNTHETIC_SCF_VERSION_ID,
    gapCode: "GAP-TEST-01",
    assessmentStatus: "not_evidenced",
    gapType: "documentation_gap",
    severity: "low",
    gapSummary: "Mock test finding for ledger audit",
    requiresUserValidation: false,
  });
  console.log("TEST DEBUG: Mock finding inserted directly:", findingId);

  return {
    assessmentId,
    soaVersionId,
    gapVersionId,
    findingId,
    organizationId,
    frameworkRequirementId,
    soaItemId,
  };
};

test("Database triggers prevent UPDATE/DELETE on assessment_control_events and throw restrict_violation", async () => {
  const { db } = await createDrizzleTestClient();

  // Insert a test row first
  await db.insert(assessmentControlEvents).values({
    organizationId: ids.organizationId,
    assessmentId: crypto.randomUUID(),
    scfControlId: crypto.randomUUID(),
    scfVersionId: ids.scfVersionId,
    eventType: "status_changed",
    newValue: { status: "test" },
    traceId: "test-trigger-violation",
  });

  let updateThrew = false;
  try {
    await db
      .update(assessmentControlEvents)
      .set({ eventType: "tampered" })
      .where(eq(assessmentControlEvents.traceId, "test-trigger-violation"));
  } catch (err: any) {
    updateThrew = true;
    const fullMsg =
      err.message + (err.cause?.message ? " | " + err.cause.message : "");
    const isOk =
      fullMsg.includes("restrict_violation") ||
      fullMsg.includes("[ADR-002]") ||
      err.cause?.code === "23001";
    expect(isOk).toBe(true);
  }
  expect(updateThrew).toBe(true);

  let deleteThrew = false;
  try {
    await db
      .delete(assessmentControlEvents)
      .where(eq(assessmentControlEvents.traceId, "test-trigger-violation"));
  } catch (err: any) {
    deleteThrew = true;
    const fullMsg =
      err.message + (err.cause?.message ? " | " + err.cause.message : "");
    const isOk =
      fullMsg.includes("restrict_violation") ||
      fullMsg.includes("[ADR-002]") ||
      err.cause?.code === "23001";
    expect(isOk).toBe(true);
  }
  expect(deleteThrew).toBe(true);
});

test("Retroactive mutation attempt on approved Gap Analysis is blocked and dispatches ledger.audit.alert", async () => {
  const { send, db } = await createDrizzleTestClient();
  const { gapVersionId, findingId, organizationId, assessmentId } =
    await setupApprovedGapAnalysis(db, send);

  // Transition Gap Analysis to approved status
  await send(
    `/api/v1/gap-analysis/${gapVersionId}/submit-review`,
    "POST",
    {
      exception_rationale: "Exception reason",
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );

  const gapApproval = await send(
    `/api/v1/assessments/${assessmentId}/approvals`,
    "POST",
    {
      gate: "gap_analysis",
      target_type: "assessment_state",
      target_id: assessmentId,
      decision: "approved",
      reason: "Synthetic Gap Analysis approval",
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );

  await send(
    `/api/v1/gap-analysis/${gapVersionId}/approve`,
    "POST",
    {
      approval_event_id: gapApproval.body.approval_id,
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );

  // Register webhook endpoint
  await db.insert(webhookEndpoints).values({
    id: crypto.randomUUID(),
    organizationId,
    url: "https://my-webhook.test/alert",
    events: ["ledger.audit.alert"],
    signingSecretHash: "hash",
    signingSecretMasked: "masked",
    enabled: true,
  });

  // Attempt PATCH
  const patchRes = await send(
    `/api/v1/gap-findings/${findingId}`,
    "PATCH",
    {
      assessment_status: "met",
      gap_rationale: "Rationale",
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );

  expect(patchRes.response.status).toBe(409);

  // Attempt bulk-update
  const bulkRes = await send(
    `/api/v1/gap-analysis/${gapVersionId}/findings/bulk-update`,
    "POST",
    {
      assessment_status: "met",
      gap_rationale: "Rationale",
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );

  expect(bulkRes.response.status).toBe(409);

  // Verify webhook delivery log
  const deliveries = await db.select().from(webhookDeliveries);
  const alerts = deliveries.filter(
    (d: any) => d.eventType === "ledger.audit.alert",
  );
  expect(alerts.length).toBeGreaterThanOrEqual(1);
});

test("Bulk-delete of 10 or more findings triggers ledger.audit.alert webhook", async () => {
  const { send, db } = await createDrizzleTestClient();
  const organizationId = ids.organizationId;

  const {
    gapVersionId,
    assessmentId,
    soaVersionId,
    frameworkRequirementId,
    soaItemId,
  } = await setupApprovedGapAnalysis(db, send);

  // Create another draft version because we cannot delete findings in an approved version
  const draftVersionId = crypto.randomUUID();
  await db.insert(gapAnalysisVersions).values({
    id: draftVersionId,
    organizationId,
    assessmentId,
    versionNumber: 2,
    status: "draft",
    sourceSoaVersionId: soaVersionId,
    frameworkId: SYNTHETIC_FRAMEWORK_ID,
    scfVersionId: SYNTHETIC_SCF_VERSION_ID,
    createdBy: ids.actorId,
    traceId: "test-bulk-delete-trace",
  });

  const findingIds = Array.from({ length: 10 }, () => crypto.randomUUID());
  await db.insert(gapFindings).values(
    findingIds.map((id, index) => ({
      id,
      organizationId,
      assessmentId,
      gapAnalysisVersionId: draftVersionId,
      soaVersionId,
      soaItemId,
      frameworkId: SYNTHETIC_FRAMEWORK_ID,
      frameworkRequirementId,
      scfVersionId: SYNTHETIC_SCF_VERSION_ID,
      gapCode: `GAP-BULK-${index}`,
      assessmentStatus: "not_evidenced",
      gapType: "documentation_gap",
      severity: "low",
      gapSummary: `Bulk delete test finding ${index}`,
      requiresUserValidation: false,
    })),
  );

  // Register webhook endpoint
  await db.delete(webhookDeliveries);
  await db.insert(webhookEndpoints).values({
    id: crypto.randomUUID(),
    organizationId,
    url: "https://my-webhook.test/alert",
    events: ["ledger.audit.alert"],
    signingSecretHash: "hash",
    signingSecretMasked: "masked",
    enabled: true,
  });

  // Call bulk-delete
  const deleteRes = await send(
    `/api/v1/gap-findings/bulk-delete`,
    "POST",
    {
      ids: findingIds,
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );

  expect(deleteRes.response.status).toBe(200);

  // Verify findings were deleted
  for (const id of findingIds) {
    const check = await db
      .select()
      .from(gapFindings)
      .where(eq(gapFindings.id, id));
    expect(check.length).toBe(0);
  }

  // Verify webhook delivery log
  const deliveries = await db.select().from(webhookDeliveries);
  expect(
    deliveries.some((d: any) => d.eventType === "ledger.audit.alert"),
  ).toBe(true);
});

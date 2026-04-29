import type { ApprovalEvent, AssessmentSnapshot } from "@aegis/assessment-engine";
import { AssessmentLifecycleOrchestrator, createInMemoryWorkflowDependencies, WorkflowOrchestrationError } from "../src";
import { expect, test } from "./test-kit";

export const ids = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  assessmentId: "33333333-3333-4333-8333-333333333333",
  actorId: "44444444-4444-4444-8444-444444444444",
  scfVersionId: "55555555-5555-4555-8555-555555555555",
  frameworkId: "66666666-6666-4666-8666-666666666666"
};

export const snapshot = (patch: Partial<AssessmentSnapshot> = {}): AssessmentSnapshot => ({
  id: ids.assessmentId,
  tenantId: ids.tenantId,
  organizationId: ids.organizationId,
  state: "draft",
  documentCount: 1,
  requiredDocumentJobsComplete: false,
  scfPreAnalysisRegistered: false,
  frameworkSelected: false,
  scopeDrafted: false,
  soaDraftVersionComplete: false,
  soaApproved: false,
  soaIngested: false,
  evidenceAnalysisReady: false,
  gapAnalysisDrafted: false,
  gapAnalysisApproved: false,
  maturityAssessed: false,
  maturityApproved: false,
  poamDrafted: false,
  poamApproved: false,
  reportGenerated: false,
  reportApproved: false,
  ...patch
});

export const approval = (gate: ApprovalEvent["gate"]): ApprovalEvent => ({
  id: "77777777-7777-4777-8777-777777777777",
  gate,
  decision: "approved",
  approvedBy: ids.actorId,
  approvedAt: "2026-04-28T20:00:00.000Z",
  traceId: "trace-test-0001"
});

const input = {
  tenant_id: ids.tenantId,
  organization_id: ids.organizationId,
  assessment_id: ids.assessmentId,
  requested_by: ids.actorId,
  trace_id: "trace-test-0001",
  idempotency_key: "workflow-start-0001",
  options: {}
};

test("start cria workflow state com trace_id e bloqueia duplicado ativo", async () => {
  const deps = createInMemoryWorkflowDependencies();
  const orchestrator = new AssessmentLifecycleOrchestrator(deps);

  const started = await orchestrator.start(input, snapshot());
  expect(started.status).toBe("waiting_for_input");
  expect(started.state.trace_id).toBe("trace-test-0001");
  expect(started.state.current_step).toBe("wait_for_documents");

  try {
    await orchestrator.start({ ...input, idempotency_key: "workflow-start-0002" }, snapshot());
    throw new Error("duplicate should fail");
  } catch (error) {
    expect(error instanceof WorkflowOrchestrationError).toBe(true);
  }
});

test("framework_selected avança por Assessment Engine até aguardar SoA approval", async () => {
  const deps = createInMemoryWorkflowDependencies();
  const orchestrator = new AssessmentLifecycleOrchestrator(deps);
  const started = await orchestrator.start(input, snapshot());

  const result = await orchestrator.signal(started.workflow_run_id, {
    signal_type: "framework_selected",
    actor_id: ids.actorId,
    idempotency_key: "signal-framework-0001",
    trace_id: "trace-test-0001",
    payload: { framework_id: ids.frameworkId, scf_version_id: ids.scfVersionId }
  }, snapshot({ state: "documents_uploaded" }));

  expect(result.status).toBe("waiting_for_approval");
  expect(result.current_step).toBe("wait_for_soa_approval");
  expect(result.pending_approval_type).toBe("soa");
  expect(deps.assessmentEngine.transitions).toContain("soa_under_review");
});

test("SoA approval sem approval_event válido é bloqueado", async () => {
  const deps = createInMemoryWorkflowDependencies();
  const orchestrator = new AssessmentLifecycleOrchestrator(deps);
  const started = await orchestrator.start(input, snapshot());
  await orchestrator.signal(started.workflow_run_id, {
    signal_type: "framework_selected",
    actor_id: ids.actorId,
    idempotency_key: "signal-framework-0001",
    trace_id: "trace-test-0001",
    payload: { framework_id: ids.frameworkId, scf_version_id: ids.scfVersionId }
  }, snapshot({ state: "documents_uploaded" }));

  try {
    await orchestrator.signal(started.workflow_run_id, {
      signal_type: "soa_approved",
      actor_id: ids.actorId,
      idempotency_key: "signal-soa-0001",
      trace_id: "trace-test-0001",
      payload: {}
    }, snapshot({ state: "soa_under_review", soaDraftVersionComplete: true, scopeDrafted: true, frameworkSelected: true }));
    throw new Error("approval should fail");
  } catch (error) {
    expect(error instanceof WorkflowOrchestrationError).toBe(true);
  }
});

test("aprovações válidas avançam até completed e fecham assessment", async () => {
  const deps = createInMemoryWorkflowDependencies();
  const orchestrator = new AssessmentLifecycleOrchestrator(deps);
  const started = await orchestrator.start(input, snapshot());

  await orchestrator.signal(started.workflow_run_id, {
    signal_type: "framework_selected",
    actor_id: ids.actorId,
    idempotency_key: "signal-framework-0001",
    trace_id: "trace-test-0001",
    payload: { framework_id: ids.frameworkId, scf_version_id: ids.scfVersionId }
  }, snapshot({ state: "documents_uploaded" }));

  const afterSoa = await orchestrator.signal(started.workflow_run_id, {
    signal_type: "soa_approved",
    actor_id: ids.actorId,
    approval_event_id: approval("soa").id,
    idempotency_key: "signal-soa-0001",
    trace_id: "trace-test-0001",
    payload: {}
  }, snapshot({ state: "soa_under_review", frameworkSelected: true, scopeDrafted: true, soaDraftVersionComplete: true }), approval("soa"));
  expect(afterSoa.current_step).toBe("wait_for_gap_approval");

  const afterGap = await orchestrator.signal(started.workflow_run_id, {
    signal_type: "gap_analysis_approved",
    actor_id: ids.actorId,
    approval_event_id: approval("gap_analysis").id,
    idempotency_key: "signal-gap-0001",
    trace_id: "trace-test-0001",
    payload: {}
  }, snapshot({ state: "gap_analysis_under_review", gapAnalysisDrafted: true }), approval("gap_analysis"));
  expect(afterGap.current_step).toBe("wait_for_maturity_approval");

  const afterMaturity = await orchestrator.signal(started.workflow_run_id, {
    signal_type: "maturity_approved",
    actor_id: ids.actorId,
    approval_event_id: approval("maturity_assessment").id,
    idempotency_key: "signal-maturity-0001",
    trace_id: "trace-test-0001",
    payload: {}
  }, snapshot({ state: "maturity_under_review", maturityAssessed: true }), approval("maturity_assessment"));
  expect(afterMaturity.current_step).toBe("wait_for_poam_approval");

  const afterPoam = await orchestrator.signal(started.workflow_run_id, {
    signal_type: "poam_approved",
    actor_id: ids.actorId,
    approval_event_id: approval("poam").id,
    idempotency_key: "signal-poam-0001",
    trace_id: "trace-test-0001",
    payload: {}
  }, snapshot({ state: "poam_under_review", poamDrafted: true }), approval("poam"));
  expect(afterPoam.current_step).toBe("wait_for_report_approval");

  const afterReport = await orchestrator.signal(started.workflow_run_id, {
    signal_type: "report_approved",
    actor_id: ids.actorId,
    approval_event_id: approval("report").id,
    idempotency_key: "signal-report-0001",
    trace_id: "trace-test-0001",
    payload: {}
  }, snapshot({ state: "report_generated", reportGenerated: true }), approval("report"));
  expect(afterReport.status).toBe("completed");
  expect(deps.assessmentEngine.transitions).toContain("closed");
});

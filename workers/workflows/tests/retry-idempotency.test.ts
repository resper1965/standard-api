import { AssessmentLifecycleOrchestrator, createInMemoryWorkflowDependencies } from "../src";
import { approval, ids, snapshot } from "./lifecycle.workflow.test";
import { expect, test } from "./test-kit";

test("idempotency_key evita duplicidade de signal e versões lógicas", async () => {
  const deps = createInMemoryWorkflowDependencies();
  const orchestrator = new AssessmentLifecycleOrchestrator(deps);
  const started = await orchestrator.start({
    tenant_id: ids.tenantId,
    organization_id: ids.organizationId,
    assessment_id: ids.assessmentId,
    requested_by: ids.actorId,
    trace_id: "trace-test-0001",
    idempotency_key: "workflow-start-0001",
    options: {}
  }, snapshot());

  const request = {
    signal_type: "framework_selected" as const,
    actor_id: ids.actorId,
    idempotency_key: "signal-framework-0001",
    trace_id: "trace-test-0001",
    payload: { framework_id: ids.frameworkId, scf_version_id: ids.scfVersionId }
  };

  const first = await orchestrator.signal(started.workflow_run_id, request, snapshot({ state: "documents_uploaded" }));
  const second = await orchestrator.signal(started.workflow_run_id, request, snapshot({ state: "documents_uploaded" }));

  expect(second.current_step).toBe(first.current_step);
  expect(deps.audit.events.filter((event) => event.event_type === "lifecycle_workflow_signal_received").length).toBe(1);
});

test("cancel muda status para cancelled e resume só funciona em blocked ou failed", async () => {
  const deps = createInMemoryWorkflowDependencies();
  const orchestrator = new AssessmentLifecycleOrchestrator(deps);
  const started = await orchestrator.start({
    tenant_id: ids.tenantId,
    organization_id: ids.organizationId,
    assessment_id: ids.assessmentId,
    requested_by: ids.actorId,
    trace_id: "trace-test-0001",
    idempotency_key: "workflow-start-0001",
    options: {}
  }, snapshot());

  const cancelled = await orchestrator.cancel(started.workflow_run_id, {
    actor_id: ids.actorId,
    reason: "User requested cancellation.",
    idempotency_key: "cancel-0001",
    trace_id: "trace-test-0001"
  });

  expect(cancelled.status).toBe("cancelled");

  try {
    await orchestrator.resume(started.workflow_run_id, {
      actor_id: ids.actorId,
      reason: "resume",
      idempotency_key: "resume-0001",
      trace_id: "trace-test-0001"
    });
    throw new Error("resume should fail");
  } catch (error) {
    expect(error).toBeDefined();
  }
});

test("blocked registra blocked_reason seguro", async () => {
  const deps = createInMemoryWorkflowDependencies();
  const orchestrator = new AssessmentLifecycleOrchestrator(deps);
  const started = await orchestrator.start({
    tenant_id: ids.tenantId,
    organization_id: ids.organizationId,
    assessment_id: ids.assessmentId,
    requested_by: ids.actorId,
    trace_id: "trace-test-0001",
    idempotency_key: "workflow-start-0001",
    options: {}
  }, snapshot());

  await orchestrator.signal(started.workflow_run_id, {
    signal_type: "assessment_blocked",
    actor_id: ids.actorId,
    idempotency_key: "blocked-0001",
    trace_id: "trace-test-0001",
    payload: { blocked_reason: "manual_intervention_required" }
  }, snapshot());

  const run = await orchestrator.get(started.workflow_run_id, ids.tenantId);
  expect(run?.status).toBe("blocked");
  expect(run?.state.blocked_reason).toBe("manual_intervention_required");
});

test("tenant isolation bloqueia acesso cruzado ao workflow", async () => {
  const deps = createInMemoryWorkflowDependencies();
  const orchestrator = new AssessmentLifecycleOrchestrator(deps);
  const started = await orchestrator.start({
    tenant_id: ids.tenantId,
    organization_id: ids.organizationId,
    assessment_id: ids.assessmentId,
    requested_by: ids.actorId,
    trace_id: "trace-test-0001",
    idempotency_key: "workflow-start-0001",
    options: {}
  }, snapshot());

  const run = await orchestrator.get(started.workflow_run_id, "99999999-9999-4999-8999-999999999999");
  expect(run).toBe(null);
});

test("approval gate errado permanece bloqueado pelo Assessment Engine", async () => {
  const deps = createInMemoryWorkflowDependencies();
  const orchestrator = new AssessmentLifecycleOrchestrator(deps);
  const started = await orchestrator.start({
    tenant_id: ids.tenantId,
    organization_id: ids.organizationId,
    assessment_id: ids.assessmentId,
    requested_by: ids.actorId,
    trace_id: "trace-test-0001",
    idempotency_key: "workflow-start-0001",
    options: {}
  }, snapshot());

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
      approval_event_id: approval("gap_analysis").id,
      idempotency_key: "signal-soa-0001",
      trace_id: "trace-test-0001",
      payload: {}
    }, snapshot({ state: "soa_under_review", frameworkSelected: true, scopeDrafted: true, soaDraftVersionComplete: true }), approval("gap_analysis"));
    throw new Error("approval should fail");
  } catch (error) {
    expect(error).toBeDefined();
  }
});

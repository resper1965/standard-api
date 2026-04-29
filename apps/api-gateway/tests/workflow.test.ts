import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("workflow start exige tenant context", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);

  const result = await client.send(`/api/v1/assessments/${created.assessmentId}/workflows/lifecycle/start`, "POST", {
    requested_by: ids.actorId,
    idempotency_key: "workflow-start-api-0001"
  }, {
    "x-aegis-actor-id": ids.actorId
  });

  expect(result.response.status).toBe(400);
});

test("workflow start cria execução e bloqueia duplicado ativo", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const headers = {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  };

  const start = await client.send(`/api/v1/assessments/${created.assessmentId}/workflows/lifecycle/start`, "POST", {
    requested_by: ids.actorId,
    idempotency_key: "workflow-start-api-0001"
  }, headers);

  expect(start.response.status).toBe(201);
  expect(start.body.state.trace_id).toBe("trace-test-0001");
  expect(start.body.status).toBe("waiting_for_input");

  const duplicate = await client.send(`/api/v1/assessments/${created.assessmentId}/workflows/lifecycle/start`, "POST", {
    requested_by: ids.actorId,
    idempotency_key: "workflow-start-api-0002"
  }, headers);

  expect(duplicate.response.status).toBe(409);
});

test("workflow signal framework-selected avança para wait de SoA e approval inválido é bloqueado", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const headers = {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  };

  const start = await client.send(`/api/v1/assessments/${created.assessmentId}/workflows/lifecycle/start`, "POST", {
    requested_by: ids.actorId,
    idempotency_key: "workflow-start-api-0001"
  }, headers);

  const framework = await client.send(`/api/v1/workflows/${start.body.workflow_run_id}/signals`, "POST", {
    signal_type: "framework_selected",
    actor_id: ids.actorId,
    idempotency_key: "signal-framework-api-0001",
    payload: {
      framework_id: "66666666-6666-4666-8666-666666666666",
      scf_version_id: ids.scfVersionId
    }
  }, headers);

  expect(framework.response.status).toBe(202);
  expect(framework.body.current_step).toBe("wait_for_soa_approval");
  expect(framework.body.pending_approval_type).toBe("soa");

  const soa = await client.send(`/api/v1/workflows/${start.body.workflow_run_id}/signals`, "POST", {
    signal_type: "soa_approved",
    actor_id: ids.actorId,
    idempotency_key: "signal-soa-api-0001",
    payload: {}
  }, headers);

  expect(soa.response.status).toBe(400);
});

test("workflow aceita approval_event válido e permite cancelamento", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const headers = {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  };

  const start = await client.send(`/api/v1/assessments/${created.assessmentId}/workflows/lifecycle/start`, "POST", {
    requested_by: ids.actorId,
    idempotency_key: "workflow-start-api-0001"
  }, headers);
  await client.send(`/api/v1/workflows/${start.body.workflow_run_id}/signals`, "POST", {
    signal_type: "framework_selected",
    actor_id: ids.actorId,
    idempotency_key: "signal-framework-api-0001",
    payload: {
      framework_id: "66666666-6666-4666-8666-666666666666",
      scf_version_id: ids.scfVersionId
    }
  }, headers);
  const approval = await client.send(`/api/v1/assessments/${created.assessmentId}/approvals`, "POST", {
    gate: "soa",
    decision: "approved",
    target_type: "assessment_state",
    target_id: created.assessmentId,
    reason: "Synthetic approval for test."
  }, headers);

  const signal = await client.send(`/api/v1/workflows/${start.body.workflow_run_id}/signals`, "POST", {
    signal_type: "soa_approved",
    actor_id: ids.actorId,
    approval_event_id: approval.body.approval_id,
    idempotency_key: "signal-soa-api-0001",
    payload: {}
  }, headers);

  expect(signal.response.status).toBe(202);
  expect(signal.body.current_step).toBe("wait_for_gap_approval");

  const cancel = await client.send(`/api/v1/workflows/${start.body.workflow_run_id}/cancel`, "POST", {
    actor_id: ids.actorId,
    reason: "Synthetic cancellation.",
    idempotency_key: "cancel-api-0001"
  }, headers);

  expect(cancel.response.status).toBe(200);
  expect(cancel.body.status).toBe("cancelled");
});

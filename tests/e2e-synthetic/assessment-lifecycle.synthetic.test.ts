import { createTestClient, ids } from "../../apps/api-gateway/tests/helpers";
import { expect, test } from "../test-kit";

test("golden synthetic lifecycle reaches workflow wait state without real providers", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const headers = {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  };

  const start = await client.send(`/api/v1/assessments/${created.assessmentId}/workflows/lifecycle/start`, "POST", {
    requested_by: ids.actorId,
    idempotency_key: "synthetic-workflow-start-001"
  }, headers);
  expect(start.response.status).toBe(201);

  const signal = await client.send(`/api/v1/workflows/${start.body.workflow_run_id}/signals`, "POST", {
    signal_type: "framework_selected",
    actor_id: ids.actorId,
    idempotency_key: "synthetic-framework-selected-001",
    payload: {
      framework_id: ids.scfVersionId,
      scf_version_id: ids.scfVersionId
    }
  }, headers);
  expect(signal.response.status).toBe(202);
  expect(signal.body.current_step).toBe("wait_for_soa_approval");
  expect(signal.body.pending_approval_type).toBe("soa");
});

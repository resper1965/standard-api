import { ids, createTestClient } from "./helpers";
import { expect, test } from "./test-kit";

test("POST /transitions bloqueia transição inválida", async () => {
  const client = createTestClient();
  const created = await client.createAssessment();
  const { response, body } = await client.send(`/api/v1/assessments/${created.assessmentId}/transitions`, "POST", {
    next_state: "framework_selected",
    reason: "tentativa sem prerequisitos"
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });

  expect(response.status).toBe(409);
  expect(body.error.code).toBe("INVALID_STATE_TRANSITION");
});

test("POST /transitions permite transição válida usando assessment-engine", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const { response, body } = await client.send(`/api/v1/assessments/${created.assessmentId}/transitions`, "POST", {
    next_state: "documents_uploaded",
    reason: "documento sintético registrado"
  }, {
    "x-standard-tenant-id": created.organizationId,
    "x-standard-actor-id": ids.actorId
  });

  expect(response.status).toBe(200);
  expect(body.previous_state).toBe("draft");
  expect(body.next_state).toBe("documents_uploaded");
  expect(body.event.trace_id).toBe("trace-test-0001");
});


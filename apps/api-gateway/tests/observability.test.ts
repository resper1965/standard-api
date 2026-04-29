import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("audit logs endpoint exige audit:read e retorna eventos do assessment", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const start = await client.send(`/api/v1/assessments/${created.assessmentId}/agent-runs`, "POST", {
    agent_id: "knowledge_steward",
    agent_version: "0.1.0",
    prompt_version: "knowledge-v1",
    model: "mock-model",
    framework_id: ids.scfVersionId,
    scf_version_id: ids.scfVersionId,
    input: { document_id: "88888888-8888-4888-8888-888888888888" }
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  expect(start.response.status).toBe(201);

  const denied = await client.send(`/api/v1/assessments/${created.assessmentId}/audit-logs`, "GET", undefined, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId,
    authorization: "Bearer dev:assessor"
  });
  expect(denied.response.status).toBe(403);

  const allowed = await client.send(`/api/v1/assessments/${created.assessmentId}/audit-logs`, "GET", undefined, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId,
    authorization: "Bearer dev:auditor_readonly"
  });
  expect(allowed.response.status).toBe(200);
  expect(allowed.body.data.some((event: any) => event.action === "agent_run_started")).toBe(true);
});

test("permission denied gera security event consultável por admin", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const denied = await client.send(`/api/v1/assessments/${created.assessmentId}/kb/search`, "POST", {
    query: "access control",
    top_k: 3
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId,
    authorization: "Bearer dev:auditor_readonly"
  });
  expect(denied.response.status).toBe(403);

  const events = await client.send("/api/v1/admin/security-events", "GET", undefined, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId,
    authorization: "Bearer dev:platform_admin"
  });
  expect(events.response.status).toBe(200);
  expect(events.body.data.some((event: any) => event.event_type === "forbidden_access_attempt")).toBe(true);
});

test("KB search registra métricas e usage sem query integral", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const search = await client.send(`/api/v1/assessments/${created.assessmentId}/kb/search`, "POST", {
    query: "access control",
    top_k: 3
  }, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  expect(search.response.status).toBe(200);

  const metrics = await client.send(`/api/v1/assessments/${created.assessmentId}/metrics`, "GET", undefined, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  expect(metrics.response.status).toBe(200);
  expect(metrics.body.data.some((metric: any) => metric.metric_name === "kb_search_count")).toBe(true);
  expect(JSON.stringify(metrics.body.data).includes("access control")).toBe(false);

  const usage = await client.send(`/api/v1/assessments/${created.assessmentId}/usage`, "GET", undefined, {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  });
  expect(usage.response.status).toBe(200);
  expect(usage.body.usage.some((record: any) => record.service_name === "vectorize")).toBe(true);
});

test("agent complete registra usage quando tokens são informados", async () => {
  const client = createTestClient();
  const created = await client.createAssessment(1);
  const headers = {
    "x-aegis-tenant-id": created.tenantId,
    "x-aegis-actor-id": ids.actorId
  };
  const run = await client.send(`/api/v1/assessments/${created.assessmentId}/agent-runs`, "POST", {
    agent_id: "poam_planner",
    agent_version: "0.1.0",
    prompt_version: "poam-v1",
    model: "mock-model",
    framework_id: ids.scfVersionId,
    scf_version_id: ids.scfVersionId,
    input: { source_gap_analysis_version_id: "77777777-7777-4777-8777-777777777777" }
  }, headers);

  await client.send(`/api/v1/agent-runs/${run.body.agent_run_id}/complete`, "POST", {
    output: {
      summary: "Synthetic agent output.",
      assumptions: ["Gap Analysis is approved."],
      limitations: ["Maturity package is not implemented."],
      sources: ["gap_analysis"],
      confidence_score: 0.73
    },
    usage: {
      model_provider: "mock",
      prompt_tokens: 10,
      completion_tokens: 5,
      embedding_tokens: 0
    }
  }, headers);

  const usage = await client.send(`/api/v1/assessments/${created.assessmentId}/usage`, "GET", undefined, headers);
  expect(usage.body.agent_usage.some((record: any) => record.total_tokens === 15)).toBe(true);
});

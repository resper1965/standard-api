import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("Agent Runtime API lista agentes funcionais e contratos de tools", async () => {
  const client = createTestClient();
  const { tenantId } = await client.createTenantOrg();

  const result = await client.send("/api/v1/agent-runtime/agents", "GET", undefined, {
    "x-standard-tenant-id": tenantId,
    "x-standard-actor-id": ids.actorId
  });

  expect(result.response.status).toBe(200);
  expect(result.body.agents.length).toBe(10);
  expect(result.body.tools.some((tool: any) => tool.tool_name === "kb_evidence_search")).toBe(true);
});

test("Agent Runtime API cria run rastreável e bloqueia tool não permitida", async () => {
  const client = createTestClient();
  const assessment = await client.createAssessment(1);
  const headers = {
    "x-standard-tenant-id": assessment.tenantId,
    "x-standard-actor-id": ids.actorId
  };

  const runResult = await client.send(`/api/v1/assessments/${assessment.assessmentId}/agent-runs`, "POST", {
    agent_id: "knowledge_steward",
    agent_version: "0.1.0",
    prompt_version: "knowledge-v1",
    model: "mock-model",
    framework_id: ids.scfVersionId,
    scf_version_id: ids.scfVersionId,
    input: { document_id: "88888888-8888-4888-8888-888888888888" }
  }, headers);

  expect(runResult.response.status).toBe(201);
  expect(runResult.body.status).toBe("running");
  expect(runResult.body.input_hash.startsWith("sha256:")).toBe(true);

  const toolResult = await client.send(`/api/v1/agent-runs/${runResult.body.agent_run_id}/tool-calls`, "POST", {
    tool_name: "approval_event_create",
    input: {
      tenant_id: assessment.tenantId,
      organization_id: assessment.organizationId,
      assessment_id: assessment.assessmentId,
      framework_id: ids.scfVersionId,
      scf_version_id: ids.scfVersionId,
      trace_id: "trace-test-0001",
      gate: "gap_analysis"
    }
  }, headers);

  expect(toolResult.response.status).toBe(409);
  expect(toolResult.body.error.code).toBe("TOOL_NOT_ALLOWED");
});

test("Agent Runtime API completa run com output schema-validado", async () => {
  const client = createTestClient();
  const assessment = await client.createAssessment(1);
  const headers = {
    "x-standard-tenant-id": assessment.tenantId,
    "x-standard-actor-id": ids.actorId
  };

  const runResult = await client.send(`/api/v1/assessments/${assessment.assessmentId}/agent-runs`, "POST", {
    agent_id: "poam_planner",
    agent_version: "0.1.0",
    prompt_version: "poam-v1",
    model: "mock-model",
    framework_id: ids.scfVersionId,
    scf_version_id: ids.scfVersionId,
    input: { source_gap_analysis_version_id: "77777777-7777-4777-8777-777777777777" }
  }, headers);

  const completed = await client.send(`/api/v1/agent-runs/${runResult.body.agent_run_id}/complete`, "POST", {
    output: {
      summary: "Synthetic agent output.",
      assumptions: ["Gap Analysis is approved."],
      limitations: ["Maturity package is not implemented."],
      sources: ["gap_analysis"],
      confidence_score: 0.73
    }
  }, headers);

  expect(completed.response.status).toBe(200);
  expect(completed.body.status).toBe("completed");
  expect(completed.body.output_hash.startsWith("sha256:")).toBe(true);
});


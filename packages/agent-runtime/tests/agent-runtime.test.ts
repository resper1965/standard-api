import {
  AgentRuntimeService,
  AGENT_TOOL_CONTRACTS,
  FUNCTIONAL_AGENT_CONTRACTS,
  createInMemoryAgentRuntimeDependencies
} from "../src/index";
import { expect, test } from "./test-kit";

const tenantId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";
const assessmentId = "33333333-3333-4333-8333-333333333333";
const frameworkId = "44444444-4444-4444-8444-444444444444";
const scfVersionId = "55555555-5555-4555-8555-555555555555";
const actorId = "66666666-6666-4666-8666-666666666666";

const context = {
  tenant_id: tenantId,
  organization_id: organizationId,
  assessment_id: assessmentId,
  framework_id: frameworkId,
  scf_version_id: scfVersionId,
  trace_id: "trace-agent-0001",
  actor_id: actorId
};

test("registry exposes the functional Standard agents with least-privilege tools", () => {
  expect(FUNCTIONAL_AGENT_CONTRACTS.length).toBe(9);
  const knowledgeSteward = FUNCTIONAL_AGENT_CONTRACTS.find((agent) => agent.agent_id === "knowledge_steward");
  expect(knowledgeSteward).toBeDefined();
  expect(knowledgeSteward!.allowed_tools).toContain("kb_evidence_search");
  expect(knowledgeSteward!.allowed_tools.includes("approval_event_create")).toBe(false);
});

test("tool contracts include risk classification and require tenant-scoped input", () => {
  const kbSearch = AGENT_TOOL_CONTRACTS.find((tool) => tool.tool_name === "kb_evidence_search");
  expect(kbSearch).toBeDefined();
  expect(kbSearch!.risk_level).toBe("medium");
  const parsed = kbSearch!.input_schema.safeParse({
    tenant_id: tenantId,
    organization_id: organizationId,
    assessment_id: assessmentId,
    framework_id: frameworkId,
    scf_version_id: scfVersionId,
    trace_id: "trace-agent-0001",
    query: "synthetic evidence",
    top_k: 3
  });
  expect(parsed.success).toBe(true);
});

test("starting an agent run records hashes, model metadata and traceability", async () => {
  const runtime = new AgentRuntimeService(createInMemoryAgentRuntimeDependencies());
  const run = await runtime.startRun({
    agent_id: "gap_analyst",
    agent_version: "0.1.0",
    prompt_version: "gap-v1",
    model: "mock-model",
    input: { source_gap_analysis_version_id: "77777777-7777-4777-8777-777777777777" },
    context
  });

  expect(run.status).toBe("running");
  expect(run.tenant_id).toBe(tenantId);
  expect(run.assessment_id).toBe(assessmentId);
  expect(run.input_hash.startsWith("sha256:")).toBe(true);
  expect(run.model).toBe("mock-model");
});

test("runtime rejects tools that are not allowed for an agent", async () => {
  const runtime = new AgentRuntimeService(createInMemoryAgentRuntimeDependencies());
  const run = await runtime.startRun({
    agent_id: "knowledge_steward",
    agent_version: "0.1.0",
    prompt_version: "knowledge-v1",
    model: "mock-model",
    input: { document_id: "88888888-8888-4888-8888-888888888888" },
    context
  });

  try {
    await runtime.invokeTool(run.agent_run_id, {
      tool_name: "approval_event_create",
      input: {
        tenant_id: tenantId,
        organization_id: organizationId,
        assessment_id: assessmentId,
        framework_id: frameworkId,
        scf_version_id: scfVersionId,
        trace_id: "trace-agent-0001",
        gate: "gap_analysis"
      },
      context
    });
    throw new Error("Expected tool invocation to fail");
  } catch (error) {
    expect((error as Error).message.includes("TOOL_NOT_ALLOWED")).toBe(true);
  }
});

test("runtime blocks final findings and official mappings from agent output", async () => {
  const runtime = new AgentRuntimeService(createInMemoryAgentRuntimeDependencies());
  const run = await runtime.startRun({
    agent_id: "framework_mapper",
    agent_version: "0.1.0",
    prompt_version: "mapper-v1",
    model: "mock-model",
    input: { framework_id: frameworkId },
    context
  });

  try {
    await runtime.completeRun(run.agent_run_id, {
      output: {
        summary: "Attempt to create official mapping",
        assumptions: ["synthetic"],
        limitations: ["synthetic"],
        sources: ["scf"],
        confidence_score: 0.8,
        writes_final_finding: true,
        creates_official_mapping: true,
        metadata: {}
      },
      context
    });
    throw new Error("Expected guardrail to fail");
  } catch (error) {
    expect((error as Error).message.includes("GUARDRAIL_VIOLATION")).toBe(true);
  }
});

test("completed agent output must declare assumptions, limitations, sources and confidence", async () => {
  const runtime = new AgentRuntimeService(createInMemoryAgentRuntimeDependencies());
  const run = await runtime.startRun({
    agent_id: "poam_planner",
    agent_version: "0.1.0",
    prompt_version: "poam-v1",
    model: "mock-model",
    input: { source_gap_analysis_version_id: "77777777-7777-4777-8777-777777777777" },
    context
  });

  const completed = await runtime.completeRun(run.agent_run_id, {
    output: {
      summary: "Synthetic POA&M planning output.",
      assumptions: ["Gap analysis version is approved."],
      limitations: ["No maturity package is available."],
      sources: ["gap_analysis"],
      confidence_score: 0.74,
      writes_final_finding: false,
      creates_official_mapping: false,
      metadata: {}
    },
    context
  });

  expect(completed.status).toBe("completed");
  expect(completed.output_hash?.startsWith("sha256:")).toBe(true);
  expect(completed.confidence_score).toBe(0.74);
});


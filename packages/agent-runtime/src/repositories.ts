import type { AgentRunResponse, AgentToolInvocationResponse } from "@standard/schemas";
import type { AgentRunRepository, AgentRuntimeDependencies, AgentToolCallRepository } from "./types";

export const createInMemoryAgentRunRepository = (): AgentRunRepository => {
  const records = new Map<string, AgentRunResponse>();

  return {
    async create(input) {
      records.set(input.agent_run_id, input);
      return input;
    },
    async get(agentRunId) {
      return records.get(agentRunId) ?? null;
    },
    async save(run) {
      records.set(run.agent_run_id, run);
    },
    async listByAssessment(assessmentId, tenantId) {
      return Array.from(records.values()).filter((run) => run.assessment_id === assessmentId && run.tenant_id === tenantId);
    }
  };
};

export const createInMemoryAgentToolCallRepository = (): AgentToolCallRepository => {
  const records: AgentToolInvocationResponse[] = [];

  return {
    async create(input) {
      records.push(input);
      return input;
    },
    async listByRun(agentRunId, tenantId) {
      return records.filter((call) => call.agent_run_id === agentRunId && call.tenant_id === tenantId);
    }
  };
};

export const createInMemoryAgentRuntimeDependencies = (): AgentRuntimeDependencies => ({
  runs: createInMemoryAgentRunRepository(),
  toolCalls: createInMemoryAgentToolCallRepository(),
  // Mock LLM placeholder — will be replaced with a real provider in production
  llm: {
    specificationVersion: "v1",
    provider: "mock",
    modelId: "mock-model",
    defaultObjectGenerationMode: "json",
    doGenerate: async () => ({
      text: "Mock LLM output",
      finishReason: "stop" as const,
      usage: { promptTokens: 10, completionTokens: 10 },
      rawCall: { rawPrompt: null, rawSettings: {} }
    }),
    doStream: async () => ({
      stream: new ReadableStream(),
      rawCall: { rawPrompt: null, rawSettings: {} }
    })
  } as unknown as AgentRuntimeDependencies["llm"]
});


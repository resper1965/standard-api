import type {
  AgentRunResponse,
  AgentToolInvocationResponse,
} from "@standard/schemas";
import type {
  AgentRunRepository,
  AgentRuntimeDependencies,
  AgentToolCallRepository,
} from "./types";

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
    async listByAssessment(assessmentId, organizationId) {
      return Array.from(records.values()).filter(
        (run) =>
          run.assessment_id === assessmentId &&
          run.organization_id === organizationId,
      );
    },
  };
};

export const createInMemoryAgentToolCallRepository =
  (): AgentToolCallRepository => {
    const records: AgentToolInvocationResponse[] = [];

    return {
      async create(input) {
        records.push(input);
        return input;
      },
      async listByRun(agentRunId, organizationId) {
        return records.filter(
          (call) =>
            call.agent_run_id === agentRunId &&
            call.organization_id === organizationId,
        );
      },
    };
  };

export const createInMemoryAgentRuntimeDependencies =
  (): AgentRuntimeDependencies => ({
    runs: createInMemoryAgentRunRepository(),
    toolCalls: createInMemoryAgentToolCallRepository(),
    // Mock LLM placeholder — will be replaced with a real provider in production
    llm: {
      generate: async (input) => ({
        message: {
          role: "assistant",
          content:
            input.response_format?.type === "json_schema"
              ? "{}"
              : "Mock LLM output",
        },
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      }),
    } as AgentRuntimeDependencies["llm"],
  });

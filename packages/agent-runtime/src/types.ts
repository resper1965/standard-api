import type {
  AgentOutput,
  AgentRunResponse,
  AgentRuntimeContext,
  AgentToolInvocationResponse,
  AgentToolName,
  FunctionalAgentId,
} from "@standard/schemas";

export type StartAgentRunInput = {
  agent_id: FunctionalAgentId;
  agent_version: string;
  prompt_version: string;
  model: string;
  input: Record<string, unknown>;
  context: AgentRuntimeContext;
};

export type InvokeAgentToolInput = {
  tool_name: AgentToolName;
  input: Record<string, unknown>;
  context: AgentRuntimeContext;
};

export type CompleteAgentRunInput = {
  output: AgentOutput;
  context: AgentRuntimeContext;
};

export type AgentRunRepository = {
  create(input: AgentRunResponse): Promise<AgentRunResponse>;
  get(agentRunId: string): Promise<AgentRunResponse | null>;
  save(run: AgentRunResponse): Promise<void>;
  listByAssessment(
    assessmentId: string,
    organizationId: string,
  ): Promise<AgentRunResponse[]>;
};

export type AgentToolCallRepository = {
  create(
    input: AgentToolInvocationResponse,
  ): Promise<AgentToolInvocationResponse>;
  listByRun(
    agentRunId: string,
    organizationId: string,
  ): Promise<AgentToolInvocationResponse[]>;
};

import type { LlmProvider } from "./llm";
/**
 * Registry of real tool implementations that execute domain logic.
 * Keys are tool names matching AgentToolName.
 */
export type ToolRegistry = Record<
  string,
  {
    execute: (args: any) => Promise<unknown>;
  }
>;

/**
 * Observability callback for agent run telemetry.
 * Records token usage, latency, and tool call counts per agent run.
 */
export type AgentRunObservability = {
  record: (data: {
    agent_run_id: string;
    organization_id: string;
    assessment_id: string;
    trace_id: string;
    model: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_latency_ms: number;
    tool_calls: number;
    finish_reason?: string;
  }) => Promise<void>;
};

export type AgentRuntimeDependencies = {
  runs: AgentRunRepository;
  toolCalls: AgentToolCallRepository;
  llm: LlmProvider;
  toolRegistry?: ToolRegistry;
  observability?: AgentRunObservability;
};

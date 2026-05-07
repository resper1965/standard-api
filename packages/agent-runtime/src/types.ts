import type {
  AgentOutput,
  AgentRunResponse,
  AgentRuntimeContext,
  AgentToolInvocationResponse,
  AgentToolName,
  FunctionalAgentId
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
  listByAssessment(assessmentId: string, tenantId: string): Promise<AgentRunResponse[]>;
};

export type AgentToolCallRepository = {
  create(input: AgentToolInvocationResponse): Promise<AgentToolInvocationResponse>;
  listByRun(agentRunId: string, tenantId: string): Promise<AgentToolInvocationResponse[]>;
};

import type { LanguageModel } from "ai";

export type AgentRuntimeDependencies = {
  runs: AgentRunRepository;
  toolCalls: AgentToolCallRepository;
  llm: LanguageModel;
};


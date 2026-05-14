import {
  AgentOutputSchema,
  AgentRunResponseSchema,
  AgentRuntimeContextSchema,
  AgentToolInvocationResponseSchema
} from "@standard/schemas";
import { AGENT_TOOL_CONTRACTS, FUNCTIONAL_AGENT_CONTRACTS } from "./contracts";
import { AgentRuntimeError } from "./errors";
import { AgentGuardrailService } from "./guardrails";
import { stableHash } from "./hashing";
import type { AgentRuntimeDependencies, CompleteAgentRunInput, InvokeAgentToolInput, StartAgentRunInput } from "./types";

const newId = (): string => crypto.randomUUID();
const now = (): string => new Date().toISOString();

export class AgentRuntimeService {
  private readonly guardrails = new AgentGuardrailService();

  constructor(private readonly deps: AgentRuntimeDependencies) {}

  async listAgents() {
    return FUNCTIONAL_AGENT_CONTRACTS;
  }

  async startRun(input: StartAgentRunInput) {
    const context = AgentRuntimeContextSchema.parse(input.context);
    this.guardrails.validateContext(context);

    const agent = FUNCTIONAL_AGENT_CONTRACTS.find((candidate) => candidate.agent_id === input.agent_id);
    if (!agent) throw new AgentRuntimeError("AGENT_NOT_FOUND", "Functional agent contract not found.", { agent_id: input.agent_id });

    const run = AgentRunResponseSchema.parse({
      agent_run_id: newId(),
      tenant_id: context.tenant_id,
      organization_id: context.organization_id,
      assessment_id: context.assessment_id,
      agent_id: input.agent_id,
      agent_version: input.agent_version,
      prompt_version: input.prompt_version,
      model: input.model,
      input_hash: await stableHash(input.input),
      status: "running",
      trace_id: context.trace_id,
      started_at: now(),
      metadata: {
        framework_id: context.framework_id,
        scf_version_id: context.scf_version_id,
        allowed_tools: agent.allowed_tools
      }
    });

    return this.deps.runs.create(run);
  }

  async getRun(agentRunId: string, tenantId: string) {
    const run = await this.deps.runs.get(agentRunId);
    if (!run || run.tenant_id !== tenantId) return null;
    return run;
  }

  async listRuns(assessmentId: string, tenantId: string) {
    return this.deps.runs.listByAssessment(assessmentId, tenantId);
  }

  async invokeTool(agentRunId: string, input: InvokeAgentToolInput) {
    const run = await this.deps.runs.get(agentRunId);
    if (!run) throw new AgentRuntimeError("AGENT_RUN_NOT_FOUND", "Agent run not found.", { agent_run_id: agentRunId });
    if (run.status !== "running") throw new AgentRuntimeError("AGENT_RUN_NOT_RUNNING", "Only running agent runs can invoke tools.");

    const context = AgentRuntimeContextSchema.parse(input.context);
    this.guardrails.validateContext(context);
    if (run.tenant_id !== context.tenant_id || run.assessment_id !== context.assessment_id) {
      throw new AgentRuntimeError("TENANT_CONTEXT_MISMATCH", "Agent run context does not match tool context.");
    }

    const agent = FUNCTIONAL_AGENT_CONTRACTS.find((candidate) => candidate.agent_id === run.agent_id);
    if (!agent?.allowed_tools.includes(input.tool_name)) {
      throw new AgentRuntimeError("TOOL_NOT_ALLOWED", "Tool is not allowed for this functional agent.", {
        agent_id: run.agent_id,
        tool_name: input.tool_name
      });
    }

    const contract = AGENT_TOOL_CONTRACTS.find((candidate) => candidate.tool_name === input.tool_name);
    if (!contract) throw new AgentRuntimeError("TOOL_CONTRACT_NOT_FOUND", "Tool contract not found.", { tool_name: input.tool_name });

    const parsed = contract.input_schema.safeParse(input.input);
    if (!parsed.success) {
      throw new AgentRuntimeError("TOOL_INPUT_INVALID", "Tool input failed schema validation.", { issues: parsed.error.issues });
    }
    this.guardrails.validateToolInputContext(input.input, context);

    return this.deps.toolCalls.create(AgentToolInvocationResponseSchema.parse({
      tool_call_id: newId(),
      agent_run_id: agentRunId,
      tenant_id: context.tenant_id,
      organization_id: context.organization_id,
      assessment_id: context.assessment_id,
      tool_name: input.tool_name,
      status: "allowed",
      trace_id: context.trace_id,
      created_at: now()
    }));
  }

  async completeRun(agentRunId: string, input: CompleteAgentRunInput) {
    const run = await this.deps.runs.get(agentRunId);
    if (!run) throw new AgentRuntimeError("AGENT_RUN_NOT_FOUND", "Agent run not found.", { agent_run_id: agentRunId });
    if (run.status !== "running") throw new AgentRuntimeError("AGENT_RUN_NOT_RUNNING", "Only running agent runs can complete.");

    const context = AgentRuntimeContextSchema.parse(input.context);
    if (run.tenant_id !== context.tenant_id || run.assessment_id !== context.assessment_id) {
      throw new AgentRuntimeError("TENANT_CONTEXT_MISMATCH", "Agent run context does not match completion context.");
    }

    const output = AgentOutputSchema.parse(input.output);
    this.guardrails.validateOutput(output);

    const completed = AgentRunResponseSchema.parse({
      ...run,
      output_hash: await stableHash(output),
      confidence_score: output.confidence_score,
      status: "completed",
      completed_at: now(),
      metadata: {
        ...run.metadata,
        assumptions: output.assumptions,
        limitations: output.limitations,
        sources: output.sources,
        schema_validated: true
      }
    });
    await this.deps.runs.save(completed);
    return completed;
  }

  async failRun(agentRunId: string, reason: string) {
    const run = await this.deps.runs.get(agentRunId);
    if (!run) throw new AgentRuntimeError("AGENT_RUN_NOT_FOUND", "Agent run not found.", { agent_run_id: agentRunId });
    const failed = AgentRunResponseSchema.parse({
      ...run,
      status: "failed",
      completed_at: now(),
      metadata: { ...run.metadata, safe_error_summary: reason }
    });
    await this.deps.runs.save(failed);
    return failed;
  }
}


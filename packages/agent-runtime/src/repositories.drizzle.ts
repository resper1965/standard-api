import type { AgentRunResponse, AgentToolInvocationResponse } from "@standard/schemas";
import { agentRuns, agentToolCalls } from "@standard/schemas";
import { sql } from "drizzle-orm";
import type { AgentRunRepository, AgentToolCallRepository, AgentRuntimeDependencies } from "./types";

type AnyDrizzleClient = any;

export const createDrizzleAgentRunRepository = (db: AnyDrizzleClient): AgentRunRepository => ({
  async create(input: AgentRunResponse) {
    await db.insert(agentRuns).values({
      id: input.agent_run_id,
      organizationId: input.organization_id,
      assessmentId: input.assessment_id,
      agentName: input.model ?? "unknown",
      agentVersion: input.agent_version || "1.0",
      promptVersion: input.prompt_version,
      inputHash: input.input_hash,
      outputHash: input.output_hash,
      status: input.status,
      traceId: input.trace_id,
      confidenceScore: input.confidence_score?.toString()
    });
    return input;
  },

  async get(agentRunId: string) {
    const records = await db.select().from(agentRuns).where(sql`${agentRuns.id} = ${agentRunId}`);
    const record = records[0];
    if (!record) return null;

    return {
      agent_run_id: record.id,
      organization_id: record.organizationId,
      assessment_id: record.assessmentId ?? "",
      agent_id: "knowledge_steward", // Mapping workaround
      agent_version: record.agentVersion,
      model: record.agentName,
      prompt_version: record.promptVersion,
      input_hash: record.inputHash,
      output_hash: record.outputHash ?? undefined,
      confidence_score: record.confidenceScore ? Number(record.confidenceScore) : undefined,
      status: record.status as never,
      trace_id: record.traceId,
      started_at: record.startedAt.toISOString(),
      completed_at: record.completedAt?.toISOString()
    } as unknown as AgentRunResponse;
  },

  async save(run: AgentRunResponse) {
    await db.update(agentRuns).set({
      outputHash: run.output_hash,
      confidenceScore: run.confidence_score?.toString(),
      status: run.status
    }).where(sql`${agentRuns.id} = ${run.agent_run_id}`);
  },

  async listByAssessment(assessmentId: string, organizationId: string) {
    const records = await db.select().from(agentRuns).where(sql`${agentRuns.assessmentId} = ${assessmentId} AND ${agentRuns.organizationId} = ${organizationId}`);
    return records.map((record: any) => ({
      agent_run_id: record.id,
      organization_id: record.organizationId,
      assessment_id: record.assessmentId ?? "",
      agent_id: "knowledge_steward", // Mapping workaround
      agent_version: record.agentVersion,
      model: record.agentName,
      prompt_version: record.promptVersion,
      input_hash: record.inputHash,
      output_hash: record.outputHash ?? undefined,
      confidence_score: record.confidenceScore ? Number(record.confidenceScore) : undefined,
      status: record.status as never,
      trace_id: record.traceId,
      started_at: record.startedAt.toISOString(),
      completed_at: record.completedAt?.toISOString()
    } as unknown as AgentRunResponse));
  }
});

export const createDrizzleAgentToolCallRepository = (db: AnyDrizzleClient): AgentToolCallRepository => ({
  async create(input: AgentToolInvocationResponse) {
    await db.insert(agentToolCalls).values({
      id: input.tool_call_id,
      organizationId: input.organization_id,
      assessmentId: input.assessment_id ?? "",
      agentRunId: input.agent_run_id,
      toolName: input.tool_name,
      riskLevel: "low",
      inputHash: "placeholder",
      status: input.status,
      traceId: input.trace_id
    });
    return input;
  },

  async listByRun(agentRunId: string, organizationId: string) {
    const records = await db.select().from(agentToolCalls).where(sql`${agentToolCalls.agentRunId} = ${agentRunId} AND ${agentToolCalls.organizationId} = ${organizationId}`);
    return records.map((record: any) => ({
      tool_call_id: record.id,
      agent_run_id: record.agentRunId,
      organization_id: record.organizationId,
      assessment_id: record.assessmentId ?? "",
      tool_name: record.toolName as never,
      status: record.status as never,
      trace_id: record.traceId,
      created_at: record.startedAt.toISOString()
    } as unknown as AgentToolInvocationResponse));
  }
});

export const createDrizzleAgentRuntimeDependencies = (db: AnyDrizzleClient): Omit<AgentRuntimeDependencies, "llm"> => ({
  runs: createDrizzleAgentRunRepository(db),
  toolCalls: createDrizzleAgentToolCallRepository(db)
});


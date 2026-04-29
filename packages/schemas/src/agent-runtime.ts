import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";

export const FunctionalAgentIdSchema = z.enum([
  "knowledge_steward",
  "scf_control_analyst",
  "framework_mapper",
  "scope_soa_architect",
  "evidence_analyst",
  "gap_analyst",
  "maturity_assessor",
  "poam_planner",
  "report_writer"
]);

export const AgentRunStatusSchema = z.enum(["queued", "running", "completed", "failed", "cancelled"]);
export const AgentToolRiskLevelSchema = z.enum(["low", "medium", "high"]);

export const AgentToolNameSchema = z.enum([
  "assessment_state_read",
  "artifact_version_read",
  "scf_control_lookup",
  "scf_mapping_lookup",
  "kb_evidence_search",
  "artifact_draft_create",
  "validation_result_write",
  "approval_event_create"
]);

export const AgentRuntimeContextSchema = z.object({
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  framework_id: UuidSchema,
  scf_version_id: UuidSchema,
  trace_id: TraceIdSchema,
  actor_id: UuidSchema.optional()
});

export const AgentOutputSchema = z.object({
  summary: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  limitations: z.array(z.string().min(1)).min(1),
  sources: z.array(z.string().min(1)).min(1),
  confidence_score: z.number().min(0).max(1),
  writes_final_finding: z.boolean().default(false),
  creates_official_mapping: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const AgentRunResponseSchema = z.object({
  agent_run_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  agent_id: FunctionalAgentIdSchema,
  agent_version: z.string().min(1),
  prompt_version: z.string().min(1),
  model: z.string().min(1),
  input_hash: z.string().startsWith("sha256:"),
  output_hash: z.string().startsWith("sha256:").optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  status: AgentRunStatusSchema,
  trace_id: TraceIdSchema,
  started_at: z.string(),
  completed_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const AgentToolInvocationResponseSchema = z.object({
  tool_call_id: UuidSchema,
  agent_run_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  tool_name: AgentToolNameSchema,
  status: z.enum(["allowed", "rejected"]),
  trace_id: TraceIdSchema,
  created_at: z.string()
});

export const StartAgentRunRequestSchema = z.object({
  agent_id: FunctionalAgentIdSchema,
  agent_version: z.string().min(1),
  prompt_version: z.string().min(1),
  model: z.string().min(1),
  framework_id: UuidSchema,
  scf_version_id: UuidSchema,
  input: z.record(z.string(), z.unknown()).default({})
});

export const CompleteAgentRunRequestSchema = z.object({
  output: AgentOutputSchema,
  usage: z.object({
    model_provider: z.string().min(1).default("unknown"),
    prompt_tokens: z.number().int().nonnegative().default(0),
    completion_tokens: z.number().int().nonnegative().default(0),
    embedding_tokens: z.number().int().nonnegative().default(0),
    estimated_cost: z.number().nonnegative().optional(),
    currency: z.string().min(3).max(3).default("USD")
  }).optional()
});

export const InvokeAgentToolRequestSchema = z.object({
  tool_name: AgentToolNameSchema,
  input: z.record(z.string(), z.unknown()).default({})
});

export type FunctionalAgentId = z.infer<typeof FunctionalAgentIdSchema>;
export type AgentToolName = z.infer<typeof AgentToolNameSchema>;
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;
export type AgentRuntimeContext = z.infer<typeof AgentRuntimeContextSchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
export type AgentRunResponse = z.infer<typeof AgentRunResponseSchema>;
export type AgentToolInvocationResponse = z.infer<typeof AgentToolInvocationResponseSchema>;
export type StartAgentRunRequest = z.infer<typeof StartAgentRunRequestSchema>;
export type CompleteAgentRunRequest = z.infer<typeof CompleteAgentRunRequestSchema>;
export type InvokeAgentToolRequest = z.infer<typeof InvokeAgentToolRequestSchema>;

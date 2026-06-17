import { z } from "zod";
import { SupportedLocaleSchema, TraceIdSchema, UuidSchema } from "./common";

export const FunctionalAgentIdSchema = z.enum([
  "knowledge_steward",
  "scf_control_analyst",
  "framework_mapper",
  "scope_soa_architect",
  "evidence_analyst",
  "gap_analyst",
  "maturity_assessor",
  "poam_planner",
  "report_writer",
  "council_orchestrator",
  // Integration-specific agent roles (M2M text analysis)
  "standard-consultative-analyst",
  "standard-strict-gap-analyst",
]);

export const AgentRunStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const AgentToolRiskLevelSchema = z.enum(["low", "medium", "high"]);

export const AgentToolNameSchema = z.enum([
  "assessment_state_read",
  "artifact_version_read",
  "scf_control_lookup",
  "scf_mapping_lookup",
  "kb_evidence_search",
  "artifact_draft_create",
  "validation_result_write",
  "approval_event_create",
]);

export const AgentRuntimeContextSchema = z.object({
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  framework_id: UuidSchema,
  scf_version_id: z.union([UuidSchema, z.literal("latest")]),
  trace_id: TraceIdSchema,
  actor_id: UuidSchema.optional(),
  locale: SupportedLocaleSchema.optional(),
});

export const AIProvenanceSchema = z.object({
  model: z.string().min(1).describe("LLM model used (e.g. gpt-4o)"),
  provider: z
    .string()
    .min(1)
    .describe("Provider path (e.g. cloudflare-ai-gateway, mock)"),
  is_inference: z
    .boolean()
    .describe("True if output is LLM-inferred, false if evidence-backed"),
  evidence_backed: z
    .boolean()
    .describe("True if output is directly supported by KB evidence"),
  token_usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative(),
      completion_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
    })
    .optional(),
  latency_ms: z.number().int().nonnegative().optional(),
  cache_status: z.enum(["HIT", "MISS", "BYPASS", "UNKNOWN"]).optional(),
});

export const AgentOutputSchema = z.object({
  summary: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  limitations: z.array(z.string().min(1)).min(1),
  sources: z.array(z.string().min(1)).min(1),
  confidence_score: z.number().min(0).max(1),
  writes_final_finding: z.boolean().default(false),
  creates_official_mapping: z.boolean().default(false),
  provenance: AIProvenanceSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const AgentRunResponseSchema = z.object({
  agent_run_id: UuidSchema,
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
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const AgentToolInvocationResponseSchema = z.object({
  tool_call_id: UuidSchema,
  agent_run_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  tool_name: AgentToolNameSchema,
  status: z.enum(["allowed", "rejected"]),
  trace_id: TraceIdSchema,
  created_at: z.string(),
});

export const StartAgentRunRequestSchema = z.strictObject({
  agent_id: FunctionalAgentIdSchema,
  agent_version: z.string().min(1),
  prompt_version: z.string().min(1),
  model: z.string().min(1),
  framework_id: UuidSchema,
  scf_version_id: z.union([UuidSchema, z.literal("latest")]),
  input: z.record(z.string(), z.unknown()).default({}),
});

export const CompleteAgentRunRequestSchema = z.strictObject({
  output: AgentOutputSchema,
  usage: z
    .object({
      model_provider: z.string().min(1).default("unknown"),
      prompt_tokens: z.number().int().nonnegative().default(0),
      completion_tokens: z.number().int().nonnegative().default(0),
      embedding_tokens: z.number().int().nonnegative().default(0),
      estimated_cost: z.number().nonnegative().optional(),
      currency: z.string().min(3).max(3).default("USD"),
    })
    .optional(),
});

export const InvokeAgentToolRequestSchema = z.strictObject({
  tool_name: AgentToolNameSchema,
  input: z.record(z.string(), z.unknown()).default({}),
});

export type FunctionalAgentId = z.infer<typeof FunctionalAgentIdSchema>;
export type AgentToolName = z.infer<typeof AgentToolNameSchema>;
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;
export type AgentRuntimeContext = z.infer<typeof AgentRuntimeContextSchema>;
export type AIProvenance = z.infer<typeof AIProvenanceSchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
export type AgentRunResponse = z.infer<typeof AgentRunResponseSchema>;
export type AgentToolInvocationResponse = z.infer<
  typeof AgentToolInvocationResponseSchema
>;
export type StartAgentRunRequest = z.infer<typeof StartAgentRunRequestSchema>;
export type CompleteAgentRunRequest = z.infer<
  typeof CompleteAgentRunRequestSchema
>;
export type InvokeAgentToolRequest = z.infer<
  typeof InvokeAgentToolRequestSchema
>;


import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";

export const PoamVersionStatusSchema = z.enum(["draft", "under_review", "approved", "superseded", "archived"]);
export const PoamItemStatusSchema = z.enum(["draft", "approved", "in_progress", "blocked", "completed", "cancelled", "deferred"]);
export const PoamActionTypeSchema = z.enum([
  "policy_update",
  "procedure_creation",
  "technical_implementation",
  "evidence_collection",
  "governance_improvement",
  "monitoring_improvement",
  "training",
  "third_party_action",
  "risk_acceptance",
  "validation_required",
  "other"
]);
export const PoamPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const PoamSeveritySchema = z.enum(["informational", "low", "medium", "high", "critical"]);
export const PoamEffortEstimateSchema = z.enum(["small", "medium", "large", "extra_large", "unknown"]);
export const PoamDependencyTypeSchema = z.enum(["blocks", "related_to", "prerequisite", "duplicates", "depends_on_external_party"]);
export const PoamMilestoneStatusSchema = z.enum(["draft", "approved", "in_progress", "blocked", "completed", "cancelled", "deferred"]);

export const CreatePoamDraftRequestSchema = z.object({
  gap_analysis_version_id: UuidSchema,
  maturity_assessment_version_id: UuidSchema.optional(),
  include_optional_improvements: z.boolean().default(false)
});

export const RegeneratePoamRequestSchema = z.object({
  reason: z.string().min(1).optional(),
  include_optional_improvements: z.boolean().default(false)
});

export const PoamVersionResponseSchema = z.object({
  poam_version_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  version_number: z.number().int().positive(),
  status: PoamVersionStatusSchema,
  source_gap_analysis_version_id: UuidSchema,
  source_maturity_assessment_version_id: UuidSchema.optional(),
  framework_id: UuidSchema,
  scf_version_id: UuidSchema,
  generated_by_agent_run_id: UuidSchema.optional(),
  created_by: UuidSchema,
  created_at: z.string(),
  submitted_for_review_at: z.string().optional(),
  approved_by: UuidSchema.optional(),
  approved_at: z.string().optional(),
  approval_event_id: UuidSchema.optional(),
  superseded_by: UuidSchema.optional(),
  trace_id: TraceIdSchema,
  metadata: z.object({
    limitations: z.array(z.string()).default([]),
    assumptions: z.array(z.string()).default([]),
    source_status: z.string().optional()
  }).catchall(z.unknown()).default({ limitations: [], assumptions: [] })
});

export const PoamItemResponseSchema = z.object({
  poam_item_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  poam_version_id: UuidSchema,
  related_gap_finding_id: UuidSchema.optional(),
  source_maturity_score_id: UuidSchema.optional(),
  soa_item_id: UuidSchema.optional(),
  framework_id: UuidSchema,
  framework_requirement_id: UuidSchema.optional(),
  scf_version_id: UuidSchema,
  scf_domain_id: UuidSchema.optional(),
  scf_control_id: UuidSchema.optional(),
  poam_code: z.string(),
  corrective_action: z.string(),
  action_type: PoamActionTypeSchema,
  priority: PoamPrioritySchema,
  severity: PoamSeveritySchema,
  risk_rating: z.string(),
  effort_estimate: PoamEffortEstimateSchema,
  suggested_owner: z.string().optional(),
  owner_role: z.string().optional(),
  due_date: z.string().optional(),
  target_maturity_score: z.number().int().min(0).max(5).optional(),
  expected_evidence: z.array(z.string()).default([]),
  acceptance_criteria: z.array(z.string()).default([]),
  dependencies_summary: z.string().optional(),
  status: PoamItemStatusSchema,
  rationale: z.string(),
  confidence_score: z.number().min(0).max(1),
  requires_user_validation: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export const UpdatePoamItemRequestSchema = z.object({
  corrective_action: z.string().optional(),
  action_type: PoamActionTypeSchema.optional(),
  priority: PoamPrioritySchema.optional(),
  severity: PoamSeveritySchema.optional(),
  risk_rating: z.string().optional(),
  effort_estimate: PoamEffortEstimateSchema.optional(),
  suggested_owner: z.string().optional(),
  owner_role: z.string().optional(),
  due_date: z.string().optional(),
  target_maturity_score: z.number().int().min(0).max(5).optional(),
  expected_evidence: z.array(z.string()).optional(),
  acceptance_criteria: z.array(z.string()).optional(),
  dependencies_summary: z.string().optional(),
  status: PoamItemStatusSchema.optional(),
  rationale: z.string().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  requires_user_validation: z.boolean().optional()
});

export const PoamMilestoneResponseSchema = z.object({
  poam_milestone_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  poam_item_id: UuidSchema,
  milestone_code: z.string(),
  title: z.string(),
  description: z.string(),
  due_date: z.string().optional(),
  status: PoamMilestoneStatusSchema,
  acceptance_criteria: z.array(z.string()).default([]),
  expected_evidence: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string()
});

export const CreatePoamMilestoneRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  due_date: z.string().optional(),
  acceptance_criteria: z.array(z.string()).default([]),
  expected_evidence: z.array(z.string()).default([])
});

export const UpdatePoamMilestoneRequestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  due_date: z.string().optional(),
  status: PoamMilestoneStatusSchema.optional(),
  acceptance_criteria: z.array(z.string()).optional(),
  expected_evidence: z.array(z.string()).optional()
});

export const PoamDependencyResponseSchema = z.object({
  poam_dependency_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  poam_item_id: UuidSchema,
  depends_on_poam_item_id: UuidSchema.optional(),
  dependency_type: PoamDependencyTypeSchema,
  description: z.string(),
  created_at: z.string()
});

export const PoamValidationResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  items_requiring_validation: z.array(UuidSchema),
  trace_id: TraceIdSchema
});

export const PoamSummaryResponseSchema = z.object({
  assessment_id: UuidSchema,
  poam_version_id: UuidSchema,
  total_items: z.number().int(),
  by_priority: z.record(z.string(), z.number()),
  by_status: z.record(z.string(), z.number()),
  by_action_type: z.record(z.string(), z.number()),
  trace_id: TraceIdSchema
});

export const SubmitPoamReviewRequestSchema = z.object({
  exception_rationale: z.string().optional()
});

export const ApprovePoamRequestSchema = z.object({
  approval_event_id: UuidSchema
});

export type PoamVersionStatus = z.infer<typeof PoamVersionStatusSchema>;
export type PoamItemStatus = z.infer<typeof PoamItemStatusSchema>;
export type PoamActionType = z.infer<typeof PoamActionTypeSchema>;
export type PoamPriority = z.infer<typeof PoamPrioritySchema>;
export type PoamSeverity = z.infer<typeof PoamSeveritySchema>;
export type PoamEffortEstimate = z.infer<typeof PoamEffortEstimateSchema>;
export type PoamDependencyType = z.infer<typeof PoamDependencyTypeSchema>;
export type PoamMilestoneStatus = z.infer<typeof PoamMilestoneStatusSchema>;
export type CreatePoamDraftRequest = z.infer<typeof CreatePoamDraftRequestSchema>;
export type RegeneratePoamRequest = z.infer<typeof RegeneratePoamRequestSchema>;
export type PoamVersionResponse = z.infer<typeof PoamVersionResponseSchema>;
export type PoamItemResponse = z.infer<typeof PoamItemResponseSchema>;
export type UpdatePoamItemRequest = z.infer<typeof UpdatePoamItemRequestSchema>;
export type PoamMilestoneResponse = z.infer<typeof PoamMilestoneResponseSchema>;
export type CreatePoamMilestoneRequest = z.infer<typeof CreatePoamMilestoneRequestSchema>;
export type UpdatePoamMilestoneRequest = z.infer<typeof UpdatePoamMilestoneRequestSchema>;
export type PoamDependencyResponse = z.infer<typeof PoamDependencyResponseSchema>;
export type PoamValidationResponse = z.infer<typeof PoamValidationResponseSchema>;
export type PoamSummaryResponse = z.infer<typeof PoamSummaryResponseSchema>;
export type SubmitPoamReviewRequest = z.infer<typeof SubmitPoamReviewRequestSchema>;
export type ApprovePoamRequest = z.infer<typeof ApprovePoamRequestSchema>;

import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";

export const ScopeStatusSchema = z.enum(["draft", "under_review", "approved", "superseded", "archived"]);
export const SoaVersionStatusSchema = z.enum(["draft", "under_review", "approved", "superseded", "archived"]);
export const SoaItemApplicabilityStatusSchema = z.enum(["applicable", "partially_applicable", "not_applicable", "to_be_defined", "requires_validation", "out_of_scope"]);
export const SoaItemImplementationStatusSchema = z.enum(["implemented", "partially_implemented", "not_implemented", "not_evidenced", "not_assessed", "not_applicable"]);
export const EvidenceCoverageStatusSchema = z.enum(["strong", "partial", "weak", "absent", "conflicting", "not_checked"]);
export const SoaMappingStatusSchema = z.enum(["official_mapping", "no_official_mapping"]);

export const CreateScopeRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  business_units: z.array(z.string()).default([]),
  processes: z.array(z.string()).default([]),
  systems: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  legal_entities: z.array(z.string()).default([]),
  data_types: z.array(z.string()).default([]),
  third_parties: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([])
});

export const UpdateScopeRequestSchema = CreateScopeRequestSchema.partial();

export const ScopeResponseSchema = CreateScopeRequestSchema.extend({
  scope_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  scope_version: z.number().int().positive(),
  status: ScopeStatusSchema,
  created_by: UuidSchema,
  approval_event_id: UuidSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
  trace_id: TraceIdSchema
});

export const CreateSoaDraftRequestSchema = z.object({
  framework_id: UuidSchema,
  scf_version_id: UuidSchema,
  source_scope_id: UuidSchema.optional()
});

export const SoaVersionResponseSchema = z.object({
  soa_version_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  version_number: z.number().int().positive(),
  status: SoaVersionStatusSchema,
  source_framework_id: UuidSchema,
  scf_version_id: UuidSchema,
  source_scope_id: UuidSchema.optional(),
  generated_by_agent_run_id: UuidSchema.optional(),
  created_by: UuidSchema,
  created_at: z.string(),
  submitted_for_review_at: z.string().optional(),
  approved_by: UuidSchema.optional(),
  approved_at: z.string().optional(),
  approval_event_id: UuidSchema.optional(),
  superseded_by: UuidSchema.optional(),
  trace_id: TraceIdSchema,
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const SoaItemResponseSchema = z.object({
  soa_item_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  soa_version_id: UuidSchema,
  framework_id: UuidSchema,
  framework_requirement_id: UuidSchema,
  scf_version_id: UuidSchema,
  scf_control_id: UuidSchema.optional(),
  applicability_status: SoaItemApplicabilityStatusSchema,
  implementation_status: SoaItemImplementationStatusSchema,
  applicability_rationale: z.string().optional(),
  non_applicability_rationale: z.string().optional(),
  scope_rationale: z.string().optional(),
  evidence_summary: z.string().optional(),
  evidence_coverage: EvidenceCoverageStatusSchema,
  confidence_score: z.number().min(0).max(1),
  requires_user_validation: z.boolean(),
  validation_notes: z.string().optional(),
  source_mapping_id: UuidSchema.optional(),
  mapping_status: SoaMappingStatusSchema,
  relationship_type: z.string().optional(),
  relationship_strength: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export const UpdateSoaItemRequestSchema = z.object({
  applicability_status: SoaItemApplicabilityStatusSchema.optional(),
  implementation_status: SoaItemImplementationStatusSchema.optional(),
  applicability_rationale: z.string().optional(),
  non_applicability_rationale: z.string().optional(),
  scope_rationale: z.string().optional(),
  evidence_summary: z.string().optional(),
  evidence_coverage: EvidenceCoverageStatusSchema.optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  requires_user_validation: z.boolean().optional(),
  validation_notes: z.string().optional()
});

export const BulkUpdateSoaItemsRequestSchema = z.object({
  items: z.array(z.object({ soa_item_id: UuidSchema, patch: UpdateSoaItemRequestSchema })).min(1)
});

export const SubmitSoaReviewRequestSchema = z.object({
  exception_rationale: z.string().optional()
});

export const ApproveSoaRequestSchema = z.object({
  approval_event_id: UuidSchema
});

export const RefreshSoaEvidenceRequestSchema = z.object({
  top_k: z.number().int().min(1).max(10).default(3)
});

export const SoaEvidenceCandidateResponseSchema = z.object({
  soa_item_id: UuidSchema,
  candidate_evidence: z.literal(true),
  evidence_summary: z.string(),
  evidence_coverage: EvidenceCoverageStatusSchema,
  trace_id: TraceIdSchema
});

export const SoaValidationResponseSchema = z.object({
  valid: z.boolean(),
  blocking_errors: z.array(z.string()),
  warnings: z.array(z.string()),
  trace_id: TraceIdSchema
});

export type ScopeStatus = z.infer<typeof ScopeStatusSchema>;
export type SoaVersionStatus = z.infer<typeof SoaVersionStatusSchema>;
export type SoaItemApplicabilityStatus = z.infer<typeof SoaItemApplicabilityStatusSchema>;
export type SoaItemImplementationStatus = z.infer<typeof SoaItemImplementationStatusSchema>;
export type EvidenceCoverageStatus = z.infer<typeof EvidenceCoverageStatusSchema>;
export type SoaMappingStatus = z.infer<typeof SoaMappingStatusSchema>;
export type CreateScopeRequest = z.input<typeof CreateScopeRequestSchema>;
export type UpdateScopeRequest = z.input<typeof UpdateScopeRequestSchema>;
export type ScopeResponse = z.infer<typeof ScopeResponseSchema>;
export type CreateSoaDraftRequest = z.infer<typeof CreateSoaDraftRequestSchema>;
export type SoaVersionResponse = z.infer<typeof SoaVersionResponseSchema>;
export type SoaItemResponse = z.infer<typeof SoaItemResponseSchema>;
export type UpdateSoaItemRequest = z.infer<typeof UpdateSoaItemRequestSchema>;
export type BulkUpdateSoaItemsRequest = z.infer<typeof BulkUpdateSoaItemsRequestSchema>;
export type SubmitSoaReviewRequest = z.infer<typeof SubmitSoaReviewRequestSchema>;
export type ApproveSoaRequest = z.infer<typeof ApproveSoaRequestSchema>;
export type RefreshSoaEvidenceRequest = z.infer<typeof RefreshSoaEvidenceRequestSchema>;
export type SoaEvidenceCandidateResponse = z.infer<typeof SoaEvidenceCandidateResponseSchema>;
export type SoaValidationResponse = z.infer<typeof SoaValidationResponseSchema>;

import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";
import { ResponsibilityTypeSchema } from "./soa";

export const GapEvidenceStrengthSchema = z.enum(["strong", "partial", "weak", "absent", "conflicting", "not_checked"]);
export const EvidenceStatusSchema = z.enum(["candidate", "accepted", "rejected", "insufficient", "conflicting", "not_evidenced"]);
export const GapAnalysisVersionStatusSchema = z.enum(["draft", "under_review", "approved", "superseded", "archived"]);
export const AssessmentStatusSchema = z.enum(["met", "partially_met", "not_met", "not_evidenced", "not_applicable_justified", "not_applicable_not_justified", "requires_validation"]);
export const GapFindingTypeSchema = z.enum(["documentation_gap", "implementation_gap", "evidence_gap", "effectiveness_gap", "governance_gap", "technical_gap", "contractual_gap", "monitoring_gap", "no_gap", "not_applicable"]);
export const GapSeveritySchema = z.enum(["informational", "low", "medium", "high", "critical"]);

export const EvidenceFindingResponseSchema = z.object({
  evidence_finding_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  soa_version_id: UuidSchema,
  soa_item_id: UuidSchema,
  framework_id: UuidSchema,
  framework_requirement_id: UuidSchema,
  scf_version_id: UuidSchema,
  scf_control_id: UuidSchema.optional(),
  evidence_strength: GapEvidenceStrengthSchema,
  evidence_status: EvidenceStatusSchema,
  evidence_summary: z.string(),
  evidence_limitations: z.array(z.string()).default([]),
  confidence_score: z.number().min(0).max(1),
  generated_by_agent_run_id: UuidSchema.optional(),
  trace_id: TraceIdSchema,
  created_at: z.string(),
  updated_at: z.string()
});

export const EvidenceSourceResponseSchema = z.object({
  evidence_source_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  evidence_finding_id: UuidSchema,
  document_id: UuidSchema,
  chunk_id: UuidSchema,
  vector_reference_id: UuidSchema.optional(),
  source_type: z.string(),
  source_title: z.string().optional(),
  source_location: z.string().optional(),
  snippet: z.string().max(500),
  retrieval_score: z.number().min(0),
  retrieval_method: z.string(),
  candidate_evidence: z.boolean(),
  created_at: z.string()
});

export const RunEvidenceAnalysisRequestSchema = z.strictObject({
  soa_version_id: UuidSchema
});

export const RunEvidenceAnalysisResponseSchema = z.object({
  assessment_id: UuidSchema,
  soa_version_id: UuidSchema,
  findings: z.array(EvidenceFindingResponseSchema),
  trace_id: TraceIdSchema
});

export const RefreshEvidenceFindingRequestSchema = z.strictObject({
  top_k: z.number().int().min(1).max(10).default(5)
});

export const GapAnalysisVersionResponseSchema = z.object({
  gap_analysis_version_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  version_number: z.number().int().positive(),
  status: GapAnalysisVersionStatusSchema,
  source_soa_version_id: UuidSchema,
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
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const GapFindingResponseSchema = z.object({
  gap_finding_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  gap_analysis_version_id: UuidSchema,
  soa_version_id: UuidSchema,
  soa_item_id: UuidSchema,
  framework_id: UuidSchema,
  framework_requirement_id: UuidSchema,
  scf_version_id: UuidSchema,
  scf_control_id: UuidSchema.optional(),
  evidence_finding_id: UuidSchema.optional(),
  gap_code: z.string(),
  assessment_status: AssessmentStatusSchema,
  gap_type: GapFindingTypeSchema,
  severity: GapSeveritySchema,
  impact: z.string().optional(),
  likelihood: z.string().optional(),
  gap_summary: z.string(),
  gap_rationale: z.string().optional(),
  recommendation_summary: z.string().optional(),
  confidence_score: z.number().min(0).max(1),
  requires_user_validation: z.boolean(),
  responsibility_type: ResponsibilityTypeSchema,
  created_at: z.string(),
  updated_at: z.string()
});

export const CreateGapAnalysisDraftRequestSchema = z.strictObject({
  soa_version_id: UuidSchema
});

export const UpdateGapFindingRequestSchema = z.strictObject({
  assessment_status: AssessmentStatusSchema.optional(),
  gap_type: GapFindingTypeSchema.optional(),
  severity: GapSeveritySchema.optional(),
  impact: z.string().optional(),
  likelihood: z.string().optional(),
  gap_summary: z.string().optional(),
  gap_rationale: z.string().optional(),
  recommendation_summary: z.string().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  requires_user_validation: z.boolean().optional(),
  responsibility_type: ResponsibilityTypeSchema.optional()
});

export const GapAnalysisValidationResponseSchema = z.object({
  valid: z.boolean(),
  blocking_errors: z.array(z.string()),
  warnings: z.array(z.string()),
  trace_id: TraceIdSchema
});

export const SubmitGapAnalysisReviewRequestSchema = z.strictObject({
  exception_rationale: z.string().optional()
});

export const ApproveGapAnalysisRequestSchema = z.strictObject({
  approval_event_id: UuidSchema
});

export const GapSummaryResponseSchema = z.object({
  assessment_id: UuidSchema,
  gap_analysis_version_id: UuidSchema,
  total_findings: z.number().int(),
  by_status: z.record(z.string(), z.number()),
  trace_id: TraceIdSchema
});

export type EvidenceStrength = z.infer<typeof GapEvidenceStrengthSchema>;
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;
export type GapAnalysisVersionStatus = z.infer<typeof GapAnalysisVersionStatusSchema>;
export type AssessmentStatus = z.infer<typeof AssessmentStatusSchema>;
export type GapType = z.infer<typeof GapFindingTypeSchema>;
export type GapSeverity = z.infer<typeof GapSeveritySchema>;
export type EvidenceFindingResponse = z.infer<typeof EvidenceFindingResponseSchema>;
export type EvidenceSourceResponse = z.infer<typeof EvidenceSourceResponseSchema>;
export type RunEvidenceAnalysisRequest = z.infer<typeof RunEvidenceAnalysisRequestSchema>;
export type RunEvidenceAnalysisResponse = z.infer<typeof RunEvidenceAnalysisResponseSchema>;
export type RefreshEvidenceFindingRequest = z.infer<typeof RefreshEvidenceFindingRequestSchema>;
export type GapAnalysisVersionResponse = z.infer<typeof GapAnalysisVersionResponseSchema>;
export type GapFindingResponse = z.infer<typeof GapFindingResponseSchema>;
export type CreateGapAnalysisDraftRequest = z.infer<typeof CreateGapAnalysisDraftRequestSchema>;
export type UpdateGapFindingRequest = z.infer<typeof UpdateGapFindingRequestSchema>;
export type GapAnalysisValidationResponse = z.infer<typeof GapAnalysisValidationResponseSchema>;
export type SubmitGapAnalysisReviewRequest = z.infer<typeof SubmitGapAnalysisReviewRequestSchema>;
export type ApproveGapAnalysisRequest = z.infer<typeof ApproveGapAnalysisRequestSchema>;
export type GapSummaryResponse = z.infer<typeof GapSummaryResponseSchema>;

// ─── Compliance Gate (CI/CD Pipeline Integration) ───────────────────

export const ComplianceGateStatusSchema = z.enum(["pass", "fail", "pending", "no_data"]);

export const ComplianceGateResponseSchema = z.object({
  gate_id: UuidSchema,
  assessment_id: UuidSchema,
  framework_id: UuidSchema.optional(),
  status: ComplianceGateStatusSchema,
  critical_findings: z.number().int().nonnegative(),
  high_findings: z.number().int().nonnegative(),
  total_findings: z.number().int().nonnegative(),
  gap_analysis_version_id: UuidSchema.optional(),
  findings_summary: z.string(),
  checked_at: z.string(),
  trace_id: TraceIdSchema
});

export type ComplianceGateStatus = z.infer<typeof ComplianceGateStatusSchema>;
export type ComplianceGateResponse = z.infer<typeof ComplianceGateResponseSchema>;


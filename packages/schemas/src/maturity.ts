import { z } from "zod";
import { TraceIdSchema, UuidSchema } from "./common";

// â”€â”€â”€ Maturity Assessment Version â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const MaturityVersionStatusSchema = z.enum([
  "draft",
  "under_review",
  "approved",
  "superseded",
  "archived",
]);

export const MaturityAssessmentVersionResponseSchema = z.object({
  maturity_assessment_version_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  version_number: z.number().int().positive(),
  status: MaturityVersionStatusSchema,
  source_gap_analysis_version_id: UuidSchema,
  framework_id: UuidSchema.optional(),
  scf_version_id: UuidSchema.optional(),
  created_by_agent_run_id: UuidSchema.optional(),
  created_by: UuidSchema.optional(),
  created_at: z.string(),
  submitted_for_review_at: z.string().optional(),
  approved_by: UuidSchema.optional(),
  approved_at: z.string().optional(),
  approval_event_id: UuidSchema.optional(),
  superseded_by: UuidSchema.optional(),
  trace_id: TraceIdSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
});

// â”€â”€â”€ Maturity Score (per SCF Control) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const MaturityScoreLevelSchema = z.number().int().min(0).max(5);

export const MaturityScoreResponseSchema = z.object({
  maturity_score_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  maturity_assessment_version_id: UuidSchema,
  scf_control_id: UuidSchema,
  score: MaturityScoreLevelSchema,
  confidence_score: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidence_coverage: z.number().min(0).max(1),
  evidence_finding_id: UuidSchema.optional(),
  gap_finding_id: UuidSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// â”€â”€â”€ Request Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CreateMaturityDraftRequestSchema = z.strictObject({
  gap_analysis_version_id: UuidSchema,
});

export const UpdateMaturityScoreRequestSchema = z.strictObject({
  score: MaturityScoreLevelSchema.optional(),
  rationale: z.string().min(1).optional(),
  evidence_coverage: z.number().min(0).max(1).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

export const SubmitMaturityReviewRequestSchema = z.strictObject({
  exception_rationale: z.string().optional(),
});

export const ApproveMaturityRequestSchema = z.strictObject({
  approval_event_id: UuidSchema,
  exception_rationale: z.string().optional(),
});

// â”€â”€â”€ Validation Response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const MaturityValidationResponseSchema = z.object({
  valid: z.boolean(),
  blocking_errors: z.array(z.string()),
  warnings: z.array(z.string()),
  trace_id: TraceIdSchema,
});

// â”€â”€â”€ Summary Response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const MaturitySummaryResponseSchema = z.object({
  assessment_id: UuidSchema,
  maturity_assessment_version_id: UuidSchema,
  total_controls_scored: z.number().int().nonnegative(),
  average_score: z.number().min(0).max(5),
  score_distribution: z.record(z.string(), z.number()),
  lowest_scoring_controls: z
    .array(
      z.object({
        scf_control_id: UuidSchema,
        score: MaturityScoreLevelSchema,
        rationale: z.string(),
      }),
    )
    .default([]),
  trace_id: TraceIdSchema,
});

// â”€â”€â”€ Type Exports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MaturityVersionStatus = z.infer<typeof MaturityVersionStatusSchema>;
export type MaturityAssessmentVersionResponse = z.infer<
  typeof MaturityAssessmentVersionResponseSchema
>;
export type MaturityScoreResponse = z.infer<typeof MaturityScoreResponseSchema>;
export type CreateMaturityDraftRequest = z.infer<
  typeof CreateMaturityDraftRequestSchema
>;
export type UpdateMaturityScoreRequest = z.infer<
  typeof UpdateMaturityScoreRequestSchema
>;
export type SubmitMaturityReviewRequest = z.infer<
  typeof SubmitMaturityReviewRequestSchema
>;
export type ApproveMaturityRequest = z.infer<
  typeof ApproveMaturityRequestSchema
>;
export type MaturityValidationResponse = z.infer<
  typeof MaturityValidationResponseSchema
>;
export type MaturitySummaryResponse = z.infer<
  typeof MaturitySummaryResponseSchema
>;

export const UpdateMaturityTargetsRequestSchema = z.record(
  z.string(),
  z.number().int().min(0).max(5),
);
export type UpdateMaturityTargetsRequest = z.infer<
  typeof UpdateMaturityTargetsRequestSchema
>;

import { z } from "zod";
import { UuidSchema } from "./common";

export const MadTransactionTypeSchema = z.enum([
  "acquisition",
  "merger",
  "divestiture",
  "joint_venture",
  "spin_off",
]);

export const MadPhaseSchema = z.enum([
  "pre_transaction",
  "transaction_assessment",
  "data_privacy_evaluation",
  "third_party_risk",
  "integration_planning",
  "inherited_risk",
  "contractual_controls",
  "post_transaction_monitoring",
]);

export const MadStandardSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  standard_number: z.number().int().min(1).max(8),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  phase: MadPhaseSchema,
  sort_order: z.number().int(),
  is_synthetic: z.boolean(),
});

export const MadSubRequirementSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  mad_standard_id: UuidSchema,
  requirement_code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int(),
  is_synthetic: z.boolean(),
});

export const MadSubRequirementWithDetailsSchema = MadSubRequirementSchema.extend({
  scf_control_codes: z.array(z.string()),
  maturity_criteria: z.array(z.object({
    level: z.number().int().min(0).max(5),
    criteria_text: z.string(),
    remediation_guidance: z.string().nullable().optional(),
  })),
});

export const MadMaturityCriteriaSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  mad_sub_requirement_id: UuidSchema,
  level: z.number().int().min(0).max(5),
  criteria_text: z.string().min(1),
  remediation_guidance: z.string().nullable().optional(),
  is_synthetic: z.boolean(),
});

export const MadTransactionAssessmentSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema.nullable().optional(),
  transaction_name: z.string().min(1),
  transaction_type: MadTransactionTypeSchema,
  target_entity_name: z.string().nullable().optional(),
  transaction_date: z.string().nullable().optional(),
  status: z.string(),
  scf_version_id: UuidSchema.nullable().optional(),
  created_by: UuidSchema.nullable().optional(),
});

export const CreateMadTransactionAssessmentSchema = z.object({
  transaction_name: z.string().min(1).max(500),
  transaction_type: MadTransactionTypeSchema,
  target_entity_name: z.string().max(500).optional(),
  transaction_date: z.string().optional(),
  assessment_id: UuidSchema.optional(),
  scf_version_id: UuidSchema.optional(),
});

export const MadMaturityScoreSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  mad_transaction_assessment_id: UuidSchema,
  mad_sub_requirement_id: UuidSchema,
  score: z.number().int().min(0).max(5),
  rationale: z.string().nullable().optional(),
  assessed_by: UuidSchema.nullable().optional(),
  assessed_at: z.string().nullable().optional(),
});

export const UpsertMadMaturityScoreSchema = z.object({
  score: z.number().int().min(0).max(5),
  rationale: z.string().max(5000).optional(),
});

export const MadPerStandardSummarySchema = z.object({
  standard_code: z.string(),
  standard_title: z.string(),
  phase: MadPhaseSchema,
  average_score: z.number(),
  sub_requirement_count: z.number().int(),
  scored_count: z.number().int(),
});

export const MadMaturitySummarySchema = z.object({
  transaction_assessment_id: UuidSchema,
  per_standard: z.array(MadPerStandardSummarySchema),
  overall_average: z.number(),
  coverage_pct: z.number(),
});

export type MadTransactionType = z.infer<typeof MadTransactionTypeSchema>;
export type MadPhase = z.infer<typeof MadPhaseSchema>;
export type MadStandard = z.infer<typeof MadStandardSchema>;
export type MadSubRequirement = z.infer<typeof MadSubRequirementSchema>;
export type MadSubRequirementWithDetails = z.infer<typeof MadSubRequirementWithDetailsSchema>;
export type MadMaturityCriteria = z.infer<typeof MadMaturityCriteriaSchema>;
export type MadTransactionAssessment = z.infer<typeof MadTransactionAssessmentSchema>;
export type CreateMadTransactionAssessment = z.infer<typeof CreateMadTransactionAssessmentSchema>;
export type MadMaturityScore = z.infer<typeof MadMaturityScoreSchema>;
export type UpsertMadMaturityScore = z.infer<typeof UpsertMadMaturityScoreSchema>;
export type MadMaturitySummary = z.infer<typeof MadMaturitySummarySchema>;

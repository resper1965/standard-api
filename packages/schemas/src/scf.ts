// @ts-nocheck -- Zod v4 CI type compat
import { z } from "zod";
import { UuidSchema } from "./common";

export const ScfImportStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "partial",
  "rolled_back",
]);
export const ScfRecordStatusSchema = z.enum([
  "active",
  "deprecated",
  "draft",
  "archived",
]);
export const ScfSourceTypeSchema = z.enum([
  "xlsx",
  "csv",
  "oscal_json",
  "synthetic_fixture",
]);
// â”€â”€ STRM Canonical Operators â€” ADR-001 (NIST IR 8477) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â›” NEVER add "direct", "related", "intersecting", "no_relationship", "source_defined"
// These 5 values MUST match the pgEnum "strm_operator" in packages/schemas/src/db/schema.ts
export const StrmOperatorSchema = z.enum([
  "equal", // = (1.0 weight) â€” full compliance coverage
  "subset", // âŠ‚ (1.0 weight) â€” SCF broader than requirement
  "intersects", // âˆ© (dynamic strength_score) â€” partial overlap
  "superset", // âŠƒ (max 0.5 weight) â€” SCF narrower than requirement
  "no_relation", // Ã˜ (0.0 weight) â€” not counted in denominator
]);
export type StrmOperator = z.infer<typeof StrmOperatorSchema>;

/** Numeric strength score 0.000â€“1.000 used for "intersects" operator weight (ADR-001). */
export const StrengthScoreSchema = z.number().min(0).max(1).nullable();
export type StrengthScore = z.infer<typeof StrengthScoreSchema>;

/**
 * @deprecated Use StrmOperatorSchema instead.
 * Kept for backward compatibility during migration of existing callsites.
 * Will be removed after all usages are updated.
 */
export const ScfRelationshipTypeSchema = StrmOperatorSchema;

export const ScfImportStatisticsSchema = z.object({
  versions: z.number().int().nonnegative().default(0),
  domains: z.number().int().nonnegative().default(0),
  controls: z.number().int().nonnegative().default(0),
  frameworks: z.number().int().nonnegative().default(0),
  requirements: z.number().int().nonnegative().default(0),
  mappings: z.number().int().nonnegative().default(0),
  strm_relationships: z.number().int().nonnegative().default(0),
  warnings: z.number().int().nonnegative().default(0),
  synthetic_records: z.number().int().nonnegative().default(0),
  // Extended meta-model entity counters (optional â€” only present when importer supports them)
  assessment_objectives: z.number().int().nonnegative().optional(),
  evidence_requests: z.number().int().nonnegative().optional(),
  maturity_criteria: z.number().int().nonnegative().optional(),
  risks: z.number().int().nonnegative().optional(),
  threats: z.number().int().nonnegative().optional(),
  dpmp_principles: z.number().int().nonnegative().optional(),
  dpmp_framework_mappings: z.number().int().nonnegative().optional(),
  cdpas_standards: z.number().int().nonnegative().optional(),
  cdpas_sub_requirements: z.number().int().nonnegative().optional(),
  mad_standards: z.number().int().nonnegative().optional(),
  mad_sub_requirements: z.number().int().nonnegative().optional(),
});

export const ScfVersionSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema.optional(),
  version_label: z.string().min(1),
  release_date: z.string().optional(),
  source_url: z.string().url().optional(),
  source_hash: z.string().min(1),
  import_status: ScfImportStatusSchema,
  imported_at: z.string().optional(),
  imported_by: z.string().optional(),
  notes: z.string().optional(),
  is_synthetic: z.boolean().default(false),
});

export const ScfVersionResponseSchema = z.object({
  scf_version_id: UuidSchema,
  version_label: z.string(),
  release_date: z.string().optional(),
  source_hash: z.string(),
  import_status: ScfImportStatusSchema,
  imported_at: z.string().optional(),
  is_synthetic: z.boolean(),
  trace_id: z.string().optional(),
});

export const ScfDomainSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema.optional(),
  scf_version_id: UuidSchema,
  domain_code: z.string().min(1),
  domain_name: z.string().min(1),
  description: z.string().optional(),
  sort_order: z.number().int().default(0),
  is_synthetic: z.boolean().default(false),
});

export const ScfDomainResponseSchema = ScfDomainSchema.extend({
  trace_id: z.string().optional(),
});

export const ScfFrameworkSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema.optional(),
  framework_code: z.string().min(1),
  framework_name: z.string().min(1),
  framework_version: z.string().optional(),
  publisher: z.string().optional(),
  jurisdiction: z.string().optional(),
  category: z.string().optional(),
  source_reference: z.string().optional(),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean().default(false),
});

export const ScfFrameworkResponseSchema = z.object({
  framework_id: UuidSchema,
  framework_code: z.string(),
  framework_name: z.string(),
  framework_version: z.string().optional(),
  publisher: z.string().optional(),
  jurisdiction: z.string().optional(),
  category: z.string().optional(),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean(),
  trace_id: z.string().optional(),
});

export const ScfStructuredControlSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema.optional(),
  scf_version_id: UuidSchema,
  scf_domain_id: UuidSchema,
  control_code: z.string().min(1),
  control_title: z.string().min(1),
  control_description: z.string().optional(),
  control_question: z.string().optional(),
  control_intent: z.string().optional(),
  implementation_guidance: z.string().optional(),
  expected_evidence: z.string().optional(),
  control_weight: z.number().optional(),
  compensating_control_guidance: z.string().optional(),
  maturity_criteria_ref: z.string().optional(),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean().default(false),
});

export const ScfControlResponseSchema = z.object({
  control_id: UuidSchema,
  scf_version_id: UuidSchema,
  scf_domain_id: UuidSchema,
  control_code: z.string(),
  control_title: z.string(),
  control_description: z.string().optional(),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean(),
  trace_id: z.string().optional(),
});

export const ScfFrameworkRequirementSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema.optional(),
  scf_framework_id: UuidSchema,
  requirement_code: z.string().min(1),
  fde_code: z.string().optional(),
  requirement_title: z.string().min(1),
  requirement_text: z.string().optional(),
  parent_requirement_id: UuidSchema.optional(),
  sort_order: z.number().int().default(0),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean().default(false),
  /** True when this requirement is a Minimum Compliance Requirement (MCR) â€”
   *  a legally mandated obligation. MCR gaps are compliance blockers. */
  is_mcr: z.boolean().default(false),
  mcr_rationale: z.string().optional(),
});

export const ScfRequirementResponseSchema = z.object({
  requirement_id: UuidSchema,
  framework_id: UuidSchema,
  requirement_code: z.string(),
  fde_code: z.string().optional(),
  requirement_title: z.string(),
  requirement_text: z.string().optional(),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean(),
  is_mcr: z.boolean().default(false),
  mcr_rationale: z.string().optional(),
  trace_id: z.string().optional(),
});

export const ScfStructuredMappingSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema.optional(),
  scf_version_id: UuidSchema,
  scf_framework_id: UuidSchema,
  scf_framework_requirement_id: UuidSchema,
  scf_control_id: UuidSchema,
  relationship_type: ScfRelationshipTypeSchema,
  relationship_strength: z.string().optional(),
  mapping_rationale: z.string().optional(),
  mapping_source: z.string().min(1),
  is_official: z.boolean(),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean().default(false),
});

export const ScfMappingResponseSchema = ScfStructuredMappingSchema.extend({
  control_code: z.string().optional(),
  requirement_code: z.string().optional(),
  framework_code: z.string().optional(),
  framework_name: z.string().optional(),
  trace_id: z.string().optional(),
});

/**
 * ScfStrmRelationshipSchema â€” reflects the `scf_strm_relationships` Drizzle table.
 * Each record links an FDE (Focal Document Element) to an SCF control with a formal
 * STRM operator (NIST IR 8477 / ADR-001).
 *
 * source values:
 *   - "scf_official_strm_bundle_2026.1" â€” from official SCF STRM bundle XLSXs
 *   - "inferred_structural_analysis_v1" â€” derived from cardinality analysis
 */
export const ScfStrmRelationshipSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema.optional(),
  /** Optional: set when a matching scf_mappings row exists for this (fde_code, scf_control) pair. */
  scf_mapping_id: UuidSchema.nullable().optional(),
  /** Direct FK to the SCF control â€” always populated from bundle. */
  scf_control_id: UuidSchema.nullable().optional(),
  /** Official Focal Document Element identifier (e.g. "AC-1", "A.5.1", "7.1"). */
  fde_code: z.string().optional(),
  /** Human-readable name of the FDE requirement. */
  fde_name: z.string().optional(),
  // ADR-001: canonical 5-value STRM operator
  relationship_type: StrmOperatorSchema,
  /**
   * Numeric weight 0.0â€“1.0 used by STRMWeightCalculator for "intersects" operator.
   * null = use default 0.5 per ADR-001.
   * Replaces legacy text "strong" | "moderate" | "weak" from pre-ADR-001 era.
   * @deprecated field name kept as relationship_strength for API backward-compat;
   * DB column is strength_score (numeric 4,3).
   */
  relationship_strength: z.string().nullable().optional(),
  rationale: z.string().optional(),
  source: z.string().min(1),
});

export const ScfStrmRelationshipResponseSchema =
  ScfStrmRelationshipSchema.extend({
    // denormalized fields for convenience
    scf_version_id: UuidSchema.optional(),
    framework_code: z.string().optional(),
    framework_name: z.string().optional(),
    requirement_code: z.string().optional(),
    control_code: z.string().optional(),
    trace_id: z.string().optional(),
  });

export const ScfStrmQuerySchema = z.object({
  scf_version_id: UuidSchema,
  framework_id: UuidSchema.optional(),
  control_id: UuidSchema.optional(),
  relationship_type: ScfRelationshipTypeSchema.optional(),
  min_confidence_score: z.coerce.number().min(0).max(1).optional(),
  source_framework_id: UuidSchema.optional(),
  target_framework_id: UuidSchema.optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

const strmBreakdownItemSchema = z.object({
  count: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
});

export const ScfStrmCoverageResponseSchema = z.object({
  framework_id: UuidSchema,
  framework_code: z.string(),
  framework_name: z.string(),
  scf_version_id: UuidSchema,
  total_mappings: z.number().int().nonnegative(),
  strm_breakdown: z.object({
    // 5 canonical STRM operators (ADR-001 / NIST IR 8477)
    equal: strmBreakdownItemSchema,
    subset: strmBreakdownItemSchema,
    intersects: strmBreakdownItemSchema,
    superset: strmBreakdownItemSchema,
    no_relation: strmBreakdownItemSchema,
  }),
  /** Fraction of mappings with equal | subset | superset (high-confidence coverage) */
  coverage_quality_score: z.number().min(0).max(1),
  inference_source: z.string(),
  trace_id: z.string().optional(),
});

export const ScfImportRunSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema.optional(),
  source_type: ScfSourceTypeSchema,
  source_filename: z.string().optional(),
  source_hash: z.string().min(1),
  status: ScfImportStatusSchema,
  started_at: z.string(),
  completed_at: z.string().optional(),
  error_summary_safe: z.string().optional(),
  import_statistics: ScfImportStatisticsSchema,
  trace_id: z.string(),
});

export const ScfImportSourceSchema = z.object({
  source_type: ScfSourceTypeSchema,
  source_filename: z.string().optional(),
  source_url: z.string().url().optional(),
  source_hash: z.string().optional(),
  version_label: z.string().min(1).optional(),
  content: z.string().min(1),
});

export const ScfImportResultSchema = z.object({
  import_run: ScfImportRunSchema,
  warnings: z.array(z.string()).default([]),
});

export const ScfControlSearchQuerySchema = z.object({
  scf_version_id: UuidSchema.optional(),
  control_code: z.string().optional(),
  domain_code: z.string().optional(),
  q: z.string().optional(),
  tags: z.array(z.string()).optional(),
  weight_min: z.number().optional(),
  weight_max: z.number().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  fields: z.string().optional(),
  /** Base64-encoded cursor for keyset pagination. When present, `page` and `offset` are ignored. */
  after: z.string().optional(),
});

export const ScfMappingQuerySchema = z.object({
  scf_version_id: UuidSchema,
  framework_id: UuidSchema.optional(),
  requirement_id: UuidSchema.optional(),
  control_id: UuidSchema.optional(),
});

export const ScfFrameworkCoverageResponseSchema = z.object({
  framework_id: UuidSchema,
  scf_version_id: UuidSchema,
  requirement_count: z.number().int().nonnegative(),
  mapped_requirement_count: z.number().int().nonnegative(),
  control_count: z.number().int().nonnegative(),
  official_mapping_count: z.number().int().nonnegative(),
  is_synthetic: z.boolean(),
  trace_id: z.string().optional(),
});

export type ScfVersion = z.infer<typeof ScfVersionSchema>;
export type ScfDomain = z.infer<typeof ScfDomainSchema>;
export type ScfControl = z.infer<typeof ScfStructuredControlSchema>;
export type ScfFramework = z.infer<typeof ScfFrameworkSchema>;
export type ScfFrameworkRequirement = z.infer<
  typeof ScfFrameworkRequirementSchema
>;
export type ScfMapping = z.infer<typeof ScfStructuredMappingSchema>;
export type ScfStrmRelationship = z.infer<typeof ScfStrmRelationshipSchema>;
export type ScfStrmRelationshipResponse = z.infer<
  typeof ScfStrmRelationshipResponseSchema
>;
export type ScfStrmQuery = z.infer<typeof ScfStrmQuerySchema>;
export type ScfStrmCoverageResponse = z.infer<
  typeof ScfStrmCoverageResponseSchema
>;
export type ScfImportRun = z.infer<typeof ScfImportRunSchema>;
export type ScfImportSource = z.infer<typeof ScfImportSourceSchema>;
export type ScfImportResult = z.infer<typeof ScfImportResultSchema>;
export type ScfImportStatistics = z.infer<typeof ScfImportStatisticsSchema>;
export type ScfControlSearchQuery = z.infer<typeof ScfControlSearchQuerySchema>;
export type ScfMappingQuery = z.infer<typeof ScfMappingQuerySchema>;
export type ScfFrameworkCoverageResponse = z.infer<
  typeof ScfFrameworkCoverageResponseSchema
>;
export type ScfVersionResponse = z.infer<typeof ScfVersionResponseSchema>;
export type ScfDomainResponse = z.infer<typeof ScfDomainResponseSchema>;
export type ScfFrameworkResponse = z.infer<typeof ScfFrameworkResponseSchema>;
export type ScfControlResponse = z.infer<typeof ScfControlResponseSchema>;
export type ScfRequirementResponse = z.infer<
  typeof ScfRequirementResponseSchema
>;
export type ScfMappingResponse = z.infer<typeof ScfMappingResponseSchema>;

// â”€â”€â”€â”€ New SCF Meta-Model Entity Types â”€â”€â”€â”€

export const PptdfDimensionSchema = z.enum([
  "people",
  "process",
  "technology",
  "data",
  "facility",
]);
export type PptdfDimension = z.infer<typeof PptdfDimensionSchema>;

export const ScfAssessmentObjectiveSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  scf_control_id: UuidSchema,
  objective_code: z.string().min(1),
  text: z.string().min(1),
  pptdf_people: z.boolean().optional(),
  pptdf_process: z.boolean().optional(),
  pptdf_technology: z.boolean().optional(),
  pptdf_data: z.boolean().optional(),
  pptdf_facility: z.boolean().optional(),
  /** Computed: collapsed array of active PPTDF dimensions (no DB column needed) */
  pptdf_dimensions: z.array(PptdfDimensionSchema).default([]),
});

export const ScfEvidenceRequestSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  scf_control_id: UuidSchema,
  request_item: z.string().min(1),
  evidence_type: z.string().optional(),
});

export const ScfMaturityCriteriaSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  scf_control_id: UuidSchema,
  level: z.number().int().min(0).max(5),
  criteria_text: z.string().min(1),
  remediation_guidance: z.string().optional(),
});

export const ScfRiskSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  risk_code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const ScfThreatSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  threat_code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
});

export type ScfAssessmentObjective = z.infer<
  typeof ScfAssessmentObjectiveSchema
>;
export type ScfEvidenceRequest = z.infer<typeof ScfEvidenceRequestSchema>;
export type ScfMaturityCriteria = z.infer<typeof ScfMaturityCriteriaSchema>;
export type ScfRisk = z.infer<typeof ScfRiskSchema>;
export type ScfThreat = z.infer<typeof ScfThreatSchema>;


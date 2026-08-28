import { z } from "@standard/schemas";

// ==========================================
// Intelligence Engine Schemas
// ==========================================

export const GapAnalysisRequestSchema = z.object({
  scf_controls_implemented: z.array(z.string().max(100)).max(2000).openapi({ description: "Array of maximum 2000 implemented SCF Control IDs to prevent array bombing." }),
  framework_mask: z.string().max(50).openapi({ description: "Framework ID context (e.g., iso27001)" }),
}).openapi("GapAnalysisRequest");

export const ComplianceScoreRequestSchema = z.object({
  scf_controls_implemented: z.array(z.string().max(100)).max(2000),
  regulation_id: z.string().max(50),
}).openapi("ComplianceScoreRequest");

export const DpiaScoreRequestSchema = z.object({
  scf_controls_implemented: z.array(z.string().max(100)).max(2000),
  data_categories: z.array(z.string().max(100)).max(100),
  processing_purposes: z.array(z.string().max(100)).max(100),
  volume_scale: z.string().max(50),
  regulation_id: z.string().max(50),
}).openapi("DpiaScoreRequest");

export const CrossCoverageRequestSchema = z.object({
  source_framework: z.string().max(50),
  target_framework: z.string().max(50),
  scf_controls_implemented: z.array(z.string().max(100)).max(2000),
}).openapi("CrossCoverageRequest");

export const RoiPathRequestSchema = z.object({
  target_framework: z.string().max(50),
  scf_controls_implemented: z.array(z.string().max(100)).max(2000),
  top_n: z.number().int().min(1).max(50).optional().default(5),
}).openapi("RoiPathRequest");

export const BlastRadiusRequestSchema = z.object({
  control_id: z.string().max(100),
}).openapi("BlastRadiusRequest");

export const BlastRadiusOutputSchema = z.object({
  control_id: z.string(),
  linked_entities: z.object({
    risks: z.array(z.object({ category: z.string(), risk: z.string() })),
    regulations: z.array(z.object({ id: z.string(), name: z.string() })),
    data_categories: z.array(z.object({ id: z.string(), name: z.string() })),
    retention_rules: z.array(z.object({ category: z.string(), context: z.string() }))
  })
}).openapi("BlastRadiusOutput");

export const GapAnalysisOutputSchema = z.object({
  framework: z.string(),
  summary: z.object({
    total_required_controls: z.number(),
    implemented_controls: z.number(),
    missing_controls: z.number(),
    /** STRM-weighted index (0-100), or null when nothing is gradeable (ADR-001). */
    compliance_percentage: z.number().nullable(),
    /** Why compliance_percentage is null. null when an index was computed. */
    compliance_reason: z.enum(["nothing_assessable"]).nullable(),
  }),
  missing_controls: z.array(z.string())
}).openapi("GapAnalysisOutput");

export const ComplianceScoreOutputSchema = z.object({
  total_required: z.number(),
  implemented: z.number(),
  missing: z.number(),
  /** STRM-weighted score (0-100), or null when nothing is gradeable (ADR-001). */
  score: z.number().nullable(),
  /** Why score is null. null when a score was computed. */
  reason: z.enum(["nothing_assessable"]).nullable()
}).openapi("ComplianceScoreOutput");

export const DpiaScoreOutputSchema = z.object({
  dpia_trigger_count: z.number(),
  is_dpia_required: z.boolean(),
  triggering_controls: z.array(z.string())
}).openapi("DpiaScoreOutput");

export const CrossCoverageOutputSchema = z.object({
  source_framework: z.string(),
  target_framework: z.string(),
  total_target_controls: z.number(),
  directly_satisfied: z.number(),
  missing_controls: z.array(z.string()),
  coverage_percentage: z.number()
}).openapi("CrossCoverageOutput");

export const RetentionCheckRequestSchema = z.object({
  data_category: z.string().max(100),
  processing_purpose: z.string().max(100),
  jurisdiction: z.string().max(50),
}).openapi("RetentionCheckRequest");

export const RetentionCheckOutputSchema = z.object({
  matched_rules: z.array(z.object({
    rule_id: z.string(),
    retention_period: z.string(),
    description: z.string()
  }))
}).openapi("RetentionCheckOutput");

export const BreachSlaRequestSchema = z.object({
  regulation_id: z.string().max(50),
  severity: z.enum(["critical", "high", "medium", "low"]),
}).openapi("BreachSlaRequest");

export const BreachSlaOutputSchema = z.object({
  sla_hours: z.number(),
  notification_required: z.boolean(),
  reporting_authority: z.string().optional()
}).openapi("BreachSlaOutput");

export const RoiPathOutputSchema = z.object({
  recommended_controls: z.array(z.object({
    control_id: z.string(),
    roi_score: z.number(),
    mitigated_risks: z.number(),
    satisfied_regulations: z.number()
  }))
}).openapi("RoiPathOutput");


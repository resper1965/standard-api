import { z } from "zod";
import { UuidSchema } from "./common";

export const ScfImportStatusSchema = z.enum(["pending", "running", "succeeded", "failed", "partial", "rolled_back"]);
export const ScfRecordStatusSchema = z.enum(["active", "deprecated", "draft", "archived"]);
export const ScfSourceTypeSchema = z.enum(["xlsx", "csv", "oscal_json", "synthetic_fixture"]);
export const ScfRelationshipTypeSchema = z.enum(["equal", "subset", "superset", "intersecting", "related", "no_relationship", "source_defined"]);

export const ScfImportStatisticsSchema = z.object({
  versions: z.number().int().nonnegative().default(0),
  domains: z.number().int().nonnegative().default(0),
  controls: z.number().int().nonnegative().default(0),
  frameworks: z.number().int().nonnegative().default(0),
  requirements: z.number().int().nonnegative().default(0),
  mappings: z.number().int().nonnegative().default(0),
  strm_relationships: z.number().int().nonnegative().default(0),
  warnings: z.number().int().nonnegative().default(0),
  synthetic_records: z.number().int().nonnegative().default(0)
});

export const ScfVersionSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  version_label: z.string().min(1),
  release_date: z.string().optional(),
  source_url: z.string().url().optional(),
  source_hash: z.string().min(1),
  import_status: ScfImportStatusSchema,
  imported_at: z.string().optional(),
  imported_by: z.string().optional(),
  notes: z.string().optional(),
  is_synthetic: z.boolean().default(false)
});

export const ScfVersionResponseSchema = z.object({
  scf_version_id: UuidSchema,
  version_label: z.string(),
  release_date: z.string().optional(),
  source_hash: z.string(),
  import_status: ScfImportStatusSchema,
  imported_at: z.string().optional(),
  is_synthetic: z.boolean(),
  trace_id: z.string().optional()
});

export const ScfDomainSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  scf_version_id: UuidSchema,
  domain_code: z.string().min(1),
  domain_name: z.string().min(1),
  description: z.string().optional(),
  sort_order: z.number().int().default(0),
  is_synthetic: z.boolean().default(false)
});

export const ScfDomainResponseSchema = ScfDomainSchema.extend({
  trace_id: z.string().optional()
});

export const ScfFrameworkSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  framework_code: z.string().min(1),
  framework_name: z.string().min(1),
  framework_version: z.string().optional(),
  publisher: z.string().optional(),
  jurisdiction: z.string().optional(),
  category: z.string().optional(),
  source_reference: z.string().optional(),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean().default(false)
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
  trace_id: z.string().optional()
});

export const ScfStructuredControlSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
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
  maturity_criteria_ref: z.string().optional(),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean().default(false)
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
  trace_id: z.string().optional()
});

export const ScfFrameworkRequirementSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  scf_framework_id: UuidSchema,
  requirement_code: z.string().min(1),
  requirement_title: z.string().min(1),
  requirement_text: z.string().optional(),
  parent_requirement_id: UuidSchema.optional(),
  sort_order: z.number().int().default(0),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean().default(false)
});

export const ScfRequirementResponseSchema = z.object({
  requirement_id: UuidSchema,
  framework_id: UuidSchema,
  requirement_code: z.string(),
  requirement_title: z.string(),
  requirement_text: z.string().optional(),
  status: ScfRecordStatusSchema,
  is_synthetic: z.boolean(),
  trace_id: z.string().optional()
});

export const ScfStructuredMappingSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
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
  is_synthetic: z.boolean().default(false)
});

export const ScfMappingResponseSchema = ScfStructuredMappingSchema.extend({
  control_code: z.string().optional(),
  requirement_code: z.string().optional(),
  trace_id: z.string().optional()
});

export const ScfStrmRelationshipSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema.optional(),
  organization_id: UuidSchema.optional(),
  relationship_type: ScfRelationshipTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  directionality: z.string().optional(),
  default_strength_range: z.string().optional()
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
  trace_id: z.string()
});

export const ScfImportSourceSchema = z.object({
  source_type: ScfSourceTypeSchema,
  source_filename: z.string().optional(),
  source_url: z.string().url().optional(),
  source_hash: z.string().optional(),
  version_label: z.string().min(1).optional(),
  content: z.string().min(1)
});

export const ScfImportResultSchema = z.object({
  import_run: ScfImportRunSchema,
  warnings: z.array(z.string()).default([])
});

export const ScfControlSearchQuerySchema = z.object({
  scf_version_id: UuidSchema.optional(),
  control_code: z.string().optional(),
  domain_code: z.string().optional(),
  q: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export const ScfMappingQuerySchema = z.object({
  scf_version_id: UuidSchema,
  framework_id: UuidSchema.optional(),
  requirement_id: UuidSchema.optional(),
  control_id: UuidSchema.optional()
});

export const ScfFrameworkCoverageResponseSchema = z.object({
  framework_id: UuidSchema,
  scf_version_id: UuidSchema,
  requirement_count: z.number().int().nonnegative(),
  mapped_requirement_count: z.number().int().nonnegative(),
  control_count: z.number().int().nonnegative(),
  official_mapping_count: z.number().int().nonnegative(),
  is_synthetic: z.boolean(),
  trace_id: z.string().optional()
});

export type ScfVersion = z.infer<typeof ScfVersionSchema>;
export type ScfDomain = z.infer<typeof ScfDomainSchema>;
export type ScfControl = z.infer<typeof ScfStructuredControlSchema>;
export type ScfFramework = z.infer<typeof ScfFrameworkSchema>;
export type ScfFrameworkRequirement = z.infer<typeof ScfFrameworkRequirementSchema>;
export type ScfMapping = z.infer<typeof ScfStructuredMappingSchema>;
export type ScfStrmRelationship = z.infer<typeof ScfStrmRelationshipSchema>;
export type ScfImportRun = z.infer<typeof ScfImportRunSchema>;
export type ScfImportSource = z.infer<typeof ScfImportSourceSchema>;
export type ScfImportResult = z.infer<typeof ScfImportResultSchema>;
export type ScfImportStatistics = z.infer<typeof ScfImportStatisticsSchema>;
export type ScfControlSearchQuery = z.infer<typeof ScfControlSearchQuerySchema>;
export type ScfMappingQuery = z.infer<typeof ScfMappingQuerySchema>;
export type ScfFrameworkCoverageResponse = z.infer<typeof ScfFrameworkCoverageResponseSchema>;
export type ScfVersionResponse = z.infer<typeof ScfVersionResponseSchema>;
export type ScfDomainResponse = z.infer<typeof ScfDomainResponseSchema>;
export type ScfFrameworkResponse = z.infer<typeof ScfFrameworkResponseSchema>;
export type ScfControlResponse = z.infer<typeof ScfControlResponseSchema>;
export type ScfRequirementResponse = z.infer<typeof ScfRequirementResponseSchema>;
export type ScfMappingResponse = z.infer<typeof ScfMappingResponseSchema>;

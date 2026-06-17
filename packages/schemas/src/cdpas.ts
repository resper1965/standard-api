import { z } from "zod";
import { UuidSchema } from "./common";

export const CdpasRatingSchema = z.enum([
  "conforms",
  "significant_deficiency",
  "material_weakness",
  "not_assessed",
  "not_applicable",
]);

export const CdpasMethodSchema = z.enum(["examine", "interview", "test"]);

export const CdpasStandardSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  standard_number: z.number().int().min(1).max(9),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int(),
  is_synthetic: z.boolean(),
});

export const CdpasSubRequirementSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  cdpas_standard_id: UuidSchema,
  requirement_code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  assessment_methods: z.array(CdpasMethodSchema),
  sort_order: z.number().int(),
  is_synthetic: z.boolean(),
});

export const CdpasSubRequirementWithMappingsSchema = CdpasSubRequirementSchema.extend({
  scf_control_codes: z.array(z.string()),
});

export const CdpasControlMappingSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  cdpas_sub_requirement_id: UuidSchema,
  scf_control_id: UuidSchema,
  relationship_note: z.string().nullable().optional(),
  is_synthetic: z.boolean(),
});

export const CdpasAssessmentFindingSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  cdpas_sub_requirement_id: UuidSchema,
  rating: CdpasRatingSchema,
  method_used: z.array(CdpasMethodSchema),
  finding_summary: z.string().nullable().optional(),
  evidence_summary: z.string().nullable().optional(),
  assessed_by: UuidSchema.nullable().optional(),
  assessed_at: z.string().nullable().optional(),
});

export const UpsertCdpasAssessmentFindingSchema = z.object({
  rating: CdpasRatingSchema,
  method_used: z.array(CdpasMethodSchema).optional(),
  finding_summary: z.string().max(5000).optional(),
  evidence_summary: z.string().max(5000).optional(),
});

export const CdpasConformanceSummarySchema = z.object({
  total: z.number().int(),
  conforms: z.number().int(),
  significant_deficiency: z.number().int(),
  material_weakness: z.number().int(),
  not_assessed: z.number().int(),
  not_applicable: z.number().int(),
  conformance_rate: z.number(),
});

export type CdpasRating = z.infer<typeof CdpasRatingSchema>;
export type CdpasMethod = z.infer<typeof CdpasMethodSchema>;
export type CdpasStandard = z.infer<typeof CdpasStandardSchema>;
export type CdpasSubRequirement = z.infer<typeof CdpasSubRequirementSchema>;
export type CdpasSubRequirementWithMappings = z.infer<typeof CdpasSubRequirementWithMappingsSchema>;
export type CdpasControlMapping = z.infer<typeof CdpasControlMappingSchema>;
export type CdpasAssessmentFinding = z.infer<typeof CdpasAssessmentFindingSchema>;
export type UpsertCdpasAssessmentFinding = z.infer<typeof UpsertCdpasAssessmentFindingSchema>;
export type CdpasConformanceSummary = z.infer<typeof CdpasConformanceSummarySchema>;


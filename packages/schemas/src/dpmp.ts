import { z } from "zod";
import { UuidSchema } from "./common";

export const DpmpDomainSchema = z.enum([
  "privacy_by_design", "data_minimization", "consent_management",
  "data_subject_rights", "data_retention", "third_party_privacy",
  "cross_border_transfers", "privacy_governance", "breach_notification",
  "privacy_impact_assessment", "business_environment",
]);

export const DpmpPrincipleSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema.nullable().optional(),
  principle_code: z.string().min(1),
  domain: DpmpDomainSchema,
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  scf_control_codes: z.array(z.string()),
  sort_order: z.number().int(),
  is_synthetic: z.boolean(),
});

export const DpmpFrameworkMappingSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema.nullable().optional(),
  dpmp_principle_id: UuidSchema,
  framework_id: z.string().min(1),
  requirement_reference: z.string().nullable().optional(),
  mapping_note: z.string().nullable().optional(),
  is_synthetic: z.boolean(),
});

export const DpmpPrincipleWithMappingsSchema = DpmpPrincipleSchema.extend({
  framework_mappings: z.array(DpmpFrameworkMappingSchema),
});

export const DpmpPrincipleQuerySchema = z.object({
  scf_version_id: UuidSchema.optional(),
  domain: DpmpDomainSchema.optional(),
  framework_id: z.string().optional(),
  q: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
});

export type DpmpDomain = z.infer<typeof DpmpDomainSchema>;
export type DpmpPrinciple = z.infer<typeof DpmpPrincipleSchema>;
export type DpmpFrameworkMapping = z.infer<typeof DpmpFrameworkMappingSchema>;
export type DpmpPrincipleWithMappings = z.infer<typeof DpmpPrincipleWithMappingsSchema>;
export type DpmpPrincipleQuery = z.infer<typeof DpmpPrincipleQuerySchema>;


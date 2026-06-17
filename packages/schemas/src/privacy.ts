import { z } from "zod";
import { UuidSchema } from "./common";

// â”€â”€â”€ Enums â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const PrivacyControllerRoleSchema = z.enum([
  "controller", "processor", "joint_controller", "independent_controller", "unknown"
]);

export const PrivacyActivityStatusSchema = z.enum([
  "draft", "needs_information", "under_review", "approved", "rejected", "archived"
]);

// â”€â”€â”€ Privacy Regime (jurisdiction) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const PrivacyRegimeSchema = z.enum([
  "lgpd",          // Brazil â€” Lei Geral de ProteÃ§Ã£o de Dados
  "gdpr",          // EU â€” General Data Protection Regulation
  "uk_gdpr",       // UK â€” UK GDPR + Data Protection Act 2018
  "ccpa_cpra",     // US California â€” CCPA / CPRA
  "popia",         // South Africa â€” Protection of Personal Information Act
  "pipl",          // China â€” Personal Information Protection Law
  "appi",          // Japan â€” Act on Protection of Personal Information
  "pdpd",          // Vietnam â€” Personal Data Protection Decree
  "lpdp_turkey",   // Turkey â€” KiÅŸisel Verilerin KorunmasÄ± Kanunu
  "nzpa",          // New Zealand â€” Privacy Act 2020
  "custom",        // Custom / other jurisdiction
]);

// â”€â”€â”€ Legal Basis (generic, per regime) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Generic legal basis applicable across regimes */
export const PrivacyLegalBasisCodeSchema = z.enum([
  // Universal bases (present in most regimes)
  "consent",
  "contract",
  "legal_obligation",
  "legitimate_interest",
  "vital_interests",
  "public_interest",
  // LGPD-specific (Art. 7)
  "public_administration",
  "research",
  "credit_protection",
  "life_protection",
  "health_protection",
  "judicial_process",
  // GDPR-specific (Art. 6)
  "public_task",
  // PIPL-specific (Art. 13)
  "hr_management",
  "public_health",
  "news_reporting",
  // CCPA/CPRA (opt-out model â€” no "basis" required, but tracked)
  "opt_out_compliant",
  "opt_in_obtained",
  // Generic
  "not_determined",
  "other",
]);

export const PrivacyLegalBasisSchema = z.object({
  regime: PrivacyRegimeSchema,
  basis: PrivacyLegalBasisCodeSchema,
  basis_detail: z.string().max(5000).optional(),
  article_reference: z.string().max(200).optional(),
});

/** @deprecated Use PrivacyLegalBasisCodeSchema instead. Kept for backward compatibility. */
export const PrivacyLegalBasisLgpdSchema = z.enum([
  "consent", "legal_obligation", "public_administration", "research",
  "contract", "legitimate_interest", "credit_protection", "life_protection",
  "health_protection", "judicial_process", "not_determined"
]);

export const PrivacyDataSensitivitySchema = z.enum([
  "personal", "sensitive", "anonymized", "pseudonymized", "children",
  "financial", "health", "biometric", "genetic", "political",
  "religious", "sexual", "criminal", "other"
]);

export const PrivacyDataSubjectCategorySchema = z.enum([
  "employees", "customers", "prospects", "partners", "suppliers",
  "minors", "patients", "students", "citizens", "visitors", "contractors", "other"
]);

// â”€â”€â”€ Create/Update Requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CreatePrivacyActivityRequestSchema = z.strictObject({
  name: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  assessment_id: UuidSchema.optional(),
  business_process: z.string().max(500).optional(),
  department_id: UuidSchema.optional(),
  owner_person_id: UuidSchema.optional(),
  controller_role: PrivacyControllerRoleSchema.default("unknown"),
  purpose: z.string().max(5000).optional(),
  // â”€â”€â”€ Jurisdiction & Legal Basis (multi-regime) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  privacy_regime: PrivacyRegimeSchema.default("lgpd"),
  legal_bases: z.array(PrivacyLegalBasisSchema).default([]),
  /** @deprecated Use legal_bases[] instead. Kept for backward compat. */
  legal_basis_lgpd: PrivacyLegalBasisLgpdSchema.optional(),
  legal_basis_detail: z.string().max(5000).optional(),
  // â”€â”€â”€ Retention â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  retention_period: z.string().max(500).optional(),
  retention_justification: z.string().max(5000).optional(),
  // â”€â”€â”€ Processing Characteristics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  third_party_sharing: z.boolean().default(false),
  international_transfer: z.boolean().default(false),
  automated_decision_making: z.boolean().default(false),
  large_scope_processing: z.boolean().default(false),
  vulnerable_subjects: z.boolean().default(false),
  systematic_monitoring: z.boolean().default(false),
  security_measures_summary: z.string().max(10000).optional(),
  // â”€â”€â”€ Screening Results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  dpia_required: z.boolean().optional(),
  lia_required: z.boolean().optional(),
  tia_required: z.boolean().optional(),
  risk_level: z.string().max(100).optional(),
});

export const UpdatePrivacyActivityRequestSchema = CreatePrivacyActivityRequestSchema.partial().omit({ assessment_id: true });

export const UpdatePrivacyActivityStatusRequestSchema = z.strictObject({
  status: PrivacyActivityStatusSchema,
  reason: z.string().max(2000).optional(),
});

// â”€â”€â”€ Data Subjects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CreatePrivacyDataSubjectRequestSchema = z.strictObject({
  category: PrivacyDataSubjectCategorySchema,
  description: z.string().max(2000).optional(),
  estimated_count: z.string().max(200).optional(),
  vulnerable_group: z.boolean().default(false),
  age_restrictions: z.string().max(500).optional(),
});

// â”€â”€â”€ Data Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CreatePrivacyDataCategoryRequestSchema = z.strictObject({
  category_name: z.string().min(1).max(500),
  sensitivity: PrivacyDataSensitivitySchema.default("personal"),
  specific_data_elements: z.array(z.string().max(200)).default([]),
  source_of_data: z.string().max(1000).optional(),
  retention_period: z.string().max(500).optional(),
});

// â”€â”€â”€ Responses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const PrivacyActivityResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  business_process: z.string().nullable(),
  department_id: UuidSchema.nullable(),
  owner_person_id: UuidSchema.nullable(),
  controller_role: PrivacyControllerRoleSchema,
  status: PrivacyActivityStatusSchema,
  purpose: z.string().nullable(),
  // â”€â”€â”€ Multi-regime legal basis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  privacy_regime: PrivacyRegimeSchema,
  legal_bases: z.array(PrivacyLegalBasisSchema).default([]),
  /** @deprecated */
  legal_basis_lgpd: PrivacyLegalBasisLgpdSchema.nullable(),
  legal_basis_detail: z.string().nullable(),
  // â”€â”€â”€ Processing characteristics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  retention_period: z.string().nullable(),
  retention_justification: z.string().nullable(),
  third_party_sharing: z.boolean(),
  international_transfer: z.boolean(),
  automated_decision_making: z.boolean(),
  large_scope_processing: z.boolean(),
  vulnerable_subjects: z.boolean(),
  systematic_monitoring: z.boolean(),
  security_measures_summary: z.string().nullable(),
  dpia_required: z.boolean().nullable(),
  lia_required: z.boolean().nullable(),
  tia_required: z.boolean().nullable(),
  risk_level: z.string().nullable(),
  created_by: UuidSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PrivacyDataSubjectResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  activity_id: UuidSchema,
  category: PrivacyDataSubjectCategorySchema,
  description: z.string().nullable(),
  estimated_count: z.string().nullable(),
  vulnerable_group: z.boolean(),
  age_restrictions: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PrivacyDataCategoryResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  activity_id: UuidSchema,
  category_name: z.string(),
  sensitivity: PrivacyDataSensitivitySchema,
  specific_data_elements: z.array(z.string()),
  source_of_data: z.string().nullable(),
  retention_period: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PrivacyControllerRole = z.infer<typeof PrivacyControllerRoleSchema>;
export type PrivacyActivityStatus = z.infer<typeof PrivacyActivityStatusSchema>;
export type PrivacyRegime = z.infer<typeof PrivacyRegimeSchema>;
export type PrivacyLegalBasisCode = z.infer<typeof PrivacyLegalBasisCodeSchema>;
export type PrivacyLegalBasis = z.infer<typeof PrivacyLegalBasisSchema>;
/** @deprecated Use PrivacyLegalBasisCode instead */
export type PrivacyLegalBasisLgpd = z.infer<typeof PrivacyLegalBasisLgpdSchema>;
export type PrivacyDataSensitivity = z.infer<typeof PrivacyDataSensitivitySchema>;
export type PrivacyDataSubjectCategory = z.infer<typeof PrivacyDataSubjectCategorySchema>;
export type CreatePrivacyActivityRequest = z.input<typeof CreatePrivacyActivityRequestSchema>;
export type UpdatePrivacyActivityRequest = z.input<typeof UpdatePrivacyActivityRequestSchema>;
export type UpdatePrivacyActivityStatusRequest = z.infer<typeof UpdatePrivacyActivityStatusRequestSchema>;
export type CreatePrivacyDataSubjectRequest = z.input<typeof CreatePrivacyDataSubjectRequestSchema>;
export type CreatePrivacyDataCategoryRequest = z.input<typeof CreatePrivacyDataCategoryRequestSchema>;
export type PrivacyActivityResponse = z.infer<typeof PrivacyActivityResponseSchema>;
export type PrivacyDataSubjectResponse = z.infer<typeof PrivacyDataSubjectResponseSchema>;
export type PrivacyDataCategoryResponse = z.infer<typeof PrivacyDataCategoryResponseSchema>;

// â”€â”€â”€ Phase 2: Third Parties â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const PrivacyThirdPartyRoleSchema = z.enum([
  "processor", "controller", "joint_controller", "sub_processor", "recipient", "other"
]);

export const PrivacyTransferMechanismSchema = z.enum([
  "adequacy_decision", "standard_contractual_clauses", "binding_corporate_rules",
  "consent", "contractual_necessity", "legal_obligation", "public_interest",
  "vital_interests", "not_applicable", "other"
]);

export const CreatePrivacyThirdPartyRequestSchema = z.strictObject({
  name: z.string().min(1).max(500),
  role: PrivacyThirdPartyRoleSchema.default("processor"),
  country: z.string().max(200).optional(),
  purpose: z.string().max(2000).optional(),
  data_shared: z.array(z.string().max(200)).default([]),
  contract_reference: z.string().max(500).optional(),
  safeguards: z.string().max(5000).optional(),
  transfer_mechanism: PrivacyTransferMechanismSchema.optional(),
  active: z.boolean().default(true),
});

export const PrivacyThirdPartyResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  activity_id: UuidSchema,
  name: z.string(),
  role: PrivacyThirdPartyRoleSchema,
  country: z.string().nullable(),
  purpose: z.string().nullable(),
  data_shared: z.array(z.string()),
  contract_reference: z.string().nullable(),
  safeguards: z.string().nullable(),
  transfer_mechanism: PrivacyTransferMechanismSchema.nullable(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PrivacyThirdPartyRole = z.infer<typeof PrivacyThirdPartyRoleSchema>;
export type PrivacyTransferMechanism = z.infer<typeof PrivacyTransferMechanismSchema>;
export type CreatePrivacyThirdPartyRequest = z.input<typeof CreatePrivacyThirdPartyRequestSchema>;
export type PrivacyThirdPartyResponse = z.infer<typeof PrivacyThirdPartyResponseSchema>;

// â”€â”€â”€ Phase 3: Screenings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const PrivacyScreeningTypeSchema = z.enum(["dpia", "lia", "tia"]);
export const PrivacyScreeningResultSchema = z.enum(["required", "not_required", "recommended", "inconclusive"]);

export const PrivacyScreeningResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  activity_id: UuidSchema,
  screening_type: PrivacyScreeningTypeSchema,
  result: PrivacyScreeningResultSchema,
  triggered_by: z.array(z.string()),
  risk_factors: z.array(z.string()),
  recommendation: z.string().nullable(),
  screened_at: z.string(),
  screened_by: UuidSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PrivacyScreeningType = z.infer<typeof PrivacyScreeningTypeSchema>;
export type PrivacyScreeningResult = z.infer<typeof PrivacyScreeningResultSchema>;
export type PrivacyScreeningResponse = z.infer<typeof PrivacyScreeningResponseSchema>;

// â”€â”€â”€ Phase 4: Field Reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const PrivacyFieldReviewStatusSchema = z.enum(["pending", "approved", "rejected", "needs_revision"]);
export const PrivacyFieldReviewSourceSchema = z.enum(["human", "ai_suggestion", "system_rule", "import"]);

export const CreatePrivacyFieldReviewRequestSchema = z.strictObject({
  field_name: z.string().min(1).max(200),
  suggested_value: z.string().max(10000).optional(),
  current_value: z.string().max(10000).optional(),
  comment: z.string().max(5000).optional(),
  source: PrivacyFieldReviewSourceSchema.default("human"),
});

export const UpdatePrivacyFieldReviewRequestSchema = z.strictObject({
  review_status: PrivacyFieldReviewStatusSchema,
  comment: z.string().max(5000).optional(),
});

export const PrivacyFieldReviewResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  activity_id: UuidSchema,
  field_name: z.string(),
  review_status: PrivacyFieldReviewStatusSchema,
  reviewer_id: UuidSchema.nullable(),
  comment: z.string().nullable(),
  suggested_value: z.string().nullable(),
  current_value: z.string().nullable(),
  source: PrivacyFieldReviewSourceSchema,
  reviewed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PrivacyFieldReviewStatus = z.infer<typeof PrivacyFieldReviewStatusSchema>;
export type PrivacyFieldReviewSource = z.infer<typeof PrivacyFieldReviewSourceSchema>;
export type CreatePrivacyFieldReviewRequest = z.input<typeof CreatePrivacyFieldReviewRequestSchema>;
export type UpdatePrivacyFieldReviewRequest = z.infer<typeof UpdatePrivacyFieldReviewRequestSchema>;
export type PrivacyFieldReviewResponse = z.infer<typeof PrivacyFieldReviewResponseSchema>;

// â”€â”€â”€ Phase 5: SCF Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const PrivacyScfApplicabilitySchema = z.enum(["applicable", "possibly_applicable", "not_applicable", "needs_review"]);
export const PrivacyScfPrioritySchema = z.enum(["critical", "high", "medium", "low"]);

export const PrivacyScfControlResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  activity_id: UuidSchema,
  scf_version: z.string().nullable(),
  control_id: UuidSchema.nullable(),
  control_code: z.string(),
  control_title: z.string(),
  scf_domain: z.string().nullable(),
  applicability_status: PrivacyScfApplicabilitySchema,
  priority: PrivacyScfPrioritySchema,
  justification: z.string().nullable(),
  expected_evidence: z.array(z.string()),
  assessment_questions: z.array(z.string()),
  gaps: z.array(z.string()),
  suggested_by: z.string().nullable(),
  reviewed_by: UuidSchema.nullable(),
  reviewed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PrivacyScfApplicability = z.infer<typeof PrivacyScfApplicabilitySchema>;
export type PrivacyScfPriority = z.infer<typeof PrivacyScfPrioritySchema>;
export type PrivacyScfControlResponse = z.infer<typeof PrivacyScfControlResponseSchema>;


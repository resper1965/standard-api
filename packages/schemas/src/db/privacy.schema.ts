import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────

export const privacyControllerRoleEnum = pgEnum("privacy_controller_role", [
  "controller", "processor", "joint_controller", "independent_controller", "unknown"
]);

export const privacyActivityStatusEnum = pgEnum("privacy_activity_status", [
  "draft", "needs_information", "under_review", "approved", "rejected", "archived"
]);

export const privacyLegalBasisLgpdEnum = pgEnum("privacy_legal_basis_lgpd", [
  "consent",
  "legal_obligation",
  "public_administration",
  "research",
  "contract",
  "legitimate_interest",
  "credit_protection",
  "life_protection",
  "health_protection",
  "judicial_process",
  "not_determined"
]);

export const privacySensitivityEnum = pgEnum("privacy_data_sensitivity", [
  "personal", "sensitive", "anonymized", "pseudonymized", "children",
  "financial", "health", "biometric", "genetic", "political",
  "religious", "sexual", "criminal", "other"
]);

export const privacyDataSubjectCategoryEnum = pgEnum("privacy_data_subject_category", [
  "employees", "customers", "prospects", "partners", "suppliers",
  "minors", "patients", "students", "citizens", "visitors", "contractors", "other"
]);

// ─── Tables ─────────────────────────────────────────────────────────

export const privacyProcessingActivities = pgTable("privacy_processing_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  assessmentId: uuid("assessment_id"),
  name: text("name").notNull(),
  description: text("description"),
  businessProcess: text("business_process"),
  departmentId: uuid("department_id"),
  ownerPersonId: uuid("owner_person_id"),
  controllerRole: privacyControllerRoleEnum("controller_role").default("unknown").notNull(),
  status: privacyActivityStatusEnum("status").default("draft").notNull(),
  purpose: text("purpose"),
  legalBasisLgpd: privacyLegalBasisLgpdEnum("legal_basis_lgpd"),
  legalBasisDetail: text("legal_basis_detail"),
  retentionPeriod: text("retention_period"),
  retentionJustification: text("retention_justification"),
  thirdPartySharing: boolean("third_party_sharing").default(false).notNull(),
  internationalTransfer: boolean("international_transfer").default(false).notNull(),
  automatedDecisionMaking: boolean("automated_decision_making").default(false).notNull(),
  largeScopeProcessing: boolean("large_scope_processing").default(false).notNull(),
  vulnerableSubjects: boolean("vulnerable_subjects").default(false).notNull(),
  systematicMonitoring: boolean("systematic_monitoring").default(false).notNull(),
  securityMeasuresSummary: text("security_measures_summary"),
  dpiaRequired: boolean("dpia_required"),
  liaRequired: boolean("lia_required"),
  tiaRequired: boolean("tia_required"),
  riskLevel: text("risk_level"),
  createdBy: uuid("created_by"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_privacy_activities_org").on(table.organizationId),
  index("idx_privacy_activities_assessment").on(table.assessmentId),
  index("idx_privacy_activities_status").on(table.status),
  index("idx_privacy_activities_org_status").on(table.organizationId, table.status),
]);

export const privacyProcessingActivityDataSubjects = pgTable("privacy_processing_activity_data_subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  activityId: uuid("activity_id").notNull(),
  category: privacyDataSubjectCategoryEnum("category").notNull(),
  description: text("description"),
  estimatedCount: text("estimated_count"),
  vulnerableGroup: boolean("vulnerable_group").default(false).notNull(),
  ageRestrictions: text("age_restrictions"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_privacy_data_subjects_activity").on(table.activityId),
  index("idx_privacy_data_subjects_org").on(table.organizationId),
]);

export const privacyProcessingActivityDataCategories = pgTable("privacy_processing_activity_data_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  activityId: uuid("activity_id").notNull(),
  categoryName: text("category_name").notNull(),
  sensitivity: privacySensitivityEnum("sensitivity").default("personal").notNull(),
  specificDataElements: jsonb("specific_data_elements").$type<string[]>().default([]).notNull(),
  sourceOfData: text("source_of_data"),
  retentionPeriod: text("retention_period"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_privacy_data_categories_activity").on(table.activityId),
  index("idx_privacy_data_categories_org").on(table.organizationId),
]);

// ─── Phase 2: Third Parties ────────────────────────────────────────

export const privacyThirdPartyRoleEnum = pgEnum("privacy_third_party_role", [
  "processor", "controller", "joint_controller", "sub_processor", "recipient", "other"
]);

export const privacyTransferMechanismEnum = pgEnum("privacy_transfer_mechanism", [
  "adequacy_decision", "standard_contractual_clauses", "binding_corporate_rules",
  "consent", "contractual_necessity", "legal_obligation", "public_interest",
  "vital_interests", "not_applicable", "other"
]);

export const privacyProcessingActivityThirdParties = pgTable("privacy_processing_activity_third_parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  activityId: uuid("activity_id").notNull(),
  name: text("name").notNull(),
  role: privacyThirdPartyRoleEnum("role").default("processor").notNull(),
  country: text("country"),
  purpose: text("purpose"),
  dataShared: jsonb("data_shared").$type<string[]>().default([]).notNull(),
  contractReference: text("contract_reference"),
  safeguards: text("safeguards"),
  transferMechanism: privacyTransferMechanismEnum("transfer_mechanism"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_privacy_third_parties_activity").on(table.activityId),
  index("idx_privacy_third_parties_org").on(table.organizationId),
]);

// ─── Phase 3: Screenings (DPIA/LIA/TIA) ───────────────────────────

export const privacyScreeningTypeEnum = pgEnum("privacy_screening_type", [
  "dpia", "lia", "tia"
]);

export const privacyScreeningResultEnum = pgEnum("privacy_screening_result", [
  "required", "not_required", "recommended", "inconclusive"
]);

export const privacyProcessingActivityScreenings = pgTable("privacy_processing_activity_screenings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  activityId: uuid("activity_id").notNull(),
  screeningType: privacyScreeningTypeEnum("screening_type").notNull(),
  result: privacyScreeningResultEnum("result").notNull(),
  triggeredBy: jsonb("triggered_by").$type<string[]>().default([]).notNull(),
  riskFactors: jsonb("risk_factors").$type<string[]>().default([]).notNull(),
  recommendation: text("recommendation"),
  screenedAt: timestamp("screened_at", { withTimezone: true }).defaultNow().notNull(),
  screenedBy: uuid("screened_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_privacy_screenings_activity").on(table.activityId),
  index("idx_privacy_screenings_org").on(table.organizationId),
]);

// ─── Phase 4: Field Reviews ────────────────────────────────────────

export const privacyFieldReviewStatusEnum = pgEnum("privacy_field_review_status", [
  "pending", "approved", "rejected", "needs_revision"
]);

export const privacyFieldReviewSourceEnum = pgEnum("privacy_field_review_source", [
  "human", "ai_suggestion", "system_rule", "import"
]);

export const privacyProcessingActivityFieldReviews = pgTable("privacy_processing_activity_field_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  activityId: uuid("activity_id").notNull(),
  fieldName: text("field_name").notNull(),
  reviewStatus: privacyFieldReviewStatusEnum("review_status").default("pending").notNull(),
  reviewerId: uuid("reviewer_id"),
  comment: text("comment"),
  suggestedValue: text("suggested_value"),
  currentValue: text("current_value"),
  source: privacyFieldReviewSourceEnum("source").default("human").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_privacy_field_reviews_activity").on(table.activityId),
  index("idx_privacy_field_reviews_org").on(table.organizationId),
  index("idx_privacy_field_reviews_status").on(table.reviewStatus),
]);

// ─── Phase 5: SCF Controls ────────────────────────────────────────

export const privacyScfApplicabilityEnum = pgEnum("privacy_scf_applicability", [
  "applicable", "possibly_applicable", "not_applicable", "needs_review"
]);

export const privacyScfPriorityEnum = pgEnum("privacy_scf_priority", [
  "critical", "high", "medium", "low"
]);

export const privacyProcessingActivityScfControls = pgTable("privacy_processing_activity_scf_controls", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  activityId: uuid("activity_id").notNull(),
  scfVersion: text("scf_version"),
  controlId: uuid("control_id"),
  controlCode: text("control_code").notNull(),
  controlTitle: text("control_title").notNull(),
  scfDomain: text("scf_domain"),
  applicabilityStatus: privacyScfApplicabilityEnum("applicability_status").default("needs_review").notNull(),
  priority: privacyScfPriorityEnum("priority").default("medium").notNull(),
  justification: text("justification"),
  expectedEvidence: jsonb("expected_evidence").$type<string[]>().default([]).notNull(),
  assessmentQuestions: jsonb("assessment_questions").$type<string[]>().default([]).notNull(),
  gaps: jsonb("gaps").$type<string[]>().default([]).notNull(),
  suggestedBy: text("suggested_by"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_privacy_scf_controls_activity").on(table.activityId),
  index("idx_privacy_scf_controls_org").on(table.organizationId),
  index("idx_privacy_scf_controls_code").on(table.controlCode),
]);

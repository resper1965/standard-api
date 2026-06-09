import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const auditMetadata = () =>
  jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull();
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const assessmentStateEnum = pgEnum("assessment_state", [
  "draft",
  "documents_uploaded",
  "documents_ingested",
  "scf_pre_analysis_ready",
  "framework_selected",
  "scope_drafted",
  "soa_drafted",
  "soa_under_review",
  "soa_approved",
  "soa_ingested",
  "evidence_analysis_ready",
  "gap_analysis_drafted",
  "gap_analysis_under_review",
  "gap_analysis_approved",
  "maturity_assessed",
  "maturity_under_review",
  "maturity_approved",
  "poam_drafted",
  "poam_under_review",
  "poam_approved",
  "report_generated",
  "closed",
  "archived",
  "failed",
  "cancelled",
  "blocked",
]);

export const artifactStatusEnum = pgEnum("artifact_status", [
  "draft",
  "under_review",
  "approved",
  "superseded",
  "archived",
]);

export const approvalGateEnum = pgEnum("approval_gate", [
  "soa",
  "gap_analysis",
  "maturity_assessment",
  "poam",
  "report",
]);
export const approvalDecisionEnum = pgEnum("approval_decision", [
  "approved",
  "rejected",
  "changes_requested",
]);
export const storageProviderEnum = pgEnum("storage_provider", [
  "r2",
  "external",
  "r2_compatible_mock",
]);
export const documentClassificationEnum = pgEnum("document_classification", [
  "public",
  "internal",
  "confidential",
  "restricted",
]);
export const documentTypeEnum = pgEnum("document_type", [
  "policy",
  "procedure",
  "standard",
  "evidence",
  "soa",
  "report",
  "other",
]);
export const extractionJobStatusEnum = pgEnum("extraction_job_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
export const evidenceStrengthEnum = pgEnum("evidence_strength", [
  "strong",
  "partial",
  "weak",
  "absent",
  "conflicting",
  "not_checked",
]);
export const evidenceStatusEnum = pgEnum("evidence_status", [
  "candidate",
  "accepted",
  "rejected",
  "insufficient",
  "conflicting",
  "not_evidenced",
]);
export const gapStatusEnum = pgEnum("gap_status", [
  "met",
  "partially_met",
  "not_met",
  "not_evidenced",
  "not_applicable_justified",
  "not_applicable_not_justified",
  "requires_validation",
]);
export const gapTypeEnum = pgEnum("gap_type", [
  "documentation_gap",
  "implementation_gap",
  "evidence_gap",
  "effectiveness_gap",
  "governance_gap",
  "technical_gap",
  "contractual_gap",
  "monitoring_gap",
  "no_gap",
  "not_applicable",
]);
export const poamStatusEnum = pgEnum("poam_status", [
  "draft",
  "approved",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
  "deferred",
]);
export const priorityEnum = pgEnum("priority", [
  "low",
  "medium",
  "high",
  "critical",
  "urgent",
]);
export const severityEnum = pgEnum("severity", [
  "informational",
  "low",
  "medium",
  "high",
  "critical",
]);
export const poamActionTypeEnum = pgEnum("poam_action_type", [
  "policy_update",
  "procedure_creation",
  "technical_implementation",
  "evidence_collection",
  "governance_improvement",
  "monitoring_improvement",
  "training",
  "third_party_action",
  "risk_acceptance",
  "validation_required",
  "other",
]);
export const poamEffortEstimateEnum = pgEnum("poam_effort_estimate", [
  "small",
  "medium",
  "large",
  "extra_large",
  "unknown",
]);
export const poamDependencyTypeEnum = pgEnum("poam_dependency_type", [
  "blocks",
  "related_to",
  "prerequisite",
  "duplicates",
  "depends_on_external_party",
]);
export const responsibilityTypeEnum = pgEnum("responsibility_type", [
  "internal",
  "customer",
  "third_party_provider",
  "shared",
]);
export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "poisoned_dlq",
]);
export const mappingSourceEnum = pgEnum("mapping_source", [
  "official_scf",
  "derived",
  "consultative",
]);
export const reportTypeEnum = pgEnum("report_type", [
  "full_assessment_report",
  "executive_summary",
  "soa_export",
  "gap_analysis_report",
  "maturity_report",
  "poam_report",
  "audit_package",
  "machine_readable_export",
]);
export const reportArtifactTypeEnum = pgEnum("report_artifact_type", [
  "report",
  "export",
  "evidence_index",
  "audit_package",
  "appendix",
  "summary",
]);
export const reportFormatEnum = pgEnum("report_format", [
  "json",
  "markdown",
  "html",
  "docx",
  "pdf",
  "csv",
  "xlsx",
  "zip",
]);
export const exportJobStatusEnum = pgEnum("export_job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped",
  "cancelled",
  "retrying",
]);
export const malwareScanStatusEnum = pgEnum("malware_scan_status", [
  "pending",
  "clean",
  "infected",
  "error",
  "skipped",
]);
export const scfIngestionModeEnum = pgEnum("scf_ingestion_mode", [
  "scf_official_xlsx",
  "oscal_json",
  "synthetic",
  "manual",
]);
export const controlImplementationStatusEnum = pgEnum(
  "control_implementation_status",
  [
    "not_assessed",
    "not_implemented",
    "planned",
    "partially_implemented",
    "implemented",
    "not_applicable",
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: text("status").default("active").notNull(),
    billingTier: text("billing_tier").default("free").notNull(),
    userId: text("user_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("organizations_slug_uidx").on(table.slug),
    index("organizations_user_idx").on(table.userId),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    identityProvider: text("identity_provider"),
    identityProviderSubject: text("identity_provider_subject"),
    ...timestamps(),
  },
  (table) => [uniqueIndex("users_email_uidx").on(table.email)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [uniqueIndex("roles_key_uidx").on(table.key)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    /** Nullable — user may not exist yet (invite-first flow) */
    userId: uuid("user_id").references(() => users.id),
    /** Nullable — role FK; prefer inline `role` text field for invite-first */
    roleId: uuid("role_id").references(() => roles.id),
    /** Invite target email — set before user accepts */
    email: text("email"),
    displayName: text("display_name"),
    /** Text role: 'member' | 'admin' | 'owner' — used for invite-first memberships */
    role: text("role").default("member"),
    status: text("status").default("active").notNull(),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("memberships_org_user_idx").on(table.organizationId, table.userId),
    index("memberships_org_email_idx").on(table.organizationId, table.email),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    maskedKey: text("masked_key").notNull(),
    /** M2M permission scopes — at least one scope required (M4 least privilege). */
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** Soft-delete: set when key is revoked. Null means active. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    /** Scheduled revocation time — set by key rotation. Null = no pending revocation. */
    scheduledRevokeAt: timestamp("scheduled_revoke_at", { withTimezone: true }),
    /** ID of the key that replaced this one (rotation chain traceability). */
    rotatedToKeyId: uuid("rotated_to_key_id"),
    ...timestamps(),
  },
  (table) => [
    index("api_keys_org_idx").on(table.organizationId),
    uniqueIndex("api_keys_hash_uidx").on(table.keyHash),
  ],
);

export const scfVersions = pgTable(
  "scf_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    version: text("version").notNull(),
    sourceUri: text("source_uri"),
    contentHash: text("content_hash"),
    provenanceHash: text("provenance_hash"),
    ingestionMode: scfIngestionModeEnum("ingestion_mode")
      .default("scf_official_xlsx")
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [uniqueIndex("scf_versions_version_uidx").on(table.version)],
);

export const scfImportRuns = pgTable(
  "scf_import_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scfVersionId: uuid("scf_version_id").references(() => scfVersions.id),
    sourceType: text("source_type").notNull(),
    sourceFilename: text("source_filename"),
    sourceHash: text("source_hash").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorSummarySafe: text("error_summary_safe"),
    importStatistics: jsonb("import_statistics")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    importedBy: text("imported_by"),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("scf_import_runs_version_idx").on(table.scfVersionId),
    index("scf_import_runs_status_idx").on(table.status),
    index("scf_import_runs_trace_idx").on(table.traceId),
  ],
);

export const scfDomains = pgTable(
  "scf_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    domainCode: text("domain_code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("scf_domains_version_idx").on(table.scfVersionId),
    uniqueIndex("scf_domains_version_code_uidx").on(
      table.scfVersionId,
      table.domainCode,
    ),
  ],
);

export const scfControls = pgTable(
  "scf_controls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfDomainId: uuid("scf_domain_id")
      .notNull()
      .references(() => scfDomains.id),
    controlCode: text("control_code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    controlQuestion: text("control_question"),
    controlIntent: text("control_intent"),
    implementationGuidance: text("implementation_guidance"),
    expectedEvidence: text("expected_evidence"),
    controlWeight: numeric("control_weight", { precision: 6, scale: 3 }),
    compensatingControlGuidance: text("compensating_control_guidance"),
    maturityCriteriaRef: text("maturity_criteria_ref"),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: text("status").default("active").notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("scf_controls_version_domain_idx").on(
      table.scfVersionId,
      table.scfDomainId,
    ),
    uniqueIndex("scf_controls_version_code_uidx").on(
      table.scfVersionId,
      table.controlCode,
    ),
  ],
);

export const scfFrameworks = pgTable(
  "scf_frameworks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    frameworkId: text("framework_id").notNull(),
    name: text("name").notNull(),
    versionLabel: text("version_label"),
    publisher: text("publisher"),
    jurisdiction: text("jurisdiction"),
    category: text("category"),
    sourceReference: text("source_reference"),
    status: text("status").default("active").notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("scf_frameworks_version_idx").on(table.scfVersionId),
    uniqueIndex("scf_frameworks_version_framework_uidx").on(
      table.scfVersionId,
      table.frameworkId,
    ),
  ],
);

export const scfFrameworkRequirements = pgTable(
  "scf_framework_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfFrameworkId: uuid("scf_framework_id")
      .notNull()
      .references(() => scfFrameworks.id),
    requirementCode: text("requirement_code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    requirementText: text("requirement_text"),
    parentRequirementId: uuid("parent_requirement_id"),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: text("status").default("active").notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("scf_requirements_framework_idx").on(table.scfFrameworkId),
    uniqueIndex("scf_requirements_framework_code_uidx").on(
      table.scfFrameworkId,
      table.requirementCode,
    ),
  ],
);

export const scfMappings = pgTable(
  "scf_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfFrameworkRequirementId: uuid("scf_framework_requirement_id")
      .notNull()
      .references(() => scfFrameworkRequirements.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    relationshipType: text("relationship_type").notNull(),
    relationshipStrength: text("relationship_strength"),
    mappingRationale: text("mapping_rationale"),
    mappingSource: mappingSourceEnum("mapping_source")
      .default("official_scf")
      .notNull(),
    isOfficial: boolean("is_official").default(true).notNull(),
    status: text("status").default("active").notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("scf_mappings_version_idx").on(table.scfVersionId),
    index("scf_mappings_requirement_idx").on(table.scfFrameworkRequirementId),
    index("scf_mappings_control_idx").on(table.scfControlId),
    uniqueIndex("scf_mappings_requirement_control_uidx").on(
      table.scfFrameworkRequirementId,
      table.scfControlId,
    ),
  ],
);

export const scfStrmRelationships = pgTable(
  "scf_strm_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfMappingId: uuid("scf_mapping_id")
      .notNull()
      .references(() => scfMappings.id),
    relationshipType: text("relationship_type").notNull(),
    relationshipStrength: text("relationship_strength").notNull(),
    rationale: text("rationale"),
    source: text("source").notNull(),
    ...timestamps(),
  },
  (table) => [index("scf_strm_mapping_idx").on(table.scfMappingId)],
);

export const scfControlMetadata = pgTable(
  "scf_control_metadata",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    riskWeight: numeric("risk_weight", { precision: 6, scale: 3 }),
    threatTags: jsonb("threat_tags").$type<string[]>().default([]).notNull(),
    maturityGuidance: jsonb("maturity_guidance")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("scf_control_metadata_control_uidx").on(table.scfControlId),
  ],
);

// ── SCF Assessment Objectives ────────────────────────────────────────────────
export const scfAssessmentObjectives = pgTable(
  "scf_assessment_objectives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    objectiveCode: text("objective_code").notNull(), // e.g. GOV-01.1a
    text: text("text").notNull(),
    pptdfPeople: boolean("pptdf_people"),
    pptdfProcess: boolean("pptdf_process"),
    pptdfTechnology: boolean("pptdf_technology"),
    pptdfData: boolean("pptdf_data"),
    pptdfFacility: boolean("pptdf_facility"),
    ...timestamps(),
  },
  (table) => [
    index("scf_ao_control_idx").on(table.scfControlId),
    uniqueIndex("scf_ao_version_code_uidx").on(
      table.scfVersionId,
      table.objectiveCode,
    ),
  ],
);

// ── SCF Evidence Request List (ERL) ──────────────────────────────────────────
export const scfEvidenceRequests = pgTable(
  "scf_evidence_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    requestItem: text("request_item").notNull(),
    evidenceType: text("evidence_type"), // e.g. policy, log, config
    ...timestamps(),
  },
  (table) => [index("scf_erl_control_idx").on(table.scfControlId)],
);

// ── SCF SCR-CMM Maturity Rubrics ─────────────────────────────────────────────
export const scfMaturityCriteria = pgTable(
  "scf_maturity_criteria",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    level: integer("level").notNull(), // 0-5
    criteriaText: text("criteria_text").notNull(),
    remediationGuidance: text("remediation_guidance"),
    ...timestamps(),
  },
  (table) => [
    index("scf_mc_control_level_idx").on(table.scfControlId, table.level),
    uniqueIndex("scf_mc_control_level_uidx").on(
      table.scfControlId,
      table.level,
    ),
  ],
);

// ── SCF Risk Catalog ──────────────────────────────────────────────────────────
export const scfRisks = pgTable(
  "scf_risks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    riskCode: text("risk_code").notNull(), // C|P-RMM code
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("scf_risks_version_code_uidx").on(
      table.scfVersionId,
      table.riskCode,
    ),
  ],
);

export const scfRiskControlMappings = pgTable(
  "scf_risk_control_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfRiskId: uuid("scf_risk_id")
      .notNull()
      .references(() => scfRisks.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("scf_rc_mapping_uidx").on(table.scfRiskId, table.scfControlId),
  ],
);

// ── SCF Threat Catalog ────────────────────────────────────────────────────────
export const scfThreats = pgTable(
  "scf_threats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    threatCode: text("threat_code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("scf_threats_version_code_uidx").on(
      table.scfVersionId,
      table.threatCode,
    ),
  ],
);

export const scfThreatControlMappings = pgTable(
  "scf_threat_control_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfThreatId: uuid("scf_threat_id")
      .notNull()
      .references(() => scfThreats.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("scf_tc_mapping_uidx").on(
      table.scfThreatId,
      table.scfControlId,
    ),
  ],
);

/**
 * Single Source of Truth for control implementation status.
 * The assessment is ALWAYS against SCF controls. Frameworks are projections (masks).
 *
 * Flow: Upload docs → AI assesses controls → status stored here
 *       → Apply ISO 27001 mask → project gaps/SoA
 *       → Apply SOC 2 mask    → project gaps/SoA (zero re-work)
 */
export const controlAssessmentStatus = pgTable(
  "control_assessment_status",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    implementationStatus: controlImplementationStatusEnum(
      "implementation_status",
    )
      .default("not_assessed")
      .notNull(),
    evidenceSummary: text("evidence_summary"),
    evidenceStrength:
      evidenceStrengthEnum("evidence_strength").default("not_checked"),
    maturityLevel: integer("maturity_level"),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }),
    assessedBy: uuid("assessed_by").references(() => users.id),
    assessedByAgentRunId: uuid("assessed_by_agent_run_id").references(
      () => agentRuns.id,
    ),
    assessedAt: timestamp("assessed_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("control_assessment_status_assessment_control_uidx").on(
      table.assessmentId,
      table.scfControlId,
    ),
    index("control_assessment_status_org_idx").on(table.organizationId),
    index("control_assessment_status_impl_status_idx").on(
      table.assessmentId,
      table.implementationStatus,
    ),
  ],
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    state: assessmentStateEnum("state").default("draft").notNull(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    createdBy: uuid("created_by").references(() => users.id),
    observationStartDate: date("observation_start_date"),
    observationEndDate: date("observation_end_date"),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("assessments_tenant_org_idx").on(table.organizationId),
    index("assessments_state_idx").on(table.state),
    index("assessments_scf_version_idx").on(table.scfVersionId),
  ],
);

export const assessmentFrameworks = pgTable(
  "assessment_frameworks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    scfFrameworkId: uuid("scf_framework_id")
      .notNull()
      .references(() => scfFrameworks.id),
    status: artifactStatusEnum("status").default("draft").notNull(),
    selectedBy: uuid("selected_by").references(() => users.id),
    selectedAt: timestamp("selected_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("assessment_frameworks_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    uniqueIndex("assessment_frameworks_assessment_framework_uidx").on(
      table.assessmentId,
      table.scfFrameworkId,
    ),
  ],
);

export const assessmentEvents = pgTable(
  "assessment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    previousState: assessmentStateEnum("previous_state"),
    nextState: assessmentStateEnum("next_state").notNull(),
    eventType: text("event_type").notNull(),
    actorId: uuid("actor_id").references(() => users.id),
    traceId: text("trace_id").notNull(),
    metadata: auditMetadata(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("assessment_events_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("assessment_events_trace_idx").on(table.traceId),
  ],
);

export const approvalEvents = pgTable(
  "approval_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    gate: approvalGateEnum("gate").notNull(),
    decision: approvalDecisionEnum("decision").notNull(),
    artifactType: text("artifact_type").notNull(),
    artifactId: uuid("artifact_id").notNull(),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id),
    comment: text("comment"),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("approval_events_assessment_gate_idx").on(
      table.organizationId,
      table.assessmentId,
      table.gate,
    ),
    index("approval_events_artifact_idx").on(
      table.artifactType,
      table.artifactId,
    ),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    originalFilename: text("original_filename").notNull(),
    storageProvider: storageProviderEnum("storage_provider")
      .default("r2")
      .notNull(),
    storageKey: text("storage_key").notNull(),
    contentHash: text("content_hash").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    classification: documentClassificationEnum("classification")
      .default("internal")
      .notNull(),
    documentType: documentTypeEnum("document_type").default("other").notNull(),
    effectiveDate: date("effective_date"),
    versionLabel: text("version_label"),
    language: text("language").default("und").notNull(),
    scanStatus: malwareScanStatusEnum("scan_status")
      .default("pending")
      .notNull(),
    malwareSignature: text("malware_signature"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("documents_tenant_org_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("documents_scan_status_idx").on(table.scanStatus),
    uniqueIndex("documents_storage_key_uidx").on(
      table.storageProvider,
      table.storageKey,
    ),
    uniqueIndex("documents_assessment_hash_uidx").on(
      table.organizationId,
      table.assessmentId,
      table.contentHash,
    ),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    versionNumber: integer("version_number").notNull(),
    storageKey: text("storage_key").notNull(),
    contentHash: text("content_hash").notNull(),
    status: artifactStatusEnum("status").default("draft").notNull(),
    scanStatus: malwareScanStatusEnum("scan_status")
      .default("pending")
      .notNull(),
    malwareSignature: text("malware_signature"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("document_versions_document_idx").on(table.documentId),
    index("document_versions_scan_status_idx").on(table.scanStatus),
    uniqueIndex("document_versions_document_number_uidx").on(
      table.documentId,
      table.versionNumber,
    ),
  ],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    documentVersionId: uuid("document_version_id").references(
      () => documentVersions.id,
    ),
    chunkIndex: integer("chunk_index").notNull(),
    textHash: text("text_hash").notNull(),
    pageNumber: integer("page_number"),
    locationMetadata: jsonb("location_metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    approximateTokenCount: integer("approximate_token_count"),
    ...timestamps(),
  },
  (table) => [
    index("document_chunks_document_idx").on(table.documentId),
    uniqueIndex("document_chunks_document_index_uidx").on(
      table.documentId,
      table.chunkIndex,
    ),
  ],
);

export const documentExtractionJobs = pgTable(
  "document_extraction_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    status: extractionJobStatusEnum("status").default("queued").notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("document_extraction_jobs_status_idx").on(table.status),
    index("document_extraction_jobs_document_idx").on(table.documentId),
  ],
);

export const kbEntries = pgTable(
  "kb_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    documentChunkId: uuid("document_chunk_id").references(
      () => documentChunks.id,
    ),
    entryType: text("entry_type").notNull(),
    contentHash: text("content_hash").notNull(),
    sourceSummary: text("source_summary"),
    ...timestamps(),
  },
  (table) => [
    index("kb_entries_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("kb_entries_chunk_idx").on(table.documentChunkId),
  ],
);

export const vectorReferences = pgTable(
  "vector_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    kbEntryId: uuid("kb_entry_id")
      .notNull()
      .references(() => kbEntries.id),
    vectorProvider: text("vector_provider")
      .default("cloudflare_vectorize")
      .notNull(),
    vectorIndexName: text("vector_index_name").notNull(),
    vectorId: text("vector_id").notNull(),
    metadata: auditMetadata(),
    ...timestamps(),
  },
  (table) => [
    index("vector_refs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    uniqueIndex("vector_refs_index_vector_uidx").on(
      table.vectorIndexName,
      table.vectorId,
    ),
  ],
);

export const kbEmbeddingJobs = pgTable(
  "kb_embedding_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    chunkId: uuid("chunk_id").references(() => documentChunks.id),
    jobType: text("job_type").notNull(),
    status: text("status").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    queuedAt: timestamp("queued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorCode: text("error_code"),
    errorMessageSafe: text("error_message_safe"),
    traceId: text("trace_id").notNull(),
    metadata: auditMetadata(),
    ...timestamps(),
  },
  (table) => [
    index("kb_embedding_jobs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("kb_embedding_jobs_document_idx").on(table.documentId),
    index("kb_embedding_jobs_status_idx").on(table.status),
    index("kb_embedding_jobs_trace_idx").on(table.traceId),
  ],
);

export const kbSearchLogs = pgTable(
  "kb_search_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    actorId: uuid("actor_id").references(() => users.id),
    queryHash: text("query_hash").notNull(),
    searchType: text("search_type").notNull(),
    filters: jsonb("filters")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    resultCount: integer("result_count").default(0).notNull(),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("kb_search_logs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("kb_search_logs_trace_idx").on(table.traceId),
    index("kb_search_logs_query_hash_idx").on(table.queryHash),
  ],
);

export const assessmentScope = pgTable(
  "assessment_scope",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    status: artifactStatusEnum("status").default("draft").notNull(),
    scopeVersion: integer("scope_version").default(1).notNull(),
    title: text("title"),
    description: text("description"),
    scopeSummary: text("scope_summary").notNull(),
    inclusions: jsonb("inclusions").$type<string[]>().default([]).notNull(),
    businessUnits: jsonb("business_units")
      .$type<string[]>()
      .default([])
      .notNull(),
    processes: jsonb("processes").$type<string[]>().default([]).notNull(),
    systems: jsonb("systems").$type<string[]>().default([]).notNull(),
    locations: jsonb("locations").$type<string[]>().default([]).notNull(),
    legalEntities: jsonb("legal_entities")
      .$type<string[]>()
      .default([])
      .notNull(),
    dataTypes: jsonb("data_types").$type<string[]>().default([]).notNull(),
    thirdParties: jsonb("third_parties")
      .$type<string[]>()
      .default([])
      .notNull(),
    exclusions: jsonb("exclusions").$type<string[]>().default([]).notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().default([]).notNull(),
    constraints: jsonb("constraints").$type<string[]>().default([]).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    approvalEventId: uuid("approval_event_id").references(
      () => approvalEvents.id,
    ),
    ...timestamps(),
  },
  (table) => [
    index("assessment_scope_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
  ],
);

export const soaVersions = pgTable(
  "soa_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    versionNumber: integer("version_number").notNull(),
    status: artifactStatusEnum("status").default("draft").notNull(),
    sourceFrameworkId: uuid("source_framework_id").references(
      () => scfFrameworks.id,
    ),
    scfVersionId: uuid("scf_version_id").references(() => scfVersions.id),
    sourceScopeId: uuid("source_scope_id").references(() => assessmentScope.id),
    approvalEventId: uuid("approval_event_id").references(
      () => approvalEvents.id,
    ),
    createdByAgentRunId: uuid("created_by_agent_run_id").references(
      () => agentRuns.id,
    ),
    createdBy: uuid("created_by").references(() => users.id),
    submittedForReviewAt: timestamp("submitted_for_review_at", {
      withTimezone: true,
    }),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    supersededBy: uuid("superseded_by"),
    traceId: text("trace_id"),
    metadata: auditMetadata(),
    ...timestamps(),
  },
  (table) => [
    index("soa_versions_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    uniqueIndex("soa_versions_assessment_version_uidx").on(
      table.assessmentId,
      table.versionNumber,
    ),
  ],
);

export const soaItems = pgTable(
  "soa_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    soaVersionId: uuid("soa_version_id")
      .notNull()
      .references(() => soaVersions.id),
    frameworkId: uuid("framework_id").references(() => scfFrameworks.id),
    frameworkRequirementId: uuid("framework_requirement_id").references(
      () => scfFrameworkRequirements.id,
    ),
    scfVersionId: uuid("scf_version_id").references(() => scfVersions.id),
    scfControlId: uuid("scf_control_id").references(() => scfControls.id),
    scfFrameworkRequirementId: uuid("scf_framework_requirement_id").references(
      () => scfFrameworkRequirements.id,
    ),
    applicability: text("applicability").notNull(),
    applicabilityStatus: text("applicability_status")
      .default("requires_validation")
      .notNull(),
    implementationStatus: text("implementation_status")
      .default("not_assessed")
      .notNull(),
    justification: text("justification"),
    applicabilityRationale: text("applicability_rationale"),
    nonApplicabilityRationale: text("non_applicability_rationale"),
    scopeRationale: text("scope_rationale"),
    evidenceSummary: text("evidence_summary"),
    evidenceCoverage: text("evidence_coverage")
      .default("not_checked")
      .notNull(),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }),
    requiresUserValidation: boolean("requires_user_validation")
      .default(true)
      .notNull(),
    validationNotes: text("validation_notes"),
    sourceMappingId: uuid("source_mapping_id").references(() => scfMappings.id),
    mappingStatus: text("mapping_status").default("official_mapping").notNull(),
    relationshipType: text("relationship_type"),
    relationshipStrength: text("relationship_strength"),
    responsibilityType: responsibilityTypeEnum("responsibility_type").default(
      "internal",
    ),
    ...timestamps(),
  },
  (table) => [
    index("soa_items_version_idx").on(table.soaVersionId),
    index("soa_items_control_idx").on(table.scfControlId),
    uniqueIndex("soa_items_version_control_requirement_uidx").on(
      table.soaVersionId,
      table.scfControlId,
      table.scfFrameworkRequirementId,
    ),
  ],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    agentName: text("agent_name").notNull(),
    agentVersion: text("agent_version").notNull(),
    modelProvider: text("model_provider"),
    modelName: text("model_name"),
    promptVersion: text("prompt_version").notNull(),
    inputHash: text("input_hash").notNull(),
    outputHash: text("output_hash"),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }),
    status: agentRunStatusEnum("status").default("queued").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("agent_runs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("agent_runs_trace_idx").on(table.traceId),
  ],
);

export const agentDecisions = pgTable(
  "agent_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id),
    decisionType: text("decision_type").notNull(),
    decisionSummary: text("decision_summary").notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().default([]).notNull(),
    limitations: jsonb("limitations").$type<string[]>().default([]).notNull(),
    sources: jsonb("sources")
      .$type<Record<string, unknown>[]>()
      .default([])
      .notNull(),
    confidenceScore: numeric("confidence_score", {
      precision: 5,
      scale: 4,
    }).notNull(),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_decisions_run_idx").on(table.agentRunId),
    index("agent_decisions_trace_idx").on(table.traceId),
  ],
);

export const agentToolCalls = pgTable(
  "agent_tool_calls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id),
    toolName: text("tool_name").notNull(),
    riskLevel: text("risk_level").notNull(),
    inputHash: text("input_hash").notNull(),
    outputHash: text("output_hash"),
    status: text("status").notNull(),
    traceId: text("trace_id").notNull(),
    metadata: auditMetadata(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_tool_calls_run_idx").on(table.agentRunId),
    index("agent_tool_calls_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("agent_tool_calls_trace_idx").on(table.traceId),
  ],
);

export const evidenceFindings = pgTable(
  "evidence_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    soaVersionId: uuid("soa_version_id")
      .notNull()
      .references(() => soaVersions.id),
    soaItemId: uuid("soa_item_id")
      .notNull()
      .references(() => soaItems.id),
    frameworkId: uuid("framework_id")
      .notNull()
      .references(() => scfFrameworks.id),
    frameworkRequirementId: uuid("framework_requirement_id")
      .notNull()
      .references(() => scfFrameworkRequirements.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfControlId: uuid("scf_control_id").references(() => scfControls.id),
    evidenceStrength: evidenceStrengthEnum("evidence_strength")
      .default("not_checked")
      .notNull(),
    evidenceStatus: evidenceStatusEnum("evidence_status")
      .default("not_evidenced")
      .notNull(),
    evidenceSummary: text("evidence_summary").notNull(),
    evidenceLimitations: jsonb("evidence_limitations")
      .$type<string[]>()
      .default([])
      .notNull(),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }),
    generatedByAgentRunId: uuid("generated_by_agent_run_id").references(
      () => agentRuns.id,
    ),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("evidence_findings_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("evidence_findings_soa_item_idx").on(table.soaItemId),
    index("evidence_findings_control_idx").on(table.scfControlId),
    index("evidence_findings_agent_idx").on(table.generatedByAgentRunId),
  ],
);

export const evidenceSources = pgTable(
  "evidence_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    evidenceFindingId: uuid("evidence_finding_id")
      .notNull()
      .references(() => evidenceFindings.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => documentChunks.id),
    vectorReferenceId: uuid("vector_reference_id").references(
      () => vectorReferences.id,
    ),
    sourceType: text("source_type").notNull(),
    sourceTitle: text("source_title"),
    sourceLocation: text("source_location"),
    snippet: text("snippet").notNull(),
    retrievalScore: numeric("retrieval_score", {
      precision: 8,
      scale: 6,
    }).notNull(),
    retrievalMethod: text("retrieval_method").notNull(),
    candidateEvidence: boolean("candidate_evidence").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("evidence_sources_finding_idx").on(table.evidenceFindingId),
    index("evidence_sources_chunk_idx").on(table.chunkId),
    index("evidence_sources_vector_reference_idx").on(table.vectorReferenceId),
  ],
);

export const gapAnalysisVersions = pgTable(
  "gap_analysis_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    versionNumber: integer("version_number").notNull(),
    status: artifactStatusEnum("status").default("draft").notNull(),
    sourceSoaVersionId: uuid("source_soa_version_id")
      .notNull()
      .references(() => soaVersions.id),
    frameworkId: uuid("framework_id")
      .notNull()
      .references(() => scfFrameworks.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    generatedByAgentRunId: uuid("generated_by_agent_run_id").references(
      () => agentRuns.id,
    ),
    createdBy: uuid("created_by").references(() => users.id),
    submittedForReviewAt: timestamp("submitted_for_review_at", {
      withTimezone: true,
    }),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvalEventId: uuid("approval_event_id").references(
      () => approvalEvents.id,
    ),
    supersededBy: uuid("superseded_by"),
    traceId: text("trace_id"),
    metadata: auditMetadata(),
    ...timestamps(),
  },
  (table) => [
    index("gap_versions_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    uniqueIndex("gap_versions_assessment_version_uidx").on(
      table.assessmentId,
      table.versionNumber,
    ),
  ],
);

export const gapFindings = pgTable(
  "gap_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    gapAnalysisVersionId: uuid("gap_analysis_version_id")
      .notNull()
      .references(() => gapAnalysisVersions.id),
    soaVersionId: uuid("soa_version_id")
      .notNull()
      .references(() => soaVersions.id),
    soaItemId: uuid("soa_item_id")
      .notNull()
      .references(() => soaItems.id),
    frameworkId: uuid("framework_id")
      .notNull()
      .references(() => scfFrameworks.id),
    frameworkRequirementId: uuid("framework_requirement_id")
      .notNull()
      .references(() => scfFrameworkRequirements.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    scfControlId: uuid("scf_control_id").references(() => scfControls.id),
    evidenceFindingId: uuid("evidence_finding_id").references(
      () => evidenceFindings.id,
    ),
    gapCode: text("gap_code").notNull(),
    assessmentStatus: gapStatusEnum("assessment_status").notNull(),
    gapType: gapTypeEnum("gap_type").notNull(),
    severity: severityEnum("severity").notNull(),
    impact: text("impact"),
    likelihood: text("likelihood"),
    gapSummary: text("gap_summary").notNull(),
    gapRationale: text("gap_rationale"),
    recommendationSummary: text("recommendation_summary"),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }),
    requiresUserValidation: boolean("requires_user_validation")
      .default(true)
      .notNull(),
    responsibilityType: responsibilityTypeEnum("responsibility_type").default(
      "internal",
    ),
    ...timestamps(),
  },
  (table) => [
    index("gap_findings_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("gap_findings_control_idx").on(table.scfControlId),
    index("gap_findings_requirement_idx").on(table.frameworkRequirementId),
    uniqueIndex("gap_findings_version_code_uidx").on(
      table.gapAnalysisVersionId,
      table.gapCode,
    ),
  ],
);

export const maturityAssessmentVersions = pgTable(
  "maturity_assessment_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    versionNumber: integer("version_number").notNull(),
    status: artifactStatusEnum("status").default("draft").notNull(),
    approvalEventId: uuid("approval_event_id").references(
      () => approvalEvents.id,
    ),
    createdByAgentRunId: uuid("created_by_agent_run_id").references(
      () => agentRuns.id,
    ),
    ...timestamps(),
  },
  (table) => [
    index("maturity_versions_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    uniqueIndex("maturity_versions_assessment_version_uidx").on(
      table.assessmentId,
      table.versionNumber,
    ),
  ],
);

export const maturityScores = pgTable(
  "maturity_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    maturityAssessmentVersionId: uuid("maturity_assessment_version_id")
      .notNull()
      .references(() => maturityAssessmentVersions.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    score: integer("score").notNull(),
    confidenceScore: numeric("confidence_score", {
      precision: 5,
      scale: 4,
    }).notNull(),
    rationale: text("rationale").notNull(),
    evidenceCoverage: numeric("evidence_coverage", {
      precision: 5,
      scale: 4,
    }).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("maturity_scores_version_idx").on(table.maturityAssessmentVersionId),
    index("maturity_scores_control_idx").on(table.scfControlId),
    uniqueIndex("maturity_scores_version_control_uidx").on(
      table.maturityAssessmentVersionId,
      table.scfControlId,
    ),
  ],
);

export const poamVersions = pgTable(
  "poam_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    versionNumber: integer("version_number").notNull(),
    status: artifactStatusEnum("status").default("draft").notNull(),
    sourceGapAnalysisVersionId: uuid(
      "source_gap_analysis_version_id",
    ).references(() => gapAnalysisVersions.id),
    sourceMaturityAssessmentVersionId: uuid(
      "source_maturity_assessment_version_id",
    ).references(() => maturityAssessmentVersions.id),
    frameworkId: uuid("framework_id").references(() => scfFrameworks.id),
    scfVersionId: uuid("scf_version_id").references(() => scfVersions.id),
    approvalEventId: uuid("approval_event_id").references(
      () => approvalEvents.id,
    ),
    generatedByAgentRunId: uuid("generated_by_agent_run_id").references(
      () => agentRuns.id,
    ),
    createdBy: uuid("created_by").references(() => users.id),
    submittedForReviewAt: timestamp("submitted_for_review_at", {
      withTimezone: true,
    }),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    supersededBy: uuid("superseded_by"),
    traceId: text("trace_id"),
    metadata: auditMetadata(),
    ...timestamps(),
  },
  (table) => [
    index("poam_versions_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("poam_versions_gap_idx").on(table.sourceGapAnalysisVersionId),
    uniqueIndex("poam_versions_assessment_version_uidx").on(
      table.assessmentId,
      table.versionNumber,
    ),
  ],
);

export const poamItems = pgTable(
  "poam_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    poamVersionId: uuid("poam_version_id")
      .notNull()
      .references(() => poamVersions.id),
    relatedGapFindingId: uuid("related_gap_finding_id").references(
      () => gapFindings.id,
    ),
    sourceMaturityScoreId: uuid("source_maturity_score_id").references(
      () => maturityScores.id,
    ),
    soaItemId: uuid("soa_item_id").references(() => soaItems.id),
    frameworkId: uuid("framework_id").references(() => scfFrameworks.id),
    frameworkRequirementId: uuid("framework_requirement_id").references(
      () => scfFrameworkRequirements.id,
    ),
    scfVersionId: uuid("scf_version_id").references(() => scfVersions.id),
    scfDomainId: uuid("scf_domain_id").references(() => scfDomains.id),
    scfControlId: uuid("scf_control_id").references(() => scfControls.id),
    poamCode: text("poam_code").notNull(),
    correctiveAction: text("corrective_action").notNull(),
    actionType: poamActionTypeEnum("action_type").notNull(),
    priority: priorityEnum("priority").notNull(),
    severity: severityEnum("severity").notNull(),
    riskRating: text("risk_rating").notNull(),
    effortEstimate: poamEffortEstimateEnum("effort_estimate")
      .default("unknown")
      .notNull(),
    suggestedOwner: text("suggested_owner"),
    ownerRole: text("owner_role"),
    dueDate: date("due_date"),
    targetMaturityScore: integer("target_maturity_score"),
    expectedEvidence: jsonb("expected_evidence")
      .$type<string[]>()
      .default([])
      .notNull(),
    acceptanceCriteria: jsonb("acceptance_criteria")
      .$type<string[]>()
      .default([])
      .notNull(),
    dependenciesSummary: text("dependencies_summary"),
    status: poamStatusEnum("status").default("draft").notNull(),
    rationale: text("rationale").notNull(),
    confidenceScore: numeric("confidence_score", {
      precision: 5,
      scale: 4,
    }).notNull(),
    requiresUserValidation: boolean("requires_user_validation")
      .default(false)
      .notNull(),
    riskAcceptanceExpiresAt: date("risk_acceptance_expires_at"),
    ...timestamps(),
  },
  (table) => [
    index("poam_items_version_idx").on(table.poamVersionId),
    index("poam_items_gap_idx").on(table.relatedGapFindingId),
    index("poam_items_control_idx").on(table.scfControlId),
    uniqueIndex("poam_items_version_code_uidx").on(
      table.poamVersionId,
      table.poamCode,
    ),
  ],
);

export const poamMilestones = pgTable(
  "poam_milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    poamItemId: uuid("poam_item_id")
      .notNull()
      .references(() => poamItems.id),
    milestoneCode: text("milestone_code").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    dueDate: date("due_date"),
    status: poamStatusEnum("status").default("draft").notNull(),
    acceptanceCriteria: jsonb("acceptance_criteria")
      .$type<string[]>()
      .default([])
      .notNull(),
    expectedEvidence: jsonb("expected_evidence")
      .$type<string[]>()
      .default([])
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    index("poam_milestones_item_idx").on(table.poamItemId),
    uniqueIndex("poam_milestones_item_code_uidx").on(
      table.poamItemId,
      table.milestoneCode,
    ),
  ],
);

export const poamDependencies = pgTable(
  "poam_dependencies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    poamItemId: uuid("poam_item_id")
      .notNull()
      .references(() => poamItems.id),
    dependsOnPoamItemId: uuid("depends_on_poam_item_id").references(
      () => poamItems.id,
    ),
    dependencyType: poamDependencyTypeEnum("dependency_type").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("poam_dependencies_item_idx").on(table.poamItemId),
    index("poam_dependencies_depends_on_idx").on(table.dependsOnPoamItemId),
  ],
);

export const reportVersions = pgTable(
  "report_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    versionNumber: integer("version_number").notNull(),
    reportType: reportTypeEnum("report_type").notNull(),
    title: text("title").notNull().default("Standard Assessment Report"),
    status: artifactStatusEnum("status").default("draft").notNull(),
    sourceScopeId: uuid("source_scope_id").references(() => assessmentScope.id),
    sourceSoaVersionId: uuid("source_soa_version_id").references(
      () => soaVersions.id,
    ),
    sourceGapAnalysisVersionId: uuid(
      "source_gap_analysis_version_id",
    ).references(() => gapAnalysisVersions.id),
    sourceMaturityAssessmentVersionId: uuid(
      "source_maturity_assessment_version_id",
    ).references(() => maturityAssessmentVersions.id),
    sourcePoamVersionId: uuid("source_poam_version_id").references(
      () => poamVersions.id,
    ),
    frameworkId: uuid("framework_id").references(() => scfFrameworks.id),
    scfVersionId: uuid("scf_version_id").references(() => scfVersions.id),
    approvalEventId: uuid("approval_event_id").references(
      () => approvalEvents.id,
    ),
    generatedByAgentRunId: uuid("generated_by_agent_run_id").references(
      () => agentRuns.id,
    ),
    createdBy: uuid("created_by").references(() => users.id),
    submittedForReviewAt: timestamp("submitted_for_review_at", {
      withTimezone: true,
    }),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    supersededBy: uuid("superseded_by"),
    traceId: text("trace_id").notNull().default("trace-not-set"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    index("report_versions_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("report_versions_sources_idx").on(
      table.sourceSoaVersionId,
      table.sourceGapAnalysisVersionId,
      table.sourcePoamVersionId,
    ),
    uniqueIndex("report_versions_assessment_type_version_uidx").on(
      table.assessmentId,
      table.reportType,
      table.versionNumber,
    ),
  ],
);

export const reportArtifacts = pgTable(
  "report_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    reportVersionId: uuid("report_version_id")
      .notNull()
      .references(() => reportVersions.id),
    artifactType: reportArtifactTypeEnum("artifact_type")
      .notNull()
      .default("report"),
    format: reportFormatEnum("format").notNull().default("json"),
    storageProvider: storageProviderEnum("storage_provider")
      .default("r2")
      .notNull(),
    storageBucket: text("storage_bucket"),
    storageKey: text("storage_key").notNull(),
    contentHash: text("content_hash").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("report_artifacts_version_idx").on(table.reportVersionId),
    uniqueIndex("report_artifacts_storage_key_uidx").on(
      table.storageProvider,
      table.storageKey,
    ),
  ],
);

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    reportVersionId: uuid("report_version_id").references(
      () => reportVersions.id,
    ),
    jobType: text("job_type").notNull(),
    status: exportJobStatusEnum("status").default("queued").notNull(),
    requestedFormat: reportFormatEnum("requested_format").notNull(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    queuedAt: timestamp("queued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorCode: text("error_code"),
    errorMessageSafe: text("error_message_safe"),
    traceId: text("trace_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
  },
  (table) => [
    index("export_jobs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("export_jobs_report_idx").on(table.reportVersionId),
    index("export_jobs_status_idx").on(table.status),
  ],
);

export const traceabilityLinks = pgTable(
  "traceability_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    relationshipType: text("relationship_type").notNull(),
    traceId: text("trace_id").notNull(),
    metadata: auditMetadata(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("traceability_links_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("traceability_links_source_idx").on(table.sourceType, table.sourceId),
    index("traceability_links_target_idx").on(table.targetType, table.targetId),
    index("traceability_links_trace_idx").on(table.traceId),
  ],
);

export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "pending",
  "running",
  "waiting_for_input",
  "waiting_for_approval",
  "blocked",
  "failed",
  "cancelled",
  "completed",
]);

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    status: workflowRunStatusEnum("status").default("pending").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    state: jsonb("state").$type<Record<string, unknown>>().notNull(),
    signalIdempotencyKeys: jsonb("signal_idempotency_keys")
      .$type<string[]>()
      .default([])
      .notNull(),
    stepIdempotencyKeys: jsonb("step_idempotency_keys")
      .$type<string[]>()
      .default([])
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    index("workflow_runs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("workflow_runs_status_idx").on(table.status),
    uniqueIndex("workflow_runs_idempotency_uidx").on(table.idempotencyKey),
  ],
);

export const workflowAuditEvents = pgTable(
  "workflow_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id),
    eventType: text("event_type").notNull(),
    stepName: text("step_name"),
    actorId: uuid("actor_id").references(() => users.id),
    systemActor: text("system_actor"),
    traceId: text("trace_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("workflow_audit_events_run_idx").on(table.workflowRunId),
    index("workflow_audit_events_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("workflow_audit_events_trace_idx").on(table.traceId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    traceId: text("trace_id"),
    metadata: auditMetadata(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_tenant_org_idx").on(table.organizationId),
    index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    actorId: uuid("actor_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull(),
    outcome: text("outcome").notNull(),
    source: text("source").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    messageSafe: text("message_safe").notNull(),
    traceId: text("trace_id").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadataSafe: jsonb("metadata_safe")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("security_events_org_idx").on(table.organizationId),
    index("security_events_type_idx").on(table.eventType),
    index("security_events_severity_idx").on(table.severity),
    index("security_events_trace_idx").on(table.traceId),
    index("security_events_created_idx").on(table.createdAt),
  ],
);

export const operationalMetrics = pgTable(
  "operational_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    metricName: text("metric_name").notNull(),
    metricType: text("metric_type").notNull(),
    metricValue: numeric("metric_value", { precision: 18, scale: 6 }).notNull(),
    unit: text("unit").notNull(),
    dimensions: jsonb("dimensions")
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .defaultNow()
      .notNull(),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("operational_metrics_org_idx").on(table.organizationId),
    index("operational_metrics_name_idx").on(table.metricName),
    index("operational_metrics_trace_idx").on(table.traceId),
    index("operational_metrics_created_idx").on(table.createdAt),
  ],
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    serviceName: text("service_name").notNull(),
    operationName: text("operation_name").notNull(),
    usageQuantity: numeric("usage_quantity", {
      precision: 18,
      scale: 6,
    }).notNull(),
    usageUnit: text("usage_unit").notNull(),
    provider: text("provider"),
    modelName: text("model_name"),
    resourceId: text("resource_id"),
    costAmount: numeric("cost_amount", { precision: 18, scale: 8 }),
    costCurrency: text("cost_currency").default("USD"),
    currency: text("currency").default("USD").notNull(),
    traceId: text("trace_id").notNull(),
    metadataSafe: jsonb("metadata_safe")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("usage_records_org_idx").on(table.organizationId),
    index("usage_records_service_idx").on(table.serviceName),
    index("usage_records_trace_idx").on(table.traceId),
    index("usage_records_created_idx").on(table.createdAt),
  ],
);

export const agentUsageRecords = pgTable(
  "agent_usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id),
    modelProvider: text("model_provider").notNull(),
    modelName: text("model_name").notNull(),
    promptTokens: integer("prompt_tokens").default(0).notNull(),
    completionTokens: integer("completion_tokens").default(0).notNull(),
    totalTokens: integer("total_tokens").default(0).notNull(),
    embeddingTokens: integer("embedding_tokens").default(0).notNull(),
    estimatedCost: numeric("estimated_cost", { precision: 18, scale: 8 }),
    currency: text("currency").default("USD").notNull(),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_usage_records_org_idx").on(table.organizationId),
    index("agent_usage_records_assessment_idx").on(table.assessmentId),
    index("agent_usage_records_agent_run_idx").on(table.agentRunId),
    index("agent_usage_records_trace_idx").on(table.traceId),
    index("agent_usage_records_created_idx").on(table.createdAt),
  ],
);

export const organizationRelations = relations(
  organizations,
  ({ one, many }) => ({
    memberships: many(memberships),
    assessments: many(assessments),
  }),
);

export const assessmentRelations = relations(assessments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [assessments.organizationId],
    references: [organizations.id],
  }),
  events: many(assessmentEvents),
  documents: many(documents),
}));

export const documentRelations = relations(documents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  assessment: one(assessments, {
    fields: [documents.assessmentId],
    references: [assessments.id],
  }),
  versions: many(documentVersions),
  chunks: many(documentChunks),
}));

export const documentChunkRelations = relations(
  documentChunks,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [documentChunks.documentId],
      references: [documents.id],
    }),
    kbEntries: many(kbEntries),
    evidenceSources: many(evidenceSources),
  }),
);

export const gapFindingRelations = relations(gapFindings, ({ one, many }) => ({
  version: one(gapAnalysisVersions, {
    fields: [gapFindings.gapAnalysisVersionId],
    references: [gapAnalysisVersions.id],
  }),
  scfControl: one(scfControls, {
    fields: [gapFindings.scfControlId],
    references: [scfControls.id],
  }),
  requirement: one(scfFrameworkRequirements, {
    fields: [gapFindings.frameworkRequirementId],
    references: [scfFrameworkRequirements.id],
  }),
  poamItems: many(poamItems),
}));

export const poamItemRelations = relations(poamItems, ({ one }) => ({
  version: one(poamVersions, {
    fields: [poamItems.poamVersionId],
    references: [poamVersions.id],
  }),
  relatedGap: one(gapFindings, {
    fields: [poamItems.relatedGapFindingId],
    references: [gapFindings.id],
  }),
}));

export const scfControlRelations = relations(scfControls, ({ one, many }) => ({
  version: one(scfVersions, {
    fields: [scfControls.scfVersionId],
    references: [scfVersions.id],
  }),
  domain: one(scfDomains, {
    fields: [scfControls.scfDomainId],
    references: [scfDomains.id],
  }),
  mappings: many(scfMappings),
}));

export const scfMappingRelations = relations(scfMappings, ({ one, many }) => ({
  requirement: one(scfFrameworkRequirements, {
    fields: [scfMappings.scfFrameworkRequirementId],
    references: [scfFrameworkRequirements.id],
  }),
  control: one(scfControls, {
    fields: [scfMappings.scfControlId],
    references: [scfControls.id],
  }),
  strmRelationships: many(scfStrmRelationships),
}));

export const controlAssessmentStatusRelations = relations(
  controlAssessmentStatus,
  ({ one }) => ({
    assessment: one(assessments, {
      fields: [controlAssessmentStatus.assessmentId],
      references: [assessments.id],
    }),
    scfControl: one(scfControls, {
      fields: [controlAssessmentStatus.scfControlId],
      references: [scfControls.id],
    }),
    scfVersion: one(scfVersions, {
      fields: [controlAssessmentStatus.scfVersionId],
      references: [scfVersions.id],
    }),
  }),
);

// ── Webhooks ──────────────────────────────────────────────────────

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
  "retrying",
]);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    url: text("url").notNull(),
    events: jsonb("events").$type<string[]>().default([]).notNull(),
    description: text("description"),
    enabled: boolean("enabled").default(true).notNull(),
    signingSecretHash: text("signing_secret_hash").notNull(),
    signingSecretMasked: text("signing_secret_masked").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("webhook_endpoints_tenant_org_idx").on(table.organizationId),
    index("webhook_endpoints_org_idx").on(table.organizationId),
  ],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: webhookDeliveryStatusEnum("status").default("pending").notNull(),
    httpStatus: integer("http_status"),
    attemptCount: integer("attempt_count").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    responseBody: text("response_body"),
    ...timestamps(),
  },
  (table) => [
    index("webhook_deliveries_endpoint_idx").on(table.endpointId),
    index("webhook_deliveries_event_id_idx").on(table.eventId),
    index("webhook_deliveries_status_idx").on(table.status),
  ],
);

// ─── Privacy Processing Activity ─────────────────────────────────
export * from "./privacy.schema";

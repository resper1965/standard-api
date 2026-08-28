import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import {
  mappingSourceEnum,
  scfIngestionModeEnum,
  strmOperatorEnum,
} from "./_shared-enums";
import { organizations } from "./core.schema";

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
    /**
     * SCRMS-PIG step (1-30) this control contributes to.
     * null = control not yet mapped to a SCRMS-PIG step.
     * Set at import time or via admin tooling; never inferred by LLM.
     */
    scrmsPigStep: integer("scrms_pig_step"),
    scrmsPigCategory: text("scrms_pig_category"), // "due_diligence" | "due_care" | null
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
    /** Official Focal Document Element (FDE) identifier used in the SCF STRM bundle.
     *  e.g. "A.5.1" for ISO 27001, "AC-1" for NIST 800-53, "7.1" for PCI DSS.
     *  Populated by the crosswalk importer and used to join with scf_strm_relationships.
     *  Distinct from requirement_code which may store SCF-internal or question text. */
    fdeCode: text("fde_code"),
    title: text("title").notNull(),
    description: text("description"),
    requirementText: text("requirement_text"),
    parentRequirementId: uuid("parent_requirement_id"),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: text("status").default("active").notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    /** Whether this requirement represents a Minimum Compliance Requirement (MCR) —
     *  a legally mandated control obligation rather than a best-practice recommendation.
     *  MCR gaps are treated as compliance blockers, not risk-based decisions.
     *  Source: SCF XLSX crosswalk column "Mandatory" or manual admin classification. */
    isMcr: boolean("is_mcr").default(false).notNull(),
    /** Human-readable rationale for why this requirement is classified as MCR.
     *  E.g. "Mandated by GDPR Art. 32 — technical measures for data security." */
    mcrRationale: text("mcr_rationale"),
    ...timestamps(),
  },
  (table) => [
    index("scf_requirements_framework_idx").on(table.scfFrameworkId),
    uniqueIndex("scf_requirements_framework_code_uidx").on(
      table.scfFrameworkId,
      table.requirementCode,
    ),
    index("scf_requirements_fde_code_idx").on(table.fdeCode),
    index("scf_requirements_mcr_idx").on(table.isMcr),
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
    // ⛔ ADR-001: usar strmOperatorEnum — NUNCA text livre com "direct"/"related"
    // Nullable de propósito: null = a origem não declara operador. Um default
    // aqui foi o que produziu 'intersects' em 79.127 de 79.133 linhas.
    relationshipType: strmOperatorEnum("relationship_type"),
    // Peso numérico 0.0–1.0 usado pelo STRMWeightCalculator para operador "intersects"
    // null = usar default (0.5) conforme ADR-001
    strengthScore: numeric("strength_score", { precision: 4, scale: 3 }),
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
    /** Optional: set when an scf_mapping row exists for this (fde_code, scf_control) pair. */
    scfMappingId: uuid("scf_mapping_id").references(() => scfMappings.id),
    /** Direct FK to the SCF control — always populated from bundle. */
    scfControlId: uuid("scf_control_id").references(() => scfControls.id),
    /** Official Focal Document Element identifier (e.g. "AC-1", "A.5.1", "7.1").
     *  This is the FDE # column from the STRM bundle XLSX. */
    fdeCode: text("fde_code"),
    /** Human-readable name of the FDE requirement. */
    fdeName: text("fde_name"),
    // ⛔ ADR-001: usar strmOperatorEnum — NUNCA text livre com "direct"/"related"
    relationshipType: strmOperatorEnum("relationship_type").notNull(),
    // Peso numérico 0.0–1.0 para operador "intersects"
    strengthScore: numeric("strength_score", { precision: 4, scale: 3 }),
    rationale: text("rationale"),
    source: text("source").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("scf_strm_mapping_idx").on(table.scfMappingId),
    index("scf_strm_control_idx").on(table.scfControlId),
    index("scf_strm_fde_code_idx").on(table.fdeCode),
    uniqueIndex("scf_strm_control_fde_uidx").on(
      table.scfControlId,
      table.fdeCode,
    ),
  ],
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

// ── SCF Risk Catalog ─────────────────────────────────────────────────────────
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

// ── SCF Threat Catalog ───────────────────────────────────────────────────────
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

import { relations } from "drizzle-orm";
import {
  boolean,
  date,
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
import { auditMetadata, timestamps } from "./_helpers";
import {
  approvalDecisionEnum,
  approvalGateEnum,
  artifactStatusEnum,
  assessmentMethodEnum,
  assessmentStateEnum,
  assuranceLevelEnum,
  controlImplementationStatusEnum,
  evidenceStatusEnum,
  evidenceStrengthEnum,
  gapStatusEnum,
  gapTypeEnum,
  poamActionTypeEnum,
  poamDependencyTypeEnum,
  poamEffortEstimateEnum,
  poamStatusEnum,
  priorityEnum,
  rocDeterminationEnum,
  riskTreatmentEnum,
  severityEnum,
  strmOperatorEnum,
  responsibilityTypeEnum,
} from "./_shared-enums";
import { organizations } from "./core.schema";
import {
  scfControls,
  scfDomains,
  scfFrameworkRequirements,
  scfFrameworks,
  scfMappings,
  scfRisks,
  scfStrmRelationships,
  scfVersions,
} from "./scf.schema";
import { agentRuns } from "./agent.schema";
import { documents, documentChunks, documentVersions } from "./document.schema";
import { kbEntries, vectorReferences } from "./kb.schema";

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
    assessedBy: uuid("assessed_by"),
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
    createdBy: uuid("created_by"),
    observationStartDate: date("observation_start_date"),
    observationEndDate: date("observation_end_date"),
    traceId: text("trace_id").notNull(),
    /**
     * Continuous Assessment Cycle support (SCRMS-PIG Due Care: Steps 27-30)
     * New cycles are new entities — closed assessments remain immutable (AGENTS.md §11).
     */
    parentAssessmentId: uuid("parent_assessment_id"), // nullable — FK enforced at runtime
    cycleNumber: integer("cycle_number").default(1).notNull(),
    baselineSoaVersionId: uuid("baseline_soa_version_id"), // nullable — SoA to carry forward
    /**
     * SCR-RMM Step 8: Assessment rigor / assurance level.
     * Determines how findings are interpreted by external auditors and downstream ROC reports.
     * l1_standard = self-assessment, l2_enhanced = reviewed, l3_comprehensive = tested/independent.
     */
    assuranceLevel:
      assuranceLevelEnum("assurance_level").default("l1_standard"),
    /**
     * SCR-CMM §Use Case 1: Target maturity level per SCF domain, set by CISO/assessor.
     * Format: { "ACM": 3, "CPL": 2, "GOV": 3, ... } (domain_code → target L0–L5).
     * Enables spider chart visualization of current vs target maturity by domain.
     * Managed via PUT /api/v1/assessments/:id/maturity-targets.
     */
    maturityDomainTargets: jsonb("maturity_domain_targets").$type<
      Record<string, number>
    >(),
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
    selectedBy: uuid("selected_by"),
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
    actorId: uuid("actor_id"),
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
    reviewerUserId: uuid("reviewer_user_id").notNull(),
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
    createdBy: uuid("created_by"),
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

/**
 * SCR-RMM Steps 13-15: Assessment Risk Register.
 *
 * Operational risk register scoped to an assessment. Each entry captures:
 *   - Source gap finding that identified the risk
 *   - Risk rating (inherent/residual, category)
 *   - Treatment decision and owner
 *   - Review cadence and ROC linkage
 *
 * Q-D decision (2026-06-09): scf_version_id REQUIRED for AGENTS.md §8 traceability.
 */
export const assessmentRiskRegister = pgTable(
  "assessment_risk_register",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    /** AGENTS.md §8: records the SCF version under which risk was scored and treated. */
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    /** Source gap finding that generated this risk register entry. */
    gapFindingId: uuid("gap_finding_id")
      .notNull()
      .references(() => gapFindings.id),
    /** Optional link to SCF Risk Catalog for normative risk traceability. */
    scfRiskId: uuid("scf_risk_id").references(() => scfRisks.id),
    riskTitle: text("risk_title").notNull(),
    riskDescription: text("risk_description"),
    /** SCR-RMM Step 12: Inherent risk score (IE × OL). */
    inherentRiskScore: numeric("inherent_risk_score", {
      precision: 6,
      scale: 2,
    }),
    /** SCR-RMM Step 12: Residual risk score (post-control mitigation). */
    residualRiskScore: numeric("residual_risk_score", {
      precision: 6,
      scale: 2,
    }),
    /** 5-category risk rating: low|moderate|high|severe|extreme */
    riskCategory: text("risk_category"),
    /** SCR-RMM Step 13: Treatment decision. */
    treatment: riskTreatmentEnum("treatment").notNull(),
    /** Rationale for treatment decision. Required for `accept` at extreme/severe (advisory). */
    treatmentRationale: text("treatment_rationale"),
    /** Owner responsible for executing or monitoring the treatment. */
    ownerId: uuid("owner_id"),
    /** Target date for treatment completion or next periodic review. */
    reviewDate: date("review_date"),
    /** ROC determination inherited from source gap finding (denormalized for reporting). */
    rocDetermination: rocDeterminationEnum("roc_determination"),
    /**
     * Input da aplicação consumidora (GRC / frontend): corporate risk appetite (0.0–1.0).
     * O Standard NÃO gerencia risk appetite — apenas recebe e armazena o valor usado no assessment.
     */
    riskAppetiteInput: numeric("risk_appetite_input", {
      precision: 4,
      scale: 2,
    }),
    /**
     * Input da aplicação consumidora: LOB/unit risk tolerance (0.0–1.0).
     * Usado para calcular within_tolerance: residual_risk_score <= risk_tolerance_input.
     */
    riskToleranceInput: numeric("risk_tolerance_input", {
      precision: 4,
      scale: 2,
    }),
    /**
     * Input da aplicação consumidora: departmental risk threshold (0.0–1.0).
     * Armazenado como contexto de rastreabilidade — não usado no cálculo de within_tolerance.
     */
    riskThresholdInput: numeric("risk_threshold_input", {
      precision: 4,
      scale: 2,
    }),
    /**
     * Calculado pelo Standard: residual_risk_score <= risk_tolerance_input.
     * null quando risk_tolerance_input não foi fornecido pela aplicação.
     */
    withinTolerance: boolean("within_tolerance"),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("arr_org_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("arr_gap_finding_idx").on(table.gapFindingId),
    uniqueIndex("arr_assessment_finding_uidx").on(
      table.assessmentId,
      table.gapFindingId,
    ),
  ],
);

// ── Assessment Control Events — Ledger Append-Only (ADR-002) ─────────────────
// ⛔ NEVER UPDATE OR DELETE rows from this table.
// ⛔ State = reducer over all events for (assessment_id, scf_control_id).
// Reference: docs/decisions/ADR-002-ledger-append-only.md
export const assessmentControlEvents = pgTable(
  "assessment_control_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    // 'status_changed' | 'evidence_added' | 'finding_created' | 'approval_gate' | 'mutation_blocked' | 'third_party_inherited'
    eventType: text("event_type").notNull(),
    previousValue: jsonb("previous_value").$type<Record<string, unknown>>(),
    newValue: jsonb("new_value").$type<Record<string, unknown>>().notNull(),
    actorId: uuid("actor_id"),
    agentRunId: uuid("agent_run_id").references(() => agentRuns.id),
    traceId: text("trace_id").notNull(),
    // NO updated_at. NO deleted_at. Append-only = immutable record.
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ace_org_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("ace_control_idx").on(table.assessmentId, table.scfControlId),
    index("ace_trace_idx").on(table.traceId),
    index("ace_occurred_at_idx").on(table.occurredAt),
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

// ── SoA ──────────────────────────────────────────────────────────────────────

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
    createdBy: uuid("created_by"),
    submittedForReviewAt: timestamp("submitted_for_review_at", {
      withTimezone: true,
    }),
    approvedBy: uuid("approved_by"),
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
    // ADR-001: canonical STRM operator (same as scf_mappings/scf_strm_relationships)
    relationshipType: strmOperatorEnum("relationship_type"),
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

// ── Evidence ─────────────────────────────────────────────────────────────────

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

// ── Gap Analysis ─────────────────────────────────────────────────────────────

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
    createdBy: uuid("created_by"),
    submittedForReviewAt: timestamp("submitted_for_review_at", {
      withTimezone: true,
    }),
    approvedBy: uuid("approved_by"),
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
    /** MCR flag: true when the gap is tied to a Minimum Compliance Requirement (SCRMS-PIG Step 1c) */
    isMcrGap: boolean("is_mcr_gap").default(false).notNull(),
    responsibilityType: responsibilityTypeEnum("responsibility_type").default(
      "internal",
    ),
    /**
     * SCR-RMM Step 14: Report on Conformity determination for this finding.
     * Derived automatically from severity during gap analysis draft creation.
     * critical/high → material_weakness, medium → significant_deficiency,
     * low + not_met → conforms, met/no_gap → strictly_conforms.
     * Can be overridden by a human reviewer before approval.
     */
    rocDetermination: rocDeterminationEnum("roc_determination"),
    /**
     * SCR-RMM Step 12: Inherent risk score = Impact Effect × Occurrence Likelihood (1-36 range).
     * Null until risk scoring is computed.
     */
    inherentRiskScore: numeric("inherent_risk_score", {
      precision: 6,
      scale: 2,
    }),
    /**
     * SCR-RMM Step 12: Residual risk score = Inherent × (1 - control_weight × maturity_factor).
     */
    residualRiskScore: numeric("residual_risk_score", {
      precision: 6,
      scale: 2,
    }),
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
    index("gap_findings_roc_idx").on(table.rocDetermination),
    index("gap_findings_mcr_idx").on(table.isMcrGap),
  ],
);

// ── Maturity ─────────────────────────────────────────────────────────────────

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
    /**
     * SCR-CMM §Assessment Methods: how this control was assessed.
     * examine = artifact review, interview = discussions, test = technical exercise.
     * Optional — defaults to examine if not specified.
     */
    assessmentMethod: assessmentMethodEnum("assessment_method"),
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

// ── POA&M ────────────────────────────────────────────────────────────────────

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
    createdBy: uuid("created_by"),
    submittedForReviewAt: timestamp("submitted_for_review_at", {
      withTimezone: true,
    }),
    approvedBy: uuid("approved_by"),
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

// ── Relations ────────────────────────────────────────────────────────────────

export const organizationRelations = relations(organizations, ({ many }) => ({
  assessments: many(assessments),
}));

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

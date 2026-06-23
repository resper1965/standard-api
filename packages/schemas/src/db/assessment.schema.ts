/**
 * @module assessment.schema
 * @description Assessment core domain tables — the foundation entities that all
 * other assessment lifecycle domains (SoA, Evidence, Gap, Maturity, POA&M) reference.
 *
 * Split from the original monolithic assessment.schema.ts for maintainability.
 * All exports remain available through the barrel in schema.ts.
 */
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
  assessmentStateEnum,
  assuranceLevelEnum,
  controlImplementationStatusEnum,
  evidenceStrengthEnum,
  riskTreatmentEnum,
  rocDeterminationEnum,
  severityEnum,
} from "./_shared-enums";
import { organizations } from "./core.schema";
import {
  scfControls,
  scfFrameworks,
  scfRisks,
  scfVersions,
} from "./scf.schema";
import { agentRuns } from "./agent.schema";

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
 *
 * NOTE: gapFindingId FK uses lazy import from gap.schema.ts to avoid circular deps.
 *       Drizzle resolves lazy FKs at migration-generation time.
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
    gapFindingId: uuid("gap_finding_id").notNull(),
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

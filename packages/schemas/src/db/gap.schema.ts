/**
 * @module gap.schema
 * @description Gap Analysis domain tables.
 */

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
import { auditMetadata, timestamps } from "./_helpers";
import {
  artifactStatusEnum,
  gapStatusEnum,
  gapTypeEnum,
  responsibilityTypeEnum,
  rocDeterminationEnum,
  severityEnum,
} from "./_shared-enums";
import { organizations } from "./core.schema";
import { assessments, approvalEvents } from "./assessment.schema";
import { soaVersions, soaItems } from "./soa.schema";
import { evidenceFindings } from "./evidence.schema";
import {
  scfControls,
  scfFrameworkRequirements,
  scfFrameworks,
  scfVersions,
} from "./scf.schema";
import { agentRuns } from "./agent.schema";

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

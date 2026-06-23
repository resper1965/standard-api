/**
 * @module poam.schema
 * @description Plan of Action and Milestones (POA&M) domain tables.
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
import { timestamps } from "./_helpers";
import { auditMetadata } from "./_helpers";
import {
  artifactStatusEnum,
  poamActionTypeEnum,
  poamDependencyTypeEnum,
  poamEffortEstimateEnum,
  poamStatusEnum,
  priorityEnum,
  severityEnum,
} from "./_shared-enums";
import { organizations } from "./core.schema";
import { assessments, approvalEvents } from "./assessment.schema";
import { soaItems } from "./soa.schema";
import { gapAnalysisVersions, gapFindings } from "./gap.schema";
import { maturityAssessmentVersions, maturityScores } from "./maturity.schema";
import {
  scfControls,
  scfDomains,
  scfFrameworkRequirements,
  scfFrameworks,
  scfVersions,
} from "./scf.schema";
import { agentRuns } from "./agent.schema";

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

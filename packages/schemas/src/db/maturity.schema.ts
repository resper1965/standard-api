/**
 * @module maturity.schema
 * @description Maturity Assessment domain tables.
 */

import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { artifactStatusEnum, assessmentMethodEnum } from "./_shared-enums";
import { organizations } from "./core.schema";
import { assessments, approvalEvents } from "./assessment.schema";
import { scfControls } from "./scf.schema";
import { agentRuns } from "./agent.schema";

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

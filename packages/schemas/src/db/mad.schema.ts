import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { madPhaseEnum, madTransactionTypeEnum } from "./_shared-enums";
import { organizations } from "./core.schema";
import { assessments } from "./assessment.schema";
import { scfControls, scfVersions } from "./scf.schema";

// ── MA&D Standard Catalog ───────────────────────────────────────────────────
export const madStandards = pgTable(
  "mad_standards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    standardNumber: integer("standard_number").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    phase: madPhaseEnum("phase").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("mad_standards_version_idx").on(table.scfVersionId),
    uniqueIndex("mad_standards_version_code_uidx").on(
      table.scfVersionId,
      table.code,
    ),
  ],
);

export const madSubRequirements = pgTable(
  "mad_sub_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    madStandardId: uuid("mad_standard_id")
      .notNull()
      .references(() => madStandards.id),
    requirementCode: text("requirement_code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("mad_subreq_standard_idx").on(table.madStandardId),
    uniqueIndex("mad_subreq_version_code_uidx").on(
      table.scfVersionId,
      table.requirementCode,
    ),
  ],
);

export const madMaturityCriteria = pgTable(
  "mad_maturity_criteria",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    madSubRequirementId: uuid("mad_sub_requirement_id")
      .notNull()
      .references(() => madSubRequirements.id),
    level: integer("level").notNull(),
    criteriaText: text("criteria_text").notNull(),
    remediationGuidance: text("remediation_guidance"),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("mad_mc_subreq_idx").on(table.madSubRequirementId),
    uniqueIndex("mad_mc_subreq_level_uidx").on(
      table.madSubRequirementId,
      table.level,
    ),
  ],
);

export const madControlMappings = pgTable(
  "mad_control_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    madSubRequirementId: uuid("mad_sub_requirement_id")
      .notNull()
      .references(() => madSubRequirements.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    relationshipNote: text("relationship_note"),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("mad_cm_subreq_idx").on(table.madSubRequirementId),
    index("mad_cm_control_idx").on(table.scfControlId),
    uniqueIndex("mad_cm_subreq_control_uidx").on(
      table.madSubRequirementId,
      table.scfControlId,
    ),
  ],
);

export const madTransactionAssessments = pgTable(
  "mad_transaction_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    transactionName: text("transaction_name").notNull(),
    transactionType: madTransactionTypeEnum("transaction_type").notNull(),
    targetEntityName: text("target_entity_name"),
    transactionDate: text("transaction_date"),
    status: text("status").default("draft").notNull(),
    scfVersionId: uuid("scf_version_id").references(() => scfVersions.id),
    createdBy: uuid("created_by"),
    ...timestamps(),
  },
  (table) => [
    index("mad_ta_org_idx").on(table.organizationId),
    index("mad_ta_assessment_idx").on(table.assessmentId),
  ],
);

export const madMaturityScores = pgTable(
  "mad_maturity_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    madTransactionAssessmentId: uuid("mad_transaction_assessment_id")
      .notNull()
      .references(() => madTransactionAssessments.id),
    madSubRequirementId: uuid("mad_sub_requirement_id")
      .notNull()
      .references(() => madSubRequirements.id),
    score: integer("score").notNull(),
    rationale: text("rationale"),
    assessedBy: uuid("assessed_by"),
    assessedAt: timestamp("assessed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("mad_ms_transaction_idx").on(table.madTransactionAssessmentId),
    uniqueIndex("mad_ms_transaction_subreq_uidx").on(
      table.madTransactionAssessmentId,
      table.madSubRequirementId,
    ),
  ],
);

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { cdpasRatingEnum } from "./_shared-enums";
import { organizations } from "./core.schema";
import { assessments } from "./assessment.schema";
import { scfControls, scfVersions } from "./scf.schema";

// ── CDPAS Standard Catalog ───────────────────────────────────────────────────
export const cdpasStandards = pgTable(
  "cdpas_standards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    standardNumber: integer("standard_number").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("cdpas_standards_version_idx").on(table.scfVersionId),
    uniqueIndex("cdpas_standards_version_code_uidx").on(
      table.scfVersionId,
      table.code,
    ),
  ],
);

export const cdpasSubRequirements = pgTable(
  "cdpas_sub_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    cdpasStandardId: uuid("cdpas_standard_id")
      .notNull()
      .references(() => cdpasStandards.id),
    requirementCode: text("requirement_code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    assessmentMethods: jsonb("assessment_methods")
      .$type<Array<"examine" | "interview" | "test">>()
      .default([])
      .notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("cdpas_subreq_standard_idx").on(table.cdpasStandardId),
    uniqueIndex("cdpas_subreq_version_code_uidx").on(
      table.scfVersionId,
      table.requirementCode,
    ),
  ],
);

export const cdpasControlMappings = pgTable(
  "cdpas_control_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    cdpasSubRequirementId: uuid("cdpas_sub_requirement_id")
      .notNull()
      .references(() => cdpasSubRequirements.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    relationshipNote: text("relationship_note"),
    isSynthetic: boolean("is_synthetic").default(false).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("cdpas_cm_subreq_idx").on(table.cdpasSubRequirementId),
    index("cdpas_cm_control_idx").on(table.scfControlId),
    uniqueIndex("cdpas_cm_subreq_control_uidx").on(
      table.cdpasSubRequirementId,
      table.scfControlId,
    ),
  ],
);

export const cdpasAssessmentFindings = pgTable(
  "cdpas_assessment_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    cdpasSubRequirementId: uuid("cdpas_sub_requirement_id")
      .notNull()
      .references(() => cdpasSubRequirements.id),
    rating: cdpasRatingEnum("rating").default("not_assessed").notNull(),
    methodUsed: jsonb("method_used")
      .$type<Array<"examine" | "interview" | "test">>()
      .default([])
      .notNull(),
    findingSummary: text("finding_summary"),
    evidenceSummary: text("evidence_summary"),
    assessedBy: uuid("assessed_by"),
    assessedAt: timestamp("assessed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("cdpas_findings_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("cdpas_findings_subreq_idx").on(table.cdpasSubRequirementId),
    uniqueIndex("cdpas_findings_assessment_subreq_uidx").on(
      table.assessmentId,
      table.cdpasSubRequirementId,
    ),
  ],
);

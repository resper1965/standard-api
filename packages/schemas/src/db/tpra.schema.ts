import {
  index,
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
  tpraAssessmentStatusEnum,
  tpraRiskCategoryEnum,
  tpraVendorTypeEnum,
} from "./_shared-enums";
import { organizations } from "./core.schema";
import { assessments } from "./assessment.schema";
import { scfControls, scfVersions } from "./scf.schema";

export const tpraVendors = pgTable(
  "tpra_vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    vendorName: text("vendor_name").notNull(),
    vendorType: tpraVendorTypeEnum("vendor_type"),
    contactEmail: text("contact_email"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("tpra_vendors_org_idx").on(table.organizationId),
    uniqueIndex("tpra_vendors_org_name_uidx").on(
      table.organizationId,
      table.vendorName,
    ),
  ],
);

export const tpraVendorControls = pgTable(
  "tpra_vendor_controls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => tpraVendors.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("tpra_vendor_ctrls_org_idx").on(table.organizationId),
    uniqueIndex("tpra_vendor_ctrls_uidx").on(
      table.vendorId,
      table.scfControlId,
    ),
  ],
);

export const tpraAssessments = pgTable(
  "tpra_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => tpraVendors.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    status: tpraAssessmentStatusEnum("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    responses: jsonb("responses")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("tpra_assessments_org_vendor_idx").on(
      table.organizationId,
      table.vendorId,
    ),
    index("tpra_assessments_status_idx").on(table.status),
  ],
);

export const tpraRiskScores = pgTable(
  "tpra_risk_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    tpraAssessmentId: uuid("tpra_assessment_id")
      .notNull()
      .references(() => tpraAssessments.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => tpraVendors.id),
    rawScore: numeric("raw_score", { precision: 5, scale: 2 }).notNull(),
    riskCategory: tpraRiskCategoryEnum("risk_category").notNull(),
    scfDomainFailures: jsonb("scf_domain_failures")
      .$type<string[]>()
      .default([])
      .notNull(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    traceId: text("trace_id").notNull(),
    // Append-only: no updated_at, no deleted_at
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tpra_risk_scores_assessment_idx").on(table.tpraAssessmentId),
    index("tpra_risk_scores_vendor_idx").on(table.vendorId),
    index("tpra_risk_scores_computed_at_idx").on(table.computedAt),
  ],
);

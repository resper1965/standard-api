/**
 * @module soa.schema
 * @description Statement of Applicability (SoA) domain tables.
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
  responsibilityTypeEnum,
  strmOperatorEnum,
} from "./_shared-enums";
import { organizations } from "./core.schema";
import {
  assessments,
  assessmentScope,
  approvalEvents,
} from "./assessment.schema";
import {
  scfControls,
  scfFrameworkRequirements,
  scfFrameworks,
  scfMappings,
  scfVersions,
} from "./scf.schema";
import { agentRuns } from "./agent.schema";

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

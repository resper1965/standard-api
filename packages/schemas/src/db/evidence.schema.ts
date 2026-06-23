/**
 * @module evidence.schema
 * @description Evidence findings and sources domain tables.
 */
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { organizations } from "./core.schema";
import { assessments } from "./assessment.schema";
import { soaVersions, soaItems } from "./soa.schema";
import {
  scfControls,
  scfFrameworkRequirements,
  scfFrameworks,
  scfVersions,
} from "./scf.schema";
import { agentRuns } from "./agent.schema";
import { documents, documentChunks } from "./document.schema";
import { vectorReferences } from "./kb.schema";
import { evidenceStrengthEnum, evidenceStatusEnum } from "./_shared-enums";

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

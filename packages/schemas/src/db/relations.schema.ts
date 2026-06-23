/**
 * @module relations.schema
 * @description Drizzle ORM relation definitions that span across domain tables.
 */

import { relations } from "drizzle-orm";
import { organizations } from "./core.schema";
import {
  assessments,
  assessmentEvents,
  controlAssessmentStatus,
} from "./assessment.schema";
import { documents, documentChunks, documentVersions } from "./document.schema";
import { kbEntries } from "./kb.schema";
import { evidenceSources } from "./evidence.schema";
import { gapAnalysisVersions, gapFindings } from "./gap.schema";
import { poamVersions, poamItems } from "./poam.schema";
import {
  scfControls,
  scfDomains,
  scfFrameworkRequirements,
  scfMappings,
  scfStrmRelationships,
  scfVersions,
} from "./scf.schema";

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

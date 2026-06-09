/**
 * @module gap-analysis.repository
 * @description Drizzle PostgreSQL repositories for Gap Analysis.
 * Uses $inferSelect types for row mappers so column names match exactly.
 */
import { eq } from "drizzle-orm";

import {
  evidenceFindings,
  evidenceSources,
  gapAnalysisVersions,
  gapFindings,
} from "@standard/schemas";
import type {
  EvidenceFindingResponse,
  EvidenceSourceResponse,
  GapAnalysisVersionResponse,
  GapFindingResponse,
} from "@standard/schemas";
import type {
  EvidenceFindingRepository,
  EvidenceSourceRepository,
  GapAnalysisVersionRepository,
  GapFindingRepository,
  GapAnalysisRepositories,
} from "@standard/gap-analysis";
import type { DbClient } from "./db";

const createDrizzleEvidenceFindingRepository = (
  db: DbClient,
): EvidenceFindingRepository => {
  const repo = {
    async save(finding: EvidenceFindingResponse) {
      await db
        .insert(evidenceFindings)
        .values({
          id: String(finding.evidence_finding_id) as any,
          organizationId: String(finding.organization_id),
          assessmentId: String(finding.assessment_id),
          soaVersionId: String(finding.soa_version_id),
          soaItemId: String(finding.soa_item_id),
          frameworkId:
            finding.framework_id != null ? String(finding.framework_id) : "",
          frameworkRequirementId:
            finding.framework_requirement_id != null
              ? String(finding.framework_requirement_id)
              : "",
          scfVersionId: String(finding.scf_version_id),
          scfControlId:
            finding.scf_control_id != null
              ? String(finding.scf_control_id)
              : null,

          evidenceStrength: String(finding.evidence_strength) as any,

          evidenceStatus: String(finding.evidence_status) as any,
          evidenceSummary: String(finding.evidence_summary),
          evidenceLimitations: [],
          confidenceScore: String(finding.confidence_score),
          generatedByAgentRunId:
            finding.generated_by_agent_run_id != null
              ? String(finding.generated_by_agent_run_id)
              : null,
          traceId: String(finding.trace_id),
        })
        .onConflictDoNothing();
    },
    async update(finding: EvidenceFindingResponse) {
      await db
        .update(evidenceFindings)
        .set({
          evidenceStrength: String(finding.evidence_strength) as any,

          evidenceStatus: String(finding.evidence_status) as any,
          evidenceSummary: String(finding.evidence_summary),
          evidenceLimitations: [],
          confidenceScore: String(finding.confidence_score),
          updatedAt: new Date(),
        })
        .where(eq(evidenceFindings.id, String(finding.evidence_finding_id)));
    },
    async get(evidenceFindingId: string, _organizationId: string) {
      const [row] = await db
        .select()
        .from(evidenceFindings)
        .where(eq(evidenceFindings.id, evidenceFindingId))
        .limit(1);
      return row ? mapEvidenceFindingRow(row) : null;
    },
    async listByAssessment(assessmentId: string, _organizationId: string) {
      const rows = await db
        .select()
        .from(evidenceFindings)
        .where(eq(evidenceFindings.assessmentId, assessmentId));
      return rows.map(mapEvidenceFindingRow);
    },
    async findBySoaItem(soaItemId: string, _organizationId: string) {
      const [row] = await db
        .select()
        .from(evidenceFindings)
        .where(eq(evidenceFindings.soaItemId, soaItemId))
        .limit(1);
      return row ? mapEvidenceFindingRow(row) : null;
    },
    withOrganization(organizationId: string) {
      return {
        save: (finding: EvidenceFindingResponse) => repo.save(finding),
        update: (finding: EvidenceFindingResponse) => repo.update(finding),
        get: (evidenceFindingId: string) =>
          repo.get(evidenceFindingId, organizationId),
        listByAssessment: (assessmentId: string) =>
          repo.listByAssessment(assessmentId, organizationId),
        findBySoaItem: (soaItemId: string) =>
          repo.findBySoaItem(soaItemId, organizationId),
      };
    },
  };
  return repo;
};

const createDrizzleEvidenceSourceRepository = (
  db: DbClient,
): EvidenceSourceRepository => {
  const repo = {
    async saveMany(sources: EvidenceSourceResponse[]) {
      if (sources.length === 0) return;
      await db
        .insert(evidenceSources)
        .values(
          sources.map((s) => ({
            id: String(s.evidence_source_id) as any,
            organizationId: String(s.organization_id),
            assessmentId: String(s.assessment_id),
            evidenceFindingId: String(s.evidence_finding_id),
            documentId: String(s.document_id),
            chunkId: String(s.chunk_id),
            vectorReferenceId:
              s.vector_reference_id != null
                ? String(s.vector_reference_id)
                : null,
            sourceType: String(s.source_type) as
              | "document_chunk"
              | "kb_entry"
              | "vector_result"
              | "manual",
            sourceTitle: s.source_title != null ? String(s.source_title) : null,
            sourceLocation:
              s.source_location != null ? String(s.source_location) : null,
            snippet: String(s.snippet),
            retrievalScore: String(s.retrieval_score),
            retrievalMethod: String(s.retrieval_method) as
              | "semantic"
              | "keyword"
              | "hybrid"
              | "manual",
            candidateEvidence: Boolean(s.candidate_evidence),
          })),
        )
        .onConflictDoNothing();
    },
    async listByFinding(evidenceFindingId: string, _organizationId: string) {
      const rows = await db
        .select()
        .from(evidenceSources)
        .where(eq(evidenceSources.evidenceFindingId, evidenceFindingId));
      return rows.map(mapEvidenceSourceRow);
    },
    withOrganization(organizationId: string) {
      return {
        saveMany: (sources: EvidenceSourceResponse[]) => repo.saveMany(sources),
        listByFinding: (evidenceFindingId: string) =>
          repo.listByFinding(evidenceFindingId, organizationId),
      };
    },
  };
  return repo;
};

const createDrizzleGapAnalysisVersionRepository = (
  db: DbClient,
): GapAnalysisVersionRepository => {
  const repo = {
    async save(version: GapAnalysisVersionResponse) {
      await db
        .insert(gapAnalysisVersions)
        .values({
          id: String(version.gap_analysis_version_id) as any,
          organizationId: String(version.organization_id),
          assessmentId: String(version.assessment_id),
          versionNumber: Number(version.version_number),
          status: String(version.status) as
            | "draft"
            | "under_review"
            | "approved"
            | "superseded"
            | "archived",
          sourceSoaVersionId: String(version.source_soa_version_id),
          frameworkId: String(version.framework_id),
          scfVersionId: String(version.scf_version_id),
          generatedByAgentRunId:
            version.generated_by_agent_run_id != null
              ? String(version.generated_by_agent_run_id)
              : null,
          createdBy:
            version.created_by != null ? String(version.created_by) : null,
          traceId: String(version.trace_id),
          metadata: (version.metadata ?? {}) as Record<string, unknown>,
        })
        .onConflictDoNothing();
    },
    async update(version: GapAnalysisVersionResponse) {
      await db
        .update(gapAnalysisVersions)
        .set({
          status: String(version.status) as
            | "draft"
            | "under_review"
            | "approved"
            | "superseded"
            | "archived",
          submittedForReviewAt: version.submitted_for_review_at
            ? new Date(version.submitted_for_review_at)
            : undefined,
          approvedBy:
            version.approved_by != null ? String(version.approved_by) : null,
          approvedAt: version.approved_at
            ? new Date(version.approved_at)
            : undefined,
          approvalEventId:
            version.approval_event_id != null
              ? String(version.approval_event_id)
              : null,
          supersededBy:
            version.superseded_by != null
              ? String(version.superseded_by)
              : null,
          metadata: (version.metadata ?? {}) as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(
          eq(gapAnalysisVersions.id, String(version.gap_analysis_version_id)),
        );
    },
    async get(gapAnalysisVersionId: string, _organizationId: string) {
      const [row] = await db
        .select()
        .from(gapAnalysisVersions)
        .where(eq(gapAnalysisVersions.id, gapAnalysisVersionId))
        .limit(1);
      return row ? mapGapVersionRow(row) : null;
    },
    async listByAssessment(assessmentId: string, _organizationId: string) {
      const rows = await db
        .select()
        .from(gapAnalysisVersions)
        .where(eq(gapAnalysisVersions.assessmentId, assessmentId));
      return rows.map(mapGapVersionRow);
    },
    withOrganization(organizationId: string) {
      return {
        save: (version: GapAnalysisVersionResponse) => repo.save(version),
        update: (version: GapAnalysisVersionResponse) => repo.update(version),
        get: (gapAnalysisVersionId: string) =>
          repo.get(gapAnalysisVersionId, organizationId),
        listByAssessment: (assessmentId: string) =>
          repo.listByAssessment(assessmentId, organizationId),
      };
    },
  };
  return repo;
};

const createDrizzleGapFindingRepository = (
  db: DbClient,
): GapFindingRepository => {
  const repo = {
    async saveMany(findings: GapFindingResponse[]) {
      if (findings.length === 0) return;
      await db
        .insert(gapFindings)
        .values(
          findings.map((f) => ({
            id: String(f.gap_finding_id) as any,
            organizationId: String(f.organization_id),
            assessmentId: String(f.assessment_id),
            gapAnalysisVersionId: String(f.gap_analysis_version_id),
            soaVersionId: String(f.soa_version_id),
            soaItemId: String(f.soa_item_id),
            frameworkId: String(f.framework_id),
            frameworkRequirementId: String(f.framework_requirement_id),
            scfVersionId: String(f.scf_version_id),
            scfControlId:
              f.scf_control_id != null ? String(f.scf_control_id) : null,
            evidenceFindingId:
              f.evidence_finding_id != null
                ? String(f.evidence_finding_id)
                : null,
            gapCode: String(f.gap_code),

            assessmentStatus: String(f.assessment_status) as any,

            gapType: String(f.gap_type) as any,

            severity: String(f.severity) as any,
            impact: f.impact != null ? String(f.impact) : null,
            likelihood: f.likelihood != null ? String(f.likelihood) : null,
            gapSummary: String(f.gap_summary),
            gapRationale:
              f.gap_rationale != null ? String(f.gap_rationale) : null,
            recommendationSummary:
              f.recommendation_summary != null
                ? String(f.recommendation_summary)
                : null,

            responsibilityType: (f.responsibility_type != null
              ? String(f.responsibility_type)
              : "internal") as any,
            confidenceScore: String(f.confidence_score),
            requiresUserValidation: Boolean(f.requires_user_validation),
          })),
        )
        .onConflictDoNothing();
    },
    async update(finding: GapFindingResponse) {
      await db
        .update(gapFindings)
        .set({
          assessmentStatus: String(finding.assessment_status) as any,

          gapType: String(finding.gap_type) as any,

          severity: String(finding.severity) as any,
          impact: finding.impact != null ? String(finding.impact) : null,
          likelihood:
            finding.likelihood != null ? String(finding.likelihood) : null,
          gapSummary: String(finding.gap_summary),
          gapRationale:
            finding.gap_rationale != null
              ? String(finding.gap_rationale)
              : null,
          recommendationSummary:
            finding.recommendation_summary != null
              ? String(finding.recommendation_summary)
              : null,

          responsibilityType: (finding.responsibility_type != null
            ? String(finding.responsibility_type)
            : "internal") as any,
          confidenceScore: String(finding.confidence_score),
          requiresUserValidation: Boolean(finding.requires_user_validation),
          updatedAt: new Date(),
        })
        .where(eq(gapFindings.id, String(finding.gap_finding_id)));
    },
    async get(gapFindingId: string, _organizationId: string) {
      const [row] = await db
        .select()
        .from(gapFindings)
        .where(eq(gapFindings.id, gapFindingId))
        .limit(1);
      return row ? mapGapFindingRow(row) : null;
    },
    async listByVersion(gapAnalysisVersionId: string, _organizationId: string) {
      const rows = await db
        .select()
        .from(gapFindings)
        .where(eq(gapFindings.gapAnalysisVersionId, gapAnalysisVersionId));
      return rows.map(mapGapFindingRow);
    },
    withOrganization(organizationId: string) {
      return {
        saveMany: (findings: GapFindingResponse[]) => repo.saveMany(findings),
        update: (finding: GapFindingResponse) => repo.update(finding),
        get: (gapFindingId: string) => repo.get(gapFindingId, organizationId),
        listByVersion: (gapAnalysisVersionId: string) =>
          repo.listByVersion(gapAnalysisVersionId, organizationId),
      };
    },
  };
  return repo;
};

export const createDrizzleGapAnalysisRepositories = (
  db: DbClient,
): GapAnalysisRepositories => ({
  evidenceFindings: createDrizzleEvidenceFindingRepository(db),
  evidenceSources: createDrizzleEvidenceSourceRepository(db),
  gapVersions: createDrizzleGapAnalysisVersionRepository(db),
  gapFindings: createDrizzleGapFindingRepository(db),
});

// --- Row mappers ---

type EvidenceFindingRow = typeof evidenceFindings.$inferSelect;
type EvidenceSourceRow = typeof evidenceSources.$inferSelect;
type GapVersionRow = typeof gapAnalysisVersions.$inferSelect;
type GapFindingRow = typeof gapFindings.$inferSelect;

const mapEvidenceFindingRow = (
  row: EvidenceFindingRow,
): EvidenceFindingResponse => ({
  evidence_finding_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  soa_version_id: row.soaVersionId,
  soa_item_id: row.soaItemId,
  framework_id: row.frameworkId,
  framework_requirement_id: row.frameworkRequirementId,
  scf_version_id: row.scfVersionId,
  scf_control_id: row.scfControlId ?? undefined,
  evidence_strength: row.evidenceStrength,
  evidence_status: row.evidenceStatus,
  evidence_summary: row.evidenceSummary,
  evidence_limitations: row.evidenceLimitations,
  confidence_score: Number(row.confidenceScore ?? 0),
  generated_by_agent_run_id: row.generatedByAgentRunId ?? undefined,
  trace_id: row.traceId,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});

const mapEvidenceSourceRow = (
  row: EvidenceSourceRow,
): EvidenceSourceResponse => ({
  evidence_source_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  evidence_finding_id: row.evidenceFindingId,
  document_id: row.documentId,
  chunk_id: row.chunkId,
  vector_reference_id: row.vectorReferenceId ?? undefined,
  source_type: row.sourceType,
  source_title: row.sourceTitle ?? undefined,
  source_location: row.sourceLocation ?? undefined,
  snippet: row.snippet,
  retrieval_score: Number(row.retrievalScore),
  retrieval_method: row.retrievalMethod,
  candidate_evidence: row.candidateEvidence,
  created_at: row.createdAt.toISOString(),
});

const mapGapVersionRow = (row: GapVersionRow): GapAnalysisVersionResponse => ({
  gap_analysis_version_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  version_number: row.versionNumber,
  status: row.status as GapAnalysisVersionResponse["status"],
  source_soa_version_id: row.sourceSoaVersionId,
  framework_id: row.frameworkId,
  scf_version_id: row.scfVersionId,
  generated_by_agent_run_id: row.generatedByAgentRunId ?? undefined,
  created_by: row.createdBy ?? "system",
  created_at: row.createdAt.toISOString(),
  submitted_for_review_at: row.submittedForReviewAt?.toISOString(),
  approved_by: row.approvedBy ?? undefined,
  approved_at: row.approvedAt?.toISOString(),
  approval_event_id: row.approvalEventId ?? undefined,
  superseded_by: row.supersededBy ?? undefined,
  trace_id: row.traceId ?? "trace-not-set",
  metadata: row.metadata,
});

const mapGapFindingRow = (row: GapFindingRow): GapFindingResponse => ({
  gap_finding_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  gap_analysis_version_id: row.gapAnalysisVersionId,
  soa_version_id: row.soaVersionId,
  soa_item_id: row.soaItemId,
  framework_id: row.frameworkId,
  framework_requirement_id: row.frameworkRequirementId,
  scf_version_id: row.scfVersionId,
  scf_control_id: row.scfControlId ?? undefined,
  evidence_finding_id: row.evidenceFindingId ?? undefined,
  gap_code: row.gapCode,
  assessment_status: row.assessmentStatus,
  gap_type: row.gapType,
  severity: row.severity,
  // isMcrGap column is added via future migration; defaults to false for existing rows
  is_mcr_gap: (row as any).isMcrGap ?? false,
  impact: row.impact ?? undefined,
  likelihood: row.likelihood ?? undefined,
  gap_summary: row.gapSummary,
  gap_rationale: row.gapRationale ?? undefined,
  recommendation_summary: row.recommendationSummary ?? undefined,
  responsibility_type: row.responsibilityType ?? "internal",
  confidence_score: Number(row.confidenceScore ?? 0),
  requires_user_validation: row.requiresUserValidation,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});

/**
 * @module gap-analysis.repository
 * @description Drizzle PostgreSQL repositories for Gap Analysis.
 * Uses $inferSelect types for row mappers so column names match exactly.
 */
import { eq, sql } from "drizzle-orm";
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
          id: sql<string>`${finding.evidence_finding_id}::uuid`,
          organizationId: finding.organization_id,
          assessmentId: finding.assessment_id,
          soaVersionId: finding.soa_version_id,
          soaItemId: finding.soa_item_id,
          frameworkId: finding.framework_id ?? "",
          frameworkRequirementId: finding.framework_requirement_id ?? "",
          scfVersionId: finding.scf_version_id,
          scfControlId: finding.scf_control_id,
          evidenceStrength: finding.evidence_strength,
          evidenceStatus: finding.evidence_status,
          evidenceSummary: finding.evidence_summary,
          evidenceLimitations: finding.evidence_limitations,
          confidenceScore: String(finding.confidence_score),
          generatedByAgentRunId: finding.generated_by_agent_run_id,
          traceId: finding.trace_id,
        })
        .onConflictDoNothing();
    },
    async update(finding: EvidenceFindingResponse) {
      await db
        .update(evidenceFindings)
        .set({
          evidenceStrength: finding.evidence_strength,
          evidenceStatus: finding.evidence_status,
          evidenceSummary: finding.evidence_summary,
          evidenceLimitations: finding.evidence_limitations,
          confidenceScore: String(finding.confidence_score),
          updatedAt: new Date(),
        })
        .where(eq(evidenceFindings.id, finding.evidence_finding_id));
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
            id: sql<string>`${s.evidence_source_id}::uuid`,
            organizationId: s.organization_id,
            assessmentId: s.assessment_id,
            evidenceFindingId: s.evidence_finding_id,
            documentId: s.document_id,
            chunkId: s.chunk_id,
            vectorReferenceId: s.vector_reference_id,
            sourceType: s.source_type,
            sourceTitle: s.source_title,
            sourceLocation: s.source_location,
            snippet: s.snippet,
            retrievalScore: String(s.retrieval_score),
            retrievalMethod: s.retrieval_method,
            candidateEvidence: s.candidate_evidence,
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
          id: sql<string>`${version.gap_analysis_version_id}::uuid`,
          organizationId: version.organization_id,
          assessmentId: version.assessment_id,
          versionNumber: version.version_number,
          status: version.status,
          sourceSoaVersionId: version.source_soa_version_id,
          frameworkId: version.framework_id,
          scfVersionId: version.scf_version_id,
          generatedByAgentRunId: version.generated_by_agent_run_id,
          createdBy: version.created_by,
          traceId: version.trace_id,
          metadata: version.metadata ?? {},
        })
        .onConflictDoNothing();
    },
    async update(version: GapAnalysisVersionResponse) {
      await db
        .update(gapAnalysisVersions)
        .set({
          status: version.status,
          submittedForReviewAt: version.submitted_for_review_at
            ? new Date(version.submitted_for_review_at)
            : undefined,
          approvedBy: version.approved_by,
          approvedAt: version.approved_at
            ? new Date(version.approved_at)
            : undefined,
          approvalEventId: version.approval_event_id,
          supersededBy: version.superseded_by,
          metadata: version.metadata ?? {},
          updatedAt: new Date(),
        })
        .where(eq(gapAnalysisVersions.id, version.gap_analysis_version_id));
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
            id: sql<string>`${f.gap_finding_id}::uuid`,
            organizationId: f.organization_id,
            assessmentId: f.assessment_id,
            gapAnalysisVersionId: f.gap_analysis_version_id,
            soaVersionId: f.soa_version_id,
            soaItemId: f.soa_item_id,
            frameworkId: f.framework_id,
            frameworkRequirementId: f.framework_requirement_id,
            scfVersionId: f.scf_version_id,
            scfControlId: f.scf_control_id,
            evidenceFindingId: f.evidence_finding_id,
            gapCode: f.gap_code,
            assessmentStatus: f.assessment_status,
            gapType: f.gap_type,
            severity: f.severity,
            impact: f.impact,
            likelihood: f.likelihood,
            gapSummary: f.gap_summary,
            gapRationale: f.gap_rationale,
            recommendationSummary: f.recommendation_summary,
            responsibilityType: f.responsibility_type,
            confidenceScore: String(f.confidence_score),
            requiresUserValidation: f.requires_user_validation,
          })),
        )
        .onConflictDoNothing();
    },
    async update(finding: GapFindingResponse) {
      await db
        .update(gapFindings)
        .set({
          assessmentStatus: finding.assessment_status,
          gapType: finding.gap_type,
          severity: finding.severity,
          impact: finding.impact,
          likelihood: finding.likelihood,
          gapSummary: finding.gap_summary,
          gapRationale: finding.gap_rationale,
          recommendationSummary: finding.recommendation_summary,
          responsibilityType: finding.responsibility_type,
          confidenceScore: String(finding.confidence_score),
          requiresUserValidation: finding.requires_user_validation,
          updatedAt: new Date(),
        })
        .where(eq(gapFindings.id, finding.gap_finding_id));
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

/**
 * Drizzle Gap Analysis Repository
 *
 * Production-grade persistence layer for gap analysis artifacts.
 * All queries are tenant-scoped per AGENTS.md §7.
 *
 * Maps between Drizzle snake_case DB columns and domain response types.
 */
import {
  evidenceFindings,
  evidenceSources,
  gapAnalysisVersions,
  gapFindings,
} from "@standard/schemas";
import { sql } from "drizzle-orm";
import type {
  EvidenceFindingRepository,
  EvidenceFindingResponse,
  EvidenceSourceRepository,
  EvidenceSourceResponse,
  GapAnalysisRepositories,
  GapAnalysisVersionRepository,
  GapAnalysisVersionResponse,
  GapFindingRepository,
  GapFindingResponse,
} from "../types";

type AnyDrizzleClient = any;

// ── Evidence Finding Repository ──────────────────────────────────────

const mapEvidenceFindingRow = (row: any): EvidenceFindingResponse => ({
  evidence_finding_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  soa_version_id: row.soaVersionId,
  soa_item_id: row.soaItemId,
  framework_id: row.frameworkId,
  framework_requirement_id: row.frameworkRequirementId,
  scf_version_id: row.scfVersionId,
  ...(row.scfControlId ? { scf_control_id: row.scfControlId } : {}),
  evidence_strength: row.evidenceStrength,
  evidence_status: row.evidenceStatus,
  evidence_summary: row.evidenceSummary,
  evidence_limitations: row.evidenceLimitations ?? [],
  confidence_score: row.confidenceScore ? Number(row.confidenceScore) : 0,
  ...(row.generatedByAgentRunId
    ? { generated_by_agent_run_id: row.generatedByAgentRunId }
    : {}),
  trace_id: row.traceId,
  created_at: row.createdAt?.toISOString?.() ?? row.createdAt,
  updated_at: row.updatedAt?.toISOString?.() ?? row.updatedAt,
});

export const createDrizzleEvidenceFindingRepository = (
  db: AnyDrizzleClient,
): EvidenceFindingRepository => ({
  async save(finding: EvidenceFindingResponse) {
    await db.insert(evidenceFindings).values({
      id: finding.evidence_finding_id,
      organizationId: finding.organization_id,
      assessmentId: finding.assessment_id,
      soaVersionId: finding.soa_version_id,
      soaItemId: finding.soa_item_id,
      frameworkId: finding.framework_id,
      frameworkRequirementId: finding.framework_requirement_id,
      scfVersionId: finding.scf_version_id,
      scfControlId: finding.scf_control_id ?? null,
      evidenceStrength: finding.evidence_strength,
      evidenceStatus: finding.evidence_status,
      evidenceSummary: finding.evidence_summary,
      evidenceLimitations: finding.evidence_limitations,
      confidenceScore: finding.confidence_score?.toString(),
      generatedByAgentRunId: finding.generated_by_agent_run_id ?? null,
      traceId: finding.trace_id,
    });
  },

  async update(finding: EvidenceFindingResponse) {
    await db
      .update(evidenceFindings)
      .set({
        evidenceStrength: finding.evidence_strength,
        evidenceStatus: finding.evidence_status,
        evidenceSummary: finding.evidence_summary,
        evidenceLimitations: finding.evidence_limitations,
        confidenceScore: finding.confidence_score?.toString(),
        generatedByAgentRunId: finding.generated_by_agent_run_id ?? null,
      })
      .where(
        sql`${evidenceFindings.id} = ${finding.evidence_finding_id} AND ${evidenceFindings.organizationId} = ${finding.organization_id}`,
      );
  },

  async get(evidenceFindingId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(evidenceFindings)
      .where(
        sql`${evidenceFindings.id} = ${evidenceFindingId} AND ${evidenceFindings.organizationId} = ${organizationId}`,
      );
    return rows[0] ? mapEvidenceFindingRow(rows[0]) : null;
  },

  async listByAssessment(assessmentId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(evidenceFindings)
      .where(
        sql`${evidenceFindings.assessmentId} = ${assessmentId} AND ${evidenceFindings.organizationId} = ${organizationId}`,
      );
    return rows.map(mapEvidenceFindingRow);
  },

  async findBySoaItem(soaItemId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(evidenceFindings)
      .where(
        sql`${evidenceFindings.soaItemId} = ${soaItemId} AND ${evidenceFindings.organizationId} = ${organizationId}`,
      )
      .limit(1);
    return rows[0] ? mapEvidenceFindingRow(rows[0]) : null;
  },

  withOrganization(organizationId: string) {
    return {
      save: (finding: EvidenceFindingResponse) => this.save(finding),
      update: (finding: EvidenceFindingResponse) => this.update(finding),
      get: (evidenceFindingId: string) =>
        this.get(evidenceFindingId, organizationId),
      listByAssessment: (assessmentId: string) =>
        this.listByAssessment(assessmentId, organizationId),
      findBySoaItem: (soaItemId: string) =>
        this.findBySoaItem(soaItemId, organizationId),
    };
  },
});

// ── Evidence Source Repository ───────────────────────────────────────

const mapEvidenceSourceRow = (row: any): EvidenceSourceResponse => ({
  evidence_source_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  evidence_finding_id: row.evidenceFindingId,
  document_id: row.documentId,
  chunk_id: row.chunkId,
  ...(row.vectorReferenceId
    ? { vector_reference_id: row.vectorReferenceId }
    : {}),
  source_type: row.sourceType,
  ...(row.sourceTitle ? { source_title: row.sourceTitle } : {}),
  ...(row.sourceLocation ? { source_location: row.sourceLocation } : {}),
  snippet: row.snippet,
  retrieval_score: row.retrievalScore ? Number(row.retrievalScore) : 0,
  retrieval_method: row.retrievalMethod,
  candidate_evidence: row.candidateEvidence,
  created_at: row.createdAt?.toISOString?.() ?? row.createdAt,
});

export const createDrizzleEvidenceSourceRepository = (
  db: AnyDrizzleClient,
): EvidenceSourceRepository => ({
  async saveMany(sources: EvidenceSourceResponse[]) {
    if (sources.length === 0) return;
    await db.insert(evidenceSources).values(
      sources.map((source) => ({
        id: source.evidence_source_id,
        organizationId: source.organization_id,
        assessmentId: source.assessment_id,
        evidenceFindingId: source.evidence_finding_id,
        documentId: source.document_id,
        chunkId: source.chunk_id,
        vectorReferenceId: source.vector_reference_id ?? null,
        sourceType: source.source_type,
        sourceTitle: source.source_title ?? null,
        sourceLocation: source.source_location ?? null,
        snippet: source.snippet,
        retrievalScore: source.retrieval_score.toString(),
        retrievalMethod: source.retrieval_method,
        candidateEvidence: source.candidate_evidence,
      })),
    );
  },

  async listByFinding(evidenceFindingId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(evidenceSources)
      .where(
        sql`${evidenceSources.evidenceFindingId} = ${evidenceFindingId} AND ${evidenceSources.organizationId} = ${organizationId}`,
      );
    return rows.map(mapEvidenceSourceRow);
  },

  withOrganization(organizationId: string) {
    return {
      saveMany: (sources: EvidenceSourceResponse[]) => this.saveMany(sources),
      listByFinding: (evidenceFindingId: string) =>
        this.listByFinding(evidenceFindingId, organizationId),
    };
  },
});

// ── Gap Analysis Version Repository ──────────────────────────────────

const mapGapVersionRow = (row: any): GapAnalysisVersionResponse => ({
  gap_analysis_version_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  version_number: row.versionNumber,
  status: row.status,
  source_soa_version_id: row.sourceSoaVersionId,
  framework_id: row.frameworkId,
  scf_version_id: row.scfVersionId,
  ...(row.generatedByAgentRunId
    ? { generated_by_agent_run_id: row.generatedByAgentRunId }
    : {}),
  created_by: row.createdBy ?? "",
  created_at: row.createdAt?.toISOString?.() ?? row.createdAt,
  ...(row.submittedForReviewAt
    ? { submitted_for_review_at: row.submittedForReviewAt.toISOString() }
    : {}),
  ...(row.approvedBy ? { approved_by: row.approvedBy } : {}),
  ...(row.approvedAt ? { approved_at: row.approvedAt.toISOString() } : {}),
  ...(row.approvalEventId ? { approval_event_id: row.approvalEventId } : {}),
  ...(row.supersededBy ? { superseded_by: row.supersededBy } : {}),
  trace_id: row.traceId ?? "",
  metadata: row.metadata ?? {},
});

export const createDrizzleGapAnalysisVersionRepository = (
  db: AnyDrizzleClient,
): GapAnalysisVersionRepository => ({
  async save(version: GapAnalysisVersionResponse) {
    await db.insert(gapAnalysisVersions).values({
      id: version.gap_analysis_version_id,
      organizationId: version.organization_id,
      assessmentId: version.assessment_id,
      versionNumber: version.version_number,
      status: version.status,
      sourceSoaVersionId: version.source_soa_version_id,
      frameworkId: version.framework_id,
      scfVersionId: version.scf_version_id,
      generatedByAgentRunId: version.generated_by_agent_run_id ?? null,
      createdBy: version.created_by || null,
      traceId: version.trace_id,
      metadata: version.metadata,
    });
  },

  async update(version: GapAnalysisVersionResponse) {
    await db
      .update(gapAnalysisVersions)
      .set({
        status: version.status,
        submittedForReviewAt: version.submitted_for_review_at
          ? new Date(version.submitted_for_review_at)
          : undefined,
        approvedBy: version.approved_by ?? undefined,
        approvedAt: version.approved_at
          ? new Date(version.approved_at)
          : undefined,
        approvalEventId: version.approval_event_id ?? undefined,
        supersededBy: version.superseded_by ?? undefined,
        metadata: version.metadata,
      })
      .where(
        sql`${gapAnalysisVersions.id} = ${version.gap_analysis_version_id} AND ${gapAnalysisVersions.organizationId} = ${version.organization_id}`,
      );
  },

  async get(gapAnalysisVersionId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(gapAnalysisVersions)
      .where(
        sql`${gapAnalysisVersions.id} = ${gapAnalysisVersionId} AND ${gapAnalysisVersions.organizationId} = ${organizationId}`,
      );
    return rows[0] ? mapGapVersionRow(rows[0]) : null;
  },

  async listByAssessment(assessmentId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(gapAnalysisVersions)
      .where(
        sql`${gapAnalysisVersions.assessmentId} = ${assessmentId} AND ${gapAnalysisVersions.organizationId} = ${organizationId}`,
      );
    return rows.map(mapGapVersionRow);
  },

  withOrganization(organizationId: string) {
    return {
      save: (version: GapAnalysisVersionResponse) => this.save(version),
      update: (version: GapAnalysisVersionResponse) => this.update(version),
      get: (gapAnalysisVersionId: string) =>
        this.get(gapAnalysisVersionId, organizationId),
      listByAssessment: (assessmentId: string) =>
        this.listByAssessment(assessmentId, organizationId),
    };
  },
});

// ── Gap Finding Repository ───────────────────────────────────────────

const mapGapFindingRow = (row: any): GapFindingResponse => ({
  gap_finding_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  gap_analysis_version_id: row.gapAnalysisVersionId,
  soa_version_id: row.soaVersionId,
  soa_item_id: row.soaItemId,
  framework_id: row.frameworkId,
  framework_requirement_id: row.frameworkRequirementId,
  scf_version_id: row.scfVersionId,
  ...(row.scfControlId ? { scf_control_id: row.scfControlId } : {}),
  ...(row.evidenceFindingId
    ? { evidence_finding_id: row.evidenceFindingId }
    : {}),
  gap_code: row.gapCode,
  assessment_status: row.assessmentStatus,
  gap_type: row.gapType,
  severity: row.severity,
  is_mcr_gap: row.isMcrGap ?? false,
  ...(row.impact ? { impact: row.impact } : {}),
  ...(row.likelihood ? { likelihood: row.likelihood } : {}),
  gap_summary: row.gapSummary,
  ...(row.gapRationale ? { gap_rationale: row.gapRationale } : {}),
  ...(row.recommendationSummary
    ? { recommendation_summary: row.recommendationSummary }
    : {}),
  responsibility_type: row.responsibilityType ?? "internal",
  confidence_score: row.confidenceScore ? Number(row.confidenceScore) : 0,
  requires_user_validation: row.requiresUserValidation,
  created_at: row.createdAt?.toISOString?.() ?? row.createdAt,
  updated_at: row.updatedAt?.toISOString?.() ?? row.updatedAt,
});

export const createDrizzleGapFindingRepository = (
  db: AnyDrizzleClient,
): GapFindingRepository => ({
  async saveMany(findings: GapFindingResponse[]) {
    if (findings.length === 0) return;
    await db.insert(gapFindings).values(
      findings.map((finding) => ({
        id: finding.gap_finding_id,
        organizationId: finding.organization_id,
        assessmentId: finding.assessment_id,
        gapAnalysisVersionId: finding.gap_analysis_version_id,
        soaVersionId: finding.soa_version_id,
        soaItemId: finding.soa_item_id,
        frameworkId: finding.framework_id,
        frameworkRequirementId: finding.framework_requirement_id,
        scfVersionId: finding.scf_version_id,
        scfControlId: finding.scf_control_id ?? null,
        evidenceFindingId: finding.evidence_finding_id ?? null,
        gapCode: finding.gap_code,
        assessmentStatus: finding.assessment_status,
        gapType: finding.gap_type,
        severity: finding.severity,
        impact: finding.impact ?? null,
        likelihood: finding.likelihood ?? null,
        gapSummary: finding.gap_summary,
        gapRationale: finding.gap_rationale ?? null,
        recommendationSummary: finding.recommendation_summary ?? null,
        responsibilityType: finding.responsibility_type,
        confidenceScore: finding.confidence_score?.toString(),
        requiresUserValidation: finding.requires_user_validation,
      })),
    );
  },

  async update(finding: GapFindingResponse) {
    await db
      .update(gapFindings)
      .set({
        assessmentStatus: finding.assessment_status,
        gapType: finding.gap_type,
        severity: finding.severity,
        impact: finding.impact ?? null,
        likelihood: finding.likelihood ?? null,
        gapSummary: finding.gap_summary,
        gapRationale: finding.gap_rationale ?? null,
        recommendationSummary: finding.recommendation_summary ?? null,
        responsibilityType: finding.responsibility_type,
        confidenceScore: finding.confidence_score?.toString(),
        requiresUserValidation: finding.requires_user_validation,
      })
      .where(
        sql`${gapFindings.id} = ${finding.gap_finding_id} AND ${gapFindings.organizationId} = ${finding.organization_id}`,
      );
  },

  async get(gapFindingId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(gapFindings)
      .where(
        sql`${gapFindings.id} = ${gapFindingId} AND ${gapFindings.organizationId} = ${organizationId}`,
      );
    return rows[0] ? mapGapFindingRow(rows[0]) : null;
  },

  async listByVersion(gapAnalysisVersionId: string, organizationId: string) {
    const rows = await db
      .select()
      .from(gapFindings)
      .where(
        sql`${gapFindings.gapAnalysisVersionId} = ${gapAnalysisVersionId} AND ${gapFindings.organizationId} = ${organizationId}`,
      );
    return rows.map(mapGapFindingRow);
  },

  withOrganization(organizationId: string) {
    return {
      saveMany: (findings: GapFindingResponse[]) => this.saveMany(findings),
      update: (finding: GapFindingResponse) => this.update(finding),
      get: (gapFindingId: string) => this.get(gapFindingId, organizationId),
      listByVersion: (gapAnalysisVersionId: string) =>
        this.listByVersion(gapAnalysisVersionId, organizationId),
    };
  },
});

// ── Factory ──────────────────────────────────────────────────────────

export const createDrizzleGapAnalysisRepositories = (
  db: AnyDrizzleClient,
): GapAnalysisRepositories => ({
  evidenceFindings: createDrizzleEvidenceFindingRepository(db),
  evidenceSources: createDrizzleEvidenceSourceRepository(db),
  gapVersions: createDrizzleGapAnalysisVersionRepository(db),
  gapFindings: createDrizzleGapFindingRepository(db),
});

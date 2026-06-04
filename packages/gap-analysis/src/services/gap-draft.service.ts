import { assertActor, assertContext, GapAnalysisWorkflowError } from "../errors";
import type { EvidenceFindingResponse, GapAnalysisContext, GapAnalysisDependencies, GapAnalysisVersionResponse, GapFindingFilters, GapFindingResponse, SoaItemResponse, SoaVersionResponse } from "../types";

export class GapDraftService {
  constructor(private readonly deps: GapAnalysisDependencies) {}

  async createGapAnalysisDraft(assessmentId: string, soaVersionId: string, context: GapAnalysisContext): Promise<GapAnalysisVersionResponse> {
    assertContext(context);
    assertActor(context);
    if (assessmentId !== context.assessmentId) throw new GapAnalysisWorkflowError("TENANT_CONTEXT_MISMATCH", "Assessment id does not match context.");
    const soaVersion = await this.getApprovedSoa(soaVersionId, context);
    const now = new Date().toISOString();
    const existingVersions = await this.deps.repositories.gapVersions.listByAssessment(assessmentId, context.organizationId);
    const version: GapAnalysisVersionResponse = {
      gap_analysis_version_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: assessmentId,
      version_number: existingVersions.length + 1,
      status: "draft",
      source_soa_version_id: soaVersion.soa_version_id,
      framework_id: soaVersion.source_framework_id,
      scf_version_id: soaVersion.scf_version_id,
      created_by: context.actorId!,
      created_at: now,
      trace_id: context.traceId,
      metadata: {}
    };
    const items = await this.deps.soa.repositories.items.listByVersion(soaVersionId, context.organizationId);
    const findings: GapFindingResponse[] = [];
    let index = 1;
    for (const item of items) {
      const evidenceFinding = await this.deps.repositories.evidenceFindings.findBySoaItem(item.soa_item_id, context.organizationId);
      findings.push(await this.generateGapFindingForSoaItem(item, evidenceFinding ?? undefined, context, version, index));
      index += 1;
    }
    await this.deps.repositories.gapVersions.save(version);
    await this.deps.repositories.gapFindings.saveMany(findings);
    return version;
  }

  async generateGapFindingForSoaItem(
    soaItem: SoaItemResponse,
    evidenceFinding: Partial<EvidenceFindingResponse> | undefined,
    context: GapAnalysisContext,
    version?: GapAnalysisVersionResponse,
    index = 1
  ): Promise<GapFindingResponse> {
    const now = new Date().toISOString();
    const assessment = this.assess(soaItem, evidenceFinding);
    return {
      gap_finding_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      gap_analysis_version_id: version?.gap_analysis_version_id ?? crypto.randomUUID(),
      soa_version_id: soaItem.soa_version_id,
      soa_item_id: soaItem.soa_item_id,
      framework_id: soaItem.framework_id,
      framework_requirement_id: soaItem.framework_requirement_id,
      scf_version_id: soaItem.scf_version_id,
      ...(soaItem.scf_control_id ? { scf_control_id: soaItem.scf_control_id } : {}),
      ...(evidenceFinding?.evidence_finding_id ? { evidence_finding_id: evidenceFinding.evidence_finding_id } : {}),
      gap_code: `GAP-${String(index).padStart(3, "0")}`,
      assessment_status: assessment.status,
      gap_type: assessment.gapType,
      severity: assessment.severity,
      gap_summary: assessment.summary,
      ...(assessment.rationale ? { gap_rationale: assessment.rationale } : {}),
      recommendation_summary: assessment.recommendation,
      responsibility_type: "internal",
      confidence_score: evidenceFinding?.confidence_score ?? 0,
      requires_user_validation: assessment.requiresUserValidation,
      created_at: now,
      updated_at: now
    };
  }

  async regenerateGapAnalysisDraft(gapAnalysisVersionId: string, _options: Record<string, unknown>, context: GapAnalysisContext): Promise<GapAnalysisVersionResponse> {
    const version = await this.getGapVersion(gapAnalysisVersionId, context);
    return this.createGapAnalysisDraft(version.assessment_id, version.source_soa_version_id, context);
  }

  async listGapFindings(gapAnalysisVersionId: string, filters: GapFindingFilters, context: GapAnalysisContext): Promise<GapFindingResponse[]> {
    const version = await this.deps.repositories.gapVersions.get(gapAnalysisVersionId, context.organizationId);
    if (!version) return [];
    const findings = await this.deps.repositories.gapFindings.listByVersion(gapAnalysisVersionId, context.organizationId);
    return filters.assessment_status ? findings.filter((finding) => finding.assessment_status === filters.assessment_status) : findings;
  }

  async getGapFinding(gapFindingId: string, context: GapAnalysisContext): Promise<GapFindingResponse> {
    const finding = await this.deps.repositories.gapFindings.get(gapFindingId, context.organizationId);
    if (!finding || finding.assessment_id !== context.assessmentId) throw new GapAnalysisWorkflowError("GAP_FINDING_NOT_FOUND", "Gap finding not found.");
    return finding;
  }

  private assess(soaItem: SoaItemResponse, evidenceFinding?: Partial<EvidenceFindingResponse>): {
    status: GapFindingResponse["assessment_status"];
    gapType: GapFindingResponse["gap_type"];
    severity: GapFindingResponse["severity"];
    summary: string;
    rationale?: string;
    recommendation?: string;
    requiresUserValidation: boolean;
  } {
    if (soaItem.applicability_status === "not_applicable") {
      const justified = Boolean(soaItem.non_applicability_rationale);
      return {
        status: justified ? "not_applicable_justified" : "not_applicable_not_justified",
        gapType: "not_applicable",
        severity: "informational",
        summary: justified ? "Control is marked not applicable with rationale." : "Control is marked not applicable without sufficient rationale.",
        ...(soaItem.non_applicability_rationale ? { rationale: soaItem.non_applicability_rationale } : {}),
        requiresUserValidation: !justified
      };
    }
    if (!evidenceFinding || evidenceFinding.evidence_strength === "absent" || evidenceFinding.evidence_status === "not_evidenced") {
      return {
        status: "not_evidenced",
        gapType: "evidence_gap",
        severity: "medium",
        summary: "No sufficient evidence was found for an applicable SoA item.",
        recommendation: "Request or upload evidence before concluding implementation status.",
        requiresUserValidation: true
      };
    }
    if (evidenceFinding.evidence_status === "conflicting" || evidenceFinding.evidence_strength === "conflicting") {
      return {
        status: "requires_validation",
        gapType: "evidence_gap",
        severity: "medium",
        summary: "Candidate evidence is conflicting and requires validation.",
        requiresUserValidation: true
      };
    }
    if (evidenceFinding.evidence_strength === "partial") {
      return {
        status: "partially_met",
        gapType: "documentation_gap",
        severity: "low",
        summary: "Partial candidate evidence was found.",
        recommendation: "Review evidence coverage and request missing artifacts if needed.",
        requiresUserValidation: true
      };
    }
    if (evidenceFinding.evidence_strength === "strong" && (evidenceFinding.confidence_score ?? 0) >= 0.8) {
      return {
        status: "met",
        gapType: "no_gap",
        severity: "informational",
        summary: "Strong candidate evidence supports the applicable requirement.",
        requiresUserValidation: false
      };
    }
    return {
      status: "requires_validation",
      gapType: "evidence_gap",
      severity: "low",
      summary: "Evidence is insufficient for a final conclusion.",
      requiresUserValidation: true
    };
  }

  private async getApprovedSoa(soaVersionId: string, context: GapAnalysisContext): Promise<SoaVersionResponse> {
    const soaVersion = await this.deps.soa.repositories.versions.get(soaVersionId, context.organizationId);
    if (!soaVersion || soaVersion.assessment_id !== context.assessmentId || soaVersion.status !== "approved") {
      throw new GapAnalysisWorkflowError("APPROVED_SOA_REQUIRED", "Gap Analysis requires an approved SoA.");
    }
    return soaVersion;
  }

  private async getGapVersion(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<GapAnalysisVersionResponse> {
    const version = await this.deps.repositories.gapVersions.get(gapAnalysisVersionId, context.organizationId);
    if (!version || version.assessment_id !== context.assessmentId) throw new GapAnalysisWorkflowError("GAP_ANALYSIS_NOT_FOUND", "Gap Analysis version not found.");
    return version;
  }
}

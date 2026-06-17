import { KbSearchService } from "@standard/kb";
import { assertContext, GapAnalysisWorkflowError } from "../errors";
import type { EvidenceFindingFilters, EvidenceFindingResponse, EvidenceSourceResponse, GapAnalysisContext, GapAnalysisDependencies, KbSearchResult, SoaItemResponse, SoaVersionResponse } from "../types";
import { EvidenceClassificationService } from "./evidence-classification.service";

const snippet = (value: string): string => value.length <= 300 ? value : `${value.slice(0, 297)}...`;

export class EvidenceAnalysisService {
  constructor(private readonly deps: GapAnalysisDependencies) {}

  async runEvidenceAnalysis(assessmentId: string, soaVersionId: string, context: GapAnalysisContext): Promise<{
    assessment_id: string;
    soa_version_id: string;
    findings: EvidenceFindingResponse[];
    trace_id: string;
  }> {
    assertContext(context);
    if (assessmentId !== context.assessmentId) throw new GapAnalysisWorkflowError("TENANT_CONTEXT_MISMATCH", "Assessment id does not match context.");
    const soaVersion = await this.getApprovedSoa(soaVersionId, context);
    const items = await this.deps.soa.repositories.items.listByVersion(soaVersionId, context.organizationId);
    const findings: EvidenceFindingResponse[] = [];
    for (const item of items) findings.push(await this.analyzeSoaItemEvidence(item.soa_item_id, context, soaVersion, item));
    return { assessment_id: assessmentId, soa_version_id: soaVersionId, findings, trace_id: context.traceId };
  }

  async analyzeSoaItemEvidence(soaItemId: string, context: GapAnalysisContext, knownSoaVersion?: SoaVersionResponse, knownItem?: SoaItemResponse): Promise<EvidenceFindingResponse> {
    assertContext(context);
    const item = knownItem ?? await this.deps.soa.repositories.items.get(soaItemId, context.organizationId);
    if (!item || item.assessment_id !== context.assessmentId) throw new GapAnalysisWorkflowError("SOA_ITEM_NOT_FOUND", "SoA item not found.");
    const soaVersion = knownSoaVersion ?? await this.getApprovedSoa(item.soa_version_id, context);
    const kbResults = await this.searchKb(item, context);
    const classification = await new EvidenceClassificationService().classifyCandidateEvidence(item, kbResults, context);
    const now = new Date().toISOString();
    const existing = await this.deps.repositories.evidenceFindings.findBySoaItem(item.soa_item_id, context.organizationId);
    const finding: EvidenceFindingResponse = {
      evidence_finding_id: existing?.evidence_finding_id ?? crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      soa_version_id: soaVersion.soa_version_id,
      soa_item_id: item.soa_item_id,
      framework_id: item.framework_id,
      framework_requirement_id: item.framework_requirement_id,
      scf_version_id: item.scf_version_id,
      ...(item.scf_control_id ? { scf_control_id: item.scf_control_id } : {}),
      evidence_strength: classification.evidence_strength,
      evidence_status: classification.evidence_status,
      evidence_summary: classification.evidence_summary,
      evidence_limitations: classification.evidence_limitations,
      confidence_score: classification.confidence_score,
      trace_id: context.traceId,
      created_at: existing?.created_at ?? now,
      updated_at: now
    };
    if (existing) await this.deps.repositories.evidenceFindings.update(finding);
    else await this.deps.repositories.evidenceFindings.save(finding);
    await this.deps.repositories.evidenceSources.saveMany(this.toSources(finding, kbResults, context));
    return finding;
  }

  async refreshEvidenceFinding(evidenceFindingId: string, context: GapAnalysisContext): Promise<EvidenceFindingResponse> {
    const finding = await this.getEvidenceFinding(evidenceFindingId, context);
    return this.analyzeSoaItemEvidence(finding.soa_item_id, context);
  }

  async listEvidenceFindings(assessmentId: string, filters: EvidenceFindingFilters, context: GapAnalysisContext): Promise<EvidenceFindingResponse[]> {
    assertContext(context);
    const findings = await this.deps.repositories.evidenceFindings.listByAssessment(assessmentId, context.organizationId);
    return findings.filter((finding) =>
      (!filters.evidence_status || finding.evidence_status === filters.evidence_status) &&
      (!filters.soa_item_id || finding.soa_item_id === filters.soa_item_id)
    );
  }

  async getEvidenceFinding(evidenceFindingId: string, context: GapAnalysisContext): Promise<EvidenceFindingResponse> {
    assertContext(context);
    const finding = await this.deps.repositories.evidenceFindings.get(evidenceFindingId, context.organizationId);
    if (!finding || finding.assessment_id !== context.assessmentId) throw new GapAnalysisWorkflowError("EVIDENCE_FINDING_NOT_FOUND", "Evidence finding not found.");
    return finding;
  }

  private async getApprovedSoa(soaVersionId: string, context: GapAnalysisContext): Promise<SoaVersionResponse> {
    const soaVersion = await this.deps.soa.repositories.versions.get(soaVersionId, context.organizationId);
    if (!soaVersion || soaVersion.assessment_id !== context.assessmentId || soaVersion.status !== "approved") {
      throw new GapAnalysisWorkflowError("APPROVED_SOA_REQUIRED", "Evidence and Gap Analysis require an approved SoA.");
    }
    return soaVersion;
  }

  private async searchKb(item: SoaItemResponse, context: GapAnalysisContext): Promise<KbSearchResult[]> {
    if (!this.deps.kb) return [];
    const response = await new KbSearchService(this.deps.kb).semanticSearch({
      organizationId: context.organizationId,
      assessmentId: context.assessmentId,
      ...(context.actorId ? { actorId: context.actorId } : {}),
      traceId: context.traceId
    }, {
      query: `${item.framework_requirement_id} ${item.scf_control_id ?? ""}`,
      search_type: "semantic",
      filters: {},
      top_k: 5,
      include_context: false
    });
    return response.data;
  }

  private toSources(finding: EvidenceFindingResponse, kbResults: KbSearchResult[], context: GapAnalysisContext): EvidenceSourceResponse[] {
    return kbResults.map((result) => ({
      evidence_source_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      evidence_finding_id: finding.evidence_finding_id,
      document_id: result.document_id,
      chunk_id: result.chunk_id,
      ...(result.vector_reference_id ? { vector_reference_id: result.vector_reference_id } : {}),
      source_type: result.document_type,
      ...(result.document_title ? { source_title: result.document_title } : {}),
      ...(result.page_number ? { source_location: `page:${result.page_number}` } : {}),
      snippet: snippet(result.snippet),
      retrieval_score: result.score,
      retrieval_method: result.retrieval_method,
      candidate_evidence: true,
      created_at: new Date().toISOString()
    }));
  }
}



import { CANDIDATE_EVIDENCE_WARNING, KbSearchService } from "@standard/kb";
import { assertContext, SoaWorkflowError } from "../errors";
import type { EvidenceCoverageStatus, SoaDependencies, SoaItemResponse, SoaWorkflowContext } from "../types";

export class SoaEvidenceService {
  constructor(private readonly deps: SoaDependencies) {}

  attachCandidateEvidence(soaVersionId: string, options: { top_k?: number }, context: SoaWorkflowContext): Promise<SoaItemResponse[]> {
    return this.refreshEvidenceCoverage(soaVersionId, context, options.top_k ?? 3);
  }

  async refreshEvidenceCoverage(soaVersionId: string, context: SoaWorkflowContext, topK = 3): Promise<SoaItemResponse[]> {
    assertContext(context);
    const version = await this.deps.repositories.versions.get(soaVersionId, context.tenantId);
    if (!version || version.assessment_id !== context.assessmentId) throw new SoaWorkflowError("SOA_VERSION_NOT_FOUND", "SoA version not found.");
    const items = await this.deps.repositories.items.listByVersion(soaVersionId, context.tenantId);
    const search = this.deps.kb ? new KbSearchService(this.deps.kb) : null;
    const updated: SoaItemResponse[] = [];

    for (const item of items) {
      const response = search
        ? await search.semanticSearch({
          tenantId: context.tenantId,
          organizationId: context.organizationId,
          assessmentId: context.assessmentId,
          ...(context.actorId ? { actorId: context.actorId } : {}),
          traceId: context.traceId
        }, {
          query: item.scf_control_id ?? item.framework_requirement_id,
          search_type: "semantic",
          filters: {},
          top_k: topK,
          include_context: false
        })
        : { data: [] };

      const hasEvidence = response.data.length > 0;
      const next: SoaItemResponse = {
        ...item,
        implementation_status: hasEvidence ? "not_assessed" : "not_evidenced",
        evidence_coverage: hasEvidence ? "not_checked" : "absent",
        evidence_summary: hasEvidence
          ? `${response.data.length} candidate evidence result(s) found. ${CANDIDATE_EVIDENCE_WARNING}`
          : "No candidate evidence was found in the KB search. This is not a conclusion of non-implementation.",
        applicability_status: item.applicability_status === "applicable" ? item.applicability_status : "requires_validation",
        requires_user_validation: true,
        updated_at: new Date().toISOString()
      };
      await this.deps.repositories.items.update(next);
      updated.push(next);
    }
    return updated;
  }

  async summarizeEvidenceForItem(soaItemId: string, context: SoaWorkflowContext): Promise<string> {
    const item = await this.deps.repositories.items.get(soaItemId, context.tenantId);
    if (!item || item.assessment_id !== context.assessmentId) throw new SoaWorkflowError("SOA_ITEM_NOT_FOUND", "SoA item not found.");
    return item.evidence_summary ?? "No evidence summary has been generated.";
  }

  async markEvidenceCoverage(soaItemId: string, coverage: EvidenceCoverageStatus, context: SoaWorkflowContext): Promise<SoaItemResponse> {
    const item = await this.deps.repositories.items.get(soaItemId, context.tenantId);
    if (!item || item.assessment_id !== context.assessmentId) throw new SoaWorkflowError("SOA_ITEM_NOT_FOUND", "SoA item not found.");
    const updated = { ...item, evidence_coverage: coverage, updated_at: new Date().toISOString() };
    await this.deps.repositories.items.update(updated);
    return updated;
  }
}


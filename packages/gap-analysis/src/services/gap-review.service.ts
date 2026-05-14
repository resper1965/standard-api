import { assertActor, assertContext, GapAnalysisWorkflowError } from "../errors";
import type { GapAnalysisContext, GapAnalysisDependencies, GapAnalysisVersionResponse, GapFindingResponse, UpdateGapFindingRequest } from "../types";
import { GapValidationService } from "./gap-validation.service";

const definedPatch = <T extends Record<string, unknown>>(patch: T): Partial<T> =>
  Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>;

export class GapReviewService {
  constructor(private readonly deps: GapAnalysisDependencies) {}

  async updateGapFinding(gapFindingId: string, patch: UpdateGapFindingRequest, context: GapAnalysisContext): Promise<GapFindingResponse> {
    assertContext(context);
    assertActor(context);
    const finding = await this.deps.repositories.gapFindings.get(gapFindingId, context.tenantId);
    if (!finding || finding.assessment_id !== context.assessmentId) throw new GapAnalysisWorkflowError("GAP_FINDING_NOT_FOUND", "Gap finding not found.");
    const version = await this.getGapVersion(finding.gap_analysis_version_id, context);
    if (version.status === "approved") throw new GapAnalysisWorkflowError("GAP_ANALYSIS_IMMUTABLE", "Approved Gap Analysis versions are immutable.");
    const candidate: GapFindingResponse = { ...finding, ...(definedPatch(patch) as Partial<GapFindingResponse>), updated_at: new Date().toISOString() };
    this.validatePatch(candidate);
    await this.deps.repositories.gapFindings.update(candidate);
    return candidate;
  }

  async bulkUpdateGapFindings(gapAnalysisVersionId: string, patch: UpdateGapFindingRequest, context: GapAnalysisContext): Promise<GapFindingResponse[]> {
    const findings = await this.deps.repositories.gapFindings.listByVersion(gapAnalysisVersionId, context.tenantId);
    const updated: GapFindingResponse[] = [];
    for (const finding of findings) updated.push(await this.updateGapFinding(finding.gap_finding_id, patch, context));
    return updated;
  }

  async submitGapAnalysisForReview(gapAnalysisVersionId: string, context: GapAnalysisContext, exceptionRationale?: string): Promise<GapAnalysisVersionResponse> {
    assertActor(context);
    const version = await this.getGapVersion(gapAnalysisVersionId, context);
    const validation = await new GapValidationService(this.deps).validateGapAnalysisForReview(gapAnalysisVersionId, context);
    if (!validation.valid && !exceptionRationale) {
      throw new GapAnalysisWorkflowError("GAP_REVIEW_BLOCKED", "Gap Analysis has blocking validation errors.", { errors: validation.blocking_errors });
    }
    const updated = {
      ...version,
      status: "under_review" as const,
      submitted_for_review_at: new Date().toISOString(),
      trace_id: context.traceId,
      metadata: { ...version.metadata, ...(exceptionRationale ? { exception_rationale: exceptionRationale } : {}) }
    };
    await this.deps.repositories.gapVersions.update(updated);
    return updated;
  }

  private validatePatch(finding: GapFindingResponse): void {
    if (finding.assessment_status === "not_met" && !finding.gap_rationale) {
      throw new GapAnalysisWorkflowError("GAP_RATIONALE_REQUIRED", "not_met requires explicit gap_rationale.");
    }
  }

  private async getGapVersion(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<GapAnalysisVersionResponse> {
    const version = await this.deps.repositories.gapVersions.get(gapAnalysisVersionId, context.tenantId);
    if (!version || version.assessment_id !== context.assessmentId) throw new GapAnalysisWorkflowError("GAP_ANALYSIS_NOT_FOUND", "Gap Analysis version not found.");
    return version;
  }
}

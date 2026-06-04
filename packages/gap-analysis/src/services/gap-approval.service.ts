import { assertActor, assertContext, GapAnalysisWorkflowError } from "../errors";
import type { GapAnalysisContext, GapAnalysisDependencies, GapAnalysisValidationResponse, GapAnalysisVersionResponse } from "../types";
import { GapValidationService } from "./gap-validation.service";

export class GapApprovalService {
  constructor(private readonly deps: GapAnalysisDependencies) {}

  async validateGapAnalysisForApproval(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<GapAnalysisValidationResponse> {
    return new GapValidationService(this.deps).validateGapAnalysisForReview(gapAnalysisVersionId, context);
  }

  async approveGapAnalysis(gapAnalysisVersionId: string, approval: { approval_event_id?: string }, context: GapAnalysisContext): Promise<GapAnalysisVersionResponse> {
    assertContext(context);
    assertActor(context);
    if (!approval.approval_event_id) throw new GapAnalysisWorkflowError("APPROVAL_EVENT_REQUIRED", "Gap Analysis approval requires a human approval event.");
    const version = await this.getVersion(gapAnalysisVersionId, context);
    if (version.status !== "under_review") throw new GapAnalysisWorkflowError("GAP_APPROVAL_BLOCKED", "Only under_review Gap Analysis versions can be approved.");
    const approved = {
      ...version,
      status: "approved" as const,
      approved_by: context.actorId!,
      approved_at: new Date().toISOString(),
      approval_event_id: approval.approval_event_id,
      trace_id: context.traceId
    };
    await this.deps.repositories.gapVersions.update(approved);
    await this.supersedePreviousApprovedGapAnalysis(approved.assessment_id, approved.gap_analysis_version_id, context);
    return approved;
  }

  async supersedePreviousApprovedGapAnalysis(assessmentId: string, approvedGapAnalysisVersionId: string, context: GapAnalysisContext): Promise<void> {
    const versions = await this.deps.repositories.gapVersions.listByAssessment(assessmentId, context.organizationId);
    for (const version of versions) {
      if (version.gap_analysis_version_id !== approvedGapAnalysisVersionId && version.status === "approved") {
        await this.deps.repositories.gapVersions.update({
          ...version,
          status: "superseded",
          superseded_by: approvedGapAnalysisVersionId,
          trace_id: context.traceId
        });
      }
    }
  }

  private async getVersion(gapAnalysisVersionId: string, context: GapAnalysisContext): Promise<GapAnalysisVersionResponse> {
    const version = await this.deps.repositories.gapVersions.get(gapAnalysisVersionId, context.organizationId);
    if (!version || version.assessment_id !== context.assessmentId) throw new GapAnalysisWorkflowError("GAP_ANALYSIS_NOT_FOUND", "Gap Analysis version not found.");
    return version;
  }
}

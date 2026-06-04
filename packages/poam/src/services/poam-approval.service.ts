import { assertActor, assertContext, PoamWorkflowError } from "../errors";
import type { PoamContext, PoamDependencies, PoamValidationResponse, PoamVersionResponse } from "../types";
import { PoamValidationService } from "./poam-validation.service";

export class PoamApprovalService {
  constructor(private readonly deps: PoamDependencies) {}

  async validatePoamForApproval(poamVersionId: string, context: PoamContext): Promise<PoamValidationResponse> {
    return new PoamValidationService(this.deps).validatePoamForReview(poamVersionId, context);
  }

  async approvePoam(poamVersionId: string, approval: { approval_event_id?: string }, context: PoamContext): Promise<PoamVersionResponse> {
    assertContext(context);
    assertActor(context);
    if (!approval.approval_event_id) throw new PoamWorkflowError("APPROVAL_EVENT_REQUIRED", "POA&M approval requires a human approval event.");
    const version = await this.getVersion(poamVersionId, context);
    if (version.status !== "under_review") throw new PoamWorkflowError("POAM_APPROVAL_BLOCKED", "Only under_review POA&M versions can be approved.");
    const validation = await this.validatePoamForApproval(poamVersionId, context);
    if (!validation.valid) throw new PoamWorkflowError("POAM_APPROVAL_BLOCKED", "POA&M has blocking validation errors.", { errors: validation.errors });
    const approved = {
      ...version,
      status: "approved" as const,
      approved_by: context.actorId!,
      approved_at: new Date().toISOString(),
      approval_event_id: approval.approval_event_id,
      trace_id: context.traceId
    };
    await this.deps.repositories.versions.update(approved);
    await this.supersedePreviousApprovedPoam(approved.assessment_id, approved.poam_version_id, context);
    return approved;
  }

  async supersedePreviousApprovedPoam(assessmentId: string, approvedPoamVersionId: string, context: PoamContext): Promise<void> {
    const versions = await this.deps.repositories.versions.listByAssessment(assessmentId, context.organizationId);
    for (const version of versions) {
      if (version.poam_version_id !== approvedPoamVersionId && version.status === "approved") {
        await this.deps.repositories.versions.update({
          ...version,
          status: "superseded",
          superseded_by: approvedPoamVersionId,
          trace_id: context.traceId
        });
      }
    }
  }

  private async getVersion(poamVersionId: string, context: PoamContext): Promise<PoamVersionResponse> {
    const version = await this.deps.repositories.versions.get(poamVersionId, context.organizationId);
    if (!version || version.assessment_id !== context.assessmentId) throw new PoamWorkflowError("POAM_NOT_FOUND", "POA&M version not found.");
    return version;
  }
}

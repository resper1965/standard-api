import { assertActor, assertContext, SoaWorkflowError } from "../errors";
import type { SoaDependencies, SoaValidationResponse, SoaVersionResponse, SoaWorkflowContext } from "../types";
import { SoaReviewService } from "./soa-review.service";

export class SoaApprovalService {
  constructor(private readonly deps: SoaDependencies) {}

  async validateSoaForApproval(soaVersionId: string, context: SoaWorkflowContext): Promise<SoaValidationResponse> {
    return new SoaReviewService(this.deps).validateSoaForReview(soaVersionId, context);
  }

  async approveSoa(soaVersionId: string, approval: { approval_event_id?: string }, context: SoaWorkflowContext): Promise<SoaVersionResponse> {
    assertContext(context);
    assertActor(context);
    if (!approval.approval_event_id) throw new SoaWorkflowError("APPROVAL_EVENT_REQUIRED", "SoA approval requires a human approval event.");
    const version = await this.getVersion(soaVersionId, context);
    if (version.status !== "under_review") throw new SoaWorkflowError("SOA_APPROVAL_BLOCKED", "Only under_review SoA versions can be approved.");
    const now = new Date().toISOString();
    const approved = {
      ...version,
      status: "approved" as const,
      approval_event_id: approval.approval_event_id,
      approved_by: context.actorId!,
      approved_at: now,
      trace_id: context.traceId,
      metadata: { ...version.metadata, soa_ingestion_status: "required" }
    };
    await this.deps.repositories.versions.update(approved);
    await this.supersedePreviousApprovedVersions(context.assessmentId, approved.soa_version_id, context);
    return approved;
  }

  async supersedePreviousApprovedVersions(assessmentId: string, approvedSoaVersionId: string, context: SoaWorkflowContext): Promise<void> {
    const versions = await this.deps.repositories.versions.listByAssessment(assessmentId, context.organizationId);
    for (const version of versions) {
      if (version.soa_version_id !== approvedSoaVersionId && version.status === "approved") {
        await this.deps.repositories.versions.update({
          ...version,
          status: "superseded",
          superseded_by: approvedSoaVersionId,
          trace_id: context.traceId
        });
      }
    }
  }

  async markSoaIngestionRequired(soaVersionId: string, context: SoaWorkflowContext): Promise<SoaVersionResponse> {
    const version = await this.getVersion(soaVersionId, context);
    const updated = {
      ...version,
      metadata: { ...version.metadata, soa_ingestion_status: "required" },
      trace_id: context.traceId
    };
    await this.deps.repositories.versions.update(updated);
    return updated;
  }

  async markSoaIngested(soaVersionId: string, context: SoaWorkflowContext): Promise<SoaVersionResponse> {
    const version = await this.getVersion(soaVersionId, context);
    const updated = {
      ...version,
      metadata: { ...version.metadata, soa_ingestion_status: "ingested" },
      trace_id: context.traceId
    };
    await this.deps.repositories.versions.update(updated);
    return updated;
  }

  private async getVersion(soaVersionId: string, context: SoaWorkflowContext): Promise<SoaVersionResponse> {
    const version = await this.deps.repositories.versions.get(soaVersionId, context.organizationId);
    if (!version || version.assessment_id !== context.assessmentId) throw new SoaWorkflowError("SOA_VERSION_NOT_FOUND", "SoA version not found.");
    return version;
  }
}

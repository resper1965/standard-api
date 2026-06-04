import { assertActor, assertContext, PoamWorkflowError } from "../errors";
import type { PoamContext, PoamDependencies, PoamItemResponse, PoamVersionResponse, UpdatePoamItemRequest } from "../types";
import { PoamValidationService } from "./poam-validation.service";

export class PoamReviewService {
  constructor(private readonly deps: PoamDependencies) {}

  async updatePoamItem(poamItemId: string, patch: UpdatePoamItemRequest, context: PoamContext): Promise<PoamItemResponse> {
    assertContext(context);
    assertActor(context);
    const item = await this.deps.repositories.items.get(poamItemId, context.organizationId);
    if (!item || item.assessment_id !== context.assessmentId) throw new PoamWorkflowError("POAM_ITEM_NOT_FOUND", "POA&M item not found.");
    const version = await this.getVersion(item.poam_version_id, context);
    if (version.status === "approved") throw new PoamWorkflowError("POAM_IMMUTABLE", "Approved POA&M versions are immutable.");
    const next: PoamItemResponse = { ...item, updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) (next as Record<string, unknown>)[key] = value;
    }
    await this.deps.repositories.items.update(next);
    return next;
  }

  async bulkUpdatePoamItems(poamVersionId: string, patch: UpdatePoamItemRequest, context: PoamContext): Promise<PoamItemResponse[]> {
    const version = await this.getVersion(poamVersionId, context);
    if (version.status === "approved") throw new PoamWorkflowError("POAM_IMMUTABLE", "Approved POA&M versions are immutable.");
    const items = await this.deps.repositories.items.listByVersion(poamVersionId, context.organizationId);
    const updated: PoamItemResponse[] = [];
    for (const item of items) updated.push(await this.updatePoamItem(item.poam_item_id, patch, context));
    return updated;
  }

  async submitPoamForReview(poamVersionId: string, context: PoamContext, exceptionRationale?: string): Promise<PoamVersionResponse> {
    assertContext(context);
    assertActor(context);
    const version = await this.getVersion(poamVersionId, context);
    if (version.status !== "draft") throw new PoamWorkflowError("POAM_REVIEW_BLOCKED", "Only draft POA&M versions can be submitted for review.");
    const validation = await new PoamValidationService(this.deps).validatePoamForReview(poamVersionId, context);
    if (!validation.valid && !exceptionRationale) throw new PoamWorkflowError("POAM_REVIEW_BLOCKED", "POA&M has blocking validation errors.", { errors: validation.errors });
    const submitted = {
      ...version,
      status: "under_review" as const,
      submitted_for_review_at: new Date().toISOString(),
      trace_id: context.traceId,
      metadata: {
        ...version.metadata,
        ...(exceptionRationale ? { exception_rationale: exceptionRationale } : {})
      }
    };
    await this.deps.repositories.versions.update(submitted);
    return submitted;
  }

  private async getVersion(poamVersionId: string, context: PoamContext): Promise<PoamVersionResponse> {
    const version = await this.deps.repositories.versions.get(poamVersionId, context.organizationId);
    if (!version || version.assessment_id !== context.assessmentId) throw new PoamWorkflowError("POAM_NOT_FOUND", "POA&M version not found.");
    return version;
  }
}

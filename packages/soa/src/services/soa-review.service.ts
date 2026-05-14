import { assertActor, assertContext, SoaWorkflowError } from "../errors";
import type { SoaDependencies, SoaItemResponse, SoaValidationResponse, SoaVersionResponse, SoaWorkflowContext, UpdateSoaItemRequest } from "../types";

const definedPatch = <T extends Record<string, unknown>>(patch: T): Partial<T> =>
  Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>;

export class SoaReviewService {
  constructor(private readonly deps: SoaDependencies) {}

  async updateSoaItemDecision(soaItemId: string, patch: UpdateSoaItemRequest, context: SoaWorkflowContext): Promise<SoaItemResponse> {
    assertContext(context);
    assertActor(context);
    const item = await this.deps.repositories.items.get(soaItemId, context.tenantId);
    if (!item || item.assessment_id !== context.assessmentId) throw new SoaWorkflowError("SOA_ITEM_NOT_FOUND", "SoA item not found.");
    const version = await this.getVersion(item.soa_version_id, context);
    if (version.status === "approved") throw new SoaWorkflowError("SOA_VERSION_IMMUTABLE", "Approved SoA versions are immutable.");
    const cleanPatch = definedPatch(patch) as Partial<SoaItemResponse>;
    const candidate: SoaItemResponse = { ...item, ...cleanPatch, updated_at: new Date().toISOString() };
    this.validateItemDecision(candidate);
    await this.deps.repositories.items.update(candidate);
    return candidate;
  }

  async bulkUpdateApplicability(soaVersionId: string, items: Array<{ soa_item_id: string; patch: UpdateSoaItemRequest }>, context: SoaWorkflowContext): Promise<SoaItemResponse[]> {
    const updated: SoaItemResponse[] = [];
    for (const item of items) updated.push(await this.updateSoaItemDecision(item.soa_item_id, item.patch, context));
    return updated.filter((item) => item.soa_version_id === soaVersionId);
  }

  async validateSoaForReview(soaVersionId: string, context: SoaWorkflowContext): Promise<SoaValidationResponse> {
    assertContext(context);
    const items = await this.deps.repositories.items.listByVersion(soaVersionId, context.tenantId);
    const blocking = items.flatMap((item) => this.itemReviewErrors(item));
    return {
      valid: blocking.length === 0,
      blocking_errors: blocking,
      warnings: items.some((item) => item.evidence_coverage === "not_checked") ? ["Some items have not checked evidence coverage."] : [],
      trace_id: context.traceId
    };
  }

  async submitSoaForReview(soaVersionId: string, context: SoaWorkflowContext, exceptionRationale?: string): Promise<SoaVersionResponse> {
    assertActor(context);
    const version = await this.getVersion(soaVersionId, context);
    const validation = await this.validateSoaForReview(soaVersionId, context);
    const hasToBeDefined = validation.blocking_errors.some((error: string) => error.includes("to_be_defined"));
    if (!validation.valid && !(hasToBeDefined && exceptionRationale)) {
      throw new SoaWorkflowError("SOA_REVIEW_BLOCKED", "SoA has blocking validation errors.", { errors: validation.blocking_errors });
    }
    const updated = {
      ...version,
      status: "under_review" as const,
      submitted_for_review_at: new Date().toISOString(),
      trace_id: context.traceId,
      metadata: { ...version.metadata, ...(exceptionRationale ? { exception_rationale: exceptionRationale } : {}) }
    };
    await this.deps.repositories.versions.update(updated);
    return updated;
  }

  private validateItemDecision(item: SoaItemResponse): void {
    if (item.applicability_status === "not_applicable" && !item.non_applicability_rationale) {
      throw new SoaWorkflowError("NON_APPLICABILITY_RATIONALE_REQUIRED", "not_applicable requires non_applicability_rationale.");
    }
    if (item.applicability_status === "out_of_scope" && !item.scope_rationale) {
      throw new SoaWorkflowError("SCOPE_RATIONALE_REQUIRED", "out_of_scope requires scope_rationale.");
    }
  }

  private itemReviewErrors(item: SoaItemResponse): string[] {
    const errors: string[] = [];
    if (item.applicability_status === "to_be_defined") errors.push(`Item ${item.soa_item_id} is to_be_defined.`);
    if (item.applicability_status === "not_applicable" && !item.non_applicability_rationale) errors.push(`Item ${item.soa_item_id} missing non_applicability_rationale.`);
    if (item.applicability_status === "out_of_scope" && !item.scope_rationale) errors.push(`Item ${item.soa_item_id} missing scope_rationale.`);
    return errors;
  }

  private async getVersion(soaVersionId: string, context: SoaWorkflowContext): Promise<SoaVersionResponse> {
    const version = await this.deps.repositories.versions.get(soaVersionId, context.tenantId);
    if (!version || version.assessment_id !== context.assessmentId) throw new SoaWorkflowError("SOA_VERSION_NOT_FOUND", "SoA version not found.");
    return version;
  }
}

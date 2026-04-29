import { assertContext, PoamWorkflowError } from "../errors";
import type { PoamContext, PoamDependencies, PoamItemResponse, PoamValidationResponse } from "../types";

export class PoamValidationService {
  constructor(private readonly deps: PoamDependencies) {}

  async validatePoamForReview(poamVersionId: string, context: PoamContext): Promise<PoamValidationResponse> {
    assertContext(context);
    const version = await this.deps.repositories.versions.get(poamVersionId, context.tenantId);
    if (!version || version.assessment_id !== context.assessmentId) throw new PoamWorkflowError("POAM_NOT_FOUND", "POA&M version not found.");
    const items = await this.deps.repositories.items.listByVersion(poamVersionId, context.tenantId);
    const errors: string[] = [];
    const warnings: string[] = [];
    const itemsRequiringValidation: string[] = [];
    for (const item of items) {
      const itemIssues = this.validatePoamItemObject(item);
      errors.push(...itemIssues.errors);
      warnings.push(...itemIssues.warnings);
      if (item.requires_user_validation) itemsRequiringValidation.push(item.poam_item_id);
    }
    if (items.length === 0) warnings.push("POA&M has no action items. This is only acceptable when all gaps are justified as not applicable or met.");
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      items_requiring_validation: itemsRequiringValidation,
      trace_id: context.traceId
    };
  }

  async validatePoamItem(poamItemId: string, context: PoamContext): Promise<PoamValidationResponse> {
    assertContext(context);
    const item = await this.deps.repositories.items.get(poamItemId, context.tenantId);
    if (!item || item.assessment_id !== context.assessmentId) throw new PoamWorkflowError("POAM_ITEM_NOT_FOUND", "POA&M item not found.");
    const issues = this.validatePoamItemObject(item);
    return {
      valid: issues.errors.length === 0,
      errors: issues.errors,
      warnings: issues.warnings,
      items_requiring_validation: item.requires_user_validation ? [item.poam_item_id] : [],
      trace_id: context.traceId
    };
  }

  async detectGenericActions(poamVersionId: string, context: PoamContext): Promise<string[]> {
    const items = await this.deps.repositories.items.listByVersion(poamVersionId, context.tenantId);
    return items.filter((item) => this.isGeneric(item)).map((item) => item.poam_item_id);
  }

  async detectMissingTraceability(poamVersionId: string, context: PoamContext): Promise<string[]> {
    const items = await this.deps.repositories.items.listByVersion(poamVersionId, context.tenantId);
    return items.filter((item) => !item.related_gap_finding_id || !item.framework_requirement_id || !item.scf_control_id).map((item) => item.poam_item_id);
  }

  async detectItemsRequiringValidation(poamVersionId: string, context: PoamContext): Promise<string[]> {
    const items = await this.deps.repositories.items.listByVersion(poamVersionId, context.tenantId);
    return items.filter((item) => item.requires_user_validation).map((item) => item.poam_item_id);
  }

  private validatePoamItemObject(item: PoamItemResponse): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!item.related_gap_finding_id && !item.rationale) errors.push(`${item.poam_code}: related_gap_finding_id is required unless an administrative exception is justified.`);
    if (!item.corrective_action.trim()) errors.push(`${item.poam_code}: corrective_action is required.`);
    if (item.expected_evidence.length === 0) errors.push(`${item.poam_code}: expected_evidence is required.`);
    if (item.acceptance_criteria.length === 0) errors.push(`${item.poam_code}: acceptance_criteria is required.`);
    if (!item.owner_role && !item.suggested_owner) errors.push(`${item.poam_code}: owner_role or suggested_owner is required.`);
    if (item.action_type === "validation_required" && !item.requires_user_validation) errors.push(`${item.poam_code}: validation_required actions must require user validation.`);
    if (this.isGeneric(item)) errors.push(`${item.poam_code}: generic action without traceability is not allowed.`);
    if (item.confidence_score < 0.5) warnings.push(`${item.poam_code}: low confidence requires reviewer validation.`);
    return { errors, warnings };
  }

  private isGeneric(item: PoamItemResponse): boolean {
    const text = item.corrective_action.trim().toLowerCase();
    return (!item.related_gap_finding_id || !item.framework_requirement_id || !item.scf_control_id) && ["fix issue", "remediate gap", "improve control", ""].includes(text);
  }
}

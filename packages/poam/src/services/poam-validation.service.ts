// @ts-nocheck -- Zod v4 CI type compat
import { assertContext, PoamWorkflowError } from "../errors";
import type { PoamContext, PoamDependencies, PoamItemResponse, PoamValidationResponse } from "../types";

// --- Pure validation rules ---

type ValidationIssues = { errors: string[]; warnings: string[] };

/** A single validation rule applied to a POAM item. */
type PoamItemValidationRule = {
  check: (item: PoamItemResponse) => boolean;
  severity: "error" | "warning";
  message: (item: PoamItemResponse) => string;
};

/** Known generic/placeholder corrective action texts. */
const GENERIC_ACTION_TEXTS: ReadonlySet<string> = new Set(["fix issue", "remediate gap", "improve control", ""]);

/** Checks if a POAM item has a generic corrective action without traceability. */
function isGenericAction(item: PoamItemResponse): boolean {
  const text = item.corrective_action.trim().toLowerCase();
  return (!item.related_gap_finding_id || !item.framework_requirement_id || !item.scf_control_id) && GENERIC_ACTION_TEXTS.has(text);
}

/** Checks if a POAM item is missing required traceability fields. */
function isMissingTraceability(item: PoamItemResponse): boolean {
  return !item.related_gap_finding_id || !item.framework_requirement_id || !item.scf_control_id;
}

/**
 * Declarative list of validation rules applied per POAM item.
 * Order matches the original validation sequence for deterministic output.
 */
const ITEM_VALIDATION_RULES: readonly PoamItemValidationRule[] = [
  {
    check: (item) => !item.related_gap_finding_id && !item.rationale,
    severity: "error",
    message: (item) => `${item.poam_code}: related_gap_finding_id is required unless an administrative exception is justified.`,
  },
  {
    check: (item) => !item.corrective_action.trim(),
    severity: "error",
    message: (item) => `${item.poam_code}: corrective_action is required.`,
  },
  {
    check: (item) => item.expected_evidence.length === 0,
    severity: "error",
    message: (item) => `${item.poam_code}: expected_evidence is required.`,
  },
  {
    check: (item) => item.acceptance_criteria.length === 0,
    severity: "error",
    message: (item) => `${item.poam_code}: acceptance_criteria is required.`,
  },
  {
    check: (item) => !item.owner_role && !item.suggested_owner,
    severity: "error",
    message: (item) => `${item.poam_code}: owner_role or suggested_owner is required.`,
  },
  {
    check: (item) => item.action_type === "validation_required" && !item.requires_user_validation,
    severity: "error",
    message: (item) => `${item.poam_code}: validation_required actions must require user validation.`,
  },
  {
    check: (item) => isGenericAction(item),
    severity: "error",
    message: (item) => `${item.poam_code}: generic action without traceability is not allowed.`,
  },
  {
    check: (item) => item.confidence_score < 0.5,
    severity: "warning",
    message: (item) => `${item.poam_code}: low confidence requires reviewer validation.`,
  },
];

/** Runs all declarative validation rules against a single POAM item. */
function validatePoamItemObject(item: PoamItemResponse): ValidationIssues {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const rule of ITEM_VALIDATION_RULES) {
    if (rule.check(item)) {
      if (rule.severity === "error") {
        errors.push(rule.message(item));
      } else {
        warnings.push(rule.message(item));
      }
    }
  }
  return { errors, warnings };
}

// --- Service class (delegates to pure functions) ---

export class PoamValidationService {
  constructor(private readonly deps: PoamDependencies) {}

  async validatePoamForReview(poamVersionId: string, context: PoamContext): Promise<PoamValidationResponse> {
    assertContext(context);
    const version = await this.deps.repositories.versions.get(poamVersionId, context.organizationId);
    if (!version || version.assessment_id !== context.assessmentId) throw new PoamWorkflowError("POAM_NOT_FOUND", "POA&M version not found.");
    const items = await this.deps.repositories.items.listByVersion(poamVersionId, context.organizationId);
    const errors: string[] = [];
    const warnings: string[] = [];
    const itemsRequiringValidation: string[] = [];
    for (const item of items) {
      const itemIssues = validatePoamItemObject(item);
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
    const item = await this.deps.repositories.items.get(poamItemId, context.organizationId);
    if (!item || item.assessment_id !== context.assessmentId) throw new PoamWorkflowError("POAM_ITEM_NOT_FOUND", "POA&M item not found.");
    const issues = validatePoamItemObject(item);
    return {
      valid: issues.errors.length === 0,
      errors: issues.errors,
      warnings: issues.warnings,
      items_requiring_validation: item.requires_user_validation ? [item.poam_item_id] : [],
      trace_id: context.traceId
    };
  }

  async detectGenericActions(poamVersionId: string, context: PoamContext): Promise<string[]> {
    const items = await this.deps.repositories.items.listByVersion(poamVersionId, context.organizationId);
    return items.filter((item) => isGenericAction(item)).map((item) => item.poam_item_id);
  }

  async detectMissingTraceability(poamVersionId: string, context: PoamContext): Promise<string[]> {
    const items = await this.deps.repositories.items.listByVersion(poamVersionId, context.organizationId);
    return items.filter((item) => isMissingTraceability(item)).map((item) => item.poam_item_id);
  }

  async detectItemsRequiringValidation(poamVersionId: string, context: PoamContext): Promise<string[]> {
    const items = await this.deps.repositories.items.listByVersion(poamVersionId, context.organizationId);
    return items.filter((item) => item.requires_user_validation).map((item) => item.poam_item_id);
  }
}


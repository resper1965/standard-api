/**
 * @module completeness/rules
 * @description Composable rule library for CompletenessAnalyzer.
 *
 * Each rule is a pure function: (input) => BlockingIssue[]
 * Rules emit zero or more issues. They never mutate input.
 *
 * Domain modules compose these to build their analyzer:
 * ```ts
 * rules: [
 *   requireRelation("data_subjects", { minCount: 1, severity: "high" }),
 *   requireCoherence({
 *     condition: (e) => e.third_party_sharing === true,
 *     relation: "third_parties",
 *     code: "THIRD_PARTY_SHARING_WITHOUT_THIRD_PARTIES",
 *     message: "third_party_sharing is true but no third parties are registered."
 *   }),
 *   requireEvidenceForCriticalFields(["legal_basis_lgpd", "dpia_required"]),
 *   requireFieldReviewsResolved(["legal_basis_lgpd", "retention_period"]),
 *   requireScreeningsComplete(),
 *   requireScfControlsReviewed({ minPriority: "high" }),
 *   requireAiSuggestionsResolved(["legal_basis_lgpd", "dpia_required"]),
 * ]
 * ```
 */
import type { BlockingIssue, CompletenessInput, CompletenessRule } from "./types";

// ─── F1: Field presence ─────────────────────────────────────────────

/**
 * Require a specific field to be non-null/non-empty.
 * Use this for fields beyond the basic `required_fields` config,
 * e.g. conditional requirements.
 */
export const requireField = <TEntity>(
  field: string,
  opts?: { severity?: BlockingIssue["severity"]; message?: string }
): CompletenessRule<TEntity> =>
  (input) => {
    const entity = input.entity as Record<string, unknown>;
    const value = entity[field];
    if (value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "")) {
      return [];
    }
    return [{
      code: `MISSING_${field.toUpperCase()}`,
      message: opts?.message ?? `Required field '${field}' is missing.`,
      category: "missing_field",
      severity: opts?.severity ?? "medium",
      affected_fields: [field],
      recommended_action: `Provide a value for '${field}'.`,
    }];
  };

// ─── F2: Relation presence ──────────────────────────────────────────

/**
 * Require at least N items in a named relation.
 *
 * Example:
 * ```ts
 * requireRelation("data_subjects", { minCount: 1, severity: "high" })
 * requireRelation("lifecycle_stages", { minCount: 1 })
 * ```
 */
export const requireRelation = <TEntity>(
  relationName: string,
  opts?: { minCount?: number; severity?: BlockingIssue["severity"]; message?: string }
): CompletenessRule<TEntity> =>
  (input) => {
    const items = input.relations[relationName];
    const minCount = opts?.minCount ?? 1;
    if (items && items.length >= minCount) return [];
    return [{
      code: `MISSING_${relationName.toUpperCase()}`,
      message: opts?.message ?? `At least ${minCount} ${relationName.replace(/_/g, " ")} required.`,
      category: "missing_relation",
      severity: opts?.severity ?? "high",
      affected_fields: [relationName],
      recommended_action: `Add ${relationName.replace(/_/g, " ")} to this activity.`,
    }];
  };

// ─── F2: Cross-entity coherence ─────────────────────────────────────

/**
 * Validate coherence between entity field and a relation.
 *
 * Example:
 * ```ts
 * requireCoherence({
 *   condition: (e) => e.third_party_sharing === true,
 *   relation: "third_parties",
 *   code: "THIRD_PARTY_SHARING_WITHOUT_THIRD_PARTIES",
 *   message: "third_party_sharing is true but no third parties are registered.",
 *   severity: "critical"
 * })
 * ```
 */
export const requireCoherence = <TEntity>(opts: {
  condition: (entity: TEntity) => boolean;
  relation: string;
  code: string;
  message: string;
  severity?: BlockingIssue["severity"];
  affected_fields?: string[];
  recommended_action?: string;
}): CompletenessRule<TEntity> =>
  (input) => {
    if (!opts.condition(input.entity)) return [];
    const items = input.relations[opts.relation];
    if (items && items.length > 0) return [];
    return [{
      code: opts.code,
      message: opts.message,
      category: "coherence",
      severity: opts.severity ?? "high",
      affected_fields: opts.affected_fields ?? [opts.relation],
      recommended_action: opts.recommended_action,
    }];
  };

/**
 * Generic conditional coherence check (no relation involved).
 *
 * Example:
 * ```ts
 * requireConditionalField({
 *   condition: (e) => e.controller_role === "processor",
 *   field: "controller_org_name",
 *   code: "PROCESSOR_WITHOUT_CONTROLLER",
 *   message: "Processor role requires controller organization name."
 * })
 * ```
 */
export const requireConditionalField = <TEntity>(opts: {
  condition: (entity: TEntity) => boolean;
  field: string;
  code: string;
  message: string;
  severity?: BlockingIssue["severity"];
  recommended_action?: string;
}): CompletenessRule<TEntity> =>
  (input) => {
    if (!opts.condition(input.entity)) return [];
    const entity = input.entity as Record<string, unknown>;
    const value = entity[opts.field];
    if (value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "")) {
      return [];
    }
    return [{
      code: opts.code,
      message: opts.message,
      category: "coherence",
      severity: opts.severity ?? "high",
      affected_fields: [opts.field],
      recommended_action: opts.recommended_action,
    }];
  };

// ─── F2: Relation item validation ───────────────────────────────────

/**
 * Validate items within a relation match a predicate.
 *
 * Example:
 * ```ts
 * requireRelationItemValid("third_parties", {
 *   predicate: (tp) => !(tp.role === "processor" && tp.dpa_status === "missing"),
 *   code: "PROCESSOR_WITHOUT_DPA",
 *   message: (tp) => `Third party '${tp.third_party_name}' is processor without DPA.`,
 *   severity: "critical"
 * })
 * ```
 */
export const requireRelationItemValid = <TEntity, TItem = Record<string, unknown>>(
  relationName: string,
  opts: {
    predicate: (item: TItem) => boolean;
    code: string;
    message: string | ((item: TItem) => string);
    severity?: BlockingIssue["severity"];
    affected_fields?: string[];
    recommended_action?: string | ((item: TItem) => string);
  }
): CompletenessRule<TEntity> =>
  (input) => {
    const items = (input.relations[relationName] ?? []) as TItem[];
    return items
      .filter((item) => !opts.predicate(item))
      .map((item) => ({
        code: opts.code,
        message: typeof opts.message === "function" ? opts.message(item) : opts.message,
        category: "coherence" as const,
        severity: opts.severity ?? "high",
        affected_fields: opts.affected_fields ?? [relationName],
        recommended_action: typeof opts.recommended_action === "function" ? opts.recommended_action(item) : opts.recommended_action,
      }));
  };

// ─── F3: Evidence for critical fields ───────────────────────────────

/**
 * Require accepted evidence for critical fields.
 *
 * Example:
 * ```ts
 * requireEvidenceForCriticalFields(["legal_basis_lgpd", "dpia_required"])
 * ```
 */
export const requireEvidenceForCriticalFields = <TEntity>(
  criticalFields: string[]
): CompletenessRule<TEntity> =>
  (input) => {
    // Only flag if there IS evidence in the system (F3+ was implemented)
    if (input.evidence.length === 0) return [];

    const acceptedLinkedFields = new Set(
      input.evidence
        .filter((e) => e.validation_status === "accepted" && e.linked_field)
        .map((e) => e.linked_field!)
    );

    const rejectedLinkedFields = new Set(
      input.evidence
        .filter((e) => e.validation_status === "rejected" && e.linked_field)
        .map((e) => e.linked_field!)
    );

    const allLinkedFields = new Set(
      input.evidence
        .filter((e) => e.linked_field)
        .map((e) => e.linked_field!)
    );

    const issues: BlockingIssue[] = [];

    for (const field of criticalFields) {
      if (rejectedLinkedFields.has(field) && !acceptedLinkedFields.has(field)) {
        // Evidence exists for this field but ALL of it has been rejected
        issues.push({
          code: `EVIDENCE_REJECTED_${field.toUpperCase()}`,
          message: `Evidence for critical field '${field}' has been rejected.`,
          category: "evidence",
          severity: "critical",
          affected_fields: [field],
          recommended_action: `Submit new evidence for '${field}'.`,
        });
      } else if (allLinkedFields.has(field) && !acceptedLinkedFields.has(field)) {
        // Evidence exists but is still pending review — not blocking, but notable
        issues.push({
          code: `EVIDENCE_PENDING_${field.toUpperCase()}`,
          message: `Evidence for critical field '${field}' exists but has not been accepted yet.`,
          category: "evidence",
          severity: "medium",
          affected_fields: [field],
          recommended_action: `Review pending evidence for '${field}'.`,
        });
      }
    }

    return issues;
  };

/**
 * Require evidence for specific artifact types (DPIA, LIA, TIA, DPA).
 *
 * Example:
 * ```ts
 * requireEvidenceForArtifact({
 *   condition: (e) => e.dpia_required === true,
 *   evidence_type: "dpia",
 *   code: "DPIA_REQUIRED_WITHOUT_EVIDENCE",
 *   message: "DPIA is required but no accepted DPIA evidence exists."
 * })
 * ```
 */
export const requireEvidenceForArtifact = <TEntity>(opts: {
  condition: (entity: TEntity) => boolean;
  evidence_type: string;
  code: string;
  message: string;
  severity?: BlockingIssue["severity"];
}): CompletenessRule<TEntity> =>
  (input) => {
    if (!opts.condition(input.entity)) return [];
    const hasAccepted = input.evidence.some(
      (e) => e.evidence_type === opts.evidence_type && e.validation_status === "accepted"
    );
    if (hasAccepted) return [];
    return [{
      code: opts.code,
      message: opts.message,
      category: "evidence",
      severity: opts.severity ?? "critical",
      affected_fields: [opts.evidence_type],
      recommended_action: `Provide and accept ${opts.evidence_type.toUpperCase()} evidence.`,
    }];
  };

// ─── F3: Field reviews resolved ─────────────────────────────────────

/**
 * Require all field reviews for critical fields to be resolved (approved/rejected).
 *
 * Example:
 * ```ts
 * requireFieldReviewsResolved(["legal_basis_lgpd", "retention_period", "dpia_required"])
 * ```
 */
export const requireFieldReviewsResolved = <TEntity>(
  criticalFields: string[]
): CompletenessRule<TEntity> =>
  (input) => {
    return input.field_reviews
      .filter(
        (fr) =>
          criticalFields.includes(fr.field_name) &&
          (fr.review_status === "pending" || fr.review_status === "needs_information")
      )
      .map((fr) => ({
        code: `FIELD_REVIEW_PENDING_${fr.field_name.toUpperCase()}`,
        message: `Field review for critical field '${fr.field_name}' is ${fr.review_status}.`,
        category: "field_review" as const,
        severity: "high" as const,
        affected_fields: [fr.field_name],
        recommended_action: `Review the proposed value for '${fr.field_name}'.`,
      }));
  };

/**
 * Require that critical fields suggested by non-human sources have been reviewed.
 *
 * Example:
 * ```ts
 * requireHumanApprovalForCriticalFields(["legal_basis_lgpd", "dpia_required"])
 * ```
 */
export const requireHumanApprovalForCriticalFields = <TEntity>(
  criticalFields: string[]
): CompletenessRule<TEntity> =>
  (input) => {
    const nonHumanSources = new Set(["agent", "scf", "import", "catalog"]);
    return input.field_reviews
      .filter(
        (fr) =>
          criticalFields.includes(fr.field_name) &&
          nonHumanSources.has(fr.source) &&
          fr.review_status !== "approved" &&
          fr.review_status !== "rejected"
      )
      .map((fr) => ({
        code: `CRITICAL_FIELD_NOT_HUMAN_APPROVED_${fr.field_name.toUpperCase()}`,
        message: `Critical field '${fr.field_name}' was suggested by '${fr.source}' and requires human approval.`,
        category: "field_review" as const,
        severity: "critical" as const,
        affected_fields: [fr.field_name],
        recommended_action: `A human must review and approve '${fr.field_name}'.`,
      }));
  };

// ─── F4: Screenings ─────────────────────────────────────────────────

/**
 * Require all screenings to be complete (not "incomplete" or "needs_review").
 */
export const requireScreeningsComplete = <TEntity>(): CompletenessRule<TEntity> =>
  (input) => {
    return input.screenings
      .filter((s) => s.status === "incomplete")
      .map((s) => ({
        code: `SCREENING_INCOMPLETE_${s.screening_type.toUpperCase()}`,
        message: `Screening '${s.screening_type}' is incomplete.`,
        category: "screening" as const,
        severity: "high" as const,
        affected_fields: [s.screening_type],
        recommended_action: `Provide missing information to complete ${s.screening_type} screening.`,
      }));
  };

// ─── F5: SCF controls ──────────────────────────────────────────────

/**
 * Require SCF controls of a minimum priority to be reviewed.
 *
 * Example:
 * ```ts
 * requireScfControlsReviewed({ minPriority: "high" })
 * ```
 */
export const requireScfControlsReviewed = <TEntity>(
  opts?: { minPriority?: "low" | "medium" | "high" | "critical" }
): CompletenessRule<TEntity> => {
  const priorityOrder = ["low", "medium", "high", "critical"];
  const minIdx = priorityOrder.indexOf(opts?.minPriority ?? "high");

  return (input) => {
    return input.scf_controls
      .filter((c) => {
        const pIdx = priorityOrder.indexOf(c.priority);
        return (
          pIdx >= minIdx &&
          c.applicability_status === "applicable" &&
          c.validation_status === "not_reviewed"
        );
      })
      .map((c) => ({
        code: `SCF_CONTROL_NOT_REVIEWED`,
        message: `SCF control '${c.control_code}' (${c.priority}) is applicable but not reviewed.`,
        category: "scf" as const,
        severity: c.priority === "critical" ? "critical" as const : "high" as const,
        affected_fields: [c.control_code],
        recommended_action: `Review SCF control '${c.control_code}'.`,
      }));
  };
};

/**
 * Require SCF applicability draft to have been executed.
 */
export const requireScfApplicabilityDraft = <TEntity>(): CompletenessRule<TEntity> =>
  (input) => {
    if (input.scf_controls.length > 0) return [];
    return [{
      code: "SCF_APPLICABILITY_NOT_EXECUTED",
      message: "SCF applicability draft has not been executed.",
      category: "scf",
      severity: "high",
      affected_fields: [],
      recommended_action: "Execute SCF applicability draft for this activity.",
    }];
  };

// ─── F6: AI suggestions ────────────────────────────────────────────

/**
 * Require AI suggestions for critical fields to be resolved.
 *
 * Example:
 * ```ts
 * requireAiSuggestionsResolved(["legal_basis_lgpd", "dpia_required", "risk_level"])
 * ```
 */
export const requireAiSuggestionsResolved = <TEntity>(
  criticalFields: string[]
): CompletenessRule<TEntity> =>
  (input) => {
    return input.ai_suggestions
      .filter(
        (s) =>
          s.status === "pending" &&
          s.target_field !== undefined &&
          criticalFields.includes(s.target_field)
      )
      .map((s) => ({
        code: `AI_SUGGESTION_PENDING_${(s.target_field ?? "unknown").toUpperCase()}`,
        message: `AI suggestion for critical field '${s.target_field}' is pending review.`,
        category: "ai_suggestion" as const,
        severity: "high" as const,
        affected_fields: s.target_field ? [s.target_field] : [],
        recommended_action: `Review AI suggestion for '${s.target_field}'.`,
      }));
  };

/**
 * Require AI contradictions to be resolved.
 */
export const requireAiContradictionsResolved = <TEntity>(): CompletenessRule<TEntity> =>
  (input) => {
    return input.ai_suggestions
      .filter((s) => s.suggestion_type === "contradiction" && s.status === "pending")
      .map((s) => ({
        code: "AI_CONTRADICTION_PENDING",
        message: `AI contradiction${s.target_field ? ` for '${s.target_field}'` : ""} is pending resolution.`,
        category: "ai_suggestion" as const,
        severity: "critical" as const,
        affected_fields: s.target_field ? [s.target_field] : [],
        recommended_action: "Review and resolve the AI-detected contradiction.",
      }));
  };

// ─── Custom rule factory ────────────────────────────────────────────

/**
 * Create a custom rule from a predicate on the entity.
 *
 * Example:
 * ```ts
 * customRule({
 *   check: (input) => input.entity.status === "archived",
 *   issue: {
 *     code: "ARCHIVED_ENTITY",
 *     message: "Cannot analyze completeness of archived entity.",
 *     category: "lifecycle",
 *     severity: "critical",
 *     affected_fields: ["status"]
 *   }
 * })
 * ```
 */
export const customRule = <TEntity>(opts: {
  check: (input: CompletenessInput<TEntity>) => boolean;
  issue: BlockingIssue;
}): CompletenessRule<TEntity> =>
  (input) => (opts.check(input) ? [opts.issue] : []);

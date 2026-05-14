/**
 * @module completeness/analyzer
 * @description Factory that creates a CompletenessAnalyzer from composable rules.
 *
 * Usage:
 * ```ts
 * const analyzer = createCompletenessAnalyzer<MyEntity>({
 *   required_fields: ["name", "purpose"],
 *   recommended_fields: ["description"],
 *   critical_fields: ["legal_basis"],
 *   rules: [requireRelation("data_subjects"), ...]
 * });
 *
 * const result = analyzer.analyze(input);
 * ```
 */
import type {
  AiPendingSummary,
  BlockingIssue,
  CompletenessAnalyzer,
  CompletenessAnalyzerConfig,
  CompletenessInput,
  CompletenessResult,
  EvidenceIssue,
  FieldReviewSummary,
  ScfIssue,
  ScreeningIssue,
} from "./types";

// ─── Helpers ────────────────────────────────────────────────────────

const getFieldValue = (entity: Record<string, unknown>, field: string): unknown => {
  const value = entity[field];
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const isEmpty = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === "string" && value.trim() === "");

// ─── Default score calculator ───────────────────────────────────────

const defaultScoreCalculator = <TEntity>(
  input: CompletenessInput<TEntity>,
  issues: BlockingIssue[],
  config: CompletenessAnalyzerConfig<TEntity>
): number => {
  const entity = input.entity as Record<string, unknown>;
  const totalRequired = config.required_fields.length;
  if (totalRequired === 0) return issues.length === 0 ? 100 : 50;

  const filledRequired = config.required_fields.filter(
    (field) => !isEmpty(getFieldValue(entity, field))
  ).length;

  // Base score: proportion of required fields filled (0-60)
  const fieldScore = Math.round((filledRequired / totalRequired) * 60);

  // Relations score: bonus for having child entities (0-15)
  const hasRelations = Object.values(input.relations).some((arr) => arr.length > 0);
  const relationScore = hasRelations ? 15 : 0;

  // Evidence score: bonus for having evidence (0-10)
  const acceptedEvidence = input.evidence.filter((e) => e.validation_status === "accepted").length;
  const evidenceScore = acceptedEvidence > 0 ? Math.min(10, acceptedEvidence * 2) : 0;

  // Penalty: critical blocking issues reduce score
  const criticalIssues = issues.filter((i) => i.severity === "critical").length;
  const highIssues = issues.filter((i) => i.severity === "high").length;
  const penalty = criticalIssues * 10 + highIssues * 5;

  return Math.max(0, Math.min(100, fieldScore + relationScore + evidenceScore - penalty));
};

// ─── Extract domain-specific summaries from issues ──────────────────

const extractFieldReviewSummaries = <TEntity>(
  input: CompletenessInput<TEntity>,
  criticalFields: string[]
): FieldReviewSummary[] =>
  input.field_reviews
    .filter((fr) => fr.review_status === "pending" || fr.review_status === "needs_information")
    .map((fr) => ({
      field_name: fr.field_name,
      review_status: fr.review_status,
      source: fr.source,
      confidence: fr.confidence,
      is_critical: criticalFields.includes(fr.field_name),
    }));

const extractEvidenceIssues = <TEntity>(
  input: CompletenessInput<TEntity>
): EvidenceIssue[] =>
  input.evidence
    .filter((e) => e.validation_status === "rejected" || e.validation_status === "needs_more_evidence")
    .map((e) => ({
      code: e.validation_status === "rejected" ? "EVIDENCE_REJECTED" : "EVIDENCE_NEEDS_MORE",
      message: `Evidence ${e.id} is ${e.validation_status}${e.linked_field ? ` for field ${e.linked_field}` : ""}.`,
      evidence_type: e.evidence_type,
      linked_field: e.linked_field,
      status: e.validation_status,
    }));

const extractScreeningIssues = <TEntity>(
  input: CompletenessInput<TEntity>
): ScreeningIssue[] =>
  input.screenings
    .filter((s) => s.status === "incomplete" || s.status === "needs_review")
    .map((s) => ({
      screening_type: s.screening_type,
      status: s.status,
      message: `Screening ${s.screening_type} is ${s.status}.`,
      blocking: s.status === "incomplete",
    }));

const extractScfIssues = <TEntity>(
  input: CompletenessInput<TEntity>
): ScfIssue[] =>
  input.scf_controls
    .filter(
      (c) =>
        c.validation_status === "not_reviewed" &&
        (c.priority === "critical" || c.priority === "high")
    )
    .map((c) => ({
      control_code: c.control_code,
      control_title: c.control_title,
      applicability_status: c.applicability_status,
      validation_status: c.validation_status,
      priority: c.priority,
      message: `SCF control ${c.control_code} (${c.priority}) requires review.`,
    }));

const extractAiPending = <TEntity>(
  input: CompletenessInput<TEntity>,
  criticalFields: string[]
): AiPendingSummary[] =>
  input.ai_suggestions
    .filter((s) => s.status === "pending")
    .map((s) => ({
      suggestion_type: s.suggestion_type,
      target_field: s.target_field,
      confidence: s.confidence,
      is_critical: s.target_field ? criticalFields.includes(s.target_field) : false,
      message: `AI suggestion for ${s.target_field ?? s.suggestion_type} is pending.`,
    }));

// ─── Factory ────────────────────────────────────────────────────────

export const createCompletenessAnalyzer = <TEntity>(
  config: CompletenessAnalyzerConfig<TEntity>
): CompletenessAnalyzer<TEntity> => {
  const analyze = (input: CompletenessInput<TEntity>): CompletenessResult => {
    const entity = input.entity as Record<string, unknown>;

    // 1. Collect missing required fields
    const missing_required_fields = config.required_fields.filter(
      (field) => isEmpty(getFieldValue(entity, field))
    );

    // 2. Collect missing recommended fields
    const missing_recommended_fields = config.recommended_fields.filter(
      (field) => isEmpty(getFieldValue(entity, field))
    );

    // 3. Run all composable rules to collect blocking issues
    const ruleIssues: BlockingIssue[] = config.rules.flatMap((rule) => rule(input));

    // 4. Add issues for missing required fields that rules didn't already flag
    const flaggedFields = new Set(ruleIssues.flatMap((i) => i.affected_fields));
    const fieldIssues: BlockingIssue[] = missing_required_fields
      .filter((f) => !flaggedFields.has(f))
      .map((field) => ({
        code: `MISSING_${field.toUpperCase()}`,
        message: `Required field '${field}' is missing.`,
        category: "missing_field" as const,
        severity: config.critical_fields.includes(field) ? "high" as const : "medium" as const,
        affected_fields: [field],
        recommended_action: `Provide a value for '${field}'.`,
      }));

    const blocking_issues = [...fieldIssues, ...ruleIssues];

    // 5. Extract domain summaries
    const pending_field_reviews = extractFieldReviewSummaries(input, config.critical_fields);
    const evidence_issues = extractEvidenceIssues(input);
    const screening_issues = extractScreeningIssues(input);
    const scf_issues = extractScfIssues(input);
    const ai_pending = extractAiPending(input, config.critical_fields);

    // 6. Calculate score
    const calculator = config.score_calculator ?? ((inp, iss) => defaultScoreCalculator(inp, iss, config));
    const completeness_score = calculator(input, blocking_issues);

    // 7. Determine gates
    const hasMissingRequired = missing_required_fields.length > 0;
    const hasCriticalBlocking = blocking_issues.some(
      (i) => i.severity === "critical" || i.severity === "high"
    );
    const hasCriticalPendingReview = pending_field_reviews.some((fr) => fr.is_critical);
    const hasCriticalAiPending = ai_pending.some((s) => s.is_critical);
    const hasIncompleteScreening = screening_issues.some((s) => s.blocking);

    const can_be_submitted_for_review =
      !hasMissingRequired &&
      !hasCriticalBlocking &&
      !hasCriticalPendingReview &&
      !hasCriticalAiPending &&
      !hasIncompleteScreening;

    const final_report_allowed =
      can_be_submitted_for_review &&
      blocking_issues.length === 0 &&
      evidence_issues.length === 0 &&
      scf_issues.length === 0;

    const draft_report_allowed = true; // Draft always allowed

    return {
      completeness_score,
      missing_required_fields,
      missing_recommended_fields,
      blocking_issues,
      pending_field_reviews,
      evidence_issues,
      screening_issues,
      scf_issues,
      ai_pending,
      can_be_submitted_for_review,
      final_report_allowed,
      draft_report_allowed,
    };
  };

  return { analyze };
};

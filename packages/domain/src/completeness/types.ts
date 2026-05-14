/**
 * @module completeness/types
 * @description Generic CompletenessAnalyzer contracts.
 *
 * Designed to evolve through progressive enrichment:
 *   F1: field presence checks
 *   F2: cross-entity coherence (relations)
 *   F3: evidence-backed + approval-gated
 *   F4: screening results
 *   F5: SCF applicability
 *   F6: AI suggestions pending
 *
 * Each domain module (Privacy, Risk, Vendor, etc.) implements its own
 * CompletenessAnalyzer using composable rule functions.
 */

// ─── Severity & Category ────────────────────────────────────────────

export type IssueSeverity = "info" | "low" | "medium" | "high" | "critical";

export type IssueCategory =
  | "missing_field"
  | "missing_relation"
  | "coherence"
  | "evidence"
  | "field_review"
  | "screening"
  | "scf"
  | "ai_suggestion"
  | "lifecycle"
  | "custom";

// ─── Individual Issues ──────────────────────────────────────────────

export type BlockingIssue = {
  /** Machine-readable issue code, e.g. "MISSING_PURPOSE" */
  code: string;
  /** Human-readable description */
  message: string;
  /** Category for grouping and filtering */
  category: IssueCategory;
  /** Severity determines if this blocks submission/approval */
  severity: IssueSeverity;
  /** Which field(s) this issue relates to, if any */
  affected_fields: string[];
  /** Recommended action to resolve */
  recommended_action?: string | undefined;
};

export type FieldReviewSummary = {
  field_name: string;
  review_status: string;
  source: string;
  confidence: string;
  is_critical: boolean;
};

export type EvidenceIssue = {
  code: string;
  message: string;
  evidence_type?: string | undefined;
  linked_field?: string | undefined;
  status: string;
};

export type ScreeningIssue = {
  screening_type: string;
  status: string;
  message: string;
  blocking: boolean;
};

export type ScfIssue = {
  control_code: string;
  control_title: string;
  applicability_status: string;
  validation_status: string;
  priority: string;
  message: string;
};

export type AiPendingSummary = {
  suggestion_type: string;
  target_field?: string | undefined;
  confidence: string;
  is_critical: boolean;
  message: string;
};

// ─── Result ─────────────────────────────────────────────────────────

export type CompletenessResult = {
  /** Score from 0 (empty) to 100 (fully complete and validated) */
  completeness_score: number;
  /** Required fields that are missing or invalid */
  missing_required_fields: string[];
  /** Recommended but optional fields that are missing */
  missing_recommended_fields: string[];
  /** Issues that block submission or approval */
  blocking_issues: BlockingIssue[];
  /** Field reviews that are pending human decision */
  pending_field_reviews: FieldReviewSummary[];
  /** Evidence problems (rejected, missing, requested) */
  evidence_issues: EvidenceIssue[];
  /** Screening problems (incomplete, needs_review) */
  screening_issues: ScreeningIssue[];
  /** SCF control problems (unreviewed critical/high) */
  scf_issues: ScfIssue[];
  /** AI suggestions that haven't been reviewed */
  ai_pending: AiPendingSummary[];
  /** Can this entity be submitted for human review? */
  can_be_submitted_for_review: boolean;
  /** Can a final (non-draft) report be generated? */
  final_report_allowed: boolean;
  /** Can a draft report be generated? */
  draft_report_allowed: boolean;
};

// ─── Input ──────────────────────────────────────────────────────────

/**
 * Generic input to the analyzer.
 * Domain modules populate only the layers they've implemented.
 * Missing layers default to empty arrays → earlier phases work unchanged.
 */
export type CompletenessInput<TEntity> = {
  /** The main entity being analyzed */
  entity: TEntity;
  /** Named collections of child entities (data_subjects, systems, etc.) */
  relations: Record<string, unknown[]>;
  /** Evidence records linked to the entity */
  evidence: EvidenceRecord[];
  /** Field-level reviews pending or completed */
  field_reviews: FieldReviewRecord[];
  /** Screening results (DPIA, LIA, TIA, DPA, etc.) */
  screenings: ScreeningRecord[];
  /** SCF controls linked to the entity */
  scf_controls: ScfControlRecord[];
  /** AI suggestions pending review */
  ai_suggestions: AiSuggestionRecord[];
};

// ─── Minimal records (domain-agnostic shapes) ──────────────────────

export type EvidenceRecord = {
  id: string;
  evidence_type: string;
  linked_field?: string | undefined;
  validation_status: string;
  reviewed_by?: string | undefined;
  reviewed_at?: string | undefined;
};

export type FieldReviewRecord = {
  id: string;
  field_name: string;
  source: string;
  confidence: string;
  review_status: string;
  proposed_value?: unknown;
  final_value?: unknown;
};

export type ScreeningRecord = {
  screening_type: string;
  status: string;
  required: boolean | null;
};

export type ScfControlRecord = {
  id: string;
  control_code: string;
  control_title: string;
  applicability_status: string;
  validation_status: string;
  priority: string;
};

export type AiSuggestionRecord = {
  id: string;
  suggestion_type: string;
  target_field?: string | undefined;
  confidence: string;
  status: string;
};

// ─── Rule ───────────────────────────────────────────────────────────

/**
 * A composable rule that inspects the input and emits issues.
 * Rules are pure functions — no side effects, no I/O.
 */
export type CompletenessRule<TEntity> = (
  input: CompletenessInput<TEntity>
) => BlockingIssue[];

// ─── Analyzer interface ─────────────────────────────────────────────

/**
 * The main analyzer contract.
 *
 * Domain modules create concrete analyzers by composing rules:
 * ```ts
 * const analyzer = createCompletenessAnalyzer<PrivacyActivity>({
 *   required_fields: ["name", "purpose"],
 *   recommended_fields: ["security_measures_summary"],
 *   critical_fields: ["legal_basis_lgpd", "dpia_required"],
 *   rules: [
 *     requireRelation("data_subjects"),
 *     requireRelation("data_categories"),
 *     coherenceThirdPartySharing(),
 *     evidenceForCriticalFields(),
 *     fieldReviewsForCriticalFields(),
 *     screeningsComplete(),
 *     scfControlsReviewed(),
 *     aiSuggestionsResolved(),
 *   ]
 * });
 * ```
 */
export type CompletenessAnalyzerConfig<TEntity> = {
  /** Fields that MUST be non-null/non-empty for submission */
  required_fields: string[];
  /** Fields that SHOULD be filled but don't block */
  recommended_fields: string[];
  /** Fields that require human approval (legal, risk, compliance) */
  critical_fields: string[];
  /** Composable rules that emit blocking issues */
  rules: CompletenessRule<TEntity>[];
  /** Custom score calculator. Default: proportional to filled required fields */
  score_calculator?: ((input: CompletenessInput<TEntity>, issues: BlockingIssue[]) => number) | undefined;
};

export type CompletenessAnalyzer<TEntity> = {
  analyze(input: CompletenessInput<TEntity>): CompletenessResult;
};

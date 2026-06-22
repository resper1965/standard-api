/**
 * @module @standard/contracts — Assessment Lifecycle Contracts
 * Wire-format types for the Standard SCF-Based Assessment Lifecycle.
 * These types define the API surface that external consumers and the frontend depend on.
 */

// ── Assessment State Machine ────────────────────────────────────────────────

/**
 * Canonical assessment lifecycle states.
 * Must match the state machine in assessment-engine.
 */
export type AssessmentLifecycleState =
  | "draft"
  | "documents_uploaded"
  | "documents_ingested"
  | "scf_pre_analysis_ready"
  | "framework_selected"
  | "scope_drafted"
  | "soa_drafted"
  | "soa_under_review"
  | "soa_approved"
  | "soa_ingested"
  | "evidence_analysis_ready"
  | "gap_analysis_drafted"
  | "gap_analysis_under_review"
  | "gap_analysis_approved"
  | "maturity_assessed"
  | "maturity_under_review"
  | "maturity_approved"
  | "poam_drafted"
  | "poam_under_review"
  | "poam_approved"
  | "report_generated"
  | "closed"
  | "archived"
  | "cancelled"
  | "failed"
  | "blocked";

// ── Approval Gate ────────────────────────────────────────────────────────────

/**
 * Approval gate identifiers requiring human sign-off.
 */
export type ApprovalGateId =
  | "soa"
  | "gap_analysis"
  | "maturity_assessment"
  | "poam";

/**
 * Approval event created when a human approves a gate.
 */
export type ApprovalEvent = {
  approval_event_id: string;
  gate: ApprovalGateId;
  approved_by: string;
  approved_at: string;
  rationale?: string;
  trace_id: string;
};

// ── STRM Relationship Types ─────────────────────────────────────────────────

/**
 * Canonical STRM relationship operators per ADR-001.
 * ⛔ NEVER use "direct" or "related" — those are legacy anti-patterns.
 */
export type StrmOperator =
  | "equal"
  | "subset"
  | "intersects"
  | "superset"
  | "no_relation";

// ── Agent Run Metadata ──────────────────────────────────────────────────────

/**
 * Traceability metadata for any agent output.
 * Required on every agent-produced artifact per AGENTS.md §10.
 */
export type AgentRunMetadata = {
  agent_run_id: string;
  model: string;
  prompt_version: string;
  input_hash?: string;
  output_hash?: string;
  confidence: number;
  trace_id: string;
};

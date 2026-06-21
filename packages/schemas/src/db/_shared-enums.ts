import { pgEnum } from "drizzle-orm/pg-core";

export const assessmentStateEnum = pgEnum("assessment_state", [
  "draft",
  "documents_uploaded",
  "documents_ingested",
  "scf_pre_analysis_ready",
  "framework_selected",
  "scope_drafted",
  "soa_drafted",
  "soa_under_review",
  "soa_approved",
  "soa_ingested",
  "evidence_analysis_ready",
  "gap_analysis_drafted",
  "gap_analysis_under_review",
  "gap_analysis_approved",
  "maturity_assessed",
  "maturity_under_review",
  "maturity_approved",
  "poam_drafted",
  "poam_under_review",
  "poam_approved",
  "report_generated",
  "closed",
  "archived",
  "failed",
  "cancelled",
  "blocked",
]);

export const artifactStatusEnum = pgEnum("artifact_status", [
  "draft",
  "under_review",
  "approved",
  "superseded",
  "archived",
]);

export const approvalGateEnum = pgEnum("approval_gate", [
  "soa",
  "gap_analysis",
  "maturity_assessment",
  "poam",
  "report",
]);
export const approvalDecisionEnum = pgEnum("approval_decision", [
  "approved",
  "rejected",
  "changes_requested",
]);
export const storageProviderEnum = pgEnum("storage_provider", [
  "r2",
  "external",
  "r2_compatible_mock",
]);
export const documentClassificationEnum = pgEnum("document_classification", [
  "public",
  "internal",
  "confidential",
  "restricted",
]);
export const documentTypeEnum = pgEnum("document_type", [
  "policy",
  "procedure",
  "standard",
  "evidence",
  "soa",
  "report",
  "other",
]);
export const extractionJobStatusEnum = pgEnum("extraction_job_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
export const evidenceStrengthEnum = pgEnum("evidence_strength", [
  "strong",
  "partial",
  "weak",
  "absent",
  "conflicting",
  "not_checked",
]);
export const evidenceStatusEnum = pgEnum("evidence_status", [
  "candidate",
  "accepted",
  "rejected",
  "insufficient",
  "conflicting",
  "not_evidenced",
]);
export const gapStatusEnum = pgEnum("gap_status", [
  "met",
  "partially_met",
  "not_met",
  "not_evidenced",
  "not_applicable_justified",
  "not_applicable_not_justified",
  "requires_validation",
]);
export const gapTypeEnum = pgEnum("gap_type", [
  "documentation_gap",
  "implementation_gap",
  "evidence_gap",
  "effectiveness_gap",
  "governance_gap",
  "technical_gap",
  "contractual_gap",
  "monitoring_gap",
  "no_gap",
  "not_applicable",
]);
/**
 * SCR-RMM Step 14: Report on Conformity (ROC) Determinations.
 * Strictly Conforms → material strength. Material Weakness → crosses risk threshold.
 * Per SCR-RMM, the worst finding in an assessment determines the overall ROC level.
 */
/**
 * SCR-CMM §Assessment Methods: the method used to assess a control.
 * examine = review artifacts/docs; interview = discussions; test = exercise/validate.
 */
export const assessmentMethodEnum = pgEnum("assessment_method", [
  "examine",
  "interview",
  "test",
]);

export const rocDeterminationEnum = pgEnum("roc_determination", [
  "strictly_conforms", // Controls exceed requirements — positive assurance
  "conforms", // Controls meet requirements — baseline assurance
  "significant_deficiency", // Notable gap but below material threshold
  "material_weakness", // Crosses risk threshold — must be in POA&M
]);

/**
 * SCR-RMM Step 8: Assessment Rigor / Assurance Levels.
 * L1=self-assessment (low assurance), L2=reviewed/corroborated (moderate), L3=tested/independent (high).
 */
export const assuranceLevelEnum = pgEnum("assurance_level", [
  "l1_standard", // Standard Rigor — Low Assurance (self-assessment / inquiry)
  "l2_enhanced", // Enhanced Rigor — Moderate Assurance (reviewed / corroborated)
  "l3_comprehensive", // Comprehensive Rigor — High Assurance (tested / verified / independent)
]);

export const poamStatusEnum = pgEnum("poam_status", [
  "draft",
  "approved",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
  "deferred",
]);
export const priorityEnum = pgEnum("priority", [
  "low",
  "medium",
  "high",
  "critical",
  "urgent",
]);
export const severityEnum = pgEnum("severity", [
  "informational",
  "low",
  "medium",
  "high",
  "critical",
]);
export const poamActionTypeEnum = pgEnum("poam_action_type", [
  "policy_update",
  "procedure_creation",
  "technical_implementation",
  "evidence_collection",
  "governance_improvement",
  "monitoring_improvement",
  "training",
  "third_party_action",
  "risk_acceptance",
  "validation_required",
  "other",
]);
export const poamEffortEstimateEnum = pgEnum("poam_effort_estimate", [
  "small",
  "medium",
  "large",
  "extra_large",
  "unknown",
]);
export const poamDependencyTypeEnum = pgEnum("poam_dependency_type", [
  "blocks",
  "related_to",
  "prerequisite",
  "duplicates",
  "depends_on_external_party",
]);
export const responsibilityTypeEnum = pgEnum("responsibility_type", [
  "internal",
  "customer",
  "third_party_provider",
  "shared",
]);
export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "poisoned_dlq",
]);
export const mappingSourceEnum = pgEnum("mapping_source", [
  "official_scf",
  "derived",
  "consultative",
]);
export const reportTypeEnum = pgEnum("report_type", [
  "full_assessment_report",
  "executive_summary",
  "soa_export",
  "gap_analysis_report",
  "maturity_report",
  "poam_report",
  "audit_package",
  "machine_readable_export",
]);
export const reportArtifactTypeEnum = pgEnum("report_artifact_type", [
  "report",
  "export",
  "evidence_index",
  "audit_package",
  "appendix",
  "summary",
]);
export const reportFormatEnum = pgEnum("report_format", [
  "json",
  "markdown",
  "html",
  "docx",
  "pdf",
  "csv",
  "xlsx",
  "zip",
]);
export const exportJobStatusEnum = pgEnum("export_job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped",
  "cancelled",
  "retrying",
]);
export const malwareScanStatusEnum = pgEnum("malware_scan_status", [
  "pending",
  "clean",
  "infected",
  "error",
  "skipped",
]);
export const scfIngestionModeEnum = pgEnum("scf_ingestion_mode", [
  "scf_official_xlsx",
  "oscal_json",
  "synthetic",
  "manual",
]);
export const controlImplementationStatusEnum = pgEnum(
  "control_implementation_status",
  [
    "not_assessed",
    "not_implemented",
    "planned",
    "partially_implemented",
    "implemented",
    "not_applicable",
  ],
);

// ── STRM Canonical Operators (NIST IR 8477 / ADR-001) ────────────────────────
// ⛔ NEVER add "direct", "related", "intersecting", "no_relationship", "source_defined"
// Reference: docs/decisions/ADR-001-strm-weights-algorithm.md
export const strmOperatorEnum = pgEnum("strm_operator", [
  "equal", // = (1.0 weight — full compliance coverage)
  "subset", // ⊂ (1.0 weight — SCF broader than requirement)
  "intersects", // ∩ (dynamic strength_score weight, 0.1–0.9)
  "superset", // ⊃ (max 0.5 weight — SCF narrower than requirement)
  "no_relation", // Ø (0.0 weight — not counted in denominator)
]);

// ── TPRA Enums ────────────────────────────────────────────────────────────────
export const tpraVendorTypeEnum = pgEnum("tpra_vendor_type", [
  "saas",
  "infrastructure",
  "processor",
  "controller",
  "subprocessor",
]);

export const tpraAssessmentStatusEnum = pgEnum("tpra_assessment_status", [
  "draft",
  "submitted",
  "scoring",
  "scored",
  "archived",
]);

export const tpraRiskCategoryEnum = pgEnum("tpra_risk_category", [
  "low",
  "medium",
  "high",
  "critical",
]);

/**
 * SCR-RMM Step 13: Risk Treatment options.
 * Q-C decision (2026-06-09): `accept` does NOT require a mandatory approval event —
 * the register entry itself is the audit record. Extreme/severe risk acceptance is
 * flagged in the ROC report but not hard-gated.
 */
export const riskTreatmentEnum = pgEnum("risk_treatment", [
  "mitigate", // Implement or improve controls to reduce residual risk
  "accept", // Formally accept residual risk (audit-logged; no approval gate)
  "transfer", // Transfer risk via insurance, contract, or third party
  "avoid", // Discontinue the activity that generates the risk
  "monitor", // Accept current level but increase monitoring frequency
]);

export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "pending",
  "running",
  "waiting_for_input",
  "waiting_for_approval",
  "blocked",
  "failed",
  "cancelled",
  "completed",
]);

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
  "retrying",
]);

// ── CDPAS Enums ──────────────────────────────────────────────────────────────
export const cdpasRatingEnum = pgEnum("cdpas_rating", [
  "conforms",
  "significant_deficiency",
  "material_weakness",
  "not_assessed",
  "not_applicable",
]);

export const cdpasMethodEnum = pgEnum("cdpas_method", [
  "examine",
  "interview",
  "test",
]);

// ── MA&D Enums ──────────────────────────────────────────────────────────────
export const madTransactionTypeEnum = pgEnum("mad_transaction_type", [
  "acquisition",
  "merger",
  "divestiture",
  "joint_venture",
  "spin_off",
]);

export const madPhaseEnum = pgEnum("mad_phase", [
  "pre_transaction",
  "transaction_assessment",
  "data_privacy_evaluation",
  "third_party_risk",
  "integration_planning",
  "inherited_risk",
  "contractual_controls",
  "post_transaction_monitoring",
]);

/**
 * V2 API Types (Regulatory Intelligence API)
 *
 * This file contains the strict TypeScript interfaces for the V2 specification.
 * It enforces i18n mapping, specific risk methodology structures, and unified reference data.
 */

// ─── Shared Common Types ───

export interface WorkflowState {
  id: string; // e.g. "received"
  name_i18n: Record<string, string>;
  order: number;
  is_terminal: boolean;
}

export interface AppetiteLevel {
  id: string; // e.g. "conservative"
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  default_max_score: number;
}

export interface TreatmentOption {
  id: string; // e.g. "mitigate"
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  when_i18n: Record<string, string>;
  scf_domains: string[];
}

export interface Right {
  id: string; // e.g. "access"
  name_i18n: Record<string, string>;
  article: string;
  sla_days: number;
  can_be_denied: boolean;
  denial_grounds_i18n: Record<string, string[]>;
  scf_controls: string[];
}

export interface LegalBasis {
  id: string; // e.g. "consent"
  code: string;
  name_i18n: Record<string, string>;
  article: string;
  applicable_data_types: "all" | "normal" | "sensitive";
  requirements: ("lia" | "dpia" | "consent_record")[];
  conditions_i18n: Record<string, string>;
  scf_controls: string[];
}

export interface BreachRules {
  authority_deadline_hours: number | null;
  authority_name: string;
  subject_notification: "always" | "when_high_risk" | "discretionary";
  required_report_fields: string[];
  severity_levels: {
    level: "critical" | "high" | "medium" | "low";
    criteria_i18n: Record<string, string>;
    auth_notify: boolean;
    subject_notify: boolean;
    response_hours: number;
  }[];
  scf_controls: string[];
}

export interface TransferRules {
  adequacy_countries: string[];
  mechanisms: {
    id: string;
    name_i18n: Record<string, string>;
    article: string;
    requires_authority_approval: boolean;
    scf_controls: string[];
  }[];
  safeguards: {
    id: string;
    name_i18n: Record<string, string>;
    article: string;
  }[];
}

export interface ConsentRules {
  validity_criteria_i18n: Record<string, string[]>;
  children_age_threshold: number;
  withdrawal_i18n: Record<string, string>;
  article: string;
  scf_controls: string[];
  consent_types: {
    id: string;
    name_i18n: Record<string, string>;
    requires_opt_in: boolean;
    requires_double_opt_in: boolean;
    renewal_months: number | null;
  }[];
  proof_types: {
    id: string;
    name_i18n: Record<string, string>;
    legal_strength: "strong" | "medium" | "weak";
    recommended_for: string[];
  }[];
}

export interface DPIATrigger {
  id: string;
  description_i18n: Record<string, string>;
  article: string;
  scf_controls: string[];
}

export interface Penalties {
  max_fine_pct_revenue: number | null;
  max_fine_absolute_i18n: Record<string, string>;
  other_sanctions_i18n: Record<string, string[]>;
  article: string;
}

// ─── Reference Data Types (CB-E & CB-F) ───

export interface DataSubjectRef {
  id: string;
  name_i18n: Record<string, string>;
  type: "internal" | "external" | "b2b" | "b2c";
  is_minor: boolean;
  requires_consent_by_default: boolean;
  default_legal_basis: string;
  examples_i18n: Record<string, string[]>;
  applicable_regulations: string[];
  scf_controls: string[];
}

export interface DataCategoryRef {
  id: string;
  name_i18n: Record<string, string>;
  sensitivity: "normal" | "special" | "criminal";
  keywords_i18n: Record<string, string[]>;
  article_by_regulation: {
    regulation_id: string;
    article: string;
    extra_legal_basis_required: boolean;
    extra_requirement_i18n: Record<string, string>;
  }[];
  examples_i18n: Record<string, string[]>;
  scf_controls: string[];
  auto_triggers: { trigger: string; condition_i18n: Record<string, string> }[];
}

export interface RetentionRuleRef {
  data_category_id: string;
  context_id: string;
  context_i18n: Record<string, string>;
  period_i18n: Record<string, string>;
  min_months: number;
  max_months: number | null;
  legal_basis: string;
  jurisdiction: string;
  disposal_method: string;
  scf_controls: string[];
}

export interface LifeCycleStageRef {
  id: string;
  name_i18n: Record<string, string>;
  order: number;
  description_i18n: Record<string, string>;
  scf_controls: string[];
  articles_by_regulation: Record<string, string>;
}

export interface DataOriginRef {
  id: string;
  name_i18n: Record<string, string>;
  requires_consent_notice: boolean;
  scf_controls: string[];
}

export interface CollectionMethodRef {
  id: string;
  name_i18n: Record<string, string>;
  requires_consent_checkbox: boolean;
  privacy_notice_required: boolean;
  scf_controls: string[];
}

export interface ProcessingPurposeRef {
  id: string;
  name_i18n: Record<string, string>;
  category: string;
  typical_legal_basis: string;
  typical_retention_i18n: Record<string, string>;
  dpia_likely: boolean;
  examples_i18n: Record<string, string[]>;
  scf_controls: string[];
}

export interface SecurityMeasureRef {
  id: string;
  name_i18n: Record<string, string>;
  category: "technical" | "organizational" | "physical";
  scf_controls: string[];
  applicable_data_categories: string[];
  priority_for_sensitive: "mandatory" | "recommended" | "optional";
  priority_for_normal: "mandatory" | "recommended" | "optional";
}

export interface DisposalMethodRef {
  id: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  applicable_to: "digital" | "physical" | "both";
  scf_controls: string[];
  articles_by_regulation: Record<string, string>;
}

export interface RiskFactorRef {
  id: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  weight: number;
  triggers_dpia: boolean;
  triggers_lia: boolean;
  regulation_refs: string[];
  detection_rule: string | null;
  scf_controls: string[];
}

export interface VolumeScaleRef {
  id: string;
  label_i18n: Record<string, string>;
  max_records: number;
  risk_contribution: number;
}

export interface DepartmentRef {
  id: string;
  name_i18n: Record<string, string>;
  typical_data_subjects: string[];
  typical_processing_purposes: string[];
}

export interface BgCheckTypeRef {
  id: string;
  name_i18n: Record<string, string>;
  scf_controls: string[];
  required_for_clearance: string[];
}

export interface ClearanceLevelRef {
  id: string;
  name_i18n: Record<string, string>;
  required_checks: string[];
  scf_controls: string[];
}

export interface MaturityLevelRef {
  level: number;
  label_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
}

// ─── Resource Domains Types (CB-A, CB-B, CB-C, CB-D) ───

export interface Regulation {
  id: string;
  name_i18n: Record<string, string>;
  jurisdiction: string;
  authority: string;
  effective_date: string;
  version: string;
  scf_domain: string;
  domains: ("privacy" | "security" | "financial" | "health" | "operational")[];

  legal_bases: LegalBasis[];
  sensitive_legal_bases: LegalBasis[];
  data_subject_rights: Right[];
  breach_rules: BreachRules;
  international_transfer: TransferRules;
  consent_rules: ConsentRules;
  dpia_triggers: DPIATrigger[];
  penalties: Penalties;
  workflow_states: Record<string, WorkflowState[]>;
}

export interface RiskMethodology {
  id: string;
  name_i18n: Record<string, string>;
  dimensions: {
    id: string; // "likelihood" | "impact"
    name_i18n: Record<string, string>;
    scale: {
      value: number;
      id: string;
      label_i18n: Record<string, string>;
      description_i18n: Record<string, string>;
    }[];
  }[];
  matrix: {
    min_score: number;
    max_score: number;
    level: string;
    label_i18n: Record<string, string>;
    color: string;
    action_i18n: Record<string, string>;
  }[];
  statuses: WorkflowState[];
  appetite_levels: AppetiteLevel[];
  treatment_options: TreatmentOption[];
}

export interface RiskCategory {
  id: string;
  name_i18n: Record<string, string>;
  color: string;
  applicable_domains: ("privacy" | "security" | "financial" | "health" | "operational")[];
}

export interface KRI {
  id: string;
  name_i18n: Record<string, string>;
  formula: string;
  unit: string;
  frequency: string;
  thresholds: { green: string; yellow: string; red: string };
  scf_controls: string[];
  risk_ids: string[];
}

export interface Risk {
  id: string;
  category_id: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  typical_likelihood: number;
  typical_impact: number;
  scf_controls: string[];
  mitre_techniques: string[];
  kris: KRI[]; // Injected or referenced
  treatment_examples: {
    strategy: string;
    action_i18n: Record<string, string>;
    scf_control: string;
    estimated_effort: "low" | "medium" | "high";
  }[];
}

export interface AssessmentTemplate {
  id: string;
  type: "tpra" | "dpia" | "gap" | "maturity" | "custom";
  name_i18n: Record<string, string>;
  version: string;
  sections: {
    id: string;
    name_i18n: Record<string, string>;
    scf_domain: string | null;
    weight: number;
    questions: {
      id: string;
      text_i18n: Record<string, string>;
      type: "yes_no" | "scale" | "multi_select" | "text" | "evidence";
      weight: number;
      scoring: Record<string, number>;
      scf_controls: string[];
      required: boolean;
      conditional: {
        depends_on: string;
        show_when: string;
      } | null;
    }[];
  }[];
  scoring: {
    method: "weighted_average" | "worst_section" | "sum";
    thresholds: {
      level: string;
      min_score: number | null;
      max_score: number | null;
      action_i18n: Record<string, string>;
    }[];
  };
}

export interface WorkflowTemplate {
  id: string;
  name_i18n: Record<string, string>;
  domain: "privacy" | "security" | "financial" | "health" | "operational";
  trigger_i18n: Record<string, string>;
  regulation_id: string | null;
  sla: { value: number; unit: "hours" | "days" | "months" } | null;
  sla_article: string | null;
  scf_controls: string[];
  steps: {
    order: number;
    id: string;
    name_i18n: Record<string, string>;
    description_i18n: Record<string, string>;
    type: "manual" | "automated" | "approval" | "decision" | "notification";
    role: string;
    timeout: { value: number; unit: "hours" | "days" } | null;
    ai_assist: boolean;
    condition: string | null;
    outputs_i18n: Record<string, string[]>;
    scf_controls: string[];
  }[];
  escalation_rules: {
    trigger_i18n: Record<string, string>;
    action_i18n: Record<string, string>;
    severity: "warning" | "critical";
  }[];
}

export interface I18nString {
  pt?: string;
  en?: string;
}

export interface LegalBase {
  id: string;
  code: string;
  name_i18n: I18nString;
  article: string;
  applicable_data_types: "non_sensitive" | "sensitive" | "all";
  requires_lia: boolean;
  requires_dpia: boolean;
  requires_consent_record: boolean;
  conditions_i18n: I18nString;
  scf_controls: string[];
}

export interface DataSubjectRight {
  id: string;
  name_i18n: I18nString;
  article: string;
  sla_days: number;
  can_be_denied: boolean;
  denial_grounds_i18n: I18nString;
  scf_controls: string[];
}

export interface Status {
  id: string;
  name_i18n: I18nString;
  order: number;
  is_terminal: boolean;
}

export interface SeverityLevel {
  level: "critical" | "high" | "medium" | "low";
  criteria_i18n: I18nString;
  auth_notify: boolean;
  subject_notify: boolean;
  response_hours: number;
}

export interface BreachRules {
  authority_deadline_hours: number;
  authority_name: string;
  subject_notification: "always" | "when_high_risk" | "never";
  required_report_fields: string[];
  severity_levels: SeverityLevel[];
  scf_controls: string[];
}

export interface TransferMechanism {
  id: string;
  name_i18n: I18nString;
  article: string;
  requires_authority_approval: boolean;
  scf_controls: string[];
}

export interface Safeguard {
  id: string;
  name_i18n: I18nString;
  article: string;
}

export interface InternationalTransfer {
  adequacy_countries: string[];
  mechanisms: TransferMechanism[];
  safeguards: Safeguard[];
}

export interface DpaRequirements {
  mandatory: boolean;
  minimum_clauses_i18n: I18nString;
  article: string;
  scf_controls: string[];
}

export interface ConsentType {
  id: string;
  name_i18n: I18nString;
  requires_opt_in: boolean;
  requires_double_opt_in: boolean;
  renewal_months: number | null;
}

export interface ProofType {
  id: string;
  name_i18n: I18nString;
  legal_strength: "weak" | "medium" | "strong";
  recommended_for: string[];
}

export interface ConsentRules {
  validity_criteria_i18n: I18nString;
  children_age_threshold: number;
  withdrawal_i18n: I18nString;
  article: string;
  scf_controls: string[];
  consent_types: ConsentType[];
  proof_types: ProofType[];
}

export interface DpiaTrigger {
  id: string;
  description_i18n: I18nString;
  article: string;
  scf_controls: string[];
}

export interface Penalties {
  max_fine_pct_revenue: number | null;
  max_fine_absolute_i18n: I18nString;
  other_sanctions_i18n: I18nString;
  article: string;
}

export interface Regulation {
  id: string;
  name_i18n: I18nString;
  jurisdiction: string;
  authority: string;
  effective_date: string;
  scf_domain: string;
  version: string;
  legal_bases: LegalBase[];
  sensitive_legal_bases: LegalBase[];
  data_subject_rights: DataSubjectRight[];
  dsar_statuses: Status[];
  breach_rules: BreachRules;
  breach_statuses: Status[];
  international_transfer: InternationalTransfer;
  dpa_requirements: DpaRequirements;
  consent_rules: ConsentRules;
  dpia_triggers: DpiaTrigger[];
  penalties: Penalties;
}

export interface SCFControl {
  id: string;
  name_i18n: I18nString;
  domain: string;
  priority: "High" | "Medium" | "Low";
  description_i18n: I18nString;
  objective_i18n: I18nString;
}

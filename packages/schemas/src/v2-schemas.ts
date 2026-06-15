// @ts-nocheck -- Zod v4 CI type compat
import { z } from "zod";

/**
 * Shared I18n Record Schema
 * Used for fields like name_i18n, description_i18n, etc.
 */
export const I18nRecordSchema = z.record(z.string(), z.string().or(z.array(z.string())));

// â”€â”€â”€ Shared Common Schemas â”€â”€â”€

export const WorkflowStateSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  order: z.number(),
  is_terminal: z.boolean(),
});

export const AppetiteLevelSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  description_i18n: I18nRecordSchema,
  default_max_score: z.number(),
});

export const TreatmentOptionSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  description_i18n: I18nRecordSchema,
  when_i18n: I18nRecordSchema,
  scf_domains: z.array(z.string()),
});

export const RightSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  article: z.string(),
  sla_days: z.number(),
  can_be_denied: z.boolean(),
  denial_grounds_i18n: z.record(z.string(), z.array(z.string())),
  scf_controls: z.array(z.string()),
});

export const LegalBasisSchema = z.object({
  id: z.string(),
  code: z.string(),
  name_i18n: I18nRecordSchema,
  article: z.string(),
  applicable_data_types: z.enum(["all", "normal", "sensitive"]),
  requirements: z.array(z.enum(["lia", "dpia", "consent_record"])),
  conditions_i18n: I18nRecordSchema,
  scf_controls: z.array(z.string()),
});

export const BreachRulesSchema = z.object({
  authority_deadline_hours: z.number().nullable(),
  authority_name: z.string(),
  subject_notification: z.enum(["always", "when_high_risk", "discretionary"]),
  required_report_fields: z.array(z.string()),
  severity_levels: z.array(
    z.object({
      level: z.enum(["critical", "high", "medium", "low"]),
      criteria_i18n: I18nRecordSchema,
      auth_notify: z.boolean(),
      subject_notify: z.boolean(),
      response_hours: z.number(),
    })
  ),
  scf_controls: z.array(z.string()),
});

export const TransferRulesSchema = z.object({
  adequacy_countries: z.array(z.string()),
  mechanisms: z.array(
    z.object({
      id: z.string(),
      name_i18n: I18nRecordSchema,
      article: z.string(),
      requires_authority_approval: z.boolean(),
      scf_controls: z.array(z.string()),
    })
  ),
  safeguards: z.array(
    z.object({
      id: z.string(),
      name_i18n: I18nRecordSchema,
      article: z.string(),
    })
  ),
});

export const ConsentRulesSchema = z.object({
  validity_criteria_i18n: z.record(z.string(), z.array(z.string())),
  children_age_threshold: z.number(),
  withdrawal_i18n: I18nRecordSchema,
  article: z.string(),
  scf_controls: z.array(z.string()),
  consent_types: z.array(
    z.object({
      id: z.string(),
      name_i18n: I18nRecordSchema,
      requires_opt_in: z.boolean(),
      requires_double_opt_in: z.boolean(),
      renewal_months: z.number().nullable(),
    })
  ),
  proof_types: z.array(
    z.object({
      id: z.string(),
      name_i18n: I18nRecordSchema,
      legal_strength: z.enum(["strong", "medium", "weak"]),
      recommended_for: z.array(z.string()),
    })
  ),
});

export const DPIATriggerSchema = z.object({
  id: z.string(),
  description_i18n: I18nRecordSchema,
  article: z.string(),
  scf_controls: z.array(z.string()),
});

export const PenaltiesSchema = z.object({
  max_fine_pct_revenue: z.number().nullable(),
  max_fine_absolute_i18n: I18nRecordSchema,
  other_sanctions_i18n: z.record(z.string(), z.array(z.string())),
  article: z.string(),
});

// â”€â”€â”€ Reference Data Schemas (CB-E & CB-F) â”€â”€â”€

export const DataSubjectRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  type: z.enum(["internal", "external", "b2b", "b2c"]),
  is_minor: z.boolean(),
  requires_consent_by_default: z.boolean(),
  default_legal_basis: z.string(),
  examples_i18n: z.record(z.string(), z.array(z.string())),
  applicable_regulations: z.array(z.string()),
  scf_controls: z.array(z.string()),
});

export const DataCategoryRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  sensitivity: z.enum(["normal", "special", "criminal"]),
  keywords_i18n: z.record(z.string(), z.array(z.string())),
  article_by_regulation: z.array(
    z.object({
      regulation_id: z.string(),
      article: z.string(),
      extra_legal_basis_required: z.boolean(),
      extra_requirement_i18n: I18nRecordSchema,
    })
  ),
  examples_i18n: z.record(z.string(), z.array(z.string())),
  scf_controls: z.array(z.string()),
  auto_triggers: z.array(
    z.object({
      trigger: z.string(),
      condition_i18n: I18nRecordSchema,
    })
  ),
});

export const RetentionRuleRefSchema = z.object({
  data_category_id: z.string(),
  context_id: z.string(),
  context_i18n: I18nRecordSchema,
  period_i18n: I18nRecordSchema,
  min_months: z.number(),
  max_months: z.number().nullable(),
  legal_basis: z.string(),
  jurisdiction: z.string(),
  disposal_method: z.string(),
  scf_controls: z.array(z.string()),
});

export const LifeCycleStageRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  order: z.number(),
  description_i18n: I18nRecordSchema,
  scf_controls: z.array(z.string()),
  articles_by_regulation: z.record(z.string(), z.string()),
});

export const DataOriginRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  requires_consent_notice: z.boolean(),
  scf_controls: z.array(z.string()),
});

export const CollectionMethodRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  requires_consent_checkbox: z.boolean(),
  privacy_notice_required: z.boolean(),
  scf_controls: z.array(z.string()),
});

export const ProcessingPurposeRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  category: z.string(),
  typical_legal_basis: z.string(),
  typical_retention_i18n: I18nRecordSchema,
  dpia_likely: z.boolean(),
  examples_i18n: z.record(z.string(), z.array(z.string())),
  scf_controls: z.array(z.string()),
});

export const SecurityMeasureRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  category: z.enum(["technical", "organizational", "physical"]),
  scf_controls: z.array(z.string()),
  applicable_data_categories: z.array(z.string()),
  priority_for_sensitive: z.enum(["mandatory", "recommended", "optional"]),
  priority_for_normal: z.enum(["mandatory", "recommended", "optional"]),
});

export const DisposalMethodRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  description_i18n: I18nRecordSchema,
  applicable_to: z.enum(["digital", "physical", "both"]),
  scf_controls: z.array(z.string()),
  articles_by_regulation: z.record(z.string(), z.string()),
});

export const RiskFactorRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  description_i18n: I18nRecordSchema,
  weight: z.number(),
  triggers_dpia: z.boolean(),
  triggers_lia: z.boolean(),
  regulation_refs: z.array(z.string()),
  detection_rule: z.string().nullable(),
  scf_controls: z.array(z.string()),
});

export const VolumeScaleRefSchema = z.object({
  id: z.string(),
  label_i18n: I18nRecordSchema,
  max_records: z.number(),
  risk_contribution: z.number(),
});

export const DepartmentRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  typical_data_subjects: z.array(z.string()),
  typical_processing_purposes: z.array(z.string()),
});

export const BgCheckTypeRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  scf_controls: z.array(z.string()),
  required_for_clearance: z.array(z.string()),
});

export const ClearanceLevelRefSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  required_checks: z.array(z.string()),
  scf_controls: z.array(z.string()),
});

export const MaturityLevelRefSchema = z.object({
  level: z.number(),
  label_i18n: I18nRecordSchema,
  description_i18n: I18nRecordSchema,
});

// â”€â”€â”€ Resource Domain Schemas â”€â”€â”€

export const RegulationSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  jurisdiction: z.string(),
  authority: z.string(),
  effective_date: z.string(),
  version: z.string(),
  scf_domain: z.string(),
  domains: z.array(z.enum(["privacy", "security", "financial", "health", "operational"])),
  legal_bases: z.array(LegalBasisSchema),
  sensitive_legal_bases: z.array(LegalBasisSchema),
  data_subject_rights: z.array(RightSchema),
  breach_rules: BreachRulesSchema,
  international_transfer: TransferRulesSchema,
  consent_rules: ConsentRulesSchema,
  dpia_triggers: z.array(DPIATriggerSchema),
  penalties: PenaltiesSchema,
  workflow_states: z.record(z.string(), z.array(WorkflowStateSchema)),
});

export const RiskMethodologySchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  dimensions: z.array(
    z.object({
      id: z.string(),
      name_i18n: I18nRecordSchema,
      scale: z.array(
        z.object({
          value: z.number(),
          id: z.string(),
          label_i18n: I18nRecordSchema,
          description_i18n: I18nRecordSchema,
        })
      ),
    })
  ),
  matrix: z.array(
    z.object({
      min_score: z.number(),
      max_score: z.number(),
      level: z.string(),
      label_i18n: I18nRecordSchema,
      color: z.string(),
      action_i18n: I18nRecordSchema,
    })
  ),
  statuses: z.array(WorkflowStateSchema),
  appetite_levels: z.array(AppetiteLevelSchema),
  treatment_options: z.array(TreatmentOptionSchema),
});

export const RiskCategorySchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  color: z.string(),
  applicable_domains: z.array(z.enum(["privacy", "security", "financial", "health", "operational"])),
});

export const KRISchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  formula: z.string(),
  unit: z.string(),
  frequency: z.string(),
  thresholds: z.object({ green: z.string(), yellow: z.string(), red: z.string() }),
  scf_controls: z.array(z.string()),
  risk_ids: z.array(z.string()),
});

export const RiskSchema = z.object({
  id: z.string(),
  category_id: z.string(),
  name_i18n: I18nRecordSchema,
  description_i18n: I18nRecordSchema,
  typical_likelihood: z.number(),
  typical_impact: z.number(),
  scf_controls: z.array(z.string()),
  mitre_techniques: z.array(z.string()),
  kris: z.array(KRISchema),
  treatment_examples: z.array(
    z.object({
      strategy: z.string(),
      action_i18n: I18nRecordSchema,
      scf_control: z.string(),
      estimated_effort: z.enum(["low", "medium", "high"]),
    })
  ),
});

export const AssessmentTemplateSchema = z.object({
  id: z.string(),
  type: z.enum(["tpra", "dpia", "gap", "maturity", "custom"]),
  name_i18n: I18nRecordSchema,
  version: z.string(),
  sections: z.array(
    z.object({
      id: z.string(),
      name_i18n: I18nRecordSchema,
      scf_domain: z.string().nullable(),
      weight: z.number(),
      questions: z.array(
        z.object({
          id: z.string(),
          text_i18n: I18nRecordSchema,
          type: z.enum(["yes_no", "scale", "multi_select", "text", "evidence"]),
          weight: z.number(),
          scoring: z.record(z.string(), z.number()),
          scf_controls: z.array(z.string()),
          required: z.boolean(),
          conditional: z.object({
            depends_on: z.string(),
            show_when: z.string(),
          }).nullable(),
        })
      ),
    })
  ),
  scoring: z.object({
    method: z.enum(["weighted_average", "worst_section", "sum"]),
    thresholds: z.array(
      z.object({
        level: z.string(),
        min_score: z.number().nullable(),
        max_score: z.number().nullable(),
        action_i18n: I18nRecordSchema,
      })
    ),
  }),
});

export const WorkflowTemplateSchema = z.object({
  id: z.string(),
  name_i18n: I18nRecordSchema,
  domain: z.enum(["privacy", "security", "financial", "health", "operational"]),
  trigger_i18n: I18nRecordSchema,
  regulation_id: z.string().nullable(),
  sla: z.object({ value: z.number(), unit: z.enum(["hours", "days", "months"]) }).nullable(),
  sla_article: z.string().nullable(),
  scf_controls: z.array(z.string()),
  steps: z.array(
    z.object({
      order: z.number(),
      id: z.string(),
      name_i18n: I18nRecordSchema,
      description_i18n: I18nRecordSchema,
      type: z.enum(["manual", "automated", "approval", "decision", "notification"]),
      role: z.string(),
      timeout: z.object({ value: z.number(), unit: z.enum(["hours", "days"]) }).nullable(),
      ai_assist: z.boolean(),
      condition: z.string().nullable(),
      outputs_i18n: z.record(z.string(), z.array(z.string())),
      scf_controls: z.array(z.string()),
    })
  ),
  escalation_rules: z.array(
    z.object({
      trigger_i18n: I18nRecordSchema,
      action_i18n: I18nRecordSchema,
      severity: z.enum(["warning", "critical"]),
    })
  ),
});


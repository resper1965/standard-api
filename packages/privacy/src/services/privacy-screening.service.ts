import type { PrivacyScreeningResponse, PrivacyScreeningType, PrivacyScreeningResult, PrivacyRegime } from "@standard/schemas";
import type { PrivacyDependencies, PrivacyContext, PrivacyActivityResponse } from "../types";
import { PrivacyError } from "../errors";

type ScreeningTrigger = {
  type: PrivacyScreeningType;
  condition: (a: PrivacyActivityResponse) => boolean;
  triggers: string[];
  riskFactors: string[];
  recommendation: string;
};

// â”€â”€â”€ Per-Regime Screening Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** LGPD screening rules (RIPD per Art. 38, LIA, TIA) */
const LGPD_RULES: ScreeningTrigger[] = [
  {
    type: "dpia",
    condition: (a) => a.large_scope_processing || a.systematic_monitoring || a.vulnerable_subjects || a.automated_decision_making,
    triggers: ["large_scope_processing", "systematic_monitoring", "vulnerable_subjects", "automated_decision_making"],
    riskFactors: ["High-risk processing identified. RIPD may be required per LGPD Art. 38."],
    recommendation: "RIPD (RelatÃ³rio de Impacto) is likely required. Submit for DPO review before processing begins.",
  },
  {
    type: "lia",
    condition: (a) => a.legal_basis_lgpd === "legitimate_interest" || a.legal_bases.some((b) => b.basis === "legitimate_interest"),
    triggers: ["legal_basis=legitimate_interest"],
    riskFactors: ["Legitimate interest requires balancing test between controller interests and data subject rights."],
    recommendation: "LIA is required when using legitimate interest as legal basis under LGPD.",
  },
  {
    type: "tia",
    condition: (a) => a.international_transfer === true,
    triggers: ["international_transfer=true"],
    riskFactors: ["International data transfer requires legal basis and safeguards assessment."],
    recommendation: "TIA is recommended for any international data transfer (LGPD Art. 33-36).",
  },
];

/** GDPR screening rules (DPIA per Art. 35, LIA, TIA per Schrems II) */
const GDPR_RULES: ScreeningTrigger[] = [
  {
    type: "dpia",
    condition: (a) => a.large_scope_processing || a.systematic_monitoring || a.vulnerable_subjects || a.automated_decision_making,
    triggers: ["large_scope_processing", "systematic_monitoring", "vulnerable_subjects", "automated_decision_making"],
    riskFactors: ["High-risk processing identified per GDPR Art. 35 and WP29 guidelines."],
    recommendation: "DPIA (Data Protection Impact Assessment) required before processing begins. Art. 35 GDPR.",
  },
  {
    type: "lia",
    condition: (a) => a.legal_bases.some((b) => b.basis === "legitimate_interest"),
    triggers: ["legal_basis=legitimate_interest"],
    riskFactors: ["Legitimate interest requires three-part test: purpose, necessity, and balancing (Recital 47 GDPR)."],
    recommendation: "LIA is mandatory when relying on legitimate interest under GDPR Art. 6(1)(f).",
  },
  {
    type: "tia",
    condition: (a) => a.international_transfer === true,
    triggers: ["international_transfer=true"],
    riskFactors: ["Post-Schrems II: transfers require risk assessment of destination country legal framework."],
    recommendation: "TIA is mandatory for transfers outside the EEA (GDPR Chapter V, Schrems II ruling).",
  },
];

/** CCPA/CPRA screening rules (Privacy Risk Assessment) */
const CCPA_RULES: ScreeningTrigger[] = [
  {
    type: "dpia",
    condition: (a) => a.large_scope_processing || a.automated_decision_making || a.vulnerable_subjects,
    triggers: ["large_scope_processing", "automated_decision_making", "vulnerable_subjects"],
    riskFactors: ["Processing may qualify as 'high risk' under CPRA, requiring Privacy Risk Assessment."],
    recommendation: "Privacy Risk Assessment recommended per CPRA regulations (Â§7150-7153).",
  },
  // CCPA doesn't use legitimate interest/LIA
  {
    type: "lia",
    condition: () => false,
    triggers: [],
    riskFactors: [],
    recommendation: "",
  },
  {
    type: "tia",
    condition: () => false, // No TIA concept in CCPA
    triggers: [],
    riskFactors: [],
    recommendation: "",
  },
];

/** Fallback rules for regimes without specific implementation */
const DEFAULT_RULES: ScreeningTrigger[] = [
  {
    type: "dpia",
    condition: (a) => a.large_scope_processing || a.systematic_monitoring || a.vulnerable_subjects || a.automated_decision_making,
    triggers: ["large_scope_processing", "systematic_monitoring", "vulnerable_subjects", "automated_decision_making"],
    riskFactors: ["High-risk processing identified. Impact assessment may be required by applicable law."],
    recommendation: "Review local privacy law requirements for impact assessments.",
  },
  {
    type: "lia",
    condition: (a) => a.legal_bases.some((b) => b.basis === "legitimate_interest"),
    triggers: ["legal_basis=legitimate_interest"],
    riskFactors: ["Legitimate interest typically requires a balancing test."],
    recommendation: "Review local requirements for legitimate interest assessments.",
  },
  {
    type: "tia",
    condition: (a) => a.international_transfer === true,
    triggers: ["international_transfer=true"],
    riskFactors: ["International transfer may require additional safeguards."],
    recommendation: "Review local requirements for cross-border data transfers.",
  },
];

const REGIME_RULES: Record<string, ScreeningTrigger[]> = {
  lgpd: LGPD_RULES,
  gdpr: GDPR_RULES,
  uk_gdpr: GDPR_RULES, // UK GDPR uses same rules
  ccpa_cpra: CCPA_RULES,
  // Other regimes fall back to DEFAULT_RULES
};

// â”€â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { PrivacyScfBridge } from "./privacy-scf-bridge.service";

/** Maps screening types to SCF PRI control codes that govern them */
const SCREENING_TO_PRI_CODES: Record<PrivacyScreeningType, string[]> = {
  dpia: ["PRI-06", "PRI-06.1"], // Privacy Impact Assessments
  lia: ["PRI-01", "PRI-01.1"],  // Data Privacy (legal basis)
  tia: ["PRI-09", "PRI-09.1"],  // Cross-Border Data Transfers
};

export class PrivacyScreeningService {
  constructor(private readonly deps: PrivacyDependencies) {}

  /** Run all screening rules against an activity, using its privacy_regime. */
  async screen(activityId: string, context: PrivacyContext): Promise<PrivacyScreeningResponse[]> {
    const activity = await this.deps.repositories.activities.get(activityId, context.organizationId);
    if (!activity) throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${activityId} not found.`);

    const regime = activity.privacy_regime ?? "lgpd";
    const rules = REGIME_RULES[regime] ?? DEFAULT_RULES;

    // Build SCF anchor if repository is available
    let scfAnchor: Awaited<ReturnType<PrivacyScfBridge["buildAnchor"]>> = null;
    if (this.deps.scfRepository) {
      const bridge = new PrivacyScfBridge(this.deps.scfRepository);
      scfAnchor = await bridge.buildAnchor(regime);
    }

    const now = new Date().toISOString();
    const results: PrivacyScreeningResponse[] = [];

    for (const rule of rules) {
      const triggered = rule.condition(activity);
      const activeTriggers = rule.triggers.filter((t) => {
        if (t.includes("=")) {
          const parts = t.split("=");
          const field = parts[0] ?? "";
          const val = parts[1] ?? "";
          return (activity as any)[field] === val
            || activity.legal_bases.some((b: any) => b.basis === val);
        }
        return (activity as any)[t] === true;
      });

      const result: PrivacyScreeningResult = triggered ? "required" : "not_required";

      // Anchor to SCF controls when available
      const priCodes = SCREENING_TO_PRI_CODES[rule.type] ?? [];
      const scfReferences = scfAnchor
        ? scfAnchor.anchored_controls.filter((c) =>
            priCodes.some((code) => c.control_code.startsWith(code))
          )
        : [];

      const screening: PrivacyScreeningResponse = {
        id: crypto.randomUUID(),
        organization_id: context.organizationId,
        activity_id: activityId,
        screening_type: rule.type,
        result,
        triggered_by: activeTriggers,
        risk_factors: triggered ? rule.riskFactors : [],
        recommendation: triggered ? rule.recommendation : null,
        screened_at: now,
        screened_by: context.actorId ?? null,
        created_at: now,
        updated_at: now,
      };

      // Attach SCF metadata as extra fields (preserves backward compat)
      if (scfAnchor && scfReferences.length > 0) {
        (screening as any).scf_anchor = {
          scf_version: scfAnchor.scf_version_label,
          framework_code: scfAnchor.framework_code,
          controls: scfReferences,
        };
      }

      await this.deps.repositories.screenings.save(screening);
      results.push(screening);
    }

    return results;
  }

  async listScreenings(activityId: string, organizationId: string): Promise<PrivacyScreeningResponse[]> {
    return this.deps.repositories.screenings.listByActivity(activityId, organizationId);
  }
}



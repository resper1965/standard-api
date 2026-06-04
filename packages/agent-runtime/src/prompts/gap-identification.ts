/**
 * Gap Identification Prompt
 *
 * LLM-based gap identification for the Gap Analysis pipeline.
 * Takes evidence classification results and produces a structured gap finding
 * with assessment status, gap type, severity, and remediation recommendation.
 *
 * AGENTS.md §10: Agent outputs MUST be schema-validated before persistence.
 * AGENTS.md §8:  SCF structured data is normative; LLM is advisory.
 * AGENTS.md §9:  KB is source of evidence, NOT normative authority.
 */
import type { LlmProvider } from "../llm";
import type { LlmResponseCache } from "../llm-cache";
import { generateStructuredOutputWithUsage, type StructuredOutputResult } from "../structured-output";

// ── Constants ────────────────────────────────────────────────────────
export const PROMPT_VERSION_GAP_IDENTIFICATION = "1.0.0";

// ── Input / Output Types ─────────────────────────────────────────────

export type GapIdentificationInput = {
  controlId: string;
  controlRequirement: string;
  frameworkRequirementId: string;
  evidenceClassification: {
    evidence_strength: string;
    evidence_status: string;
    evidence_summary: string;
    confidence_score: number;
    supporting_quotes: string[];
  };
  soaApplicabilityStatus: string;
  soaNonApplicabilityRationale?: string;
  regulatoryContext?: string;
  organizationId: string;
};

export type GapIdentificationOutput = {
  thinking_process: string;
  assessment_status: "met" | "partially_met" | "not_met" | "not_evidenced" | "not_applicable_justified" | "not_applicable_not_justified" | "requires_validation";
  gap_type: "documentation_gap" | "implementation_gap" | "evidence_gap" | "effectiveness_gap" | "governance_gap" | "technical_gap" | "contractual_gap" | "monitoring_gap" | "no_gap" | "not_applicable";
  severity: "informational" | "low" | "medium" | "high" | "critical";
  gap_summary: string;
  gap_rationale: string;
  recommendation_summary: string;
  confidence_score: number;
  requires_user_validation: boolean;
};

// ── JSON Schema (strict mode) ────────────────────────────────────────

const gapIdentificationSchema = {
  type: "object",
  properties: {
    thinking_process: {
      type: "string",
      description: "Step-by-step reasoning documenting how you derived the gap assessment from the evidence classification. This MUST be written BEFORE deciding the assessment fields."
    },
    assessment_status: {
      type: "string",
      enum: ["met", "partially_met", "not_met", "not_evidenced", "not_applicable_justified", "not_applicable_not_justified", "requires_validation"],
      description: "Compliance assessment status for this control requirement."
    },
    gap_type: {
      type: "string",
      enum: ["documentation_gap", "implementation_gap", "evidence_gap", "effectiveness_gap", "governance_gap", "technical_gap", "contractual_gap", "monitoring_gap", "no_gap", "not_applicable"],
      description: "Type of gap identified."
    },
    severity: {
      type: "string",
      enum: ["informational", "low", "medium", "high", "critical"],
      description: "Severity of the identified gap."
    },
    gap_summary: {
      type: "string",
      description: "Concise summary of the gap finding (max 500 chars)."
    },
    gap_rationale: {
      type: "string",
      description: "Detailed rationale explaining why this assessment status and gap type were assigned."
    },
    recommendation_summary: {
      type: "string",
      description: "Actionable remediation recommendation to close the gap."
    },
    confidence_score: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Confidence in the gap assessment from 0.0 to 1.0."
    },
    requires_user_validation: {
      type: "boolean",
      description: "Whether this finding requires human review before finalization."
    }
  },
  required: [
    "thinking_process",
    "assessment_status",
    "gap_type",
    "severity",
    "gap_summary",
    "gap_rationale",
    "recommendation_summary",
    "confidence_score",
    "requires_user_validation"
  ],
  additionalProperties: false
} as const;

// ── System Prompt ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Senior SCF Gap Analyst for an enterprise GRC assessment platform.

## YOUR ROLE
Given a control requirement and its evidence classification, determine the compliance gap status and produce a structured gap finding with remediation recommendations.

## CRITICAL CHAIN-OF-THOUGHT INSTRUCTION
You MUST document your step-by-step reasoning in "thinking_process" BEFORE deciding the assessment fields. This ensures auditable, traceable gap analysis.

## ASSESSMENT STATUS RULES

### When to use each status:
- "met": Evidence is strong (evidence_strength = "strong") with high confidence (>= 0.75). The control requirement appears fully addressed.
- "partially_met": Evidence is partial. Some aspects of the requirement are addressed but there are coverage gaps.
- "not_met": Evidence is weak and directly contradicts or fails to support the requirement despite being relevant.
- "not_evidenced": No evidence was found (evidence_status = "not_evidenced" or evidence_strength = "absent"). IMPORTANT: Absence of evidence is NOT evidence of non-implementation.
- "not_applicable_justified": The SoA marks this control as not applicable AND a valid rationale exists.
- "not_applicable_not_justified": The SoA marks this control as not applicable BUT no rationale or a weak rationale is provided.
- "requires_validation": Evidence is conflicting, ambiguous, or the confidence is too low for an automated determination.

## GAP TYPE CLASSIFICATION
- "documentation_gap": Policies, procedures, or documentation are missing or incomplete.
- "implementation_gap": Technical or operational implementation is absent or insufficient.
- "evidence_gap": Evidence could not be located or is insufficient to evaluate.
- "effectiveness_gap": Controls exist but are not operating effectively.
- "governance_gap": Governance structures (roles, oversight, accountability) are missing.
- "technical_gap": Technical controls (encryption, access control, monitoring) are missing.
- "contractual_gap": Contractual or third-party obligations are unmet.
- "monitoring_gap": Monitoring, logging, or review mechanisms are absent.
- "no_gap": No gap identified; the requirement is fully met.
- "not_applicable": The control is legitimately not applicable.

## SEVERITY RULES
- "critical": Fundamental security/compliance control missing; immediate risk exposure.
- "high": Significant gap affecting core compliance posture; requires priority remediation.
- "medium": Moderate gap with partial coverage; remediable within standard timelines.
- "low": Minor documentation or evidence gap; low risk impact.
- "informational": No actionable gap; observation or recommendation only.

## requires_user_validation RULES
Set to true when:
- Evidence is conflicting or ambiguous
- Confidence score is below 0.7
- Assessment status is "not_evidenced" (absence ≠ non-implementation)
- Assessment status is "requires_validation"
- The gap type involves judgment calls (effectiveness_gap, governance_gap)

Set to false ONLY when:
- Evidence is strong with high confidence
- Assessment status is "met" or "not_applicable_justified"
- The determination is unambiguous

## KEY CONSTRAINTS
1. You are producing a DRAFT finding. Final compliance status requires human approval.
2. NEVER present absence of evidence as confirmed non-compliance.
3. Always provide actionable, specific remediation recommendations.
4. Consider the regulatory context when determining severity.
5. Be conservative: when in doubt, flag for user validation.`;

// ── UseCase Class ────────────────────────────────────────────────────

export type GapIdentificationOptions = {
  provider: LlmProvider;
  model: string;
  cache?: LlmResponseCache;
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void;
};

export class GapIdentificationPrompt {
  private readonly provider: LlmProvider;
  private readonly model: string;
  private readonly cache: LlmResponseCache | undefined;
  private readonly onUsage: GapIdentificationOptions["onUsage"] | undefined;

  constructor(options: GapIdentificationOptions) {
    this.provider = options.provider;
    this.model = options.model;
    this.cache = options.cache;
    this.onUsage = options.onUsage;
  }

  async identify(input: GapIdentificationInput): Promise<StructuredOutputResult<GapIdentificationOutput>> {
    const quotesBlock = input.evidenceClassification.supporting_quotes.length > 0
      ? `\nSupporting Quotes from Evidence:\n${input.evidenceClassification.supporting_quotes.map((q, i) => `  ${i + 1}. "${q}"`).join("\n")}`
      : "";

    const regulatoryBlock = input.regulatoryContext
      ? `\nOfficial Standard Context:\n<regulatory_context>\n${input.regulatoryContext}\n</regulatory_context>\n`
      : "";

    const applicabilityBlock = input.soaApplicabilityStatus === "not_applicable"
      ? `\nSoA Applicability: NOT APPLICABLE\nNon-Applicability Rationale: ${input.soaNonApplicabilityRationale ?? "No rationale provided."}`
      : `\nSoA Applicability: APPLICABLE`;

    const userPrompt = `Control Requirement (${input.controlId}):\n<control_requirement>\n${input.controlRequirement}\n</control_requirement>\n\nFramework Requirement ID: ${input.frameworkRequirementId}\n${applicabilityBlock}\n${regulatoryBlock}\nEvidence Classification:\n- Strength: ${input.evidenceClassification.evidence_strength}\n- Status: ${input.evidenceClassification.evidence_status}\n- Summary: ${input.evidenceClassification.evidence_summary}\n- Confidence: ${input.evidenceClassification.confidence_score}\n${quotesBlock}`;

    return generateStructuredOutputWithUsage<GapIdentificationOutput>({
      provider: this.provider,
      model: this.model,
      organizationId: input.organizationId,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      schemaName: "gap_identification_result",
      schema: gapIdentificationSchema as unknown as Record<string, unknown>,
      temperature: 0.1,
      maxTokens: 1000,
      ...(this.cache !== undefined ? { cache: this.cache } : {}),
      ...(this.onUsage !== undefined ? { onUsage: this.onUsage } : {})
    });
  }
}

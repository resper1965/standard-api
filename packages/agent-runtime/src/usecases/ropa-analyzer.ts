import type { LlmProvider } from "../llm";
import { generateStructuredOutput } from "../structured-output";

export type RopaAnalysisInput = {
  naturalLanguageDescription: string;
  organizationId: string;
};

export type PrivacyRequiredControl = {
  control_id: string; // e.g. "CRY_01"
  name: string;
  reason: string;
};

export type RopaAnalysisOutput = {
  suggested_risk_level: "low" | "medium" | "high" | "critical";
  required_controls: PrivacyRequiredControl[];
  suggested_legal_basis: string;
  is_dpia_required: boolean;
};

const ropaSchema = {
  type: "object",
  properties: {
    suggested_risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
    required_controls: {
      type: "array",
      items: {
        type: "object",
        properties: {
          control_id: { type: "string" },
          name: { type: "string" },
          reason: { type: "string" }
        },
        required: ["control_id", "name", "reason"],
        additionalProperties: false
      }
    },
    suggested_legal_basis: { type: "string" },
    is_dpia_required: { type: "boolean" }
  },
  required: ["suggested_risk_level", "required_controls", "suggested_legal_basis", "is_dpia_required"],
  additionalProperties: false
};

export class RopaAnalyzerUseCase {
  constructor(private provider: LlmProvider, private defaultModel: string = "gpt-4o-mini") {}

  async analyze(input: RopaAnalysisInput): Promise<RopaAnalysisOutput> {
    const systemPrompt = `You are a Privacy Architect specializing in Data Governance frameworks.
Evaluate the user's free-text description and return structured output. Rules:
1. If it involves health, biometric, or financial data, classify risk as 'high' or 'critical' and set is_dpia_required=true.
2. Suggest the appropriate LGPD/GDPR legal basis (e.g., consent, legal obligation, contract execution, legitimate interest).
3. List mandatory technical security controls from the SCF (Secure Controls Framework), e.g., Encryption (CRY_01), RBAC (IAM_01).`;

    return await generateStructuredOutput<RopaAnalysisOutput>({
      provider: this.provider,
      model: this.defaultModel,
      systemPrompt,
      userPrompt: `Data Processing Activity submitted by client: "${input.naturalLanguageDescription}"`,
      schemaName: "ropa_analysis_result",
      schema: ropaSchema,
      maxTokens: 600
    });
  }
}

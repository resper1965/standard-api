import type { LlmProvider } from "../llm";
import { generateStructuredOutput } from "../structured-output";

export const AGENT_VERSION_BOARD = "1.0.0";

export type BoardTranslatorInput = {
  technicalRiskDescription: string;
  riskCategory: "security" | "privacy" | "compliance" | "architecture";
  businessContext?: string;
  organizationId: string;
};

export type BoardTranslatorOutput = {
  executive_summary: string;
  financial_impact_estimate: string;
  regulatory_impact: string;
  board_level_recommendation: string;
  urgency_metric: number; // 0 a 100
};

const boardTranslatorSchema = {
  type: "object",
  properties: {
    executive_summary: { type: "string" },
    financial_impact_estimate: { type: "string" },
    regulatory_impact: { type: "string" },
    board_level_recommendation: { type: "string" },
    urgency_metric: { type: "number", minimum: 0, maximum: 100 }
  },
  required: [
    "executive_summary",
    "financial_impact_estimate",
    "regulatory_impact",
    "board_level_recommendation",
    "urgency_metric"
  ],
  additionalProperties: false
};

export class BoardTranslatorUseCase {
  constructor(private provider: LlmProvider, private defaultModel: string = "dynamic/assessment-general") {}

  async translate(input: BoardTranslatorInput): Promise<BoardTranslatorOutput> {
    const systemPrompt = `You are the virtual CISO/DPO of a large corporation, acting as a "Board Translator".
Translate highly technical risk descriptions into a format the C-Level and Board understand.
Focus on business impact, financial exposure, regulatory consequences, and reputation.
Write formally and concisely without excessive jargon.`;

    const userPrompt = `Technical Risk to Translate:
---
Category: ${input.riskCategory}
Technical Description: ${input.technicalRiskDescription}
Business Context: ${input.businessContext ?? "Not specified"}
---`;

    return await generateStructuredOutput<BoardTranslatorOutput>({
      provider: this.provider,
      model: this.defaultModel,
      systemPrompt,
      userPrompt,
      schemaName: "executive_board_translator",
      schema: boardTranslatorSchema,
      maxTokens: 700
    });
  }
}


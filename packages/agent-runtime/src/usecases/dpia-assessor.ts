import type { LlmProvider } from "../llm";
import { generateStructuredOutput } from "../structured-output";
import type { RopaAnalysisOutput } from "./ropa-analyzer";

export type DpiaAssessorInput = {
  ropaContext: RopaAnalysisOutput;
  projectDescription: string;
  organizationId: string;
};

export type DpiaAssessorOutput = {
  residual_risk_level: "low" | "medium" | "high" | "critical";
  is_approved_technically: boolean;
  mitigating_controls_required: string[];
  is_draft: boolean; // Indicates the output is from AI and requires human DPO sign-off
  justification: string;
};

const dpiaSchema = {
  type: "object",
  properties: {
    residual_risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
    is_approved_technically: { type: "boolean" },
    mitigating_controls_required: {
      type: "array",
      items: { type: "string" }
    },
    is_draft: { type: "boolean", enum: [true] }, // Hard require true
    justification: { type: "string" }
  },
  required: [
    "residual_risk_level",
    "is_approved_technically",
    "mitigating_controls_required",
    "is_draft",
    "justification"
  ],
  additionalProperties: false
};

export class DpiaAssessorUseCase {
  constructor(private provider: LlmProvider, private defaultModel: string = "gpt-4o") {}

  async assess(input: DpiaAssessorInput): Promise<DpiaAssessorOutput> {
    const systemPrompt = `You are a Senior Privacy Analyst validating a Data Protection Impact Assessment (DPIA/RIPD).
You will receive metadata from a catalogued RoPA activity with primary risk and original controls.
Analyze the data against the project description to calculate residual risk and recommend additional SCF-based mitigation controls.

Mandatory rules:
1. Always set 'is_draft: true' — a human DPO review will be triggered.
2. Define mitigation controls in 'mitigating_controls_required'.
3. Set 'is_approved_technically' to false if there are unacceptable risks to fundamental rights and freedoms under GDPR/LGPD without severe preventive controls in place.`;

    const userPrompt = `RoPA Priority Metadata (Required Context):\n${JSON.stringify(input.ropaContext, null, 2)}\n\nDetailed project execution / potential breach / system description:\n"${input.projectDescription}"`;

    return await generateStructuredOutput<DpiaAssessorOutput>({
      provider: this.provider,
      model: this.defaultModel,
      systemPrompt,
      userPrompt,
      schemaName: "dpia_assessment_result",
      schema: dpiaSchema,
      maxTokens: 700
    });
  }
}

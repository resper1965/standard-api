import type { LlmProvider } from "../llm";
import { generateStructuredOutput } from "../structured-output";
import type { EvidenceEvaluationOutput } from "./evidence-evaluator";

export const AGENT_VERSION_POAM = "1.0.0";

export type PoamRemediationInput = {
  evidenceContext: EvidenceEvaluationOutput;
  systemArchitectureDescription: string;
  tenantId: string;
};

export type PoamRemediationOutput = {
  priority_level: "low" | "medium" | "high" | "critical";
  estimated_effort: "small" | "medium" | "large";
  sprint_action_items: string[];
  devops_commands_suggested: string[];
};

const poamSchema = {
  type: "object",
  properties: {
    priority_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
    estimated_effort: { type: "string", enum: ["small", "medium", "large"] },
    sprint_action_items: {
      type: "array",
      items: { type: "string" }
    },
    devops_commands_suggested: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["priority_level", "estimated_effort", "sprint_action_items", "devops_commands_suggested"],
  additionalProperties: false
};

export class PoamArchitectUseCase {
  constructor(private provider: LlmProvider, private defaultModel: string = "gpt-4o") {}

  async architect(input: PoamRemediationInput): Promise<PoamRemediationOutput> {
    if (input.evidenceContext.is_compliant) {
      throw new Error("Cannot generate PoAM remediation for a compliant evidence context.");
    }

    const systemPrompt = `You are a Senior DevOps Manager / Security Architect.
Read a control compliance failure report where infrastructure evidence did not meet the target.
Produce a Plan of Action & Milestones (POA&M) as agile sprint tickets.
- Determine priority level.
- Specify direct, pragmatic technical actions in sprint_action_items.
- Suggest real commands or script blocks (AWS CLI, Terraform, kubectl) that would fix the reported weakness in devops_commands_suggested.`;

    const userPrompt = `Audit Analysis - Missing Elements (Failures):
${JSON.stringify(input.evidenceContext.missing_elements, null, 2)}

Auditor Intelligence Notes:
"${input.evidenceContext.auditor_notes}"

Team System Description:
"${input.systemArchitectureDescription}"`;

    return await generateStructuredOutput<PoamRemediationOutput>({
      provider: this.provider,
      model: this.defaultModel,
      systemPrompt,
      userPrompt,
      schemaName: "poam_remediation_plan",
      schema: poamSchema,
      maxTokens: 800
    });
  }
}

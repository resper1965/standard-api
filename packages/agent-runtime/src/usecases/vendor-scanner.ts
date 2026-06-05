import type { LlmProvider } from "../llm";
import { generateStructuredOutput } from "../structured-output";

export const AGENT_VERSION_VENDOR = "1.0.0";

export type VendorScannerInput = {
  contractExcerpt: string;
  vendorName: string;
  organizationId: string;
};

export type VendorScannerOutput = {
  has_standard_contractual_clauses: boolean;
  data_subprocessors_listed: string[];
  red_flags_for_negotiation: string[];
  liability_cap_identified?: string;
  is_dpa_compliant: boolean;
};

const vendorScannerSchema = {
  type: "object",
  properties: {
    has_standard_contractual_clauses: { type: "boolean" },
    data_subprocessors_listed: {
      type: "array",
      items: { type: "string" }
    },
    red_flags_for_negotiation: {
      type: "array",
      items: { type: "string" }
    },
    liability_cap_identified: { type: "string" },
    is_dpa_compliant: { type: "boolean" }
  },
  required: ["has_standard_contractual_clauses", "data_subprocessors_listed", "red_flags_for_negotiation", "is_dpa_compliant"],
  additionalProperties: false
};

export class VendorScannerUseCase {
  constructor(private provider: LlmProvider, private defaultModel: string = "dynamic/critical-analysis") {}

  async scan(input: VendorScannerInput): Promise<VendorScannerOutput> {
    const systemPrompt = `You are a DPO Attorney specializing in LGPD and GDPR Vendor Risk Management, acting as "Contract Screener".
You will receive excerpts from Data Processing Agreements (DPAs) and massive B2B contracts.
Analyze deeply and return structured output:
- Flag red_flags_for_negotiation critically if you find: breach notification gaps (>72h caveats), shadow subcontracting without audit rights.
- Identify the list of sub-processors if found.
- Deduce and extract liability limitations (liability_cap_identified).
- Summarize violations for Legal negotiation in the most aggressively protective way.`;

    const userPrompt = `B2B Vendor Analysis: "${input.vendorName}"

Submitted Text (Contract / DPA / SOC2 Report excerpts):
---
${input.contractExcerpt}
---`;

    return await generateStructuredOutput<VendorScannerOutput>({
      provider: this.provider,
      model: this.defaultModel,
      systemPrompt,
      userPrompt,
      schemaName: "vendor_risk_analysis",
      schema: vendorScannerSchema,
      maxTokens: 1000
    });
  }
}

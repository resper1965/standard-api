import type { CostEstimate } from "@standard/schemas";
import type { PricingLookupInput, PricingProvider } from "./pricing-provider.placeholder";

/**
 * OpenAI Pricing Provider — static lookup table for cost estimation.
 *
 * Prices are per 1M tokens (input/output) as of May 2025.
 * Update this table when OpenAI changes pricing.
 */
const OPENAI_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4o":           { inputPer1M: 2.50,   outputPer1M: 10.00 },
  "gpt-4o-mini":      { inputPer1M: 0.15,   outputPer1M: 0.60 },
  "gpt-4-turbo":      { inputPer1M: 10.00,  outputPer1M: 30.00 },
  "gpt-4":            { inputPer1M: 30.00,  outputPer1M: 60.00 },
  "gpt-3.5-turbo":    { inputPer1M: 0.50,   outputPer1M: 1.50 },
  "o1":               { inputPer1M: 15.00,  outputPer1M: 60.00 },
  "o1-mini":          { inputPer1M: 3.00,   outputPer1M: 12.00 },
  "o3-mini":          { inputPer1M: 1.10,   outputPer1M: 4.40 },
};

const EMBEDDING_PRICING: Record<string, { per1M: number }> = {
  "text-embedding-3-small": { per1M: 0.02 },
  "text-embedding-3-large": { per1M: 0.13 },
  "text-embedding-ada-002": { per1M: 0.10 },
};

export class OpenAiPricingProvider implements PricingProvider {
  async estimate(input: PricingLookupInput): Promise<CostEstimate | null> {
    const model = input.model_name?.toLowerCase() ?? "";

    // Embedding models
    if (input.operation_name === "embedding" || model.includes("embedding")) {
      const pricing = EMBEDDING_PRICING[model];
      if (!pricing) return null;

      const cost = (input.usage_quantity / 1_000_000) * pricing.per1M;
      return {
        amount: Math.round(cost * 1_000_000) / 1_000_000,
        currency: "USD",
      };
    }

    // Chat/completion models
    const chatPricing = OPENAI_PRICING[model];
    if (!chatPricing) return null;

    const isOutput = input.usage_unit === "output_tokens";
    const rate = isOutput ? chatPricing.outputPer1M : chatPricing.inputPer1M;
    const cost = (input.usage_quantity / 1_000_000) * rate;

    return {
      amount: Math.round(cost * 1_000_000) / 1_000_000,
      currency: "USD",
    };
  }
}

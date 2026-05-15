import { OpenAiPricingProvider } from "../src/cost/openai-pricing-provider";
import { expect, test } from "./test-kit";

// ═══════════════════════════════════════════════════════════════
//  OpenAI Pricing Provider Tests
// ═══════════════════════════════════════════════════════════════

test("OpenAiPricingProvider estima custo GPT-4o input corretamente", async () => {
  const provider = new OpenAiPricingProvider();
  const result = await provider.estimate({
    service_name: "openai",
    operation_name: "chat",
    model_name: "gpt-4o",
    usage_quantity: 1_000_000,
    usage_unit: "input_tokens",
  });

  if (!result) throw new Error("Expected cost estimate");
  expect(result.currency).toBe("USD");
  expect(result.amount).toBe(2.5); // $2.50 per 1M input tokens
});

test("OpenAiPricingProvider estima custo GPT-4o output corretamente", async () => {
  const provider = new OpenAiPricingProvider();
  const result = await provider.estimate({
    service_name: "openai",
    operation_name: "chat",
    model_name: "gpt-4o",
    usage_quantity: 1_000_000,
    usage_unit: "output_tokens",
  });

  if (!result) throw new Error("Expected cost estimate");
  expect(result.amount).toBe(10.0); // $10 per 1M output tokens
});

test("OpenAiPricingProvider estima embedding-3-small", async () => {
  const provider = new OpenAiPricingProvider();
  const result = await provider.estimate({
    service_name: "openai",
    operation_name: "embedding",
    model_name: "text-embedding-3-small",
    usage_quantity: 1_000_000,
    usage_unit: "tokens",
  });

  if (!result) throw new Error("Expected cost estimate");
  expect(result.amount).toBe(0.02); // $0.02 per 1M tokens
});

test("OpenAiPricingProvider retorna null para modelo desconhecido", async () => {
  const provider = new OpenAiPricingProvider();
  const result = await provider.estimate({
    service_name: "openai",
    operation_name: "chat",
    model_name: "gpt-99-turbo",
    usage_quantity: 100,
    usage_unit: "input_tokens",
  });

  expect(result).toBe(null);
});

test("OpenAiPricingProvider: quantidade pequena não perde precisão", async () => {
  const provider = new OpenAiPricingProvider();
  const result = await provider.estimate({
    service_name: "openai",
    operation_name: "chat",
    model_name: "gpt-4o-mini",
    usage_quantity: 500,
    usage_unit: "input_tokens",
  });

  if (!result) throw new Error("Expected cost estimate");
  // 500 / 1M * $0.15 = $0.000075
  expect(result.amount).toBe(0.000075);
});

test("OpenAiPricingProvider: o3-mini pricing", async () => {
  const provider = new OpenAiPricingProvider();
  const result = await provider.estimate({
    service_name: "openai",
    operation_name: "chat",
    model_name: "o3-mini",
    usage_quantity: 1_000_000,
    usage_unit: "input_tokens",
  });

  if (!result) throw new Error("Expected cost estimate");
  expect(result.amount).toBe(1.1); // $1.10 per 1M
});

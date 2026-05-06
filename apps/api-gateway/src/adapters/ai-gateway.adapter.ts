/**
 * @module ai-gateway.adapter
 * @description Cloudflare AI Gateway LLM adapter.
 * Proxies OpenAI-compatible requests through Cloudflare's AI Gateway.
 */
import type {
  LlmProvider,
  LlmGenerateInput,
  LlmGenerateOutput,
  LlmMessage,
  LlmTool,
} from "@standard/agent-runtime";

export type AiGatewayConfig = {
  baseUrl: string; // e.g. https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway}/openai
  apiKey: string;  // e.g. OpenAI API Key
};

export class CloudflareAiGatewayAdapter implements LlmProvider {
  constructor(private readonly config: AiGatewayConfig) {}

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        tools: input.tools?.length ? input.tools : undefined,
        temperature: input.temperature ?? 0,
        max_tokens: input.max_tokens,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Gateway error (${response.status}): ${errText}`);
    }

    const data = await response.json() as OpenAICompletionResponse;
    const choice = data.choices[0];
    if (!choice) {
      throw new Error("No choices returned from LLM provider");
    }

    return {
      message: choice.message,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.usage?.completion_tokens ?? 0,
        total_tokens: data.usage?.total_tokens ?? 0,
      },
    };
  }
}

// Minimal OpenAI response type shape
type OpenAICompletionResponse = {
  id: string;
  choices: {
    index: number;
    message: LlmMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};


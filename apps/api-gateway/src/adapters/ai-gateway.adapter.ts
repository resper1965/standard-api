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
  gatewayToken?: string; // Cloudflare API token for Authenticated Gateway
};

export class CloudflareAiGatewayAdapter implements LlmProvider {
  private static readonly TIMEOUT_MS = 15_000;
  private static readonly RETRYABLE_STATUSES = [502, 503, 429];

  constructor(private readonly config: AiGatewayConfig) {}

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const body = JSON.stringify({
      model: input.model,
      messages: input.messages,
      tools: input.tools?.length ? input.tools : undefined,
      temperature: input.temperature ?? 0,
      max_tokens: input.max_tokens,
      response_format: input.response_format,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.config.apiKey}`,
    };

    if (this.config.gatewayToken) {
      headers["cf-aig-authorization"] = `Bearer ${this.config.gatewayToken}`;
    }

    const url = `${this.config.baseUrl}/chat/completions`;

    // Attempt with timeout + single retry for transient errors
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CloudflareAiGatewayAdapter.TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          if (attempt === 0 && CloudflareAiGatewayAdapter.RETRYABLE_STATUSES.includes(response.status)) {
            lastError = new Error(`AI Gateway error (${response.status}): ${errText}`);
            continue; // Retry once
          }
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
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new Error(`AI Gateway timeout after ${CloudflareAiGatewayAdapter.TIMEOUT_MS}ms`);
          if (attempt === 0) continue; // Retry once on timeout
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error("AI Gateway: all retries exhausted");
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


/**
 * @module ai-gateway.adapter
 * @description Cloudflare AI Gateway LLM adapter.
 * Proxies OpenAI-compatible requests through Cloudflare's AI Gateway
 * with native cache, retry, and observability headers.
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
  /** Cache TTL in seconds. Default: 3600 (1 hour). Set to 0 to disable. */
  cacheTtlSeconds?: number;
  /** Optional metadata for per-tenant/per-agent observability in Cloudflare dashboard. Max 5 entries. */
  metadata?: Record<string, string | number | boolean>;
};

export class CloudflareAiGatewayAdapter implements LlmProvider {
  private static readonly TIMEOUT_MS = 60_000;
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

    // AI Gateway native cache — avoids redundant LLM calls for identical prompts
    const cacheTtl = this.config.cacheTtlSeconds ?? 3600;
    if (cacheTtl > 0) {
      headers["cf-aig-cache-ttl"] = String(cacheTtl);
    }

    // AI Gateway native retry with exponential backoff
    headers["cf-aig-max-attempts"] = "3";
    headers["cf-aig-retry-delay"] = "1000";
    headers["cf-aig-backoff"] = "exponential";
    headers["cf-aig-request-timeout"] = String(CloudflareAiGatewayAdapter.TIMEOUT_MS);

    // AI Gateway metadata for observability (per-tenant cost tracking in dashboard)
    if (this.config.metadata && Object.keys(this.config.metadata).length > 0) {
      headers["cf-aig-metadata"] = JSON.stringify(this.config.metadata);
    }

    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    // Attempt with timeout + single retry for transient errors
    const callStartedAt = Date.now();
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

          // Auth errors are non-retryable and indicate a config problem
          if (response.status === 401 || response.status === 403) {
            throw new Error(
              `AI Gateway auth failed (${response.status}). Check AI_GATEWAY_TOKEN and OPENAI_API_KEY. Detail: ${errText.substring(0, 300)}`
            );
          }

          if (attempt === 0 && CloudflareAiGatewayAdapter.RETRYABLE_STATUSES.includes(response.status)) {
            lastError = new Error(`AI Gateway error (${response.status}): ${errText}`);
            continue; // Retry once
          }
          throw new Error(`AI Gateway error (${response.status}): ${errText}`);
        }

        // Log cache status from AI Gateway response
        const cacheStatus = response.headers.get("cf-aig-cache-status") ?? "UNKNOWN";
        const latencyMs = Date.now() - callStartedAt;

        const data = await response.json() as OpenAICompletionResponse;
        const choice = data.choices[0];
        if (!choice) {
          throw new Error("No choices returned from LLM provider");
        }

        const usage = {
          prompt_tokens: data.usage?.prompt_tokens ?? 0,
          completion_tokens: data.usage?.completion_tokens ?? 0,
          total_tokens: data.usage?.total_tokens ?? 0,
        };

        // Structured observability log for LLM calls
        console.log(JSON.stringify({
          metric: "llm.call",
          model: input.model,
          cache_status: cacheStatus,
          latency_ms: latencyMs,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          attempt,
          ...(this.config.metadata ?? {}),
          timestamp: new Date().toISOString(),
        }));

        return { message: choice.message, usage };
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


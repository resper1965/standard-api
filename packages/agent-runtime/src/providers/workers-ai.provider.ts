/**
 * @module workers-ai.provider
 * @description Real Cloudflare Workers AI provider for agent runtime.
 * Uses the Vercel AI SDK workers-ai-provider package.
 * Default model: @cf/meta/llama-3.3-70b-instruct-fp8-fast
 */
import type { LlmProvider, LlmGenerateInput, LlmGenerateOutput } from "../llm";

/** Minimal Cloudflare Workers AI binding interface (env.AI) — accepts any superset */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AiBinding = Record<string, any> & { run: (model: string, input: any) => Promise<any> };

export type WorkersAIProviderConfig = {
  /** The Cloudflare Workers AI binding (env.AI) */
  binding: AiBinding;
  /** Override the default model ID */
  model?: string;
  /** Optional AI Gateway configuration for observability and rate limiting */
  gateway?: { id: string; cacheTtl?: number };
};

const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/**
 * Creates a Vercel AI SDK LanguageModel backed by Cloudflare Workers AI.
 * 
 * @example
 * ```ts
 * const model = createWorkersAILanguageModel({ binding: env.AI });
 * const result = await generateText({ model, prompt: "..." });
 * ```
 */
export function createWorkersAILanguageModel(config: WorkersAIProviderConfig): LlmProvider {
  return {
    generate: async (input: LlmGenerateInput): Promise<LlmGenerateOutput> => {
      const model = input.model ?? config.model ?? DEFAULT_MODEL;
      const response = await config.binding.run(model, {
        messages: input.messages,
        max_tokens: input.max_tokens,
        temperature: input.temperature
      });

      return {
        message: {
          role: "assistant",
          content: response.response ?? ""
        },
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    }
  };
}

export { DEFAULT_MODEL as WORKERS_AI_DEFAULT_MODEL };

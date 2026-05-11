/**
 * @module workers-ai.provider
 * @description Real Cloudflare Workers AI provider for agent runtime.
 * Uses the Vercel AI SDK workers-ai-provider package.
 * Default model: @cf/meta/llama-3.3-70b-instruct-fp8-fast
 */
import { createWorkersAI } from "workers-ai-provider";
import type { LanguageModel } from "ai";

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
export function createWorkersAILanguageModel(config: WorkersAIProviderConfig): LanguageModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workersAI = createWorkersAI({ binding: config.binding as any });
  return workersAI(config.model ?? DEFAULT_MODEL);
}

export { DEFAULT_MODEL as WORKERS_AI_DEFAULT_MODEL };

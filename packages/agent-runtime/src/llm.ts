/**
 * @module llm
 * @description Interfaces for LLM inference providers used by the agent runtime.
 */

export type LlmMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string; // JSON string
    };
  }[];
  tool_call_id?: string;
};

export type LlmTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
};

export type LlmGenerateInput = {
  model: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: "json_object" | "json_schema";
    json_schema?: {
      name: string;
      schema: Record<string, unknown>;
      strict?: boolean;
    };
  };
};

export type LlmGenerateOutput = {
  message: LlmMessage;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Model name actually used (e.g. "gpt-4o"). */
  model?: string;
  /** Provider identifier (e.g. "cloudflare-ai-gateway", "mock"). */
  provider?: string;
  /** Latency in milliseconds. */
  latency_ms?: number;
  /** Cache status from AI Gateway. */
  cache_status?: "HIT" | "MISS" | "BYPASS" | "UNKNOWN";
};

export interface LlmProvider {
  generate(input: LlmGenerateInput): Promise<LlmGenerateOutput>;
}

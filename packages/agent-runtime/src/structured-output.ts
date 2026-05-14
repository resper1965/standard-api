import type { LlmProvider, LlmMessage, LlmGenerateOutput } from "./llm";
import type { LlmResponseCache } from "./llm-cache";

export type StructuredOutputOptions<T> = {
  provider: LlmProvider;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>; // JSON Schema
  temperature?: number;
  maxTokens?: number;
  cache?: LlmResponseCache; // Optional semantic cache for repeat evaluations
};

export type StructuredOutputResult<T> = {
  data: T;
  usage: LlmGenerateOutput["usage"];
};

/**
 * Validates that all required fields from the JSON Schema exist in the parsed output.
 * This catches cases where the LLM returns valid JSON but misses required fields.
 */
function validateRequiredFields(parsed: Record<string, unknown>, schema: Record<string, unknown>): string[] {
  const required = (schema.required ?? []) as string[];
  const missing = required.filter((field) => !(field in parsed));
  return missing;
}

/**
 * Generates a structured LLM output with:
 * 1. JSON parse safety + single retry on parse failure
 * 2. Required field validation against the declared schema
 * 3. Usage tracking for cost observability
 */
export async function generateStructuredOutput<T>(options: StructuredOutputOptions<T>): Promise<T> {
  const result = await generateStructuredOutputWithUsage<T>(options);
  return result.data;
}

/**
 * Same as generateStructuredOutput but also returns token usage for cost tracking.
 */
export async function generateStructuredOutputWithUsage<T>(options: StructuredOutputOptions<T>): Promise<StructuredOutputResult<T>> {
  const messages: LlmMessage[] = [
    { role: "system", content: options.systemPrompt },
    { role: "user", content: options.userPrompt }
  ];

  const generateInput = {
    model: options.model,
    messages,
    temperature: options.temperature ?? 0.1,
    ...(options.maxTokens != null ? { max_tokens: options.maxTokens } : {}),
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: options.schemaName,
        schema: options.schema,
        strict: true
      }
    }
  };

  // ── Check cache first ──
  if (options.cache) {
    const cached = await options.cache.get(generateInput);
    if (cached) {
      // Validate cached response structure (cache may be stale vs schema changes)
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(cached.message.content);
        const missingFields = validateRequiredFields(parsed, options.schema);
        if (missingFields.length === 0) {
          return { data: parsed as T, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
        }
      } catch {
        // Cache hit but invalid — fall through to LLM
      }
    }
  }

  // Attempt with single retry on parse/validation failure
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await options.provider.generate(generateInput);
    const raw = response.message.content;

    // ── Step 1: Parse JSON safely ──
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      lastError = new Error(
        `LLM returned invalid JSON (attempt ${attempt + 1}): ${parseErr instanceof Error ? parseErr.message : String(parseErr)}. ` +
        `Raw content (first 200 chars): ${raw.slice(0, 200)}`
      );
      if (attempt === 0) continue; // Retry once
      throw lastError;
    }

    // ── Step 2: Validate required fields ──
    const missingFields = validateRequiredFields(parsed, options.schema);
    if (missingFields.length > 0) {
      lastError = new Error(
        `LLM output missing required fields (attempt ${attempt + 1}): [${missingFields.join(", ")}]. ` +
        `Schema: ${options.schemaName}`
      );
      if (attempt === 0) continue; // Retry once
      throw lastError;
    }

    // ── Step 3: Cache the validated response ──
    if (options.cache) {
      options.cache.set(generateInput, response).catch(() => {}); // Fire-and-forget
    }

    // ── Step 4: Return validated data + usage ──
    return {
      data: parsed as T,
      usage: response.usage,
    };
  }

  throw lastError ?? new Error("generateStructuredOutput: all retries exhausted");
}


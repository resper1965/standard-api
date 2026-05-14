import type { PromptContentTrustLevel } from "@standard/schemas";

export type WrappedPromptContent = {
  trust_level: PromptContentTrustLevel;
  content: string;
  source: Record<string, string>;
  detected_injection: boolean;
  instructions: string[];
};


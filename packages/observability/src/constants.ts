export const SENSITIVE_FIELD_NAMES = [
  "password",
  "token",
  "api_key",
  "authorization",
  "cookie",
  "secret",
  "private_key",
  "access_key",
  "refresh_token",
  "id_token",
  "document_text",
  "chunk_text",
  "prompt",
  "completion",
  "raw_llm_output",
  "file_content",
  "extracted_text",
  "signed_url"
] as const;

export const DEFAULT_REDACTION_REPLACEMENT = "[REDACTED]";


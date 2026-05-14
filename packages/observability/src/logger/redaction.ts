import { DEFAULT_REDACTION_REPLACEMENT, SENSITIVE_FIELD_NAMES } from "../constants";

const sensitiveFields = new Set<string>(SENSITIVE_FIELD_NAMES);

export const isSensitiveField = (field: string): boolean => sensitiveFields.has(field.toLowerCase());

export const redactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = isSensitiveField(key) ? DEFAULT_REDACTION_REPLACEMENT : redactValue(entry);
  }
  return result;
};

export const assertMetadataSafe = (metadata: Record<string, unknown>): void => {
  for (const key of Object.keys(metadata)) {
    if (isSensitiveField(key)) {
      throw new Error(`metadata_safe contains forbidden field: ${key}`);
    }
  }
};

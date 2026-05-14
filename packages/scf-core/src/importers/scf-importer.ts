import { ScfImportSourceSchema } from "@standard/schemas";
import type { ScfImportParsedDataset, ScfImportSource, ScfImportValidationResult } from "../types";

export type ScfImporter = {
  sourceType: ScfImportSource["source_type"];
  validate(source: ScfImportSource): Promise<ScfImportValidationResult>;
  parse(source: ScfImportSource): Promise<ScfImportParsedDataset>;
};

export const validateBaseImportSource = (source: unknown): ScfImportValidationResult => {
  const parsed = ScfImportSourceSchema.safeParse(source);
  if (!parsed.success) {
    return { valid: false, errors: parsed.error.issues.map((issue) => issue.message), warnings: [] };
  }

  if (!parsed.data.version_label) {
    return { valid: false, errors: ["SCF import source must include version_label."], warnings: [] };
  }

  return { valid: true, errors: [], warnings: [] };
};

export const safeImportError = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message.slice(0, 240);
  return "SCF import failed.";
};

export const sha256Hex = async (content: string): Promise<string> => {
  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};


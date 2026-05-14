import { z } from "zod";

/**
 * Strict schema for parsing an Official SCF Spreadsheet Control Row.
 * Used during the ingestion process to prevent phantom or corrupt data.
 */
export const scfControlRowSchema = z.object({
  domain_code: z.string().min(1, "Domain code cannot be empty"),
  control_code: z.string().min(1, "Control code cannot be empty"),
  title: z.string().min(1, "Title cannot be empty"),
  description: z.string().min(1, "Description cannot be empty"),
  control_question: z.string().optional(),
  control_weight: z.number().optional(),
}).strict();

/**
 * Strict schema for parsing Framework Requirement Mappings (e.g. BR-LGPD).
 */
export const scfFrameworkMappingSchema = z.object({
  framework_id: z.string().min(1, "Framework ID cannot be empty"),
  requirement_code: z.string().min(1, "Requirement Code cannot be empty"),
}).strict();

export type ScfControlRow = z.infer<typeof scfControlRowSchema>;
export type ScfFrameworkMapping = z.infer<typeof scfFrameworkMappingSchema>;

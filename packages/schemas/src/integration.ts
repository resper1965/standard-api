import { z } from "zod";

export const AnalyzeRawTextRequestSchema = z.object({
  raw_text: z.string().min(10, "Text must be at least 10 characters long").max(100000, "Text too large"),
  mode: z.enum(["strict", "consultative"]).default("strict"),
  framework_id: z.string().uuid("Invalid framework ID").optional(),
  scf_version_id: z.string().optional(),
  context_focus: z.array(z.string()).optional()
});

export type AnalyzeRawTextRequest = z.infer<typeof AnalyzeRawTextRequestSchema>;

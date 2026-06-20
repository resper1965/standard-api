import { z } from "zod";
import { UuidSchema } from "./common";

export const TpraScoreRequestSchema = z.strictObject({
  questionnaire_id: z.string(),
  answers: z.record(z.string(), z.union([z.string(), z.number()])),
});
export type TpraScoreRequest = z.infer<typeof TpraScoreRequestSchema>;

export const CreateTpraVendorRequestSchema = z.strictObject({
  vendor_name: z.string().min(1),
  vendor_type: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateTpraVendorRequest = z.infer<
  typeof CreateTpraVendorRequestSchema
>;

export const CreateTpraAssessmentRequestSchema = z.strictObject({
  assessment_id: UuidSchema.optional(),
  scf_version_id: UuidSchema,
});
export type CreateTpraAssessmentRequest = z.infer<
  typeof CreateTpraAssessmentRequestSchema
>;

export const SubmitTpraAssessmentRequestSchema = z.strictObject({
  responses: z.record(z.string(), z.unknown()),
});
export type SubmitTpraAssessmentRequest = z.infer<
  typeof SubmitTpraAssessmentRequestSchema
>;

export const CreateTpraRiskScoreRequestSchema = z.strictObject({
  raw_score: z.number(),
  risk_category: z.string().min(1),
  scf_domain_failures: z.array(z.string()).optional(),
});
export type CreateTpraRiskScoreRequest = z.infer<
  typeof CreateTpraRiskScoreRequestSchema
>;

import { z } from "zod";
import { AssessmentLifecycleStateSchema } from "./domain";
import { UuidSchema } from "./common";

export const CreateAssessmentRequestSchema = z.object({
  organization_id: z.string().min(1),
  name: z.string().min(1),
  scf_version_id: UuidSchema,
  document_count: z.number().int().nonnegative().default(0)
});

export const UpdateAssessmentRequestSchema = z.object({
  name: z.string().min(1).optional()
});

export const AssessmentResponseSchema = z.object({
  assessment_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  name: z.string(),
  state: AssessmentLifecycleStateSchema,
  scf_version_id: UuidSchema,
  trace_id: z.string()
});

export const AssessmentStatusResponseSchema = z.object({
  assessment_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  state: AssessmentLifecycleStateSchema,
  trace_id: z.string()
});

export const AssessmentTimelineResponseSchema = z.object({
  assessment_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  events: z.array(z.unknown()),
  trace_id: z.string()
});

export type CreateAssessmentRequest = z.infer<typeof CreateAssessmentRequestSchema>;
export type UpdateAssessmentRequest = z.infer<typeof UpdateAssessmentRequestSchema>;
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;
export type AssessmentStatusResponse = z.infer<typeof AssessmentStatusResponseSchema>;
export type AssessmentTimelineResponse = z.infer<typeof AssessmentTimelineResponseSchema>;

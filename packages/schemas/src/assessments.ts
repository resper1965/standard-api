import { z } from "zod";
import { AssessmentLifecycleStateSchema } from "./domain";
import { UuidSchema } from "./common";

export const CreateAssessmentRequestSchema = z.strictObject({
  organization_id: z.string().min(1),
  name: z.string().min(1),
  scf_version_id: UuidSchema,
  document_count: z.number().int().nonnegative().default(0),
  observation_start_date: z.string().date().optional(),
  observation_end_date: z.string().date().optional(),
});

export const UpdateAssessmentRequestSchema = z.strictObject({
  name: z.string().min(1).optional(),
  observation_start_date: z.string().date().optional(),
  observation_end_date: z.string().date().optional(),
});

export const AssessmentResponseSchema = z.object({
  assessment_id: UuidSchema,
  organization_id: UuidSchema,
  name: z.string(),
  state: AssessmentLifecycleStateSchema,
  scf_version_id: UuidSchema,
  observation_start_date: z.string().nullable().optional(),
  observation_end_date: z.string().nullable().optional(),
  /** Continuous Assessment Cycle (SCRMS-PIG Due Care: Steps 27-30) */
  parent_assessment_id: UuidSchema.nullable().optional(),
  cycle_number: z.number().int().min(1).default(1),
  baseline_soa_version_id: UuidSchema.nullable().optional(),
  trace_id: z.string(),
});

export const AssessmentStatusResponseSchema = z.object({
  assessment_id: UuidSchema,
  organization_id: UuidSchema,
  state: AssessmentLifecycleStateSchema,
  trace_id: z.string(),
});

export const AssessmentTimelineResponseSchema = z.object({
  assessment_id: UuidSchema,
  organization_id: UuidSchema,
  events: z.array(z.unknown()),
  trace_id: z.string(),
});

export type CreateAssessmentRequest = z.infer<
  typeof CreateAssessmentRequestSchema
>;
export type UpdateAssessmentRequest = z.infer<
  typeof UpdateAssessmentRequestSchema
>;
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;
export type AssessmentStatusResponse = z.infer<
  typeof AssessmentStatusResponseSchema
>;
export type AssessmentTimelineResponse = z.infer<
  typeof AssessmentTimelineResponseSchema
>;

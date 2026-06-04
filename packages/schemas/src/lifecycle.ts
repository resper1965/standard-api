import { z } from "zod";
import { AssessmentLifecycleStateSchema } from "./domain";
import { UuidSchema } from "./common";

export const TransitionRequestSchema = z.strictObject({
  next_state: AssessmentLifecycleStateSchema,
  reason: z.string().min(1),
  approval_event_id: UuidSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const LifecycleEventResponseSchema = z.object({
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  previous_state: AssessmentLifecycleStateSchema,
  next_state: AssessmentLifecycleStateSchema,
  event_type: z.string(),
  actor_id: UuidSchema.optional(),
  system_actor: z.string().optional(),
  reason: z.string(),
  timestamp: z.string(),
  trace_id: z.string(),
  metadata: z.record(z.string(), z.unknown())
});

export const TransitionResponseSchema = z.object({
  assessment_id: UuidSchema,
  organization_id: UuidSchema,
  previous_state: AssessmentLifecycleStateSchema,
  next_state: AssessmentLifecycleStateSchema,
  event: LifecycleEventResponseSchema,
  trace_id: z.string()
});

export const AvailableTransitionsResponseSchema = z.object({
  assessment_id: UuidSchema,
  organization_id: UuidSchema,
  current_state: AssessmentLifecycleStateSchema,
  available_transitions: z.array(AssessmentLifecycleStateSchema),
  trace_id: z.string()
});

export type TransitionRequest = z.infer<typeof TransitionRequestSchema>;
export type LifecycleEventResponse = z.infer<typeof LifecycleEventResponseSchema>;
export type TransitionResponse = z.infer<typeof TransitionResponseSchema>;
export type AvailableTransitionsResponse = z.infer<typeof AvailableTransitionsResponseSchema>;

import { z } from "zod";
import { UuidSchema } from "./common";

export const ApprovalDecisionSchema = z.enum(["approved", "rejected", "changes_requested"]);
export const ApprovalTargetTypeSchema = z.enum(["assessment_state", "artifact_version"]);
export const ApprovalGateSchema = z.enum(["soa", "gap_analysis", "maturity_assessment", "poam", "report"]);

export const CreateApprovalRequestSchema = z.object({
  gate: ApprovalGateSchema,
  target_type: ApprovalTargetTypeSchema,
  target_id: UuidSchema,
  decision: ApprovalDecisionSchema,
  reason: z.string().min(1)
});

export const ApprovalResponseSchema = z.object({
  approval_id: UuidSchema,
  tenant_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  gate: ApprovalGateSchema,
  target_type: ApprovalTargetTypeSchema,
  target_id: UuidSchema,
  decision: ApprovalDecisionSchema,
  actor_id: UuidSchema,
  reason: z.string(),
  created_at: z.string(),
  trace_id: z.string()
});

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;
export type ApprovalTargetType = z.infer<typeof ApprovalTargetTypeSchema>;
export type ApprovalGate = z.infer<typeof ApprovalGateSchema>;
export type CreateApprovalRequest = z.infer<typeof CreateApprovalRequestSchema>;
export type ApprovalResponse = z.infer<typeof ApprovalResponseSchema>;

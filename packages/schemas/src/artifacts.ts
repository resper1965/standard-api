// @ts-nocheck -- Zod v4 CI type compat
import { z } from "zod";
import { UuidSchema } from "./common";
import { ApprovalGateSchema } from "./approvals";

export const ArtifactTypeSchema = z.enum(["scope", "soa", "gap_analysis", "maturity_assessment", "poam", "report"]);
export const ArtifactVersionStatusSchema = z.enum(["draft", "under_review", "approved", "superseded", "archived"]);

export const CreateArtifactVersionRequestSchema = z.strictObject({
  source_agent_run_id: UuidSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const SubmitArtifactReviewRequestSchema = z.strictObject({
  reason: z.string().min(1)
});

export const ApproveArtifactRequestSchema = z.strictObject({
  approval_id: UuidSchema.optional(),
  gate: ApprovalGateSchema,
  reason: z.string().min(1)
});

export const SupersedeArtifactRequestSchema = z.strictObject({
  reason: z.string().min(1)
});

export const ArtifactVersionResponseSchema = z.object({
  artifact_version_id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema,
  artifact_type: ArtifactTypeSchema,
  version_number: z.number().int().positive(),
  status: ArtifactVersionStatusSchema,
  created_by: UuidSchema,
  created_at: z.string(),
  approved_by: UuidSchema.optional(),
  approved_at: z.string().optional(),
  supersedes_version_id: UuidSchema.optional(),
  trace_id: z.string()
});

export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;
export type ArtifactVersionStatus = z.infer<typeof ArtifactVersionStatusSchema>;
export type CreateArtifactVersionRequest = z.infer<typeof CreateArtifactVersionRequestSchema>;
export type SubmitArtifactReviewRequest = z.infer<typeof SubmitArtifactReviewRequestSchema>;
export type ApproveArtifactRequest = z.infer<typeof ApproveArtifactRequestSchema>;
export type SupersedeArtifactRequest = z.infer<typeof SupersedeArtifactRequestSchema>;
export type ArtifactVersionResponse = z.infer<typeof ArtifactVersionResponseSchema>;


import { z } from "zod";
import { lifecycleEvents } from "./events";
import { assessmentStates } from "./states";

export const AssessmentStateSchema = z.enum(assessmentStates);
export const ArtifactTypeSchema = z.enum(["scope", "soa", "gap_analysis", "maturity_assessment", "poam", "report"]);
export const ArtifactVersionStatusSchema = z.enum(["draft", "under_review", "approved", "superseded", "archived"]);
export const ApprovalGateSchema = z.enum(["soa", "gap_analysis", "maturity_assessment", "poam", "report"]);
export const ApprovalDecisionSchema = z.enum(["approved", "rejected", "changes_requested"]);
export const AssessmentLifecycleEventTypeSchema = z.enum(lifecycleEvents);

export const ApprovalEventSchema = z.object({
  id: z.string().uuid(),
  gate: ApprovalGateSchema,
  decision: ApprovalDecisionSchema,
  approvedBy: z.string().uuid(),
  approvedAt: z.string().datetime(),
  traceId: z.string().min(8)
});

export const AssessmentSnapshotSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid(),
  state: AssessmentStateSchema,
  documentCount: z.number().int().nonnegative(),
  requiredDocumentJobsComplete: z.boolean(),
  scfPreAnalysisRegistered: z.boolean(),
  frameworkSelected: z.boolean(),
  scopeDrafted: z.boolean(),
  soaDraftVersionComplete: z.boolean(),
  soaApproved: z.boolean(),
  soaIngested: z.boolean(),
  evidenceAnalysisReady: z.boolean(),
  gapAnalysisDrafted: z.boolean(),
  gapAnalysisApproved: z.boolean(),
  maturityAssessed: z.boolean(),
  maturityApproved: z.boolean(),
  poamDrafted: z.boolean(),
  poamApproved: z.boolean(),
  reportGenerated: z.boolean(),
  reportApproved: z.boolean()
});

export const TransitionContextSchema = z.object({
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid(),
  assessmentId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  systemActor: z.string().min(1).optional(),
  reason: z.string().min(1),
  traceId: z.string().min(8),
  occurredAt: z.string().datetime(),
  idempotencyKey: z.string().min(1).optional(),
  approvalEvent: ApprovalEventSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const ArtifactVersionSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid(),
  assessmentId: z.string().uuid(),
  artifactType: ArtifactTypeSchema,
  versionNumber: z.number().int().positive(),
  status: ArtifactVersionStatusSchema,
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
  approvedBy: z.string().min(1).optional(),
  approvedAt: z.string().datetime().optional(),
  sourceAgentRunId: z.string().uuid().optional(),
  traceId: z.string().min(8),
  supersedesVersionId: z.string().min(1).optional()
});

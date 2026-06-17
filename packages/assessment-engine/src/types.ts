import type { AssessmentLifecycleEventType } from "./events";
import type { AssessmentState } from "./states";

export type ArtifactType = "scope" | "soa" | "gap_analysis" | "maturity_assessment" | "poam" | "report";
export type ArtifactVersionStatus = "draft" | "under_review" | "approved" | "rejected" | "superseded" | "archived";
export type ApprovalGate = "soa" | "gap_analysis" | "maturity_assessment" | "poam" | "report";
export type ApprovalDecision = "approved" | "rejected" | "changes_requested";

export type AssessmentSnapshot = {
  id: string;
  organizationId: string;
  state: AssessmentState;
  documentCount: number;
  requiredDocumentJobsComplete: boolean;
  scfPreAnalysisRegistered: boolean;
  frameworkSelected: boolean;
  scopeDrafted: boolean;
  soaDraftVersionComplete: boolean;
  soaApproved: boolean;
  soaIngested: boolean;
  evidenceAnalysisReady: boolean;
  gapAnalysisDrafted: boolean;
  gapAnalysisApproved: boolean;
  maturityAssessed: boolean;
  maturityApproved: boolean;
  poamDrafted: boolean;
  poamApproved: boolean;
  reportGenerated: boolean;
  reportApproved: boolean;
};

export type ApprovalEvent = {
  id: string;
  gate: ApprovalGate;
  decision: ApprovalDecision;
  approvedBy: string;
  approvedAt: string;
  traceId: string;
};

export type TransitionContext = {
  organizationId: string;
  assessmentId: string;
  actorId?: string;
  systemActor?: string;
  reason: string;
  traceId: string;
  occurredAt: string;
  idempotencyKey?: string;
  approvalEvent?: ApprovalEvent;
  metadata?: Record<string, unknown>;
};

export type AssessmentTransition = {
  from: AssessmentState;
  to: AssessmentState;
  eventType: AssessmentLifecycleEventType;
};

export type AssessmentLifecycleEvent = {
  organizationId: string;
  assessmentId: string;
  previousState: AssessmentState;
  nextState: AssessmentState;
  eventType: AssessmentLifecycleEventType;
  actorId?: string;
  systemActor?: string;
  reason: string;
  timestamp: string;
  traceId: string;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
};

export type TransitionResult = {
  assessment: AssessmentSnapshot;
  event: AssessmentLifecycleEvent;
};

export type ArtifactVersion = {
  id: string;
  organizationId: string;
  assessmentId: string;
  artifactType: ArtifactType;
  versionNumber: number;
  status: ArtifactVersionStatus;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  sourceAgentRunId?: string;
  traceId: string;
  supersedesVersionId?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

export type CreateArtifactVersionInput = {
  id: string;
  organizationId: string;
  assessmentId: string;
  artifactType: ArtifactType;
  createdBy: string;
  createdAt: string;
  sourceAgentRunId?: string;
  traceId: string;
};

export type AssessmentRepository = {
  getAssessment(id: string, organizationId: string): Promise<AssessmentSnapshot | null>;
  saveAssessment(assessment: AssessmentSnapshot): Promise<void>;
};

export type ArtifactVersionRepository = {
  saveArtifactVersion(version: ArtifactVersion): Promise<void>;
  listArtifactVersions(assessmentId: string, artifactType: ArtifactType): Promise<ArtifactVersion[]>;
};

export type ApprovalRepository = {
  getApprovalEvent(id: string, gate: ApprovalGate): Promise<ApprovalEvent | null>;
};

export type AuditLogRepository = {
  recordAuditLog(event: AssessmentLifecycleEvent): Promise<void>;
};

export type LifecycleEventRepository = {
  recordLifecycleEvent(event: AssessmentLifecycleEvent): Promise<void>;
};

export type RejectionEvent = {
  id: string;
  gate: ApprovalGate;
  decision: "rejected" | "changes_requested";
  rejectedBy: string;
  rejectedAt: string;
  reason: string;
  traceId: string;
};


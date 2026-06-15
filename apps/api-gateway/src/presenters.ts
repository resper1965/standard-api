// @ts-nocheck -- Zod v4 CI type compat
import type { ArtifactVersion, AssessmentLifecycleEvent } from "@standard/assessment-engine";
import type { ApprovalRecord, AssessmentRecord } from "./http";

export const assessmentResponse = (record: AssessmentRecord) => {
  const snapshot = record.snapshot;
  const progressFlags = [
    snapshot.requiredDocumentJobsComplete,
    snapshot.scfPreAnalysisRegistered,
    snapshot.frameworkSelected,
    snapshot.scopeDrafted,
    snapshot.soaDraftVersionComplete,
    snapshot.soaApproved,
    snapshot.soaIngested,
    snapshot.evidenceAnalysisReady,
    snapshot.gapAnalysisDrafted,
    snapshot.gapAnalysisApproved,
    snapshot.maturityAssessed,
    snapshot.maturityApproved,
    snapshot.poamDrafted,
    snapshot.poamApproved,
    snapshot.reportGenerated,
    snapshot.reportApproved
  ];
  const completedCount = progressFlags.filter(Boolean).length;
  const progress = Math.round((completedCount / progressFlags.length) * 100);

  return {
    assessment_id: record.assessment_id,
    organization_id: record.organization_id,
    name: record.name,
    status: record.snapshot.state, // Renamed from state for frontend consistency
    state: record.snapshot.state,  // Kept for backward compatibility
    progress,
    scf_version_id: record.scf_version_id,
    trace_id: record.trace_id,
    created_at: record.created_at || new Date().toISOString(),
    updated_at: record.updated_at || new Date().toISOString(),
    ...(record.scf_version_label ? { scf_version_label: record.scf_version_label } : {})
  };
};


export const lifecycleEventResponse = (event: AssessmentLifecycleEvent) => ({
  organization_id: event.organizationId,
  assessment_id: event.assessmentId,
  previous_state: event.previousState,
  next_state: event.nextState,
  event_type: event.eventType,
  actor_id: event.actorId,
  system_actor: event.systemActor,
  reason: event.reason,
  timestamp: event.timestamp,
  trace_id: event.traceId,
  metadata: event.metadata
});

export const approvalResponse = (record: ApprovalRecord) => ({
  approval_id: record.id,
  organization_id: record.organizationId,
  assessment_id: record.assessmentId,
  gate: record.gate,
  target_type: record.targetType,
  target_id: record.targetId,
  decision: record.decision,
  actor_id: record.approvedBy,
  reason: record.reason,
  created_at: record.approvedAt,
  trace_id: record.traceId
});

export const artifactVersionResponse = (version: ArtifactVersion) => ({
  artifact_version_id: version.id,
  organization_id: version.organizationId,
  assessment_id: version.assessmentId,
  artifact_type: version.artifactType,
  version_number: version.versionNumber,
  status: version.status,
  created_by: version.createdBy,
  created_at: version.createdAt,
  approved_by: version.approvedBy,
  approved_at: version.approvedAt,
  supersedes_version_id: version.supersedesVersionId,
  trace_id: version.traceId
});



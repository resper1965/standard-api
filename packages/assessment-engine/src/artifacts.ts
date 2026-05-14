import { AssessmentEngineError } from "./errors";
import type { ApprovalEvent, ArtifactType, ArtifactVersion, CreateArtifactVersionInput, RejectionEvent, TransitionContext } from "./types";

export const artifactApprovalGateByType: Record<ArtifactType, ApprovalEvent["gate"]> = {
  scope: "soa",
  soa: "soa",
  gap_analysis: "gap_analysis",
  maturity_assessment: "maturity_assessment",
  poam: "poam",
  report: "report"
};

export const createArtifactVersion = (input: CreateArtifactVersionInput): ArtifactVersion => ({
  ...input,
  versionNumber: 1,
  status: "draft"
});

export const createNextArtifactVersion = (
  current: ArtifactVersion,
  context: TransitionContext,
  id = `${current.id}-next`
): ArtifactVersion => {
  if (current.status !== "approved") {
    assertVersionEditable(current);
  }

  return {
    id,
    tenantId: current.tenantId,
    organizationId: current.organizationId,
    assessmentId: current.assessmentId,
    artifactType: current.artifactType,
    versionNumber: current.versionNumber + 1,
    status: "draft",
    createdBy: context.actorId ?? context.systemActor ?? "system",
    createdAt: context.occurredAt,
    traceId: context.traceId,
    supersedesVersionId: current.id
  };
};

export const markArtifactUnderReview = (version: ArtifactVersion, context: TransitionContext): ArtifactVersion => {
  assertVersionEditable(version);

  return {
    ...version,
    status: "under_review",
    traceId: context.traceId
  };
};

export const approveArtifactVersion = (version: ArtifactVersion, approvalEvent: ApprovalEvent): ArtifactVersion => {
  if (version.status !== "under_review") {
    throw new AssessmentEngineError(
      "ARTIFACT_VERSION_NOT_REVIEWABLE",
      `Only under_review ${version.artifactType} versions can be approved.`,
      { artifactType: version.artifactType, status: version.status }
    );
  }

  const expectedGate = artifactApprovalGateByType[version.artifactType];
  if (approvalEvent.gate !== expectedGate || approvalEvent.decision !== "approved") {
    throw new AssessmentEngineError(
      "APPROVAL_GATE_MISMATCH",
      `Artifact ${version.artifactType} requires ${expectedGate} approval.`,
      { artifactType: version.artifactType, expectedGate, actualGate: approvalEvent.gate }
    );
  }

  return {
    ...version,
    status: "approved",
    approvedBy: approvalEvent.approvedBy,
    approvedAt: approvalEvent.approvedAt,
    traceId: approvalEvent.traceId
  };
};

export const supersedeApprovedVersions = (
  versions: ArtifactVersion[],
  approvedVersion: ArtifactVersion
): ArtifactVersion[] =>
  versions.map((version) => {
    if (version.id === approvedVersion.id || version.status !== "approved") {
      return version;
    }

    return { ...version, status: "superseded" };
  });

export const assertVersionEditable = (version: ArtifactVersion): void => {
  if (version.status === "approved") {
    throw new AssessmentEngineError(
      "ARTIFACT_VERSION_IMMUTABLE",
      `Approved ${version.artifactType} version ${version.versionNumber} is immutable. Create a new version instead.`,
      { artifactType: version.artifactType, versionNumber: version.versionNumber }
    );
  }
};

/**
 * Reject an artifact version that is under review.
 * Records full traceability: who rejected, when, and why.
 * AGENTS.md §11: Reprocessamento deve registrar motivo, versão anterior, versão nova, ator e trace.
 */
export const rejectArtifactVersion = (
  version: ArtifactVersion,
  rejectionEvent: RejectionEvent
): ArtifactVersion => {
  if (version.status !== "under_review") {
    throw new AssessmentEngineError(
      "ARTIFACT_VERSION_NOT_REVIEWABLE",
      `Only under_review ${version.artifactType} versions can be rejected.`,
      { artifactType: version.artifactType, status: version.status }
    );
  }

  const expectedGate = artifactApprovalGateByType[version.artifactType];
  if (rejectionEvent.gate !== expectedGate) {
    throw new AssessmentEngineError(
      "APPROVAL_GATE_MISMATCH",
      `Artifact ${version.artifactType} requires ${expectedGate} rejection gate.`,
      { artifactType: version.artifactType, expectedGate, actualGate: rejectionEvent.gate }
    );
  }

  return {
    ...version,
    status: "rejected",
    rejectedBy: rejectionEvent.rejectedBy,
    rejectedAt: rejectionEvent.rejectedAt,
    rejectionReason: rejectionEvent.reason,
    traceId: rejectionEvent.traceId
  };
};

/**
 * Create a reworked version after rejection.
 * Links back to the rejected version via supersedesVersionId for traceability.
 */
export const createReworkedVersion = (
  rejectedVersion: ArtifactVersion,
  context: TransitionContext,
  id = `${rejectedVersion.id}-rework`
): ArtifactVersion => {
  if (rejectedVersion.status !== "rejected") {
    throw new AssessmentEngineError(
      "ARTIFACT_VERSION_NOT_REJECTED",
      `Only rejected versions can be reworked. Current status: ${rejectedVersion.status}`,
      { artifactType: rejectedVersion.artifactType, status: rejectedVersion.status }
    );
  }

  return {
    id,
    tenantId: rejectedVersion.tenantId,
    organizationId: rejectedVersion.organizationId,
    assessmentId: rejectedVersion.assessmentId,
    artifactType: rejectedVersion.artifactType,
    versionNumber: rejectedVersion.versionNumber + 1,
    status: "draft",
    createdBy: context.actorId ?? context.systemActor ?? "system",
    createdAt: context.occurredAt,
    traceId: context.traceId,
    supersedesVersionId: rejectedVersion.id
  };
};

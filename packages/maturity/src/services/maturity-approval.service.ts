import { MaturityError } from "../errors";
import type { MaturityAssessmentVersion, MaturityContext, MaturityDependencies } from "../types";

/**
 * Approve a maturity assessment version (human approval gate).
 *
 * AGENTS.md §10: Maturity Assessor não finaliza maturidade sem approval gate.
 * AGENTS.md §11: Approval gates obrigatórios: Maturity Assessment.
 * AGENTS.md §11: Artefatos aprovados são imutáveis; correções geram nova versão.
 */
export const approveMaturityVersion = async (
  versionId: string,
  approvalEventId: string,
  ctx: MaturityContext,
  deps: MaturityDependencies
): Promise<MaturityAssessmentVersion> => {
  const version = await deps.repositories.versions.get(versionId, ctx.organizationId);
  if (!version || version.assessmentId !== ctx.assessmentId) {
    throw new MaturityError("VERSION_NOT_FOUND", "Maturity assessment version not found.", { versionId });
  }
  if (version.status !== "under_review") {
    throw new MaturityError("INVALID_STATUS_FOR_APPROVAL", `Cannot approve version with status '${version.status}'. Expected 'under_review'.`, { versionId, status: version.status });
  }

  // Supersede previous approved versions
  const existingVersions = await deps.repositories.versions.listByAssessment(ctx.assessmentId, ctx.organizationId);
  for (const existing of existingVersions) {
    if (existing.id !== versionId && existing.status === "approved") {
      await deps.repositories.versions.update({
        ...existing,
        status: "superseded",
        updatedAt: new Date().toISOString()
      });
    }
  }

  const approvedVersion: MaturityAssessmentVersion = {
    ...version,
    status: "approved",
    approvalEventId,
    updatedAt: new Date().toISOString()
  };

  await deps.repositories.versions.update(approvedVersion);
  return approvedVersion;
};

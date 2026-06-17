import { MaturityError } from "../errors";
import type { MaturityAssessmentVersion, MaturityContext, MaturityDependencies } from "../types";

/**
 * Approve a maturity assessment version (human approval gate).
 *
 * AGENTS.md Â§10: Maturity Assessor nÃ£o finaliza maturidade sem approval gate.
 * AGENTS.md Â§11: Approval gates obrigatÃ³rios: Maturity Assessment.
 * AGENTS.md Â§11: Artefatos aprovados sÃ£o imutÃ¡veis; correÃ§Ãµes geram nova versÃ£o.
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


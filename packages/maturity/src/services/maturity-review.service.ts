import { MaturityError } from "../errors";
import type { MaturityAssessmentVersion, MaturityContext, MaturityDependencies } from "../types";
import { validateMaturityVersion } from "./maturity-validation.service";

/**
 * Submit a maturity assessment version for human review.
 *
 * AGENTS.md §10: Maturity Assessor pode sugerir maturidade; não finaliza maturidade sem approval gate.
 * AGENTS.md §11: Approval gates obrigatórios: Maturity Assessment.
 */
export const submitMaturityForReview = async (
  versionId: string,
  ctx: MaturityContext,
  deps: MaturityDependencies
): Promise<MaturityAssessmentVersion> => {
  const version = await deps.repositories.versions.get(versionId, ctx.tenantId);
  if (!version || version.assessmentId !== ctx.assessmentId) {
    throw new MaturityError("VERSION_NOT_FOUND", "Maturity assessment version not found.", { versionId });
  }
  if (version.status !== "draft") {
    throw new MaturityError("VERSION_NOT_EDITABLE", `Cannot submit version with status '${version.status}'.`, { versionId, status: version.status });
  }

  // Run validation — must pass before review submission
  const validation = await validateMaturityVersion(versionId, ctx, deps);
  if (!validation.valid) {
    throw new MaturityError("VALIDATION_FAILED", "Maturity version has blocking errors.", { errors: validation.blocking_errors });
  }

  const updatedVersion: MaturityAssessmentVersion = {
    ...version,
    status: "under_review",
    updatedAt: new Date().toISOString()
  };

  await deps.repositories.versions.update(updatedVersion);
  return updatedVersion;
};

/**
 * Return maturity version to draft status with rejection metadata.
 *
 * AGENTS.md §11: maturity_under_review → maturity_assessed (maturity_rejected).
 */
export const rejectMaturityReview = async (
  versionId: string,
  rejectionReason: string,
  ctx: MaturityContext,
  deps: MaturityDependencies
): Promise<MaturityAssessmentVersion> => {
  const version = await deps.repositories.versions.get(versionId, ctx.tenantId);
  if (!version || version.assessmentId !== ctx.assessmentId) {
    throw new MaturityError("VERSION_NOT_FOUND", "Maturity assessment version not found.", { versionId });
  }
  if (version.status !== "under_review") {
    throw new MaturityError("INVALID_STATUS_FOR_REJECTION", `Cannot reject version with status '${version.status}'. Expected 'under_review'.`, { versionId, status: version.status });
  }

  const updatedVersion: MaturityAssessmentVersion = {
    ...version,
    status: "draft",
    updatedAt: new Date().toISOString()
  };

  await deps.repositories.versions.update(updatedVersion);
  return updatedVersion;
};

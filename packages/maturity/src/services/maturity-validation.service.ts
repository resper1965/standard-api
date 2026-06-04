import { MaturityError } from "../errors";
import type { MaturityAssessmentVersion, MaturityContext, MaturityDependencies, MaturityScore } from "../types";

/**
 * Validate a maturity assessment version before it can be submitted for review.
 *
 * AGENTS.md §10: Todo output de agente deve ser schema-validated antes de persistência.
 * AGENTS.md §11: Approval gates obrigatórios: Maturity Assessment.
 */
export const validateMaturityVersion = async (
  versionId: string,
  ctx: MaturityContext,
  deps: MaturityDependencies
): Promise<{ valid: boolean; blocking_errors: string[]; warnings: string[]; trace_id: string }> => {
  const version = await deps.repositories.versions.get(versionId, ctx.organizationId);
  if (!version || version.assessmentId !== ctx.assessmentId) {
    throw new MaturityError("VERSION_NOT_FOUND", "Maturity assessment version not found.", { versionId });
  }

  const scores = await deps.repositories.scores.listByVersion(versionId, ctx.organizationId);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must have at least one score
  if (scores.length === 0) {
    errors.push("Maturity assessment has no scored controls.");
  }

  // Version must be in draft status
  if (version.status !== "draft") {
    errors.push(`Version status is '${version.status}', expected 'draft'.`);
  }

  // All scores must have rationale
  const missingRationale = scores.filter(s => !s.rationale || s.rationale.trim().length === 0);
  if (missingRationale.length > 0) {
    errors.push(`${missingRationale.length} score(s) are missing rationale.`);
  }

  // Warn about low-confidence scores
  const lowConfidence = scores.filter(s => s.confidenceScore < 0.5);
  if (lowConfidence.length > 0) {
    warnings.push(`${lowConfidence.length} score(s) have confidence below 50%.`);
  }

  // Warn about zero-scored controls that aren't N/A
  const zeroScores = scores.filter(s => s.score === 0);
  if (zeroScores.length > scores.length * 0.5) {
    warnings.push(`More than 50% of controls scored at level 0. Consider reviewing gap analysis inputs.`);
  }

  return {
    valid: errors.length === 0,
    blocking_errors: errors,
    warnings,
    trace_id: ctx.traceId
  };
};

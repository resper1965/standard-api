import { MaturityError } from "../errors";
import type {
  MaturityAssessmentVersion,
  MaturityContext,
  MaturityDependencies,
  MaturityLevel,
  MaturityScore,
  MaturitySummary
} from "../types";
import { classifyMaturity } from "./maturity-classification.service";

/**
 * Create a draft maturity assessment version by classifying all gap findings.
 *
 * AGENTS.md §10: Maturity Assessor pode sugerir maturidade; não finaliza maturidade sem approval gate.
 * AGENTS.md §11: Todo output de agente deve ser schema-validated antes de persistência.
 */
export const createMaturityDraft = async (
  ctx: MaturityContext,
  deps: MaturityDependencies
): Promise<{ version: MaturityAssessmentVersion; scores: MaturityScore[]; summary: MaturitySummary }> => {
  // 1. Get approved gap analysis
  const gapResult = await deps.getApprovedGapAnalysis(ctx.assessmentId, ctx.tenantId);
  if (!gapResult) {
    throw new MaturityError(
      "NO_APPROVED_GAP_ANALYSIS",
      "Cannot create maturity assessment without an approved gap analysis.",
      { assessmentId: ctx.assessmentId }
    );
  }

  // 2. Determine next version number
  const existingVersions = await deps.repositories.versions.listByAssessment(ctx.assessmentId, ctx.tenantId);
  const nextVersionNumber = existingVersions.length > 0
    ? Math.max(...existingVersions.map(v => v.versionNumber)) + 1
    : 1;

  // 3. Create version record
  const version: MaturityAssessmentVersion = {
    id: crypto.randomUUID(),
    tenantId: ctx.tenantId,
    organizationId: ctx.organizationId,
    assessmentId: ctx.assessmentId,
    versionNumber: nextVersionNumber,
    status: "draft",
    createdByAgentRunId: ctx.agentRunId ?? undefined
  };

  await deps.repositories.versions.save(version);

  // 4. Classify each gap finding → maturity score (skip findings without scf_control_id)
  const scorableFindings = gapResult.findings.filter(f => f.scf_control_id != null);

  const scores: MaturityScore[] = scorableFindings.map(finding => {
    const status = finding.assessment_status;
    const type = finding.gap_type;

    let evidenceStrength: "strong" | "partial" | "weak" | "absent" | "conflicting" | "not_checked" = "absent";
    let evidenceCoverage = 0.0;
    let hasDocumentation = false;
    let hasProcess = false;
    let hasMeasurement = false;
    let hasContinuousImprovement = false;

    if (status === "met") {
      evidenceStrength = "strong";
      evidenceCoverage = 1.0;
      hasDocumentation = true;
      hasProcess = true;
      if (type === "no_gap") {
        hasMeasurement = true;
        hasContinuousImprovement = true;
      }
    } else if (status === "partially_met") {
      evidenceStrength = "partial";
      evidenceCoverage = 0.5;
      hasProcess = true;
      if (type !== "documentation_gap") {
        hasDocumentation = true;
      }
    } else if (status === "requires_validation") {
      evidenceStrength = "weak";
      evidenceCoverage = 0.25;
    }

    const result = classifyMaturity({
      scfControlId: finding.scf_control_id!,
      controlCode: finding.gap_code,
      controlTitle: finding.gap_code,
      gapStatus: status,
      gapType: type,
      evidenceStrength,
      evidenceCoverage,
      hasDocumentation,
      hasProcess,
      hasMeasurement,
      hasContinuousImprovement
    });

    return {
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      assessmentId: ctx.assessmentId,
      maturityAssessmentVersionId: version.id,
      scfControlId: finding.scf_control_id!,
      score: result.score,
      confidenceScore: result.confidenceScore,
      rationale: result.rationale,
      evidenceCoverage
    };
  });

  if (scores.length > 0) {
    await deps.repositories.scores.saveMany(scores);
  }

  // 5. Compute summary
  const summary = computeSummary(scores);

  return { version, scores, summary };
};

/**
 * Compute maturity summary statistics.
 */
export const computeSummary = (scores: MaturityScore[]): MaturitySummary => {
  if (scores.length === 0) {
    return {
      averageScore: 0,
      medianScore: 0,
      minScore: 0,
      maxScore: 0,
      totalControls: 0,
      scoredControls: 0,
      levelDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const sorted = [...scores].sort((a, b) => a.score - b.score);
  const sum = sorted.reduce((acc, s) => acc + s.score, 0);
  const mid = Math.floor(sorted.length / 2);

  const levelDistribution: Record<MaturityLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of scores) {
    levelDistribution[s.score]++;
  }

  return {
    averageScore: Number((sum / sorted.length).toFixed(2)),
    medianScore: sorted.length % 2 === 0
      ? Number(((sorted[mid - 1]!.score + sorted[mid]!.score) / 2).toFixed(2))
      : sorted[mid]!.score,
    minScore: sorted[0]!.score,
    maxScore: sorted[sorted.length - 1]!.score,
    totalControls: scores.length,
    scoredControls: scores.filter(s => s.score > 0).length,
    levelDistribution
  };
};

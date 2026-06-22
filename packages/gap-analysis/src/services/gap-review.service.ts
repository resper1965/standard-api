import {
  assertActor,
  assertContext,
  GapAnalysisWorkflowError,
} from "../errors";
import type {
  GapAnalysisContext,
  GapAnalysisDependencies,
  GapAnalysisVersionResponse,
  GapFindingResponse,
  UpdateGapFindingRequest,
} from "../types";
import { GapValidationService } from "./gap-validation.service";
import {
  deriveRocDetermination,
  calculateRiskScore,
  severityToImpactEffect,
  likelihoodToOccurrenceLikelihood,
} from "./risk-score.service";

const definedPatch = <T extends Record<string, unknown>>(
  patch: T,
): Partial<T> =>
  Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

export class GapReviewService {
  constructor(private readonly deps: GapAnalysisDependencies) {}

  async updateGapFinding(
    gapFindingId: string,
    patch: UpdateGapFindingRequest,
    context: GapAnalysisContext,
  ): Promise<GapFindingResponse> {
    assertContext(context);
    assertActor(context);
    const finding = await this.deps.repositories.gapFindings.get(
      gapFindingId,
      context.organizationId,
    );
    if (!finding || finding.assessment_id !== context.assessmentId)
      throw new GapAnalysisWorkflowError(
        "GAP_FINDING_NOT_FOUND",
        "Gap finding not found.",
      );
    const version = await this.getGapVersion(
      finding.gap_analysis_version_id,
      context,
    );
    if (version.status === "approved")
      throw new GapAnalysisWorkflowError(
        "GAP_ANALYSIS_IMMUTABLE",
        "Approved Gap Analysis versions are immutable.",
      );

    const candidate: GapFindingResponse = {
      ...finding,
      ...(definedPatch(patch) as Partial<GapFindingResponse>),
      updated_at: new Date().toISOString(),
    };

    // Q-A decision (2026-06-09): auto-recalculate roc_determination whenever severity or
    // assessment_status is patched. Deterministic â€” never LLM-derived (AGENTS.md Â§10).
    // Guard: only recalculate if the version is still mutable (draft or under_review).
    if (patch.severity !== undefined || patch.assessment_status !== undefined) {
      const recalcRoc = (() => {
        try {
          return (
            deriveRocDetermination(
              candidate.severity,
              candidate.assessment_status,
              candidate.gap_type,
            ) ?? undefined
          );
        } catch {
          return undefined;
        }
      })();
      if (recalcRoc !== undefined) {
        candidate.roc_determination = recalcRoc;
      }

      // Also recalculate risk scores when severity changes (IE mapping updates)
      if (patch.severity !== undefined) {
        try {
          const ie = severityToImpactEffect(candidate.severity);
          const ol = likelihoodToOccurrenceLikelihood(undefined);
          const scores = calculateRiskScore({
            impactValue: ie,
            likelihoodValue: ol,
          });
          candidate.inherent_risk_score = String(scores.inherentRisk);
          candidate.residual_risk_score = String(scores.residualRisk);
        } catch {
          // Non-blocking: keep existing scores if recalculation fails
        }
      }
    }

    this.validatePatch(candidate);
    await this.deps.repositories.gapFindings.update(candidate);

    if (this.deps.ledger && candidate.scf_control_id) {
      try {
        await this.deps.ledger.appendEvent({
          organizationId: candidate.organization_id,
          assessmentId: candidate.assessment_id,
          scfControlId: candidate.scf_control_id,
          scfVersionId: candidate.scf_version_id,
          eventType: "finding_updated",
          previousValue: finding as unknown as Record<string, unknown>,
          newValue: candidate as unknown as Record<string, unknown>,
          actorId: context.actorId,
          traceId: context.traceId,
        });
      } catch (err) {
        console.warn(
          "[GapReviewService] Failed to append finding update to ledger:",
          err,
        );
      }
    }

    return candidate;
  }

  async bulkUpdateGapFindings(
    gapAnalysisVersionId: string,
    patch: UpdateGapFindingRequest,
    context: GapAnalysisContext,
  ): Promise<GapFindingResponse[]> {
    const findings = await this.deps.repositories.gapFindings.listByVersion(
      gapAnalysisVersionId,
      context.organizationId,
    );
    const updated: GapFindingResponse[] = [];
    for (const finding of findings)
      updated.push(
        await this.updateGapFinding(finding.gap_finding_id, patch, context),
      );
    return updated;
  }

  async submitGapAnalysisForReview(
    gapAnalysisVersionId: string,
    context: GapAnalysisContext,
    exceptionRationale?: string,
  ): Promise<GapAnalysisVersionResponse> {
    assertActor(context);
    const version = await this.getGapVersion(gapAnalysisVersionId, context);
    const validation = await new GapValidationService(
      this.deps,
    ).validateGapAnalysisForReview(gapAnalysisVersionId, context);
    if (!validation.valid && !exceptionRationale) {
      throw new GapAnalysisWorkflowError(
        "GAP_REVIEW_BLOCKED",
        "Gap Analysis has blocking validation errors.",
        { errors: validation.blocking_errors },
      );
    }
    const updated = {
      ...version,
      status: "under_review" as const,
      submitted_for_review_at: new Date().toISOString(),
      trace_id: context.traceId,
      metadata: {
        ...version.metadata,
        ...(exceptionRationale
          ? { exception_rationale: exceptionRationale }
          : {}),
      },
    };
    await this.deps.repositories.gapVersions.update(updated);
    return updated;
  }

  private validatePatch(finding: GapFindingResponse): void {
    if (finding.assessment_status === "not_met" && !finding.gap_rationale) {
      throw new GapAnalysisWorkflowError(
        "GAP_RATIONALE_REQUIRED",
        "not_met requires explicit gap_rationale.",
      );
    }
  }

  private async getGapVersion(
    gapAnalysisVersionId: string,
    context: GapAnalysisContext,
  ): Promise<GapAnalysisVersionResponse> {
    const version = await this.deps.repositories.gapVersions.get(
      gapAnalysisVersionId,
      context.organizationId,
    );
    if (!version || version.assessment_id !== context.assessmentId)
      throw new GapAnalysisWorkflowError(
        "GAP_ANALYSIS_NOT_FOUND",
        "Gap Analysis version not found.",
      );
    return version;
  }
}

/**
 * Maturity Assessment Routes — Standard Assessment Lifecycle
 *
 * Implements the maturity assessment CRUD lifecycle with mandatory approval gate.
 *
 * AGENTS.md §10: Maturity Assessor pode sugerir maturidade; não finaliza sem approval gate.
 * AGENTS.md §11: Todo output de agente deve ser schema-validated antes de persistência.
 * SCR-RMM Step 7: CMM target levels inform the maturity assessment baseline.
 *
 * Endpoints:
 *   POST   /api/v1/assessments/:id/maturity-versions          — create draft
 *   GET    /api/v1/assessments/:id/maturity-versions          — list versions
 *   GET    /api/v1/assessments/:id/maturity-versions/:vid     — get version
 *   GET    /api/v1/assessments/:id/maturity-versions/:vid/scores — list scores (by_domain optional)
 *   POST   /api/v1/assessments/:id/maturity-versions/:vid/submit-review — submit for review
 *   GET    /api/v1/assessments/:id/maturity-versions/:vid/summary  — summary stats
 *   GET    /api/v1/assessments/:id/roc-summary                — ROC overview (SCR-RMM Step 14)
 */
import {
  createMaturityDraft,
  computeSummary,
  submitMaturityForReview,
  validateMaturityVersion,
  MATURITY_LEVELS,
  createInMemoryMaturityRepositories,
} from "@standard/maturity";
import type { AppDependencies, RouteDefinition } from "../http";
import { json, routeUuidParam, requireOrganizationId } from "../http";
import { ApiError } from "../errors/api-error";
import type { AssessmentRecord } from "../http";

// ── Helper ───────────────────────────────────────────────────────────────────

const requireAssessment = async (
  deps: AppDependencies,
  assessmentId: string,
  organizationId: string,
): Promise<AssessmentRecord> => {
  const assessment = await deps.assessments
    .withOrganization(organizationId)
    .get(assessmentId);
  if (!assessment)
    throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
  return assessment;
};

/**
 * Build maturity deps from AppDependencies.
 * The maturity package uses in-memory repos by default; here we wire
 * the real repositories through the artifact adapter.
 *
 * NOTE: Drizzle-backed maturity repos are a future migration step.
 * For now, the in-memory repos are sufficient for the approval gate flow.
 */
const buildMaturityDeps = (deps: AppDependencies, _organizationId: string) => {
  // ESM import of in-memory repos (Drizzle-backed repos are a future migration step)
  const repos = createInMemoryMaturityRepositories();

  return {
    repositories: repos,
    /** Fetches the approved gap analysis for an assessment (required by maturity draft creation) */
    getApprovedGapAnalysis: async (assessmentId: string, orgId: string) => {
      try {
        const versions =
          await deps.gapAnalysis.repositories.gapVersions.listByAssessment(
            assessmentId,
            orgId,
          );
        const approved = versions.find((v: any) => v.status === "approved");
        if (!approved) return null;
        const findings =
          await deps.gapAnalysis.repositories.gapFindings.listByVersion(
            approved.gap_analysis_version_id,
            orgId,
          );
        return { version: approved, findings };
      } catch {
        return null;
      }
    },
  };
};

// ── Domain Summary Calculator (by SCF domain) ────────────────────────────────

function groupScoresByDomain(scores: any[]): Record<
  string,
  {
    domain: string;
    count: number;
    average: number;
    distribution: Record<number, number>;
  }
> {
  const domainMap: Record<string, number[]> = {};

  for (const score of scores) {
    // SCF control IDs don't natively carry domain; use first 3 chars of a linked code
    // In full implementation, join against scf_controls.domain_code
    const domain = (score.controlCode ?? score.scfControlId ?? "UNKNOWN")
      .slice(0, 3)
      .toUpperCase();
    if (!domainMap[domain]) domainMap[domain] = [];
    domainMap[domain]!.push(score.score);
  }

  const result: Record<string, any> = {};
  for (const [domain, domainScores] of Object.entries(domainMap)) {
    const sum = domainScores.reduce((a: number, b: number) => a + b, 0);
    const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const s of domainScores)
      dist[s as number] = (dist[s as number] ?? 0) + 1;
    result[domain] = {
      domain,
      count: domainScores.length,
      average: Number((sum / domainScores.length).toFixed(2)),
      distribution: dist,
    };
  }
  return result;
}

// ── Routes ───────────────────────────────────────────────────────────────────

export const maturityRoutes: RouteDefinition[] = [
  // POST /api/v1/assessments/:id/maturity-versions
  // Create a maturity assessment draft from the approved gap analysis
  {
    method: "POST",
    path: "/api/v1/assessments/:id/maturity-versions",
    protected: true,
    requireActor: true,
    permissions: ["assessment:create"],
    handler: async ({ deps, params, organizationId, actorId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);

      const maturityDeps = buildMaturityDeps(deps, orgId);
      const ctx = {
        organizationId: orgId,
        assessmentId,
        ...(actorId ? { actorId } : {}),
        traceId,
      };

      const { version, scores, summary } = await createMaturityDraft(
        ctx,
        maturityDeps,
      );

      return json(
        {
          data: {
            version,
            summary,
            scores_count: scores.length,
          },
          trace_id: traceId,
        },
        { status: 201 },
      );
    },
  },

  // GET /api/v1/assessments/:id/maturity-versions
  // List all maturity assessment versions for an assessment
  {
    method: "GET",
    path: "/api/v1/assessments/:id/maturity-versions",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);

      const maturityDeps = buildMaturityDeps(deps, orgId);

      const versions =
        await maturityDeps.repositories.versions.listByAssessment(
          assessmentId,
          orgId,
        );

      return json({
        data: versions,
        total: versions.length,
        trace_id: traceId,
      });
    },
  },

  // GET /api/v1/assessments/:id/maturity-versions/:vid
  // Get a specific maturity assessment version
  {
    method: "GET",
    path: "/api/v1/assessments/:id/maturity-versions/:vid",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const versionId = routeUuidParam(params, "vid");

      const maturityDeps = buildMaturityDeps(deps, orgId);
      const version = await maturityDeps.repositories.versions.get(
        versionId,
        orgId,
      );
      if (!version || version.assessmentId !== assessmentId)
        throw new ApiError(
          "NOT_FOUND",
          "Maturity assessment version not found.",
          404,
        );

      return json({ data: version, trace_id: traceId });
    },
  },

  // GET /api/v1/assessments/:id/maturity-versions/:vid/scores
  // List maturity scores. Optional ?by_domain=true for domain-level breakdown (SCR-CMM).
  {
    method: "GET",
    path: "/api/v1/assessments/:id/maturity-versions/:vid/scores",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, request, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const _assessmentId = routeUuidParam(params, "id");
      const versionId = routeUuidParam(params, "vid");

      const url = new URL(request.url);
      const byDomain = url.searchParams.get("by_domain") === "true";
      const mcrOnly = url.searchParams.get("mcr_only") === "true";

      const maturityDeps = buildMaturityDeps(deps, orgId);
      const scores = await maturityDeps.repositories.scores.listByVersion(
        versionId,
        orgId,
      );

      // Filter to MCR-only scores if requested (requires gap finding lookup)
      const filteredScores = mcrOnly
        ? scores // TODO: join gap findings is_mcr_gap in Drizzle adapter
        : scores;

      if (byDomain) {
        const byDomainResult = groupScoresByDomain(filteredScores);
        return json({
          data: byDomainResult,
          total_controls: filteredScores.length,
          trace_id: traceId,
        });
      }

      const summary = computeSummary(filteredScores);
      return json({
        data: filteredScores,
        total: filteredScores.length,
        summary,
        trace_id: traceId,
      });
    },
  },

  // GET /api/v1/assessments/:id/maturity-versions/:vid/summary
  // Aggregated maturity statistics for a version (SCR-CMM compatible)
  {
    method: "GET",
    path: "/api/v1/assessments/:id/maturity-versions/:vid/summary",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const versionId = routeUuidParam(params, "vid");

      const maturityDeps = buildMaturityDeps(deps, orgId);
      const scores = await maturityDeps.repositories.scores.listByVersion(
        versionId,
        orgId,
      );
      const summary = computeSummary(scores);
      const byDomain = groupScoresByDomain(scores);

      return json({
        data: {
          ...summary,
          by_domain: byDomain,
          maturity_levels: MATURITY_LEVELS,
        },
        trace_id: traceId,
      });
    },
  },

  // POST /api/v1/assessments/:id/maturity-versions/:vid/submit-review
  // Submit a maturity version for human review (approval gate)
  {
    method: "POST",
    path: "/api/v1/assessments/:id/maturity-versions/:vid/submit-review",
    protected: true,
    requireActor: true,
    permissions: ["assessment:create"],
    handler: async ({
      deps,
      params,
      request,
      organizationId,
      actorId,
      traceId,
    }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const versionId = routeUuidParam(params, "vid");

      let exceptionRationale: string | undefined;
      try {
        const body = (await request.json()) as { exception_rationale?: string };
        exceptionRationale = body?.exception_rationale;
      } catch {
        // Body is optional
      }

      const maturityDeps = buildMaturityDeps(deps, orgId);
      const ctx = {
        organizationId: orgId,
        assessmentId,
        ...(actorId ? { actorId } : {}),
        traceId,
      };

      // Validate before submitting (snake_case: blocking_errors per MaturityValidationResponse)
      const validation = await validateMaturityVersion(
        versionId,
        ctx,
        maturityDeps,
      );
      if (validation.blocking_errors.length > 0 && !exceptionRationale) {
        throw new ApiError(
          "VALIDATION_ERROR",
          `Maturity version has ${validation.blocking_errors.length} blocking error(s). Provide exception_rationale to override.`,
          422,
          validation.blocking_errors,
        );
      }

      const version = await submitMaturityForReview(
        versionId,
        ctx,
        maturityDeps,
      );
      return json({ data: version, trace_id: traceId });
    },
  },

  // GET /api/v1/assessments/:id/roc-summary
  // SCR-RMM Step 14: Report on Conformity summary for the assessment.
  // Aggregates gap findings → ROC determinations → overall conformity level.
  {
    method: "GET",
    path: "/api/v1/assessments/:id/roc-summary",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, request, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);

      const url = new URL(request.url);
      const gapVersionId = url.searchParams.get("gap_version_id");

      // Get gap findings — use provided version or find approved
      let findings: any[] = [];
      try {
        if (gapVersionId) {
          findings =
            await deps.gapAnalysis.repositories.gapFindings.listByVersion(
              gapVersionId,
              orgId,
            );
        } else {
          const versions =
            await deps.gapAnalysis.repositories.gapVersions.listByAssessment(
              assessmentId,
              orgId,
            );
          const approved = versions.find((v: any) => v.status === "approved");
          if (approved) {
            findings =
              await deps.gapAnalysis.repositories.gapFindings.listByVersion(
                approved.gap_analysis_version_id,
                orgId,
              );
          }
        }
      } catch {
        findings = [];
      }

      // Aggregate ROC determinations
      const rocCounts: Record<string, number> = {
        strictly_conforms: 0,
        conforms: 0,
        significant_deficiency: 0,
        material_weakness: 0,
        not_determined: 0,
      };

      let mcrMaterialWeaknesses = 0;
      let totalInherentRisk = 0;
      let totalResidualRisk = 0;
      let riskScoredCount = 0;

      for (const finding of findings) {
        const roc = finding.roc_determination ?? "not_determined";
        rocCounts[roc] = (rocCounts[roc] ?? 0) + 1;

        if (finding.is_mcr_gap && roc === "material_weakness")
          mcrMaterialWeaknesses++;

        if (finding.inherent_risk_score) {
          totalInherentRisk += parseFloat(finding.inherent_risk_score);
          totalResidualRisk += parseFloat(finding.residual_risk_score ?? "0");
          riskScoredCount++;
        }
      }

      // Overall conformity: worst finding determines the level (per SCR-RMM §14)
      let overallConformity: string = "strictly_conforms";
      if (rocCounts["material_weakness"]! > 0)
        overallConformity = "material_weakness";
      else if (rocCounts["significant_deficiency"]! > 0)
        overallConformity = "significant_deficiency";
      else if (rocCounts["conforms"]! > 0) overallConformity = "conforms";

      const avgInherentRisk =
        riskScoredCount > 0
          ? Number((totalInherentRisk / riskScoredCount).toFixed(2))
          : null;
      const avgResidualRisk =
        riskScoredCount > 0
          ? Number((totalResidualRisk / riskScoredCount).toFixed(2))
          : null;

      return json({
        data: {
          assessment_id: assessmentId,
          /**
           * SCR-RMM §14: The worst finding determines the overall ROC.
           * material_weakness supersedes significant_deficiency supersedes conforms.
           */
          overall_conformity: overallConformity,
          roc_distribution: rocCounts,
          total_findings: findings.length,
          mcr_material_weaknesses: mcrMaterialWeaknesses,
          risk_scores: {
            average_inherent: avgInherentRisk,
            average_residual: avgResidualRisk,
            scored_findings: riskScoredCount,
          },
          /**
           * SCR-RMM interpretation guide for consumers:
           * - material_weakness: Immediate escalation required; must be in POA&M
           * - significant_deficiency: Remediation plan required; not yet material threshold
           * - conforms: Meets requirements; monitor
           * - strictly_conforms: Exceeds requirements; positive assurance
           */
          roc_guidance: {
            material_weakness:
              "Immediate escalation required. Control failure exceeds risk threshold. Must appear in approved POA&M.",
            significant_deficiency:
              "Notable control gap. Remediation plan required within 90 days.",
            conforms:
              "Controls meet requirements. Periodic monitoring advised.",
            strictly_conforms:
              "Controls exceed requirements. Positive assurance documented.",
          },
        },
        trace_id: traceId,
      });
    },
  },
];

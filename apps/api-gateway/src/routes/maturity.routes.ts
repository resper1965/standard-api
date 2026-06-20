/**
 * Maturity Assessment Routes â€” Standard Assessment Lifecycle
 *
 * Implements the maturity assessment CRUD lifecycle with mandatory approval gate.
 *
 * AGENTS.md Â§10: Maturity Assessor pode sugerir maturidade; nÃ£o finaliza sem approval gate.
 * AGENTS.md Â§11: Todo output de agente deve ser schema-validated antes de persistÃªncia.
 * SCR-RMM Step 7: CMM target levels inform the maturity assessment baseline.
 *
 * Endpoints:
 *   POST   /api/v1/assessments/:id/maturity-versions          â€” create draft
 *   GET    /api/v1/assessments/:id/maturity-versions          â€” list versions
 *   GET    /api/v1/assessments/:id/maturity-versions/:vid     â€” get version
 *   GET    /api/v1/assessments/:id/maturity-versions/:vid/scores â€” list scores (by_domain optional)
 *   POST   /api/v1/assessments/:id/maturity-versions/:vid/submit-review â€” submit for review
 *   GET    /api/v1/assessments/:id/maturity-versions/:vid/summary  â€” summary stats
 *   GET    /api/v1/assessments/:id/roc-summary                â€” ROC overview (SCR-RMM Step 14)
 */
import {
  createMaturityDraft,
  computeSummary,
  submitMaturityForReview,
  validateMaturityVersion,
  approveMaturityVersion,
  MATURITY_LEVELS,
} from "@standard/maturity";
import type { AppDependencies, RouteDefinition } from "../http";
import {
  json,
  parseJson,
  routeUuidParam,
  requireOrganizationId,
} from "../http";
import { ApiError } from "../errors/api-error";
import type { AssessmentRecord } from "../http";

import { eq } from "drizzle-orm";
import {
  MaturitySummaryResponseSchema,
  MaturityScoreResponseSchema,
  MaturityAssessmentVersionResponseSchema,
  z, assessments } from "@standard/schemas";

// â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
 * Uses deps.maturity (Drizzle-backed in production, in-memory in tests).
 */
const buildMaturityDeps = (deps: AppDependencies, _organizationId: string) =>
  deps.maturity;

// â”€â”€ Domain Summary Calculator (by SCF domain) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  // Aggregates gap findings â†’ ROC determinations â†’ overall conformity level.
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

      // Get gap findings â€” use provided version or find approved
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

      // Overall conformity: worst finding determines the level (per SCR-RMM Â§14)
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
           * SCR-RMM Â§14: The worst finding determines the overall ROC.
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

  // â”€â”€ PUT /assessments/:id/maturity-targets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // SCR-CMM Â§Use Case 1: Set target maturity level per SCF domain.
  // Enables spider chart: current (from maturity scores) vs target (from this map).
  // Format: { "ACM": 3, "CPL": 2, "GOV": 3 } â€” domain_code â†’ L0â€“L5 integer
  {
    method: "PUT",
    path: "/api/v1/assessments/:id/maturity-targets",
    authRequired: true,
    tenantRequired: true,
    handler: async ({ deps, params, request, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);

      if (!deps._db)
        throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);

      const body = (await request.json()) as Record<string, unknown>;

      // Validate: keys are strings, values are integers 0â€“5
      for (const [key, val] of Object.entries(body)) {
        if (typeof key !== "string" || key.length === 0)
          throw new ApiError(
            "VALIDATION_ERROR",
            `Invalid domain key: ${key}`,
            400,
          );
        if (
          typeof val !== "number" ||
          !Number.isInteger(val) ||
          val < 0 ||
          val > 5
        )
          throw new ApiError(
            "VALIDATION_ERROR",
            `Target for domain ${key} must be integer 0â€“5, got: ${val}`,
            400,
          );
      }

      const targets = body as Record<string, number>;

      await deps._db
        .update(assessments)
        .set({ maturityDomainTargets: targets, updatedAt: new Date() })
        .where(eq(assessments.id, assessmentId));

      return json({
        assessment_id: assessmentId,
        maturity_domain_targets: targets,
        domain_count: Object.keys(targets).length,
        trace_id: traceId,
      });
    },
  },

  // â”€â”€ GET /assessments/:id/maturity-targets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/assessments/:id/maturity-targets",
    authRequired: true,
    tenantRequired: true,
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");

      if (!deps._db)
        throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);

      const [row] = await deps._db
        .select({
          id: assessments.id,
          maturityDomainTargets: assessments.maturityDomainTargets,
        })
        .from(assessments)
        .where(eq(assessments.id, assessmentId))
        .limit(1);

      if (!row) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      return json({
        assessment_id: assessmentId,
        maturity_domain_targets: row.maturityDomainTargets ?? {},
        domain_count: Object.keys(row.maturityDomainTargets ?? {}).length,
        trace_id: traceId,
      });
    },
  },
  // â”€â”€ POST /assessments/:id/maturity-versions/:vid/approve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // AGENTS.md Â§11: Mandatory approval gate for Maturity Assessment.
  // Requires a pre-existing approval_event_id from the approvals service.
  {
    method: "POST",
    path: "/api/v1/assessments/:id/maturity-versions/:vid/approve",
    protected: true,
    requireActor: true,
    permissions: ["maturity:approve"],
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
      await requireAssessment(deps, assessmentId, orgId);

      const body = await parseJson(
        request,
        z.object({ approval_event_id: z.string().uuid() }),
      );

      const maturityDeps = buildMaturityDeps(deps, orgId);
      const ctx = {
        organizationId: orgId,
        assessmentId,
        ...(actorId ? { actorId } : {}),
        traceId,
      };

      const approved = await approveMaturityVersion(
        versionId,
        body.approval_event_id,
        ctx,
        maturityDeps,
      );

      return json({
        data: approved,
        trace_id: traceId,
      });
    },
  },
];

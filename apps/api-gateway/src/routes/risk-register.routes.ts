/**
 * Risk Register API — SCR-RMM Step 13 (Risk Treatment Decision)
 *
 * Registers risk entries per assessment, linking gap findings to treatment decisions.
 * risk_appetite / risk_tolerance / risk_threshold are sent by the consuming application
 * (GRC / frontend). The Standard does NOT manage risk appetite — it only receives,
 * stores, and uses these values to compute within_tolerance for this assessment.
 *
 * Architecture:
 * - All DB access via createDrizzleRiskRegisterRepository (AGENTS.md §5: no inline Drizzle)
 * - Multi-tenancy enforced via organization_id + assessment_id on every query
 * - ADR-014: within_tolerance = residual_risk_score <= risk_tolerance_input
 * - ADR-014 Q-C: `accept` treatment does not require hard approval gate
 * - ADR-014 Q-D: scf_version_id is mandatory (NOT NULL)
 */
import type {
  AppDependencies,
  AssessmentRecord,
  RouteDefinition,
} from "../http";
import {
  json,
  parseJson,
  requireOrganizationId,
  routeUuidParam,
} from "../http";
import { ApiError } from "../errors/api-error";
import {
  createDrizzleRiskRegisterRepository,
  deriveRiskCategory,
} from "../adapters/risk-register.repository";
import {
  CreateRiskRegisterEntrySchema,
  UpdateRiskRegisterEntrySchema,
} from "@standard/schemas";

// -- Helpers ------------------------------------------------------------------

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

const requireRepo = (deps: AppDependencies) => {
  if (!deps._db)
    throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);
  return createDrizzleRiskRegisterRepository(deps._db);
};

// -- Routes -------------------------------------------------------------------

export const riskRegisterRoutes: RouteDefinition[] = [
  // -- POST /assessments/:id/risk-register ------------------------------------
  {
    method: "POST",
    path: "/api/v1/assessments/:id/risk-register",
    authRequired: true,
    tenantRequired: true,
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
      await requireAssessment(deps, assessmentId, orgId);
      const repo = requireRepo(deps);

      const body = await parseJson(request, CreateRiskRegisterEntrySchema);

      // Validate gap finding belongs to this assessment (multi-tenancy)
      const finding = await repo.findGapFinding(body.gap_finding_id, orgId);
      if (!finding || finding.assessmentId !== assessmentId) {
        throw new ApiError(
          "NOT_FOUND",
          "Gap finding not found or does not belong to this assessment.",
          404,
        );
      }

      // Inherit scores from gap finding (calculated by risk-score.service during Gap phase)
      const inherentScore = finding.inherentRiskScore
        ? Number(finding.inherentRiskScore)
        : null;
      const residualScore = finding.residualRiskScore
        ? Number(finding.residualRiskScore)
        : null;
      const riskCategory =
        residualScore !== null ? deriveRiskCategory(residualScore) : null;
      const riskToleranceInput = body.risk_tolerance ?? null;
      const withinTolerance =
        residualScore !== null && riskToleranceInput !== null
          ? residualScore <= riskToleranceInput
          : null;

      // We pass pre-computed values via a thin overrides object
      // The adapter handles ID generation and DB insert
      const entry = await repo.createWithScores({
        organization_id: orgId,
        assessment_id: assessmentId,
        scf_version_id: body.scf_version_id,
        gap_finding_id: body.gap_finding_id,
        scf_risk_id: body.scf_risk_id ?? null,
        risk_title: body.risk_title,
        risk_description: body.risk_description ?? null,
        treatment: body.treatment,
        treatment_rationale: body.treatment_rationale ?? null,
        owner_id: body.owner_id ?? null,
        review_date: body.review_date ?? null,
        risk_appetite: body.risk_appetite,
        risk_tolerance: body.risk_tolerance,
        risk_threshold: body.risk_threshold,
        inherent_risk_score: inherentScore,
        residual_risk_score: residualScore,
        risk_category: riskCategory,
        roc_determination: finding.rocDetermination ?? null,
        within_tolerance: withinTolerance,
        trace_id: traceId,
      });

      return json({ data: entry, trace_id: traceId }, { status: 201 });
    },
  },

  // -- GET /assessments/:id/risk-register ------------------------------------
  {
    method: "GET",
    path: "/api/v1/assessments/:id/risk-register",
    authRequired: true,
    tenantRequired: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);
      const repo = requireRepo(deps);

      const entries = await repo.list(assessmentId, orgId);
      return json({ data: entries, total: entries.length, trace_id: traceId });
    },
  },

  // -- GET /assessments/:id/risk-register/export -----------------------------
  // IMPORTANT: must come before /:entryId to avoid route conflict
  {
    method: "GET",
    path: "/api/v1/assessments/:id/risk-register/export",
    authRequired: true,
    tenantRequired: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);
      const repo = requireRepo(deps);

      const entries = await repo.list(assessmentId, orgId);
      const exportedAt = new Date().toISOString();
      const exportEntries = entries.map((e) => ({
        ...e,
        _export_at: exportedAt,
        _assessment_id: assessmentId,
        _standard_version: "2026.1",
      }));

      return json({
        assessment_id: assessmentId,
        exported_at: exportedAt,
        total: exportEntries.length,
        entries: exportEntries,
        trace_id: traceId,
      });
    },
  },

  // -- GET /assessments/:id/risk-register/:entryId ---------------------------
  {
    method: "GET",
    path: "/api/v1/assessments/:id/risk-register/:entryId",
    authRequired: true,
    tenantRequired: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const entryId = routeUuidParam(params, "entryId");
      await requireAssessment(deps, assessmentId, orgId);
      const repo = requireRepo(deps);

      const entry = await repo.get(entryId, assessmentId, orgId);
      if (!entry)
        throw new ApiError("NOT_FOUND", "Risk register entry not found.", 404);

      return json({ data: entry, trace_id: traceId });
    },
  },

  // -- PATCH /assessments/:id/risk-register/:entryId -------------------------
  {
    method: "PATCH",
    path: "/api/v1/assessments/:id/risk-register/:entryId",
    authRequired: true,
    tenantRequired: true,
    permissions: ["assessment:update"],
    handler: async ({ deps, params, request, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const entryId = routeUuidParam(params, "entryId");
      await requireAssessment(deps, assessmentId, orgId);
      const repo = requireRepo(deps);

      const patch = await parseJson(request, UpdateRiskRegisterEntrySchema);
      const updated = await repo.update(entryId, orgId, patch);
      if (!updated)
        throw new ApiError("NOT_FOUND", "Risk register entry not found.", 404);

      return json({ data: updated, trace_id: traceId });
    },
  },

  // -- DELETE /assessments/:id/risk-register/:entryId ------------------------
  {
    method: "DELETE",
    path: "/api/v1/assessments/:id/risk-register/:entryId",
    authRequired: true,
    tenantRequired: true,
    permissions: ["assessment:update"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const entryId = routeUuidParam(params, "entryId");
      await requireAssessment(deps, assessmentId, orgId);
      const repo = requireRepo(deps);

      const deleted = await repo.delete(entryId, assessmentId, orgId);
      if (!deleted)
        throw new ApiError("NOT_FOUND", "Risk register entry not found.", 404);

      return json({ success: true, trace_id: traceId });
    },
  },
];

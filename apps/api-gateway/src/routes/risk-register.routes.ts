// @ts-nocheck -- Zod v4 CI type compat
/**
 * Risk Register API â€” SCR-RMM Step 13 (Risk Treatment Decision)
 *
 * Registers risk entries per assessment, linking gap findings to treatment decisions.
 * risk_appetite / risk_tolerance / risk_threshold are sent by the consuming application
 * (GRC / frontend). The Standard does NOT manage risk appetite â€” it only receives,
 * stores, and uses these values to compute within_tolerance for this assessment.
 *
 * Architecture:
 * - All DB access via deps._db (Drizzle client) â€” same pattern as risk.routes.ts
 * - Multi-tenancy enforced via organization_id + assessment_id on every query
 * - ADR-014: within_tolerance = residual_risk_score <= risk_tolerance_input
 * - ADR-014 Q-C: `accept` treatment does not require hard approval gate
 * - ADR-014 Q-D: scf_version_id is mandatory (NOT NULL)
 */
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { assessmentRiskRegister, gapFindings } from "@standard/schemas";
import {
  CreateRiskRegisterEntrySchema,
  UpdateRiskRegisterEntrySchema,
} from "@standard/schemas";
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

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

const requireDb = (deps: AppDependencies) => {
  if (!deps._db)
    throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);
  return deps._db;
};

/**
 * Derives risk_category from residual risk score (0.0â€“1.0).
 * SCR-RMM Step 12: Risk Score â†’ Category mapping.
 */
const deriveRiskCategory = (
  score: number,
): "low" | "moderate" | "high" | "severe" | "extreme" => {
  if (score < 0.2) return "low";
  if (score < 0.4) return "moderate";
  if (score < 0.6) return "high";
  if (score < 0.8) return "severe";
  return "extreme";
};

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const riskRegisterRoutes: RouteDefinition[] = [
  // â”€â”€ POST /assessments/:id/risk-register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "POST",
    path: "/api/v1/assessments/:id/risk-register",
    authRequired: true,
    tenantRequired: true,
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
      const db = requireDb(deps);

      const body = await parseJson(request, CreateRiskRegisterEntrySchema);

      // 1. Validar que o gap finding pertence ao assessment (multi-tenancy)
      const [finding] = await db
        .select()
        .from(gapFindings)
        .where(
          and(
            eq(gapFindings.id, body.gap_finding_id),
            eq(gapFindings.organizationId, orgId),
          ),
        )
        .limit(1);

      if (!finding || finding.assessmentId !== assessmentId) {
        throw new ApiError(
          "NOT_FOUND",
          "Gap finding not found or does not belong to this assessment.",
          404,
        );
      }

      // 2. Herdar scores do gap finding (calculados pelo risk-score.service na etapa de Gap)
      const inherentScore = finding.inherentRiskScore
        ? Number(finding.inherentRiskScore)
        : null;
      const residualScore = finding.residualRiskScore
        ? Number(finding.residualRiskScore)
        : null;

      // 3. Derivar risk_category
      const riskCategory =
        residualScore !== null ? deriveRiskCategory(residualScore) : null;

      // 4. Calcular within_tolerance â€” determinÃ­stico, calculado pelo Standard
      const riskToleranceInput = body.risk_tolerance ?? null;
      const withinTolerance =
        residualScore !== null && riskToleranceInput !== null
          ? residualScore <= riskToleranceInput
          : null;

      const entryId = randomUUID();
      const now = new Date();

      await db.insert(assessmentRiskRegister).values({
        id: entryId,
        organizationId: orgId,
        assessmentId,
        scfVersionId: body.scf_version_id,
        gapFindingId: body.gap_finding_id,
        scfRiskId: body.scf_risk_id ?? null,
        riskTitle: body.risk_title,
        riskDescription: body.risk_description ?? null,
        inherentRiskScore:
          inherentScore !== null ? String(inherentScore) : null,
        residualRiskScore:
          residualScore !== null ? String(residualScore) : null,
        riskCategory,
        treatment: body.treatment,
        treatmentRationale: body.treatment_rationale ?? null,
        ownerId: body.owner_id ?? null,
        reviewDate: body.review_date ?? null,
        rocDetermination: finding.rocDetermination ?? null,
        riskAppetiteInput:
          body.risk_appetite !== undefined ? String(body.risk_appetite) : null,
        riskToleranceInput:
          riskToleranceInput !== null ? String(riskToleranceInput) : null,
        riskThresholdInput:
          body.risk_threshold !== undefined
            ? String(body.risk_threshold)
            : null,
        withinTolerance,
        traceId,
        createdAt: now,
        updatedAt: now,
      });

      const [entry] = await db
        .select()
        .from(assessmentRiskRegister)
        .where(eq(assessmentRiskRegister.id, entryId))
        .limit(1);

      return json({ data: entry, trace_id: traceId }, { status: 201 });
    },
  },

  // â”€â”€ GET /assessments/:id/risk-register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/assessments/:id/risk-register",
    authRequired: true,
    tenantRequired: true,
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);
      const db = requireDb(deps);

      const entries = await db
        .select()
        .from(assessmentRiskRegister)
        .where(
          and(
            eq(assessmentRiskRegister.organizationId, orgId),
            eq(assessmentRiskRegister.assessmentId, assessmentId),
          ),
        );

      return json({ data: entries, total: entries.length, trace_id: traceId });
    },
  },

  // â”€â”€ GET /assessments/:id/risk-register/export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // IMPORTANT: must come before /:entryId to avoid route conflict
  {
    method: "GET",
    path: "/api/v1/assessments/:id/risk-register/export",
    authRequired: true,
    tenantRequired: true,
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);
      const db = requireDb(deps);

      const entries = await db
        .select()
        .from(assessmentRiskRegister)
        .where(
          and(
            eq(assessmentRiskRegister.organizationId, orgId),
            eq(assessmentRiskRegister.assessmentId, assessmentId),
          ),
        );

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

  // â”€â”€ GET /assessments/:id/risk-register/:entryId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/assessments/:id/risk-register/:entryId",
    authRequired: true,
    tenantRequired: true,
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const entryId = routeUuidParam(params, "entryId");
      await requireAssessment(deps, assessmentId, orgId);
      const db = requireDb(deps);

      const [entry] = await db
        .select()
        .from(assessmentRiskRegister)
        .where(
          and(
            eq(assessmentRiskRegister.id, entryId),
            eq(assessmentRiskRegister.organizationId, orgId),
            eq(assessmentRiskRegister.assessmentId, assessmentId),
          ),
        )
        .limit(1);

      if (!entry)
        throw new ApiError("NOT_FOUND", "Risk register entry not found.", 404);

      return json({ data: entry, trace_id: traceId });
    },
  },

  // â”€â”€ PATCH /assessments/:id/risk-register/:entryId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "PATCH",
    path: "/api/v1/assessments/:id/risk-register/:entryId",
    authRequired: true,
    tenantRequired: true,
    handler: async ({ deps, params, request, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const entryId = routeUuidParam(params, "entryId");
      await requireAssessment(deps, assessmentId, orgId);
      const db = requireDb(deps);

      const patch = await parseJson(request, UpdateRiskRegisterEntrySchema);

      // Fetch existing to compute within_tolerance with updated tolerance
      const [existing] = await db
        .select()
        .from(assessmentRiskRegister)
        .where(
          and(
            eq(assessmentRiskRegister.id, entryId),
            eq(assessmentRiskRegister.organizationId, orgId),
          ),
        )
        .limit(1);

      if (!existing)
        throw new ApiError("NOT_FOUND", "Risk register entry not found.", 404);

      const residualScore = existing.residualRiskScore
        ? Number(existing.residualRiskScore)
        : null;

      // Resolve risk_tolerance: use patched value first, then existing, then null
      const newTolerance =
        patch.risk_tolerance !== undefined
          ? patch.risk_tolerance
          : existing.riskToleranceInput !== null
            ? Number(existing.riskToleranceInput)
            : null;

      const withinTolerance =
        residualScore !== null && newTolerance !== null
          ? residualScore <= newTolerance
          : existing.withinTolerance;

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        withinTolerance,
        ...(patch.risk_title !== undefined && { riskTitle: patch.risk_title }),
        ...(patch.risk_description !== undefined && {
          riskDescription: patch.risk_description,
        }),
        ...(patch.treatment !== undefined && { treatment: patch.treatment }),
        ...(patch.treatment_rationale !== undefined && {
          treatmentRationale: patch.treatment_rationale,
        }),
        ...(patch.owner_id !== undefined && { ownerId: patch.owner_id }),
        ...(patch.review_date !== undefined && {
          reviewDate: patch.review_date,
        }),
        ...(patch.scf_risk_id !== undefined && {
          scfRiskId: patch.scf_risk_id,
        }),
        ...(patch.risk_appetite !== undefined && {
          riskAppetiteInput: String(patch.risk_appetite),
        }),
        ...(patch.risk_tolerance !== undefined && {
          riskToleranceInput: String(patch.risk_tolerance),
        }),
        ...(patch.risk_threshold !== undefined && {
          riskThresholdInput: String(patch.risk_threshold),
        }),
      };

      await db
        .update(assessmentRiskRegister)
        .set(updates)
        .where(
          and(
            eq(assessmentRiskRegister.id, entryId),
            eq(assessmentRiskRegister.organizationId, orgId),
          ),
        );

      const [updated] = await db
        .select()
        .from(assessmentRiskRegister)
        .where(eq(assessmentRiskRegister.id, entryId))
        .limit(1);

      return json({ data: updated, trace_id: traceId });
    },
  },

  // â”€â”€ DELETE /assessments/:id/risk-register/:entryId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "DELETE",
    path: "/api/v1/assessments/:id/risk-register/:entryId",
    authRequired: true,
    tenantRequired: true,
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const entryId = routeUuidParam(params, "entryId");
      await requireAssessment(deps, assessmentId, orgId);
      const db = requireDb(deps);

      const [existing] = await db
        .select({ id: assessmentRiskRegister.id })
        .from(assessmentRiskRegister)
        .where(
          and(
            eq(assessmentRiskRegister.id, entryId),
            eq(assessmentRiskRegister.organizationId, orgId),
            eq(assessmentRiskRegister.assessmentId, assessmentId),
          ),
        )
        .limit(1);

      if (!existing)
        throw new ApiError("NOT_FOUND", "Risk register entry not found.", 404);

      await db
        .delete(assessmentRiskRegister)
        .where(
          and(
            eq(assessmentRiskRegister.id, entryId),
            eq(assessmentRiskRegister.organizationId, orgId),
          ),
        );

      return json({ success: true, trace_id: traceId });
    },
  },
];

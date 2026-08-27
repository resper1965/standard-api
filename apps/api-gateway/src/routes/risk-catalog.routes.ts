/**
 * SCF Risk & Threat Catalog API Routes — SCR-RMM Task 3
 *
 * Exposes the normative SCF Risk Catalog (scf_risks) and SCF Threat Catalog
 * (scf_threats) via read-only API endpoints.
 *
 * Architecture:
 * - These are shared normative tables — no organization_id scope required
 * - All DB access via createDrizzleScfRiskCatalogRepository (no inline Drizzle in handlers)
 * - Auth required but no tenant scope
 * - Distinct from business/operational risk taxonomy in risk.routes.ts
 *
 * References: AGENTS.md §8, ADR-014, SCR-RMM Task 3
 */
import type { AppDependencies, RouteDefinition } from "../http";
import { json, routeUuidParam } from "../http";
import { ApiError } from "../errors/api-error";
import { createDrizzleScfRiskCatalogRepository } from "../adapters/scf-risk-catalog.repository";

// -- Helpers ------------------------------------------------------------------

const requireCatalogRepo = (deps: AppDependencies) => {
  if (!deps._db)
    throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);
  return createDrizzleScfRiskCatalogRepository(deps._db);
};

// -- Routes -------------------------------------------------------------------

export const riskCatalogRoutes: RouteDefinition[] = [
  // -- GET /risk-catalog -------------------------------------------------------
  {
    method: "GET",
    path: "/api/v1/risk-catalog",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ deps, request, traceId }) => {
      const repo = requireCatalogRepo(deps);
      const url = new URL(request.url);
      const scfVersionId = url.searchParams.get("scf_version_id") ?? undefined;
      const category = url.searchParams.get("category") ?? undefined;

      const data = await repo.listRisks({ scfVersionId, category });
      return json({ data, total: data.length, trace_id: traceId });
    },
  },

  // -- GET /risk-catalog/:riskId -----------------------------------------------
  {
    method: "GET",
    path: "/api/v1/risk-catalog/:riskId",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const repo = requireCatalogRepo(deps);
      const riskId = routeUuidParam(params, "riskId");

      const risk = await repo.getRisk(riskId);
      if (!risk) throw new ApiError("NOT_FOUND", "SCF risk not found.", 404);

      return json({ data: risk, trace_id: traceId });
    },
  },

  // -- GET /threat-catalog -----------------------------------------------------
  {
    method: "GET",
    path: "/api/v1/threat-catalog",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ deps, request, traceId }) => {
      const repo = requireCatalogRepo(deps);
      const url = new URL(request.url);
      const scfVersionId = url.searchParams.get("scf_version_id") ?? undefined;
      const category = url.searchParams.get("category") ?? undefined;

      const data = await repo.listThreats({ scfVersionId, category });
      return json({ data, total: data.length, trace_id: traceId });
    },
  },

  // -- GET /threat-catalog/:threatId -------------------------------------------
  {
    method: "GET",
    path: "/api/v1/threat-catalog/:threatId",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const repo = requireCatalogRepo(deps);
      const threatId = routeUuidParam(params, "threatId");

      const threat = await repo.getThreat(threatId);
      if (!threat)
        throw new ApiError("NOT_FOUND", "SCF threat not found.", 404);

      return json({ data: threat, trace_id: traceId });
    },
  },
];

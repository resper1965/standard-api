// @ts-nocheck -- Zod v4 CI type compat
/**
 * SCF Risk & Threat Catalog API Routes â€” SCR-RMM Task 3
 *
 * Exposes the normative SCF Risk Catalog (scf_risks) and SCF Threat Catalog
 * (scf_threats) via read-only API endpoints.
 *
 * Architecture:
 * - These are shared normative tables â€” no organization_id scope required
 * - Queries via deps._db (Drizzle) â€” same pattern as other SCF catalog routes
 * - Auth required but no tenant scope
 * - Distinct from business/operational risk taxonomy in risk.routes.ts
 *
 * References: AGENTS.md Â§8, ADR-014, SCR-RMM Task 3
 */
import { and, eq, inArray } from "drizzle-orm";
import {
  scfRiskControlMappings,
  scfRisks,
  scfThreatControlMappings,
  scfThreats,
} from "@standard/schemas";
import type { AppDependencies, RouteDefinition } from "../http";
import { json, routeUuidParam } from "../http";
import { ApiError } from "../errors/api-error";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const requireDb = (deps: AppDependencies) => {
  if (!deps._db)
    throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);
  return deps._db;
};

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const riskCatalogRoutes: RouteDefinition[] = [
  // â”€â”€ GET /risk-catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/risk-catalog",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ deps, request, traceId }) => {
      const db = requireDb(deps);
      const url = new URL(request.url);
      const scfVersionId = url.searchParams.get("scf_version_id");
      const category = url.searchParams.get("category");

      // Build filter
      const filters = [];
      if (scfVersionId) filters.push(eq(scfRisks.scfVersionId, scfVersionId));
      if (category) filters.push(eq(scfRisks.category, category));

      const rows =
        filters.length > 0
          ? await db
              .select()
              .from(scfRisks)
              .where(and(...filters))
          : await db.select().from(scfRisks);

      // Attach mitigating_control_ids (batch join)
      const riskIds = rows.map((r) => r.id);
      const mappings =
        riskIds.length > 0
          ? await db
              .select()
              .from(scfRiskControlMappings)
              .where(inArray(scfRiskControlMappings.scfRiskId, riskIds))
          : [];

      const controlMap = new Map<string, string[]>();
      for (const m of mappings) {
        const list = controlMap.get(m.scfRiskId) ?? [];
        list.push(m.scfControlId);
        controlMap.set(m.scfRiskId, list);
      }

      const data = rows.map((r) => ({
        id: r.id,
        scf_version_id: r.scfVersionId,
        risk_code: r.riskCode,
        title: r.title,
        description: r.description ?? null,
        category: r.category ?? null,
        mitigating_control_ids: controlMap.get(r.id) ?? [],
        created_at: r.createdAt?.toISOString?.() ?? String(r.createdAt),
        updated_at: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
      }));

      return json({ data, total: data.length, trace_id: traceId });
    },
  },

  // â”€â”€ GET /risk-catalog/:riskId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/risk-catalog/:riskId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ deps, params, traceId }) => {
      const db = requireDb(deps);
      const riskId = routeUuidParam(params, "riskId");

      const [risk] = await db
        .select()
        .from(scfRisks)
        .where(eq(scfRisks.id, riskId))
        .limit(1);

      if (!risk) throw new ApiError("NOT_FOUND", "SCF risk not found.", 404);

      const mappings = await db
        .select()
        .from(scfRiskControlMappings)
        .where(eq(scfRiskControlMappings.scfRiskId, riskId));

      return json({
        data: {
          id: risk.id,
          scf_version_id: risk.scfVersionId,
          risk_code: risk.riskCode,
          title: risk.title,
          description: risk.description ?? null,
          category: risk.category ?? null,
          mitigating_control_ids: mappings.map((m) => m.scfControlId),
          created_at: risk.createdAt?.toISOString?.() ?? String(risk.createdAt),
          updated_at: risk.updatedAt?.toISOString?.() ?? String(risk.updatedAt),
        },
        trace_id: traceId,
      });
    },
  },

  // â”€â”€ GET /threat-catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/threat-catalog",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ deps, request, traceId }) => {
      const db = requireDb(deps);
      const url = new URL(request.url);
      const scfVersionId = url.searchParams.get("scf_version_id");
      const category = url.searchParams.get("category");

      const filters = [];
      if (scfVersionId) filters.push(eq(scfThreats.scfVersionId, scfVersionId));
      if (category) filters.push(eq(scfThreats.category, category));

      const rows =
        filters.length > 0
          ? await db
              .select()
              .from(scfThreats)
              .where(and(...filters))
          : await db.select().from(scfThreats);

      const threatIds = rows.map((r) => r.id);
      const mappings =
        threatIds.length > 0
          ? await db
              .select()
              .from(scfThreatControlMappings)
              .where(inArray(scfThreatControlMappings.scfThreatId, threatIds))
          : [];

      const controlMap = new Map<string, string[]>();
      for (const m of mappings) {
        const list = controlMap.get(m.scfThreatId) ?? [];
        list.push(m.scfControlId);
        controlMap.set(m.scfThreatId, list);
      }

      const data = rows.map((r) => ({
        id: r.id,
        scf_version_id: r.scfVersionId,
        threat_code: r.threatCode,
        title: r.title,
        description: r.description ?? null,
        category: r.category ?? null,
        mitigating_control_ids: controlMap.get(r.id) ?? [],
        created_at: r.createdAt?.toISOString?.() ?? String(r.createdAt),
        updated_at: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
      }));

      return json({ data, total: data.length, trace_id: traceId });
    },
  },

  // â”€â”€ GET /threat-catalog/:threatId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/threat-catalog/:threatId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ deps, params, traceId }) => {
      const db = requireDb(deps);
      const threatId = routeUuidParam(params, "threatId");

      const [threat] = await db
        .select()
        .from(scfThreats)
        .where(eq(scfThreats.id, threatId))
        .limit(1);

      if (!threat)
        throw new ApiError("NOT_FOUND", "SCF threat not found.", 404);

      const mappings = await db
        .select()
        .from(scfThreatControlMappings)
        .where(eq(scfThreatControlMappings.scfThreatId, threatId));

      return json({
        data: {
          id: threat.id,
          scf_version_id: threat.scfVersionId,
          threat_code: threat.threatCode,
          title: threat.title,
          description: threat.description ?? null,
          category: threat.category ?? null,
          mitigating_control_ids: mappings.map((m) => m.scfControlId),
          created_at:
            threat.createdAt?.toISOString?.() ?? String(threat.createdAt),
          updated_at:
            threat.updatedAt?.toISOString?.() ?? String(threat.updatedAt),
        },
        trace_id: traceId,
      });
    },
  },
];

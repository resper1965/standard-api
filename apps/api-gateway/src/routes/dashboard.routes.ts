/**
 * Dashboard Routes â€” Server-Computed KPIs
 *
 * These endpoints aggregate data so frontends never need to
 * calculate compliance percentages or count findings client-side.
 */
import type {
  AssessmentSummary,
  OrganizationDashboard,
  AuditLogTenantQuery,
} from "@standard/schemas";
import { AuditLogTenantQuerySchema } from "@standard/schemas";
// ADR-001: STRM-weighted compliance replaces binary implementedControls/totalControls
import { computeComplianceIndex } from "@standard/assessment-engine";
import { buildStrmControlInputs } from "../lib/strm-compliance-query";
import type { SoaItemWithMapping } from "../lib/strm-compliance-query";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import {
  json,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";

/**
 * computeRealStrmCompliance â€” builds STRM inputs from real scf_mappings data.
 *
 * Replaces strmProxyFromSoaItems() which used intersects/0.5 hardcoded.
 * Now reads actual relationship_type + strength_score from scf_mappings (ADR-001).
 *
 * Falls back to conservative proxy (intersects/0.5) when scf.repository unavailable.
 */
async function computeRealStrmCompliance(
  deps: {
    scf?: {
      repository?: {
        listMappingsByControlIds?: (
          ids: string[],
          versionId: string,
        ) => Promise<
          Array<{
            scf_control_id: string;
            relationship_type: string;
            strength_score: number | null;
          }>
        >;
      };
    };
  },
  soaItems: Array<{
    scfControlId?: string | null;
    scf_control_id?: string | null;
    maturityLevel?: number | null;
    maturity_level?: number | null;
    implementation_status?: string;
    implementationStatus?: string;
  }>,
  scfVersionId: string | null | undefined,
): Promise<{ index: number; percentage: number }> {
  if (soaItems.length === 0) return { index: 0, percentage: 0 };

  // Use real mappings if repository available and we have a scf_version_id
  if (deps.scf?.repository?.listMappingsByControlIds && scfVersionId) {
    const controlIds = soaItems
      .map((i) => i.scfControlId ?? i.scf_control_id)
      .filter((id): id is string => !!id);

    if (controlIds.length > 0) {
      const rawMappings = await (
        deps.scf.repository as any
      ).listMappingsByControlIds(controlIds, scfVersionId);
      const mappingMap = new Map<
        string,
        {
          scf_control_id: string;
          relationship_type: string;
          strength_score: number | null;
        }
      >(
        rawMappings.map(
          (m: {
            scf_control_id: string;
            relationship_type: string;
            strength_score: number | null;
          }) => [m.scf_control_id, m],
        ),
      );

      const soaItemsWithMappings: SoaItemWithMapping[] = soaItems.map(
        (item) => {
          const ctrlId = item.scfControlId ?? item.scf_control_id ?? "";
          const mapping = mappingMap.get(ctrlId);
          const implStatus =
            item.implementation_status ??
            item.implementationStatus ??
            "not_assessed";
          const maturityVal =
            item.maturityLevel ??
            item.maturity_level ??
            (implStatus === "implemented"
              ? 5
              : implStatus === "partially_implemented"
                ? 2
                : 0);
          return {
            control_id: ctrlId,
            maturity_level: maturityVal,
            relationship_type: mapping?.relationship_type ?? null,
            strength_score: mapping?.strength_score ?? null,
          };
        },
      );

      const strmInputs = buildStrmControlInputs(soaItemsWithMappings);
      if (strmInputs.length > 0) {
        return computeComplianceIndex(strmInputs);
      }
    }
  }

  // Fallback: conservative STRM proxy (no scf_version_id or no mappings found)
  // Maps implementation_status â†’ maturity level, uses intersects/0.5 as conservative estimate
  const fallbackControls = soaItems.map((item) => {
    const implStatus =
      item.implementation_status ?? item.implementationStatus ?? "not_assessed";
    const maturityVal =
      item.maturityLevel ??
      item.maturity_level ??
      (implStatus === "implemented"
        ? 5
        : implStatus === "partially_implemented"
          ? 2
          : 0);
    return {
      maturity_level: maturityVal,
      strm_operator: "intersects" as const,
      strength_score: 0.5,
    };
  });
  return computeComplianceIndex(fallbackControls);
}

const parseQuery = (
  request: Request,
  schema: {
    safeParse: (v: unknown) => {
      success: boolean;
      data?: unknown;
      error?: unknown;
    };
  },
) => {
  const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new ApiError("VALIDATION_ERROR", "Invalid query parameters.", 400, [
      parsed.error,
    ]);
  return parsed.data;
};

export const dashboardRoutes: RouteDefinition[] = [
  // â”€â”€ G5: Assessment Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/summary",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const assessmentId = routeUuidParam(params, "assessmentId");
      const assessment = await deps.assessments
        .withOrganization(requireOrganizationId({ organizationId }))
        .get(assessmentId);
      if (!assessment)
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      // SoA items â†’ total & implemented controls
      const soaVersions = await deps.soa.repositories.versions.listByAssessment(
        assessmentId,
        requireOrganizationId({ organizationId }),
      );
      const latestSoa = soaVersions.at(-1);
      let totalControls = 0;
      let implementedControls = 0;
      if (latestSoa) {
        const items = await deps.soa.repositories.items.listByVersion(
          latestSoa.soa_version_id,
          requireOrganizationId({ organizationId }),
        );
        totalControls = items.length;
        implementedControls = items.filter(
          (i) => i.implementation_status === "implemented",
        ).length;
      }

      // Gap findings
      const gapVersions =
        await deps.gapAnalysis.repositories.gapVersions.listByAssessment(
          assessmentId,
          requireOrganizationId({ organizationId }),
        );
      const latestGap = gapVersions.at(-1);
      let totalFindings = 0,
        critical = 0,
        high = 0,
        medium = 0,
        low = 0;
      if (latestGap) {
        const findings =
          await deps.gapAnalysis.repositories.gapFindings.listByVersion(
            latestGap.gap_analysis_version_id,
            requireOrganizationId({ organizationId }),
          );
        totalFindings = findings.length;
        for (const f of findings) {
          if (f.severity === "critical") critical++;
          else if (f.severity === "high") high++;
          else if (f.severity === "medium") medium++;
          else low++;
        }
      }

      // POA&M open items
      const poamVersions =
        await deps.poam.repositories.versions.listByAssessment(
          assessmentId,
          requireOrganizationId({ organizationId }),
        );
      const latestPoam = poamVersions.at(-1);
      let openPoamItems = 0;
      if (latestPoam) {
        const items = await deps.poam.repositories.items.listByVersion(
          latestPoam.poam_version_id,
          requireOrganizationId({ organizationId }),
        );
        openPoamItems = items.filter(
          (p) =>
            p.status === "draft" ||
            p.status === "in_progress" ||
            p.status === "approved",
        ).length;
      }

      // ADR-001: STRM-weighted compliance index â€” real scf_mappings data
      // â›” was: strmProxyFromSoaItems() with hardcoded intersects/0.5
      let strmResult = { index: 0, percentage: 0 };
      if (latestSoa) {
        const soaItemsForStrm = await deps.soa.repositories.items.listByVersion(
          latestSoa.soa_version_id,
          requireOrganizationId({ organizationId }),
        );
        strmResult = await computeRealStrmCompliance(
          deps as any,
          soaItemsForStrm as any[],
          assessment.scf_version_id,
        );
      }

      const summary: AssessmentSummary = {
        assessment_id: assessmentId,
        name: assessment.name,
        state: assessment.snapshot.state,
        total_controls: totalControls,
        implemented_controls: implementedControls,
        // ADR-001: STRM-weighted compliance index, not binary percentage
        compliance_pct: strmResult.percentage,
        total_findings: totalFindings,
        critical_findings: critical,
        high_findings: high,
        medium_findings: medium,
        low_findings: low,
        open_poam_items: openPoamItems,
        maturity_avg: null,
        last_activity_at: null,
        computed_at: new Date().toISOString(),
      };

      return json({
        ...summary,
        // Traceability: document how compliance was computed
        compliance_method: "strm_real_scf_mappings",
        trace_id: traceId,
      });
    },
  },
  // â”€â”€ G5: Organization Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/dashboard",
    protected: true,
    permissions: ["organization:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = routeUuidParam(params, "organizationId");
      const org = await deps.organizations.get(orgId);
      if (!org) throw new ApiError("NOT_FOUND", "Organization not found.", 404);

      const assessments = await deps.assessments.listByOrganization(orgId);

      const byState: Record<string, number> = {};
      let complianceSum = 0;
      let complianceCount = 0;
      let totalOpenPoams = 0;
      let totalCritical = 0;
      let totalHigh = 0;
      let lastActivity: string | null = null;

      for (const a of assessments) {
        const state = a.snapshot.state;
        byState[state] = (byState[state] ?? 0) + 1;

        // Quick SoA compliance calc
        const soaVersions =
          await deps.soa.repositories.versions.listByAssessment(
            a.assessment_id,
            requireOrganizationId({ organizationId }),
          );
        const latestSoa = soaVersions.at(-1);
        if (latestSoa) {
          const items = await deps.soa.repositories.items.listByVersion(
            latestSoa.soa_version_id,
            requireOrganizationId({ organizationId }),
          );
          if (items.length > 0) {
            // ADR-001: STRM-weighted compliance index â€” real scf_mappings data
            // â›” was: strmProxyFromSoaItems() with hardcoded intersects/0.5
            const strmResult = await computeRealStrmCompliance(
              deps as any,
              items as any[],
              a.scf_version_id,
            );
            complianceSum += strmResult.percentage;
            complianceCount++;
          }
        }

        // POA&M count
        const poamVersions =
          await deps.poam.repositories.versions.listByAssessment(
            a.assessment_id,
            requireOrganizationId({ organizationId }),
          );
        const latestPoam = poamVersions.at(-1);
        if (latestPoam) {
          const pItems = await deps.poam.repositories.items.listByVersion(
            latestPoam.poam_version_id,
            requireOrganizationId({ organizationId }),
          );
          totalOpenPoams += pItems.filter(
            (p) =>
              p.status === "draft" ||
              p.status === "in_progress" ||
              p.status === "approved",
          ).length;
        }

        // Gap findings
        const gapVersions =
          await deps.gapAnalysis.repositories.gapVersions.listByAssessment(
            a.assessment_id,
            requireOrganizationId({ organizationId }),
          );
        const latestGap = gapVersions.at(-1);
        if (latestGap) {
          const findings =
            await deps.gapAnalysis.repositories.gapFindings.listByVersion(
              latestGap.gap_analysis_version_id,
              requireOrganizationId({ organizationId }),
            );
          for (const f of findings) {
            if (f.severity === "critical") totalCritical++;
            else if (f.severity === "high") totalHigh++;
          }
        }

        if (!lastActivity) lastActivity = new Date().toISOString();
      }

      const dashboard: OrganizationDashboard = {
        organization_id: orgId,
        organization_name: org.name,
        total_assessments: assessments.length,
        assessments_by_state: byState,
        compliance_avg_pct:
          complianceCount > 0
            ? Math.round((complianceSum / complianceCount) * 100) / 100
            : 0,
        total_open_poams: totalOpenPoams,
        total_critical_findings: totalCritical,
        total_high_findings: totalHigh,
        last_activity_at: lastActivity,
        computed_at: new Date().toISOString(),
      };

      return json({ ...dashboard, trace_id: traceId });
    },
  },
  // â”€â”€ G4: Tenant-Wide Audit Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/tenants/:organizationId/audit-logs",
    protected: true,
    permissions: ["audit:read"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      if (routeUuidParam(params, "organizationId") !== organizationId)
        throw new ApiError("FORBIDDEN", "Tenant context mismatch.", 403);
      const query = parseQuery(
        request,
        AuditLogTenantQuerySchema,
      ) as AuditLogTenantQuery;
      const data = await deps.observability.auditEvents.list({
        organization_id: organizationId,
        limit: query.limit,
      });

      // Apply additional filters
      const filtered = data.filter((event) => {
        if (query.action && event.action !== query.action) return false;
        if (query.actor_id && event.actor_id !== query.actor_id) return false;
        if (query.resource_type && event.resource_type !== query.resource_type)
          return false;
        if (query.since && event.timestamp < query.since) return false;
        if (query.until && event.timestamp > query.until) return false;
        return true;
      });

      return json({ data: filtered, trace_id: traceId });
    },
  },
  // â”€â”€ G4: Org-Level Audit Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/audit-logs",
    protected: true,
    permissions: ["audit:read"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      const orgId = routeUuidParam(params, "organizationId");
      const org = await deps.organizations.get(orgId);
      if (!org) throw new ApiError("NOT_FOUND", "Organization not found.", 404);
      const query = parseQuery(
        request,
        AuditLogTenantQuerySchema,
      ) as AuditLogTenantQuery;
      const data = await deps.observability.auditEvents.list({
        organization_id: organizationId,
        limit: query.limit,
      });

      const filtered = data.filter((event) => {
        if (event.organization_id !== orgId) return false;
        if (query.action && event.action !== query.action) return false;
        if (query.actor_id && event.actor_id !== query.actor_id) return false;
        if (query.since && event.timestamp < query.since) return false;
        if (query.until && event.timestamp > query.until) return false;
        return true;
      });

      return json({ data: filtered, trace_id: traceId });
    },
  },
];

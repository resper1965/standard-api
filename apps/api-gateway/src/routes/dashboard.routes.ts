/**
 * Dashboard Routes — Server-Computed KPIs
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
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import {
  json,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";

/**
 * strmProxyFromSoaItems — conservative STRM proxy when no explicit maturity data.
 *
 * Maps SoA implementation_status to maturity levels:
 *   implemented        → 5  (fully mature)
 *   partially_implemented → 2  (partial)
 *   not_implemented    → 0
 *   planned / unknown  → 0
 *
 * Uses 'intersects' operator with default strength 0.5 as conservative estimate.
 * This avoids over-reporting compliance vs the forbidden binary formula.
 *
 * ⛔ NOT (implemented / total) * 100 — see ADR-001 and IMPLEMENTATION-CONSTRAINTS.md
 */
function strmProxyFromSoaItems(
  items: Array<{ implementation_status?: string }>,
): { index: number; percentage: number } {
  if (items.length === 0) return { index: 0, percentage: 0 };
  const controls = items.map((item) => ({
    maturity_level:
      item.implementation_status === "implemented"
        ? 5
        : item.implementation_status === "partially_implemented"
          ? 2
          : 0,
    strm_operator: "intersects" as const, // conservative default
    strength_score: 0.5, // default intersects weight per ADR-001
  }));
  return computeComplianceIndex(controls);
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
  // ── G5: Assessment Summary ──────────────────────────
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

      // SoA items → total & implemented controls
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

      // ADR-001: STRM-weighted compliance index (conservative proxy)
      // ⛔ was: Math.round((implementedControls / totalControls) * 10000) / 100
      const strmResult = latestSoa
        ? strmProxyFromSoaItems(
            await deps.soa.repositories.items.listByVersion(
              latestSoa.soa_version_id,
              requireOrganizationId({ organizationId }),
            ),
          )
        : { index: 0, percentage: 0 };

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
        compliance_method: "strm_proxy_intersects_0.5",
        trace_id: traceId,
      });
    },
  },
  // ── G5: Organization Dashboard ──────────────────────
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
            // ADR-001: STRM-weighted compliance index (conservative proxy)
            // ⛔ was: (implemented / items.length) * 100
            const strmResult = strmProxyFromSoaItems(items);
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
  // ── G4: Tenant-Wide Audit Logs ──────────────────────
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
  // ── G4: Org-Level Audit Logs ────────────────────────
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

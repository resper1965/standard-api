import { CreateAssessmentRequestSchema, UpdateAssessmentRequestSchema, type ComplianceGateResponse, type ComplianceGateStatus } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, newId, parseJson, routeParam } from "../http";
import { assessmentResponse, lifecycleEventResponse } from "../presenters";
import { z } from "zod";

/**
 * Asserts that the fetched resource belongs to the request's resolved tenant.
 * Prevents IDOR attacks across tenant boundaries.
 *
 * Behaviour:
 * - If resourceTenantId is absent/null/empty → FORBIDDEN (data anomaly, never trust)
 * - If resourceTenantId !== resolvedTenantId → FORBIDDEN (cross-tenant access)
 * - If they match → pass
 *
 * AGENTS.md §13: Tenant isolation must be enforced at every resource access.
 */
function assertTenantOwnership(
  resourceTenantId: string | undefined | null,
  resolvedTenantId: string,
  resourceType = "Assessment"
): void {
  // !resourceTenantId covers undefined, null and empty string —
  // all are treated as FORBIDDEN (corrupted data must never pass the guard).
  if (!resourceTenantId || resourceTenantId !== resolvedTenantId) {
    throw new ApiError(
      "FORBIDDEN",
      `${resourceType} does not belong to the current tenant.`,
      403
    );
  }
}

const AssessmentAutomationConfigSchema = z.object({
  agents_enabled: z.array(z.string()).optional(),
  auto_remediation: z.boolean().optional(),
  approval_gates: z.boolean().optional(),
  schedule: z.string().optional()
}).openapi("AssessmentAutomationConfig");

export const assessmentsRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments",
    protected: true,
    requireActor: true,
    bodySchema: CreateAssessmentRequestSchema,
    handler: async ({ validatedBody, deps, tenantId, traceId }) => {
      const body = validatedBody as import("@standard/schemas").CreateAssessmentRequest;

      // Bridge Better Auth text ID → Standard domain UUID context
      const betterAuthOrgId = body.organization_id ?? tenantId!;
      if (!deps.resolveTenantContext) {
        throw new ApiError("INTERNAL_ERROR", "Tenant mapping not configured.", 500);
      }
      const ctx = await deps.resolveTenantContext(betterAuthOrgId);
      if (!ctx) {
        throw new ApiError(
          "NOT_FOUND",
          `Organization "${betterAuthOrgId}" not found in Better Auth. Please create an organization first.`,
          404
        );
      }

      const tenantDb = deps.assessments.withTenant(ctx.tenant_id);
      const assessment = await tenantDb.create({
        assessment_id: newId(),
        organization_id: ctx.organization_id,
        name: body.name,
        scf_version_id: body.scf_version_id,
        documentCount: body.document_count,
        trace_id: traceId
      });

      const version = await deps.scf.versions.getVersion(assessment.scf_version_id);
      const res = assessmentResponse(assessment);
      if (version) res.scf_version_label = version.version_label;

      return json(res, { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId",
    protected: true,
    handler: async ({ deps, params, tenantId }) => {
      // Resolve Better Auth org ID → Standard domain UUID
      let resolvedTenantId = tenantId!;
      try {
        const ctx = await deps.resolveTenantContext?.(tenantId!);
        if (ctx) resolvedTenantId = ctx.tenant_id;
      } catch { /* use original tenantId if mapping fails */ }

      const tenantDb = deps.assessments.withTenant(resolvedTenantId);
      const assessment = await tenantDb.get(routeParam(params, "assessmentId"));
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.tenant_id, resolvedTenantId);

      const version = await deps.scf.versions.getVersion(assessment.scf_version_id);
      const res = assessmentResponse(assessment);
      if (version) res.scf_version_label = version.version_label;

      return json(res);
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments",
    protected: true,
    handler: async ({ deps, tenantId, traceId }) => {
      // Resolve Better Auth org ID → Standard domain UUID
      let resolvedTenantId = tenantId!;
      try {
        const ctx = await deps.resolveTenantContext?.(tenantId!);
        if (ctx) resolvedTenantId = ctx.tenant_id;
      } catch { /* use original tenantId if mapping fails */ }

      const tenantDb = deps.assessments.withTenant(resolvedTenantId);
      const assessments = await tenantDb.listAll();
      const versions = await deps.scf.versions.listVersions();
      const versionMap = new Map(versions.map(v => [v.id, v.version_label]));
      const enriched = assessments.map(a => {
        const res = assessmentResponse(a);
        const label = versionMap.get(a.scf_version_id);
        if (label) res.scf_version_label = label;
        return res;
      });
      return json({ data: enriched, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/assessments",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      // Resolve Better Auth org ID → Standard domain UUID
      let resolvedTenantId = tenantId!;
      try {
        const ctx = await deps.resolveTenantContext?.(tenantId!);
        if (ctx) resolvedTenantId = ctx.tenant_id;
      } catch { /* use original tenantId if mapping fails */ }

      const tenantDb = deps.assessments.withTenant(resolvedTenantId);
      const assessments = await tenantDb.listByOrganization(routeParam(params, "organizationId"));
      const versions = await deps.scf.versions.listVersions();
      const versionMap = new Map(versions.map(v => [v.id, v.version_label]));
      const enriched = assessments.map(a => {
        const res = assessmentResponse(a);
        const label = versionMap.get(a.scf_version_id);
        if (label) res.scf_version_label = label;
        return res;
      });
      return json({ data: enriched, trace_id: traceId });
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/assessments/:assessmentId",
    protected: true,
    requireActor: true,
    bodySchema: UpdateAssessmentRequestSchema,
    handler: async ({ validatedBody, deps, params, tenantId }) => {
      const body = validatedBody as import("@standard/schemas").UpdateAssessmentRequest;
      let resolvedTenantId = tenantId!;
      try { const ctx = await deps.resolveTenantContext?.(tenantId!); if (ctx) resolvedTenantId = ctx.tenant_id; } catch {}
      const tenantDb = deps.assessments.withTenant(resolvedTenantId);
      const assessment = await tenantDb.get(routeParam(params, "assessmentId"));
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.tenant_id, resolvedTenantId);

      const updated = { ...assessment, name: body.name ?? assessment.name };
      await tenantDb.save(updated);
      
      const version = await deps.scf.versions.getVersion(updated.scf_version_id);
      const res = assessmentResponse(updated);
      if (version) res.scf_version_label = version.version_label;

      return json(res);
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/status",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      let resolvedTenantId = tenantId!;
      try { const ctx = await deps.resolveTenantContext?.(tenantId!); if (ctx) resolvedTenantId = ctx.tenant_id; } catch {}
      const tenantDb = deps.assessments.withTenant(resolvedTenantId);
      const assessment = await tenantDb.get(routeParam(params, "assessmentId"));
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.tenant_id, resolvedTenantId);
      return json({
        assessment_id: assessment.assessment_id,
        tenant_id: assessment.tenant_id,
        organization_id: assessment.organization_id,
        state: assessment.snapshot.state,
        trace_id: traceId
      });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/timeline",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      let resolvedTenantId = tenantId!;
      try { const ctx = await deps.resolveTenantContext?.(tenantId!); if (ctx) resolvedTenantId = ctx.tenant_id; } catch {}
      const assessmentId = routeParam(params, "assessmentId");
      const tenantDb = deps.assessments.withTenant(resolvedTenantId);
      const assessment = await tenantDb.get(assessmentId);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.tenant_id, resolvedTenantId);
      const events = await deps.lifecycleEvents.listByAssessment(assessmentId, resolvedTenantId);
      return json({
        assessment_id: assessment.assessment_id,
        tenant_id: assessment.tenant_id,
        organization_id: assessment.organization_id,
        events: events.map(lifecycleEventResponse),
        trace_id: traceId
      });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/compliance-gate",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      let resolvedTenantId = tenantId!;
      try { const ctx = await deps.resolveTenantContext?.(tenantId!); if (ctx) resolvedTenantId = ctx.tenant_id; } catch {}
      const assessmentId = routeParam(params, "assessmentId");
      const tenantDb = deps.assessments.withTenant(resolvedTenantId);
      const assessment = await tenantDb.get(assessmentId);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.tenant_id, resolvedTenantId);

      // Find latest approved gap analysis version
      const versions = await deps.gapAnalysis.repositories.gapVersions.listByAssessment(assessmentId, resolvedTenantId);
      const approved = versions
        .filter((v) => v.status === "approved")
        .sort((a, b) => b.version_number - a.version_number)[0];

      if (!approved) {
        const gate: ComplianceGateResponse = {
          gate_id: newId(),
          assessment_id: assessmentId,
          status: "no_data",
          critical_findings: 0,
          high_findings: 0,
          total_findings: 0,
          findings_summary: "No approved gap analysis found for this assessment.",
          checked_at: new Date().toISOString(),
          trace_id: traceId
        };
        return json(gate);
      }

      const findings = await deps.gapAnalysis.repositories.gapFindings.listByVersion(approved.gap_analysis_version_id, resolvedTenantId);
      const critical = findings.filter((f) => f.severity === "critical").length;
      const high = findings.filter((f) => f.severity === "high").length;
      const total = findings.length;

      const status: ComplianceGateStatus = critical > 0 ? "fail" : high > 3 ? "fail" : "pass";

      const gate: ComplianceGateResponse = {
        gate_id: newId(),
        assessment_id: assessmentId,
        framework_id: approved.framework_id,
        status,
        critical_findings: critical,
        high_findings: high,
        total_findings: total,
        gap_analysis_version_id: approved.gap_analysis_version_id,
        findings_summary: status === "pass"
          ? `Assessment passes compliance gate. ${total} findings, none critical.`
          : `Assessment BLOCKED: ${critical} critical, ${high} high findings require remediation.`,
        checked_at: new Date().toISOString(),
        trace_id: traceId
      };

      // Best-effort webhook dispatch for CI/CD subscribers
      if (deps.webhooks) {
        try {
          const subscribers = await deps.webhooks.findSubscribers(
            tenantId!,
            assessment.organization_id,
            "compliance.gate.evaluated"
          );
          for (const endpoint of subscribers) {
            if (!endpoint.enabled) continue;
            await deps.webhooks.logDelivery({
              delivery_id: newId(),
              endpoint_id: endpoint.id,
              event_id: gate.gate_id,
              event_type: "compliance.gate.evaluated",
              status: "pending",
              http_status: null,
              attempt_count: 0,
              max_attempts: 3,
              last_attempted_at: null,
              next_retry_at: new Date().toISOString(),
              response_body: null,
              created_at: new Date().toISOString()
            });
          }
        } catch {
          // Non-blocking — webhook delivery is best-effort
        }
      }

      return json(gate);
    }
  },
  {
    method: "PUT",
    path: "/api/v1/assessments/:assessmentId/automation-rules",
    protected: true,
    requireActor: true,
    bodySchema: AssessmentAutomationConfigSchema,
    handler: async ({ validatedBody, deps, params, tenantId, traceId }) => {
      // Resolve Better Auth org ID → Standard domain UUID
      let resolvedTenantId = tenantId!;
      try {
        const ctx = await deps.resolveTenantContext?.(tenantId!);
        if (ctx) resolvedTenantId = ctx.tenant_id;
      } catch { /* use original tenantId if mapping fails */ }

      const assessmentId = routeParam(params, "assessmentId");
      const assessment = await deps.assessments.withTenant(resolvedTenantId).get(assessmentId);
      
      if (!assessment) {
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      }
      assertTenantOwnership(assessment.tenant_id, resolvedTenantId);

      // Instead of changing the schema natively, we'll embed the config in snapshot.automation_config
      // to keep it within the existing AssessmentRecord bounds without schema migrations
      const config = validatedBody as import("zod").infer<typeof AssessmentAutomationConfigSchema>;
      
      const snapshot = assessment.snapshot || {};
      (snapshot as any).automation_config = config;
      
      const updated = {
        ...assessment,
        snapshot,
        trace_id: traceId
      };
      
      await deps.assessments.withTenant(updated.tenant_id).save(updated);
      await deps.audit.record("assessment.rules.updated", {
        assessment_id: assessmentId,
        tenant_id: resolvedTenantId,
        trace_id: traceId,
        config
      });
      
      return json({ data: updated, trace_id: traceId });
    }
  }
];


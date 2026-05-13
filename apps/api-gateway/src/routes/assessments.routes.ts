import { CreateAssessmentRequestSchema, UpdateAssessmentRequestSchema, type ComplianceGateResponse, type ComplianceGateStatus } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, newId, parseJson, routeParam } from "../http";
import { assessmentResponse, lifecycleEventResponse } from "../presenters";

export const assessmentsRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments",
    protected: true,
    requireActor: true,
    bodySchema: CreateAssessmentRequestSchema,
    handler: async ({ validatedBody, deps, tenantId, traceId }) => {
      const body = validatedBody as import("@standard/schemas").CreateAssessmentRequest;
      const organization = await deps.organizations.get(body.organization_id, tenantId!);
      if (!organization) throw new ApiError("NOT_FOUND", "Organization not found.", 404);

      const assessment = await deps.assessments.create({
        assessment_id: newId(),
        tenant_id: tenantId!,
        organization_id: body.organization_id,
        name: body.name,
        scf_version_id: body.scf_version_id,
        documentCount: body.document_count,
        trace_id: traceId
      });

      return json(assessmentResponse(assessment), { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId",
    protected: true,
    handler: async ({ deps, params, tenantId }) => {
      const assessment = await deps.assessments.get(routeParam(params, "assessmentId"), tenantId!);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      return json(assessmentResponse(assessment));
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments",
    protected: true,
    handler: async ({ deps, tenantId, traceId }) => {
      const assessments = await deps.assessments.listAll(tenantId!);
      return json({ data: assessments.map(assessmentResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/assessments",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const assessments = await deps.assessments.listByOrganization(routeParam(params, "organizationId"), tenantId!);
      return json({ data: assessments.map(assessmentResponse), trace_id: traceId });
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
      const assessment = await deps.assessments.get(routeParam(params, "assessmentId"), tenantId!);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      const updated = { ...assessment, name: body.name ?? assessment.name };
      await deps.assessments.save(updated);
      return json(assessmentResponse(updated));
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/status",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const assessment = await deps.assessments.get(routeParam(params, "assessmentId"), tenantId!);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
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
      const assessmentId = routeParam(params, "assessmentId");
      const assessment = await deps.assessments.get(assessmentId, tenantId!);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      const events = await deps.lifecycleEvents.listByAssessment(assessmentId, tenantId!);
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
      const assessmentId = routeParam(params, "assessmentId");
      const assessment = await deps.assessments.get(assessmentId, tenantId!);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      // Find latest approved gap analysis version
      const versions = await deps.gapAnalysis.repositories.gapVersions.listByAssessment(assessmentId, tenantId!);
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

      const findings = await deps.gapAnalysis.repositories.gapFindings.listByVersion(approved.gap_analysis_version_id, tenantId!);
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
  }
];


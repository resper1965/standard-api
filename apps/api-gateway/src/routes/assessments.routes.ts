import {
  AssessmentTimelineResponseSchema,
  AssessmentStatusResponseSchema,
  AssessmentResponseSchema,
  z,
  CreateAssessmentRequestSchema,
  UpdateAssessmentRequestSchema,
  type ComplianceGateResponse,
  type ComplianceGateStatus,
} from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import {
  json,
  newId,
  parseJson,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";
import { assessmentResponse, lifecycleEventResponse } from "../presenters";


/**
 * Asserts that the fetched resource belongs to the request's resolved tenant.
 * Prevents IDOR attacks across tenant boundaries.
 *
 * Behaviour:
 * - If resourceTenantId is absent/null/empty â†’ FORBIDDEN (data anomaly, never trust)
 * - If resourceTenantId !== resolvedTenantId â†’ FORBIDDEN (cross-tenant access)
 * - If they match â†’ pass
 *
 * AGENTS.md Â§13: Tenant isolation must be enforced at every resource access.
 */
function assertTenantOwnership(
  resourceTenantId: string | undefined | null,
  resolvedTenantId: string,
  resourceType = "Assessment",
): void {
  // !resourceTenantId covers undefined, null and empty string â€”
  // all are treated as FORBIDDEN (corrupted data must never pass the guard).
  if (!resourceTenantId || resourceTenantId !== resolvedTenantId) {
    throw new ApiError(
      "FORBIDDEN",
      `${resourceType} does not belong to the current tenant.`,
      403,
    );
  }
}

const AssessmentAutomationConfigSchema = z
  .object({
    agents_enabled: z.array(z.string()).optional(),
    auto_remediation: z.boolean().optional(),
    approval_gates: z.boolean().optional(),
    schedule: z.string().optional(),
  })
  .openapi("AssessmentAutomationConfig");

export const assessmentsRoutes: RouteDefinition[] = [
  {
    method: "POST",
    idempotencyRequired: true,
    path: "/api/v1/assessments",
    protected: true,
    requireActor: true,
    permissions: ["assessment:create"],
    bodySchema: CreateAssessmentRequestSchema,
    handler: async ({ validatedBody, deps, organizationId, traceId }) => {
      const body =
        validatedBody as import("@standard/schemas").CreateAssessmentRequest;

      // Bridge Standard Native Auth text ID â†’ Standard domain UUID context
      const standardAuthOrgId =
        body.organization_id ?? requireOrganizationId({ organizationId });
      if (!deps.resolveOrganizationContext) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Tenant mapping not configured.",
          500,
        );
      }
      const ctx = await deps.resolveOrganizationContext(standardAuthOrgId);
      if (!ctx) {
        throw new ApiError(
          "NOT_FOUND",
          `Organization "${standardAuthOrgId}" not found in Standard Native Auth. Please create an organization first.`,
          404,
        );
      }

      const tenantDb = deps.assessments.withOrganization(ctx.organization_id);
      const assessment = await tenantDb.create({
        assessment_id: newId(),
        name: body.name,
        scf_version_id: body.scf_version_id,
        documentCount: body.document_count,
        trace_id: traceId,
      });

      const version = await deps.scf.versions.getVersion(
        assessment.scf_version_id,
      );
      const res = assessmentResponse(assessment);
      if (version) res.scf_version_label = version.version_label;

      return json(res, { status: 201 });
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId }) => {
      const resolvedTenantId = requireOrganizationId({ organizationId });

      const tenantDb = deps.assessments.withOrganization(resolvedTenantId);
      const assessment = await tenantDb.get(
        routeUuidParam(params, "assessmentId"),
      );
      if (!assessment)
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.organization_id, resolvedTenantId);

      const version = await deps.scf.versions.getVersion(
        assessment.scf_version_id,
      );
      const res = assessmentResponse(assessment);
      if (version) res.scf_version_label = version.version_label;

      return json(res);
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, organizationId, traceId }) => {
      const resolvedTenantId = requireOrganizationId({ organizationId });

      const tenantDb = deps.assessments.withOrganization(resolvedTenantId);
      const assessments = await tenantDb.listAll();
      const versions = await deps.scf.versions.listVersions();
      const versionMap = new Map(versions.map((v) => [v.id, v.version_label]));
      const enriched = assessments.map((a) => {
        const res = assessmentResponse(a);
        const label = versionMap.get(a.scf_version_id);
        if (label) res.scf_version_label = label;
        return res;
      });
      return json({ data: enriched, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/assessments",
      openapi: {
        tags: ["Assessments"],
        summary: "List Assessments by Organization",
        description: "Lists all assessments for a specific organization.",
        responses: {
          200: {
            description: "List of Assessments",
            content: { "application/json": { schema: z.object({ data: z.array(AssessmentResponseSchema), trace_id: z.string() }) } }
          }
        }
      },
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const resolvedTenantId = requireOrganizationId({ organizationId });

      const tenantDb = deps.assessments.withOrganization(resolvedTenantId);
      const assessments = await tenantDb.listByOrganization(
        routeUuidParam(params, "organizationId"),
      );
      const versions = await deps.scf.versions.listVersions();
      const versionMap = new Map(versions.map((v) => [v.id, v.version_label]));
      const enriched = assessments.map((a) => {
        const res = assessmentResponse(a);
        const label = versionMap.get(a.scf_version_id);
        if (label) res.scf_version_label = label;
        return res;
      });
      return json({ data: enriched, trace_id: traceId });
    },
  },
  {
    method: "PATCH",
    path: "/api/v1/assessments/:assessmentId",
    protected: true,
    requireActor: true,
    permissions: ["assessment:update"],
    bodySchema: UpdateAssessmentRequestSchema,
    handler: async ({ validatedBody, deps, params, organizationId }) => {
      const body =
        validatedBody as import("@standard/schemas").UpdateAssessmentRequest;
      const resolvedTenantId = requireOrganizationId({ organizationId });
      const tenantDb = deps.assessments.withOrganization(resolvedTenantId);
      const assessment = await tenantDb.get(
        routeUuidParam(params, "assessmentId"),
      );
      if (!assessment)
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.organization_id, resolvedTenantId);

      const updated = { ...assessment, name: body.name ?? assessment.name };
      await tenantDb.save(updated);

      const version = await deps.scf.versions.getVersion(
        updated.scf_version_id,
      );
      const res = assessmentResponse(updated);
      if (version) res.scf_version_label = version.version_label;

      return json(res);
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/status",
      openapi: {
        tags: ["Assessments"],
        summary: "Get Assessment Status",
        description: "Retrieves the current lifecycle status and phase of an assessment.",
        responses: {
          200: {
            description: "Assessment Status",
            content: { "application/json": { schema: z.intersection(AssessmentStatusResponseSchema, z.object({ trace_id: z.string() })) } }
          }
        }
      },
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const resolvedTenantId = requireOrganizationId({ organizationId });
      const tenantDb = deps.assessments.withOrganization(resolvedTenantId);
      const assessment = await tenantDb.get(
        routeUuidParam(params, "assessmentId"),
      );
      if (!assessment)
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.organization_id, resolvedTenantId);
      return json({
        assessment_id: assessment.assessment_id,
        organization_id: assessment.organization_id,
        state: assessment.snapshot.state,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/timeline",
      openapi: {
        tags: ["Assessments"],
        summary: "Get Assessment Timeline",
        description: "Retrieves the chronological timeline of events for an assessment.",
        responses: {
          200: {
            description: "Assessment Timeline",
            content: { "application/json": { schema: z.intersection(AssessmentTimelineResponseSchema, z.object({ trace_id: z.string() })) } }
          }
        }
      },
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const resolvedTenantId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "assessmentId");
      const tenantDb = deps.assessments.withOrganization(resolvedTenantId);
      const assessment = await tenantDb.get(assessmentId);
      if (!assessment)
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.organization_id, resolvedTenantId);
      const events = await deps.lifecycleEvents.listByAssessment(
        assessmentId,
        resolvedTenantId,
      );
      return json({
        assessment_id: assessment.assessment_id,
        organization_id: assessment.organization_id,
        events: events.map(lifecycleEventResponse),
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/compliance-gate",
      openapi: {
        tags: ["Assessments"],
        summary: "Evaluate Compliance Gate",
        description: "Evaluates if the assessment meets all requirements to pass its current gate.",
        responses: {
          200: {
            description: "Compliance Gate Status",
            content: { "application/json": { schema: z.any() } }
          }
        }
      },
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const resolvedTenantId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "assessmentId");
      const tenantDb = deps.assessments.withOrganization(resolvedTenantId);
      const assessment = await tenantDb.get(assessmentId);
      if (!assessment)
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(assessment.organization_id, resolvedTenantId);

      // Find latest approved gap analysis version
      const versions =
        await deps.gapAnalysis.repositories.gapVersions.listByAssessment(
          assessmentId,
          resolvedTenantId,
        );
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
          findings_summary:
            "No approved gap analysis found for this assessment.",
          checked_at: new Date().toISOString(),
          trace_id: traceId,
        };
        return json(gate);
      }

      const findings =
        await deps.gapAnalysis.repositories.gapFindings.listByVersion(
          approved.gap_analysis_version_id,
          resolvedTenantId,
        );
      const critical = findings.filter((f) => f.severity === "critical").length;
      const high = findings.filter((f) => f.severity === "high").length;
      const total = findings.length;

      const status: ComplianceGateStatus =
        critical > 0 ? "fail" : high > 3 ? "fail" : "pass";

      const gate: ComplianceGateResponse = {
        gate_id: newId(),
        assessment_id: assessmentId,
        framework_id: approved.framework_id,
        status,
        critical_findings: critical,
        high_findings: high,
        total_findings: total,
        gap_analysis_version_id: approved.gap_analysis_version_id,
        findings_summary:
          status === "pass"
            ? `Assessment passes compliance gate. ${total} findings, none critical.`
            : `Assessment BLOCKED: ${critical} critical, ${high} high findings require remediation.`,
        checked_at: new Date().toISOString(),
        trace_id: traceId,
      };

      // Best-effort webhook dispatch for CI/CD subscribers
      if (deps.webhooks) {
        try {
          const subscribers = await deps.webhooks.findSubscribers(
            assessment.organization_id,
            "compliance.gate.evaluated",
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
              created_at: new Date().toISOString(),
            });
          }
        } catch {
          // Non-blocking â€” webhook delivery is best-effort
        }
      }

      return json(gate);
    },
  },
  {
    method: "PUT",
    path: "/api/v1/assessments/:assessmentId/automation-rules",
      openapi: {
        tags: ["Assessments"],
        summary: "Update Automation Rules",
        description: "Updates the automation execution rules for an assessment.",
        responses: {
          200: {
            description: "Updated Assessment",
            content: { "application/json": { schema: z.intersection(AssessmentResponseSchema, z.object({ trace_id: z.string() })) } }
          }
        }
      },
    protected: true,
    requireActor: true,
    permissions: ["assessment:update"],
    bodySchema: AssessmentAutomationConfigSchema,
    handler: async ({
      validatedBody,
      deps,
      params,
      organizationId,
      traceId,
    }) => {
      const resolvedTenantId = requireOrganizationId({ organizationId });

      const assessmentId = routeUuidParam(params, "assessmentId");
      const assessment = await deps.assessments
        .withOrganization(resolvedTenantId)
        .get(assessmentId);

      if (!assessment) {
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      }
      assertTenantOwnership(assessment.organization_id, resolvedTenantId);

      // Instead of changing the schema natively, we'll embed the config in snapshot.automation_config
      // to keep it within the existing AssessmentRecord bounds without schema migrations
      const config = validatedBody as import("zod").infer<
        typeof AssessmentAutomationConfigSchema
      >;

      const snapshot = assessment.snapshot || {};
      (snapshot as any).automation_config = config;

      const updated = {
        ...assessment,
        snapshot,
        trace_id: traceId,
      };

      await deps.assessments
        .withOrganization(updated.organization_id)
        .save(updated);
      await deps.audit.record("assessment.rules.updated", {
        assessment_id: assessmentId,
        organization_id: resolvedTenantId,
        trace_id: traceId,
        config,
      });

      return json({ data: updated, trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/new-cycle",
      openapi: {
        tags: ["Assessments"],
        summary: "Start New Assessment Cycle",
        description: "Clones an existing assessment into a new assessment cycle.",
        responses: {
          201: {
            description: "New Assessment Cycle",
            content: { "application/json": { schema: z.intersection(AssessmentResponseSchema, z.object({ trace_id: z.string() })) } }
          }
        }
      },
    protected: true,
    requireActor: true,
    permissions: ["assessment:create"],
    handler: async ({ deps, params, organizationId, actorId, traceId }) => {
      const resolvedTenantId = requireOrganizationId({ organizationId });
      const parentId = routeUuidParam(params, "assessmentId");

      const tenantDb = deps.assessments.withOrganization(resolvedTenantId);
      const parent = await tenantDb.get(parentId);
      if (!parent)
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      assertTenantOwnership(parent.organization_id, resolvedTenantId);

      // Only closed assessments can start a new cycle (AGENTS.md Â§11: closed is terminal and immutable)
      if (parent.snapshot.state !== "closed") {
        throw new ApiError(
          "VALIDATION_ERROR",
          `Only closed assessments can start a new cycle. Current state: ${parent.snapshot.state}`,
          400,
        );
      }

      // Resolve the latest approved SoA version for this assessment (carries forward as baseline)
      const soaVersions =
        await deps.gapAnalysis.repositories.gapVersions.listByAssessment(
          parentId,
          resolvedTenantId,
        );
      const latestApprovedGap = soaVersions
        .filter((v) => v.status === "approved")
        .sort((a, b) => b.version_number - a.version_number)[0];

      const cycleNumber = (parent.cycle_number ?? 1) + 1;
      const newAssessment = await tenantDb.create({
        assessment_id: newId(),
        name: `${parent.name} â€” Cycle ${cycleNumber}`,
        scf_version_id: parent.scf_version_id,
        parent_assessment_id: parentId,
        cycle_number: cycleNumber,
        baseline_soa_version_id:
          latestApprovedGap?.gap_analysis_version_id ?? null,
        trace_id: traceId,
        documentCount: 0,
      });

      await deps.audit.record("assessment.cycle.started", {
        organization_id: resolvedTenantId,
        parent_assessment_id: parentId,
        new_assessment_id: newAssessment.assessment_id,
        cycle_number: cycleNumber,
        actor_id: actorId,
        trace_id: traceId,
      });

      const res = assessmentResponse(newAssessment);
      return json(
        {
          ...res,
          parent_assessment_id: parentId,
          cycle_number: cycleNumber,
          baseline_soa_version_id:
            latestApprovedGap?.gap_analysis_version_id ?? null,
        },
        { status: 201 },
      );
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/live",
      openapi: {
        tags: ["Assessments"],
        summary: "Live Collaboration Channel",
        description: "WebSocket connection for live collaboration on an assessment.",
        responses: {
          101: {
            description: "Switching Protocols (WebSocket)"
          }
        }
      },
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ request, env, params }) => {
      if (!env?.ASSESSMENT_SESSION_DO) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Live assessments are not configured.",
          500,
        );
      }

      const id = env.ASSESSMENT_SESSION_DO.idFromName(
        routeUuidParam(params, "assessmentId"),
      );
      const stub = env.ASSESSMENT_SESSION_DO.get(id);

      return stub.fetch(request);
    },
  },
];

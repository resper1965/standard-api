import { CreateAssessmentRequestSchema, UpdateAssessmentRequestSchema } from "@standard/schemas";
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
    handler: async ({ request, deps, tenantId, traceId }) => {
      const body = await parseJson(request, CreateAssessmentRequestSchema);
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
    handler: async ({ request, deps, params, tenantId }) => {
      const body = await parseJson(request, UpdateAssessmentRequestSchema);
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
  }
];


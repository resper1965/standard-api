import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import { ApiError } from "../errors/api-error";
import { UpsertCdpasAssessmentFindingSchema } from "@standard/schemas";

export const cdpasRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/cdpas/standards",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, request, traceId }) => {
      const url = new URL(request.url);
      const scfVersionId = url.searchParams.get("scf_version") ?? undefined;
      const standards = await (deps as any).cdpas.listStandards(scfVersionId);
      return json({ data: standards, total: standards.length, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/cdpas/standards/:standardId/sub-requirements",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const standardId = routeParam(params, "standardId");
      const subReqs = await (deps as any).cdpas.listSubRequirements(standardId);
      return json({ data: subReqs, total: subReqs.length, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/cdpas/sub-requirements/:subReqId",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const subReqId = routeParam(params, "subReqId");
      const subReq = await (deps as any).cdpas.getSubRequirement(subReqId);
      if (!subReq) throw new ApiError("NOT_FOUND", "CDPAS sub-requirement not found.", 404);
      return json({ ...subReq, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/cdpas/findings",
    protected: true,
    requireActor: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const assessmentId = routeParam(params, "assessmentId");
      const findings = await (deps as any).cdpas.listFindings(organizationId, assessmentId);
      return json({ data: findings, total: findings.length, trace_id: traceId });
    },
  },
  {
    method: "PUT",
    path: "/api/v1/assessments/:assessmentId/cdpas/findings/:subReqId",
    protected: true,
    requireActor: true,
    permissions: ["assessment:write"],
    handler: async ({ deps, params, request, organizationId, actorId, traceId }) => {
      const assessmentId = routeParam(params, "assessmentId");
      const subReqId = routeParam(params, "subReqId");
      const body = await parseJson(request, UpsertCdpasAssessmentFindingSchema);
      const finding = await (deps as any).cdpas.upsertFinding(organizationId, assessmentId, subReqId, actorId, body);
      return json({ ...finding, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/cdpas/summary",
    protected: true,
    requireActor: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const assessmentId = routeParam(params, "assessmentId");
      const summary = await (deps as any).cdpas.getSummary(organizationId, assessmentId);
      return json({ ...summary, trace_id: traceId });
    },
  },
];

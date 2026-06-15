// @ts-nocheck -- Zod v4 CI type compat
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import { ApiError } from "../errors/api-error";
import {
  CreateMadTransactionAssessmentSchema,
  UpsertMadMaturityScoreSchema,
} from "@standard/schemas";

export const madRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/mad/standards",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, request, traceId }) => {
      const url = new URL(request.url);
      const scfVersionId = url.searchParams.get("scf_version") ?? undefined;
      const phase = url.searchParams.get("phase") ?? undefined;
      const standards = await (deps as any).mad.listStandards(
        scfVersionId,
        phase,
      );
      return json({
        data: standards,
        total: standards.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/mad/standards/:standardId/sub-requirements",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const standardId = routeParam(params, "standardId");
      const subReqs = await (deps as any).mad.listSubRequirements(standardId);
      return json({ data: subReqs, total: subReqs.length, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/mad/sub-requirements/:subReqId/maturity-criteria",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const subReqId = routeParam(params, "subReqId");
      const criteria = await (deps as any).mad.getMaturityCriteria(subReqId);
      return json({ data: criteria, trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/mad/transaction-assessments",
    protected: true,
    requireActor: true,
    permissions: ["assessment:create"],
    handler: async ({ deps, request, organizationId, actorId, traceId }) => {
      const body = await parseJson(
        request,
        CreateMadTransactionAssessmentSchema,
      );
      const ta = await (deps as any).mad.createTransactionAssessment(
        organizationId,
        actorId,
        body,
      );
      return json({ ...ta, trace_id: traceId }, { status: 201 });
    },
  },
  {
    method: "GET",
    path: "/api/v1/mad/transaction-assessments",
    protected: true,
    requireActor: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, organizationId, request, traceId }) => {
      const url = new URL(request.url);
      const limit = url.searchParams.get("limit")
        ? parseInt(url.searchParams.get("limit")!, 10)
        : 50;
      const offset = url.searchParams.get("offset")
        ? parseInt(url.searchParams.get("offset")!, 10)
        : 0;
      const tas = await (deps as any).mad.listTransactionAssessments(
        organizationId,
        limit,
        offset,
      );
      return json({ data: tas, total: tas.length, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/mad/transaction-assessments/:taId",
    protected: true,
    requireActor: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const taId = routeParam(params, "taId");
      const ta = await (deps as any).mad.getTransactionAssessment(
        organizationId,
        taId,
      );
      if (!ta)
        throw new ApiError(
          "NOT_FOUND",
          "Transaction assessment not found.",
          404,
        );
      return json({ ...ta, trace_id: traceId });
    },
  },
  {
    method: "PUT",
    path: "/api/v1/mad/transaction-assessments/:taId/scores/:subReqId",
    protected: true,
    requireActor: true,
    permissions: ["assessment:update"],
    handler: async ({
      deps,
      params,
      request,
      organizationId,
      actorId,
      traceId,
    }) => {
      const taId = routeParam(params, "taId");
      const subReqId = routeParam(params, "subReqId");
      const body = await parseJson(request, UpsertMadMaturityScoreSchema);
      const score = await (deps as any).mad.upsertMaturityScore(
        organizationId,
        taId,
        subReqId,
        actorId,
        body,
      );
      return json({ ...score, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/mad/transaction-assessments/:taId/summary",
    protected: true,
    requireActor: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const taId = routeParam(params, "taId");
      const summary = await (deps as any).mad.getMaturitySummary(
        organizationId,
        taId,
      );
      return json({ ...summary, trace_id: traceId });
    },
  },
];

import { executeTransition, getAllowedNextStates } from "@standard/assessment-engine";
import {
  ApprovePoamRequestSchema,
  CreatePoamDraftRequestSchema,
  CreatePoamMilestoneRequestSchema,
  PoamApprovalService,
  PoamDraftService,
  PoamMilestoneService,
  PoamReviewService,
  PoamValidationService,
  PoamWorkflowError,
  RegeneratePoamRequestSchema,
  SubmitPoamReviewRequestSchema,
  UpdatePoamItemRequestSchema,
  UpdatePoamMilestoneRequestSchema
} from "@standard/poam";
import { ApiError } from "../errors/api-error";
import type { ApiErrorCode } from "../errors/error-codes";
import type { AppDependencies, AssessmentRecord, RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import { parsePagination, applyPagination } from "../utils/pagination";

const toApiError = (error: unknown): never => {
  if (error instanceof PoamWorkflowError) {
    const status = error.code.endsWith("_NOT_FOUND") ? 404 : error.code.includes("APPROVAL") || error.code.includes("IMMUTABLE") || error.code.includes("REVIEW_BLOCKED") ? 409 : 400;
    throw new ApiError(error.code as ApiErrorCode, error.message.replace(`${error.code}: `, ""), status, [error.details]);
  }
  throw error;
};

const requireAssessment = async (deps: AppDependencies, assessmentId: string, tenantId: string): Promise<AssessmentRecord> => {
  const assessment = await deps.assessments.get(assessmentId, tenantId);
  if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
  return assessment;
};

const contextFor = (assessment: AssessmentRecord, traceId: string, actorId?: string) => ({
  tenantId: assessment.tenant_id,
  organizationId: assessment.organization_id,
  assessmentId: assessment.assessment_id,
  ...(actorId ? { actorId } : {}),
  traceId
});

const applyTransitionIfAllowed = async (
  deps: AppDependencies,
  assessment: AssessmentRecord,
  nextState: AssessmentRecord["snapshot"]["state"],
  traceId: string,
  actorId: string,
  approvalEvent?: Parameters<typeof executeTransition>[2]["approvalEvent"]
): Promise<void> => {
  if (!getAllowedNextStates(assessment.snapshot.state).includes(nextState)) return;
  const result = executeTransition(assessment.snapshot, nextState, {
    tenantId: assessment.tenant_id,
    organizationId: assessment.organization_id,
    assessmentId: assessment.assessment_id,
    actorId,
    reason: `POA&M workflow advanced to ${nextState}.`,
    traceId,
    occurredAt: new Date().toISOString(),
    ...(approvalEvent ? { approvalEvent } : {})
  });
  assessment.snapshot = result.assessment;
  assessment.trace_id = traceId;
  await deps.assessments.save(assessment);
  await deps.lifecycleEvents.record(result.event);
};

const cleanObject = <T extends Record<string, unknown>>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;

const summarize = async (deps: AppDependencies, poamVersionId: string, tenantId: string, traceId: string) => {
  const version = await deps.poam.repositories.versions.get(poamVersionId, tenantId);
  if (!version) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
  const items = await deps.poam.repositories.items.listByVersion(poamVersionId, tenantId);
  const count = (key: keyof typeof items[number]) => items.reduce<Record<string, number>>((acc, item) => {
    const value = String(item[key] ?? "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  return {
    assessment_id: version.assessment_id,
    poam_version_id: poamVersionId,
    total_items: items.length,
    by_priority: count("priority"),
    by_status: count("status"),
    by_action_type: count("action_type"),
    trace_id: traceId
  };
};

export const poamRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/poam/draft",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const body = await parseJson(request, CreatePoamDraftRequestSchema);
      try {
        const draftOptions = {
          include_optional_improvements: body.include_optional_improvements,
          ...(body.maturity_assessment_version_id ? { maturity_assessment_version_id: body.maturity_assessment_version_id } : {})
        };
        const draft = await new PoamDraftService(deps.poam).createPoamDraft(assessment.assessment_id, body.gap_analysis_version_id, draftOptions, contextFor(assessment, traceId, actorId!));
        await applyTransitionIfAllowed(deps, assessment, "poam_drafted", traceId, actorId!);
        return json(draft, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/poam",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      return json({ data: await new PoamDraftService(deps.poam).listPoamVersions(assessment.assessment_id, contextFor(assessment, traceId)), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/poam-summary",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const versions = await deps.poam.repositories.versions.listByAssessment(assessment.assessment_id, tenantId!);
      const latest = versions.at(-1);
      if (!latest) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
      return json(await summarize(deps, latest.poam_version_id, tenantId!, traceId));
    }
  },
  {
    method: "GET",
    path: "/api/v1/poam/:poamVersionId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const version = await deps.poam.repositories.versions.get(routeParam(params, "poamVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
      return json({ ...version, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/poam/:poamVersionId/items",
    protected: true,
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const version = await deps.poam.repositories.versions.get(routeParam(params, "poamVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
      const url = new URL(request.url);
      const page = parsePagination(request);
      const data = await deps.poam.repositories.items.listByVersion(version.poam_version_id, tenantId!, cleanObject({
        priority: url.searchParams.get("priority") ?? undefined,
        severity: url.searchParams.get("severity") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        action_type: url.searchParams.get("action_type") ?? undefined,
        owner_role: url.searchParams.get("owner_role") ?? undefined,
        requires_validation: url.searchParams.has("requires_validation") ? url.searchParams.get("requires_validation") === "true" : undefined
      }) as never);
      const result = applyPagination(data, page, "poam_item_id");
      return json({ data: result.data, pagination: result.pagination, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/poam/:poamVersionId/summary",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => json(await summarize(deps, routeParam(params, "poamVersionId"), tenantId!, traceId))
  },
  {
    method: "GET",
    path: "/api/v1/poam-items/:poamItemId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const item = await deps.poam.repositories.items.get(routeParam(params, "poamItemId"), tenantId!);
      if (!item) throw new ApiError("NOT_FOUND", "POA&M item not found.", 404);
      return json({ ...item, trace_id: traceId });
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/poam-items/:poamItemId",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const item = await deps.poam.repositories.items.get(routeParam(params, "poamItemId"), tenantId!);
      if (!item) throw new ApiError("NOT_FOUND", "POA&M item not found.", 404);
      // Immutability guard: reject mutations on approved versions
      const parentVersion = await deps.poam.repositories.versions.get(item.poam_version_id, tenantId!);
      if (parentVersion && parentVersion.status === "approved") {
        throw new ApiError("CONFLICT", "Cannot modify items in an approved POA&M version. Create a new draft instead.", 409);
      }
      const assessment = await requireAssessment(deps, item.assessment_id, tenantId!);
      const body = await parseJson(request, UpdatePoamItemRequestSchema);
      try {
        return json(await new PoamReviewService(deps.poam).updatePoamItem(item.poam_item_id, body, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/poam-items/:poamItemId/milestones",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const item = await deps.poam.repositories.items.get(routeParam(params, "poamItemId"), tenantId!);
      if (!item) throw new ApiError("NOT_FOUND", "POA&M item not found.", 404);
      const assessment = await requireAssessment(deps, item.assessment_id, tenantId!);
      return json({ data: await new PoamMilestoneService(deps.poam).listMilestones(item.poam_item_id, contextFor(assessment, traceId)), trace_id: traceId });
    }
  },
  {
    method: "POST",
    path: "/api/v1/poam-items/:poamItemId/milestones",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const item = await deps.poam.repositories.items.get(routeParam(params, "poamItemId"), tenantId!);
      if (!item) throw new ApiError("NOT_FOUND", "POA&M item not found.", 404);
      const assessment = await requireAssessment(deps, item.assessment_id, tenantId!);
      const body = await parseJson(request, CreatePoamMilestoneRequestSchema);
      try {
        return json(await new PoamMilestoneService(deps.poam).createMilestone(item.poam_item_id, body, contextFor(assessment, traceId, actorId!)), { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/poam-milestones/:milestoneId",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const milestone = await deps.poam.repositories.milestones.get(routeParam(params, "milestoneId"), tenantId!);
      if (!milestone) throw new ApiError("NOT_FOUND", "POA&M milestone not found.", 404);
      // Immutability guard: reject mutations on approved versions (look up via parent item)
      const parentItem = await deps.poam.repositories.items.get(milestone.poam_item_id, tenantId!);
      if (parentItem) {
        const parentVersion = await deps.poam.repositories.versions.get(parentItem.poam_version_id, tenantId!);
        if (parentVersion && parentVersion.status === "approved") {
          throw new ApiError("CONFLICT", "Cannot modify milestones in an approved POA&M version. Create a new draft instead.", 409);
        }
      }
      const assessment = await requireAssessment(deps, milestone.assessment_id, tenantId!);
      const body = await parseJson(request, UpdatePoamMilestoneRequestSchema);
      try {
        return json(await new PoamMilestoneService(deps.poam).updateMilestone(milestone.poam_milestone_id, body, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/poam/:poamVersionId/validate",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const version = await deps.poam.repositories.versions.get(routeParam(params, "poamVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      return json(await new PoamValidationService(deps.poam).validatePoamForReview(version.poam_version_id, contextFor(assessment, traceId)));
    }
  },
  {
    method: "POST",
    path: "/api/v1/poam/:poamVersionId/submit-review",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.poam.repositories.versions.get(routeParam(params, "poamVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, SubmitPoamReviewRequestSchema);
      try {
        const submitted = await new PoamReviewService(deps.poam).submitPoamForReview(version.poam_version_id, contextFor(assessment, traceId, actorId!), body.exception_rationale);
        await applyTransitionIfAllowed(deps, assessment, "poam_under_review", traceId, actorId!);
        return json(submitted);
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/poam/:poamVersionId/approve",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.poam.repositories.versions.get(routeParam(params, "poamVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, ApprovePoamRequestSchema);
      try {
        const approvalEvent = await deps.approvals.getForGate(body.approval_event_id, "poam");
        if (!approvalEvent || approvalEvent.approvedBy !== actorId) throw new ApiError("APPROVAL_REQUIRED", "Valid human POA&M approval_event is required.", 409);
        const approved = await new PoamApprovalService(deps.poam).approvePoam(version.poam_version_id, body, contextFor(assessment, traceId, actorId!));
        await applyTransitionIfAllowed(deps, assessment, "poam_approved", traceId, actorId!, approvalEvent);
        return json(approved);
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/poam/:poamVersionId/regenerate",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.poam.repositories.versions.get(routeParam(params, "poamVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, RegeneratePoamRequestSchema);
      try {
        return json(await new PoamDraftService(deps.poam).regeneratePoamDraft(version.poam_version_id, body, contextFor(assessment, traceId, actorId!)), { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/poam/:poamVersionId/items/bulk-update",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.poam.repositories.versions.get(routeParam(params, "poamVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, UpdatePoamItemRequestSchema);
      try {
        return json({ data: await new PoamReviewService(deps.poam).bulkUpdatePoamItems(version.poam_version_id, body, contextFor(assessment, traceId, actorId!)), trace_id: traceId });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/poam/:poamVersionId/dependencies/detect",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const version = await deps.poam.repositories.versions.get(routeParam(params, "poamVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "POA&M version not found.", 404);
      return json({ data: [], message: "Dependency detection runs during draft generation in MVP.", trace_id: traceId });
    }
  }
];


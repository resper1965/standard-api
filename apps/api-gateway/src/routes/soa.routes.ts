import { executeTransition, getAllowedNextStates } from "@standard/assessment-engine";
import {
  ApproveSoaRequestSchema,
  CreateScopeRequestSchema,
  CreateSoaDraftRequestSchema,
  RefreshSoaEvidenceRequestSchema,
  ScopeService,
  SoaApprovalService,
  SoaDraftService,
  SoaEvidenceService,
  SoaReviewService,
  SoaWorkflowError,
  SubmitSoaReviewRequestSchema,
  UpdateScopeRequestSchema,
  UpdateSoaItemRequestSchema
} from "@standard/soa";
import { ApiError } from "../errors/api-error";
import type { ApiErrorCode } from "../errors/error-codes";
import type { AppDependencies, AssessmentRecord, RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import { parsePagination, applyPagination } from "../utils/pagination";

const toApiError = (error: unknown): never => {
  if (error instanceof SoaWorkflowError) {
    throw new ApiError(error.code as ApiErrorCode, error.message.replace(`${error.code}: `, ""), error.code.endsWith("_NOT_FOUND") ? 404 : 400, [error.details]);
  }
  throw error;
};

const requireAssessment = async (deps: AppDependencies, assessmentId: string, tenantId: string): Promise<AssessmentRecord> => {
  const tenantAssessmentsDb = deps.assessments.withTenant(tenantId);
  const assessment = await tenantAssessmentsDb.get(assessmentId);
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
    reason: `SoA workflow advanced to ${nextState}.`,
    traceId,
    occurredAt: new Date().toISOString(),
    ...(approvalEvent ? { approvalEvent } : {})
  });
  assessment.snapshot = result.assessment;
  assessment.trace_id = traceId;
  await deps.assessments.withTenant(assessment.tenant_id).save(assessment);
  await deps.lifecycleEvents.withTenant(assessment.tenant_id).record(result.event);
};

export const soaRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/scope",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const body = await parseJson(request, CreateScopeRequestSchema);
      try {
        const scope = await new ScopeService(deps.soa).createDraftScope(body, contextFor(assessment, traceId, actorId!));
        assessment.snapshot.scopeDrafted = true;
        await deps.assessments.withTenant(assessment.tenant_id).save(assessment);
        await applyTransitionIfAllowed(deps, assessment, "scope_drafted", traceId, actorId!);
        return json(scope, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/scope",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const data = await new ScopeService(deps.soa).listScopes(assessment.assessment_id, contextFor(assessment, traceId));
      return json({ data, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scopes/:scopeId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const scopes = await deps.soa.repositories.scopes.listByAssessment("", tenantId!);
      const direct = await deps.soa.repositories.scopes.get(routeParam(params, "scopeId"), tenantId!);
      void scopes;
      if (!direct) throw new ApiError("NOT_FOUND", "Scope not found.", 404);
      return json({ ...direct, trace_id: traceId });
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/scopes/:scopeId",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const direct = await deps.soa.repositories.scopes.get(routeParam(params, "scopeId"), tenantId!);
      if (!direct) throw new ApiError("NOT_FOUND", "Scope not found.", 404);
      const assessment = await requireAssessment(deps, direct.assessment_id, tenantId!);
      const body = await parseJson(request, UpdateScopeRequestSchema);
      try {
        return json(await new ScopeService(deps.soa).updateDraftScope(direct.scope_id, body, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/scopes/:scopeId/submit-review",
    protected: true,
    requireActor: true,
    handler: async ({ deps, params, tenantId, actorId, traceId }) => {
      const scope = await deps.soa.repositories.scopes.get(routeParam(params, "scopeId"), tenantId!);
      if (!scope) throw new ApiError("NOT_FOUND", "Scope not found.", 404);
      const assessment = await requireAssessment(deps, scope.assessment_id, tenantId!);
      try {
        return json(await new ScopeService(deps.soa).submitScopeForReview(scope.scope_id, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/scopes/:scopeId/approve",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const scope = await deps.soa.repositories.scopes.get(routeParam(params, "scopeId"), tenantId!);
      if (!scope) throw new ApiError("NOT_FOUND", "Scope not found.", 404);
      const assessment = await requireAssessment(deps, scope.assessment_id, tenantId!);
      const body = await parseJson(request, ApproveSoaRequestSchema);
      try {
        return json(await new ScopeService(deps.soa).approveScope(scope.scope_id, body, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/soa/draft",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const body = await parseJson(request, CreateSoaDraftRequestSchema);
      try {
        const draft = await new SoaDraftService(deps.soa).createDraftFromFramework(assessment.assessment_id, body.framework_id, body.scf_version_id, contextFor(assessment, traceId, actorId!));
        assessment.snapshot.soaDraftVersionComplete = true;
        await deps.assessments.withTenant(assessment.tenant_id).save(assessment);
        await applyTransitionIfAllowed(deps, assessment, "soa_drafted", traceId, actorId!);
        return json(draft, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/soa",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const data = await new SoaDraftService(deps.soa).listSoaVersions(assessment.assessment_id, contextFor(assessment, traceId));
      return json({ data, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/soa/:soaVersionId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const version = await deps.soa.repositories.versions.get(routeParam(params, "soaVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "SoA version not found.", 404);
      return json({ ...version, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/soa/:soaVersionId/items",
    protected: true,
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const version = await deps.soa.repositories.versions.get(routeParam(params, "soaVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "SoA version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const page = parsePagination(request);
      const allItems = await new SoaDraftService(deps.soa).listSoaItems(version.soa_version_id, {}, contextFor(assessment, traceId));
      const result = applyPagination(allItems, page, "soa_item_id");
      return json({ data: result.data, pagination: result.pagination, trace_id: traceId });
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/soa/items/:soaItemId",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const item = await deps.soa.repositories.items.get(routeParam(params, "soaItemId"), tenantId!);
      if (!item) throw new ApiError("NOT_FOUND", "SoA item not found.", 404);
      // Immutability guard: reject mutations on approved versions
      const parentVersion = await deps.soa.repositories.versions.get(item.soa_version_id, tenantId!);
      if (parentVersion && parentVersion.status === "approved") {
        throw new ApiError("SOA_VERSION_IMMUTABLE" as any, "Cannot modify items in an approved SoA version. Create a new draft instead.", 409);
      }
      const assessment = await requireAssessment(deps, item.assessment_id, tenantId!);
      const body = await parseJson(request, UpdateSoaItemRequestSchema);
      try {
        return json(await new SoaReviewService(deps.soa).updateSoaItemDecision(item.soa_item_id, body, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/soa/:soaVersionId/evidence/refresh",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.soa.repositories.versions.get(routeParam(params, "soaVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "SoA version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, RefreshSoaEvidenceRequestSchema);
      const data = await new SoaEvidenceService(deps.soa).refreshEvidenceCoverage(version.soa_version_id, contextFor(assessment, traceId, actorId!), body.top_k);
      return json({ data, candidate_evidence: true, trace_id: traceId });
    }
  },
  {
    method: "POST",
    path: "/api/v1/soa/:soaVersionId/submit-review",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.soa.repositories.versions.get(routeParam(params, "soaVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "SoA version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, SubmitSoaReviewRequestSchema);
      try {
        const submitted = await new SoaReviewService(deps.soa).submitSoaForReview(version.soa_version_id, contextFor(assessment, traceId, actorId!), body.exception_rationale);
        assessment.snapshot.soaDraftVersionComplete = true;
        await deps.assessments.withTenant(assessment.tenant_id).save(assessment);
        await applyTransitionIfAllowed(deps, assessment, "soa_under_review", traceId, actorId!);
        return json(submitted);
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/soa/:soaVersionId/approve",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.soa.repositories.versions.get(routeParam(params, "soaVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "SoA version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, ApproveSoaRequestSchema);
      const approvalEvent = await deps.approvals.withTenant(tenantId!).getForGate(body.approval_event_id, "soa");
      if (!approvalEvent || approvalEvent.approvedBy !== actorId) throw new ApiError("APPROVAL_REQUIRED", "Valid human SoA approval_event is required.", 409);
      try {
        const approved = await new SoaApprovalService(deps.soa).approveSoa(version.soa_version_id, body, contextFor(assessment, traceId, actorId!));
        assessment.snapshot.soaApproved = true;
        await deps.assessments.withTenant(assessment.tenant_id).save(assessment);
        await applyTransitionIfAllowed(deps, assessment, "soa_approved", traceId, actorId!, approvalEvent);
        return json(approved);
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/soa/:soaVersionId/mark-ingested",
    protected: true,
    requireActor: true,
    handler: async ({ deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.soa.repositories.versions.get(routeParam(params, "soaVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "SoA version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const marked = await new SoaApprovalService(deps.soa).markSoaIngested(version.soa_version_id, contextFor(assessment, traceId, actorId!));
      assessment.snapshot.soaIngested = true;
      await deps.assessments.withTenant(assessment.tenant_id).save(assessment);
      await applyTransitionIfAllowed(deps, assessment, "soa_ingested", traceId, actorId!);
      return json(marked);
    }
  },
  {
    method: "POST",
    path: "/api/v1/soa/:soaVersionId/mark-ingestion-required",
    protected: true,
    requireActor: true,
    handler: async ({ deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.soa.repositories.versions.get(routeParam(params, "soaVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "SoA version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      return json(await new SoaApprovalService(deps.soa).markSoaIngestionRequired(version.soa_version_id, contextFor(assessment, traceId, actorId!)));
    }
  },
  {
    method: "POST",
    path: "/api/v1/soa/:soaVersionId/regenerate",
    protected: true,
    requireActor: true,
    handler: async ({ deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.soa.repositories.versions.get(routeParam(params, "soaVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "SoA version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      return json(await new SoaDraftService(deps.soa).regenerateDraft(assessment.assessment_id, {
        frameworkId: version.source_framework_id,
        scfVersionId: version.scf_version_id
      }, contextFor(assessment, traceId, actorId!)), { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/soa/:soaVersionId/validation",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const version = await deps.soa.repositories.versions.get(routeParam(params, "soaVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "SoA version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      return json(await new SoaReviewService(deps.soa).validateSoaForReview(version.soa_version_id, contextFor(assessment, traceId)));
    }
  }
];


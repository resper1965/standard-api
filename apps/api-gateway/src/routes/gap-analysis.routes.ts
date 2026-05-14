import { executeTransition, getAllowedNextStates } from "@standard/assessment-engine";
import {
  ApproveGapAnalysisRequestSchema,
  CreateGapAnalysisDraftRequestSchema,
  EvidenceAnalysisService,
  GapAnalysisWorkflowError,
  GapApprovalService,
  GapDraftService,
  GapReviewService,
  GapValidationService,
  RefreshEvidenceFindingRequestSchema,
  RunEvidenceAnalysisRequestSchema,
  SubmitGapAnalysisReviewRequestSchema,
  UpdateGapFindingRequestSchema
} from "@standard/gap-analysis";
import { EvidenceEvaluatorUseCase, PoamArchitectUseCase } from "@standard/agent-runtime";
import { z } from "zod";
import { ApiError } from "../errors/api-error";
import type { ApiErrorCode } from "../errors/error-codes";
import type { AppDependencies, AssessmentRecord, RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";
import { parsePagination, applyPagination } from "../utils/pagination";

/** Schema for POST /api/v1/gap/evaluate-evidence */
const EvaluateEvidenceRequestSchema = z.object({
  controlRequirement: z.string().min(5),
  evidenceDescription: z.string().min(5),
});

/** Schema for POST /api/v1/poam/architect-remediation */
const ArchitectRemediationRequestSchema = z.object({
  evidenceContext: z.any(),
  systemArchitectureDescription: z.string().min(5),
});

const toApiError = (error: unknown): never => {
  if (error instanceof GapAnalysisWorkflowError) {
    throw new ApiError(error.code as ApiErrorCode, error.message.replace(`${error.code}: `, ""), error.code.endsWith("_NOT_FOUND") ? 404 : 400, [error.details]);
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
    reason: `Gap Analysis workflow advanced to ${nextState}.`,
    traceId,
    occurredAt: new Date().toISOString(),
    ...(approvalEvent ? { approvalEvent } : {})
  });
  assessment.snapshot = result.assessment;
  assessment.trace_id = traceId;
  await deps.assessments.save(assessment);
  await deps.lifecycleEvents.record(result.event);
};

export const gapAnalysisRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/evidence-analysis/run",
    protected: true,
    requireActor: true,
    bodySchema: RunEvidenceAnalysisRequestSchema,
    handler: async ({ validatedBody, deps, params, tenantId, actorId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const body = validatedBody as { soa_version_id: string };
      try {
        const result = await new EvidenceAnalysisService(deps.gapAnalysis).runEvidenceAnalysis(assessment.assessment_id, body.soa_version_id, contextFor(assessment, traceId, actorId!));
        await applyTransitionIfAllowed(deps, assessment, "evidence_analysis_ready", traceId, actorId!);
        return json(result, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/evidence-findings",
    protected: true,
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const page = parsePagination(request);
      const data = await new EvidenceAnalysisService(deps.gapAnalysis).listEvidenceFindings(assessment.assessment_id, {}, contextFor(assessment, traceId));
      const result = applyPagination(data, page, "evidence_finding_id");
      return json({ data: result.data, pagination: result.pagination, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/evidence-findings/:evidenceFindingId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const finding = await deps.gapAnalysis.repositories.evidenceFindings.get(routeParam(params, "evidenceFindingId"), tenantId!);
      if (!finding) throw new ApiError("NOT_FOUND", "Evidence finding not found.", 404);
      return json({ ...finding, trace_id: traceId });
    }
  },
  {
    method: "POST",
    path: "/api/v1/evidence-findings/:evidenceFindingId/refresh",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      await parseJson(request, RefreshEvidenceFindingRequestSchema);
      const existing = await deps.gapAnalysis.repositories.evidenceFindings.get(routeParam(params, "evidenceFindingId"), tenantId!);
      if (!existing) throw new ApiError("NOT_FOUND", "Evidence finding not found.", 404);
      const assessment = await requireAssessment(deps, existing.assessment_id, tenantId!);
      try {
        return json(await new EvidenceAnalysisService(deps.gapAnalysis).refreshEvidenceFinding(existing.evidence_finding_id, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/evidence-findings/:evidenceFindingId/sources",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const data = await deps.gapAnalysis.repositories.evidenceSources.listByFinding(routeParam(params, "evidenceFindingId"), tenantId!);
      return json({ data, trace_id: traceId });
    }
  },
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/gap-analysis/draft",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const body = await parseJson(request, CreateGapAnalysisDraftRequestSchema);
      try {
        const draft = await new GapDraftService(deps.gapAnalysis).createGapAnalysisDraft(assessment.assessment_id, body.soa_version_id, contextFor(assessment, traceId, actorId!));
        await applyTransitionIfAllowed(deps, assessment, "gap_analysis_drafted", traceId, actorId!);
        return json(draft, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/gap-analysis",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const assessment = await requireAssessment(deps, routeParam(params, "assessmentId"), tenantId!);
      const data = await deps.gapAnalysis.repositories.gapVersions.listByAssessment(assessment.assessment_id, tenantId!);
      return json({ data, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const version = await deps.gapAnalysis.repositories.gapVersions.get(routeParam(params, "gapAnalysisVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      return json({ ...version, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/findings",
    protected: true,
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const version = await deps.gapAnalysis.repositories.gapVersions.get(routeParam(params, "gapAnalysisVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const page = parsePagination(request);
      const data = await new GapDraftService(deps.gapAnalysis).listGapFindings(version.gap_analysis_version_id, {}, contextFor(assessment, traceId));
      const result = applyPagination(data, page, "gap_finding_id");
      return json({ data: result.data, pagination: result.pagination, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/gap-findings/:gapFindingId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const finding = await deps.gapAnalysis.repositories.gapFindings.get(routeParam(params, "gapFindingId"), tenantId!);
      if (!finding) throw new ApiError("NOT_FOUND", "Gap finding not found.", 404);
      return json({ ...finding, trace_id: traceId });
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/gap-findings/:gapFindingId",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const finding = await deps.gapAnalysis.repositories.gapFindings.get(routeParam(params, "gapFindingId"), tenantId!);
      if (!finding) throw new ApiError("NOT_FOUND", "Gap finding not found.", 404);
      // Immutability guard: reject mutations on approved versions
      const parentVersion = await deps.gapAnalysis.repositories.gapVersions.get(finding.gap_analysis_version_id, tenantId!);
      if (parentVersion && parentVersion.status === "approved") {
        throw new ApiError("CONFLICT", "Cannot modify findings in an approved Gap Analysis version. Create a new draft instead.", 409);
      }
      const assessment = await requireAssessment(deps, finding.assessment_id, tenantId!);
      const body = await parseJson(request, UpdateGapFindingRequestSchema);
      try {
        return json(await new GapReviewService(deps.gapAnalysis).updateGapFinding(finding.gap_finding_id, body, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/validate",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      const version = await deps.gapAnalysis.repositories.gapVersions.get(routeParam(params, "gapAnalysisVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      return json(await new GapValidationService(deps.gapAnalysis).validateGapAnalysisForReview(version.gap_analysis_version_id, contextFor(assessment, traceId)));
    }
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/submit-review",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.gapAnalysis.repositories.gapVersions.get(routeParam(params, "gapAnalysisVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, SubmitGapAnalysisReviewRequestSchema);
      try {
        const submitted = await new GapReviewService(deps.gapAnalysis).submitGapAnalysisForReview(version.gap_analysis_version_id, contextFor(assessment, traceId, actorId!), body.exception_rationale);
        await applyTransitionIfAllowed(deps, assessment, "gap_analysis_under_review", traceId, actorId!);
        return json(submitted);
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/approve",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.gapAnalysis.repositories.gapVersions.get(routeParam(params, "gapAnalysisVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, ApproveGapAnalysisRequestSchema);
      try {
        const approvalEvent = await deps.approvals.getForGate(body.approval_event_id, "gap_analysis");
        if (!approvalEvent || approvalEvent.approvedBy !== actorId) throw new ApiError("APPROVAL_REQUIRED", "Valid human Gap Analysis approval_event is required.", 409);
        const approved = await new GapApprovalService(deps.gapAnalysis).approveGapAnalysis(version.gap_analysis_version_id, body, contextFor(assessment, traceId, actorId!));
        await applyTransitionIfAllowed(deps, assessment, "gap_analysis_approved", traceId, actorId!, approvalEvent);
        return json(approved);
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/regenerate",
    protected: true,
    requireActor: true,
    handler: async ({ deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.gapAnalysis.repositories.gapVersions.get(routeParam(params, "gapAnalysisVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      try {
        return json(await new GapDraftService(deps.gapAnalysis).regenerateGapAnalysisDraft(version.gap_analysis_version_id, {}, contextFor(assessment, traceId, actorId!)), { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/findings/bulk-update",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const version = await deps.gapAnalysis.repositories.gapVersions.get(routeParam(params, "gapAnalysisVersionId"), tenantId!);
      if (!version) throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(deps, version.assessment_id, tenantId!);
      const body = await parseJson(request, UpdateGapFindingRequestSchema);
      try {
        const data = await new GapReviewService(deps.gapAnalysis).bulkUpdateGapFindings(version.gap_analysis_version_id, body, contextFor(assessment, traceId, actorId!));
        return json({ data, trace_id: traceId });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/gap/evaluate-evidence",
    authRequired: true,
    tenantRequired: true,
    bodySchema: EvaluateEvidenceRequestSchema,
    handler: async (ctx) => {
      try {
        const body = ctx.validatedBody as { controlRequirement: string; evidenceDescription: string };
        
        const llmProvider = ctx.deps.agentRuntime.llm; 
        if (!llmProvider) {
          throw new ApiError("INTERNAL_ERROR", "LLM Provider is not configured in dependencies.", 500);
        }

        const usecase = new EvidenceEvaluatorUseCase(llmProvider);
        const result = await usecase.evaluate({
          controlRequirement: body.controlRequirement,
          evidenceDescription: body.evidenceDescription,
          tenantId: ctx.tenantId!
        });
        
        await ctx.deps.audit.record("gap.evidence.evaluated", { tenant_id: ctx.tenantId, trace_id: ctx.traceId, compliant: result.is_compliant });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("INTERNAL_ERROR", "Agent Evidence evaluation failed", 500);
      }
    },
  },
  {
    method: "POST",
    path: "/api/v1/poam/architect-remediation",
    authRequired: true,
    tenantRequired: true,
    bodySchema: ArchitectRemediationRequestSchema,
    handler: async (ctx) => {
      try {
        const body = ctx.validatedBody as { evidenceContext: unknown; systemArchitectureDescription: string };
        
        const llmProvider = ctx.deps.agentRuntime.llm; 
        if (!llmProvider) {
          throw new ApiError("INTERNAL_ERROR", "LLM Provider is not configured in dependencies.", 500);
        }

        const usecase = new PoamArchitectUseCase(llmProvider);
        const result = await usecase.architect({
          evidenceContext: body.evidenceContext as import("@standard/agent-runtime").EvidenceEvaluationOutput,
          systemArchitectureDescription: body.systemArchitectureDescription,
          tenantId: ctx.tenantId!
        });
        
        await ctx.deps.audit.record("poam.architectured", { tenant_id: ctx.tenantId, trace_id: ctx.traceId, priority: result.priority_level });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("INTERNAL_ERROR", "Agent PoAM Architecture failed", 500);
      }
    },
  },
];


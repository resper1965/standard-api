import {
  executeTransition,
  getAllowedNextStates,
} from "@standard/assessment-engine";
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
  UpdateGapFindingRequestSchema,
} from "@standard/gap-analysis";
import {
  EvidenceEvaluatorUseCase,
  PoamArchitectUseCase,
} from "@standard/agent-runtime";
import { z } from "zod";
import { ApiError } from "../errors/api-error";
import type { ApiErrorCode } from "../errors/error-codes";
import type {
  AppDependencies,
  AssessmentRecord,
  RouteDefinition,
} from "../http";
import {
  json,
  parseJson,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";
import { parsePagination, applyPagination } from "../utils/pagination";

/** Schema for POST /api/v1/gap/evaluate-evidence */
const EvaluateEvidenceRequestSchema = z.object({
  controlRequirement: z.string().min(5),
  evidenceDescription: z.string().min(5),
});

/** Schema for POST /api/v1/poam/architect-remediation */
const EvaluateEvidenceBatchRequestSchema = z.object({
  batch_id: z.string().optional(),
  items: z
    .array(
      z.object({
        correlation_id: z.string(),
        payload: EvaluateEvidenceRequestSchema,
      }),
    )
    .max(500),
});

/** Schema for POST /api/v1/poam/architect-remediation */
const ArchitectRemediationRequestSchema = z.object({
  evidenceContext: z.any(),
  systemArchitectureDescription: z.string().min(5),
});

const toApiError = (error: unknown): never => {
  if (error instanceof GapAnalysisWorkflowError) {
    throw new ApiError(
      error.code as ApiErrorCode,
      error.message.replace(`${error.code}: `, ""),
      error.code.endsWith("_NOT_FOUND") ? 404 : 400,
      [error.details],
    );
  }
  throw error;
};

const requireAssessment = async (
  deps: AppDependencies,
  assessmentId: string,
  organizationId: string,
): Promise<AssessmentRecord> => {
  const tenantAssessmentsDb = deps.assessments.withOrganization(organizationId);
  const assessment = await tenantAssessmentsDb.get(assessmentId);
  if (!assessment)
    throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
  return assessment;
};

const contextFor = (
  assessment: AssessmentRecord,
  traceId: string,
  actorId?: string,
) => ({
  organizationId: assessment.organization_id,
  assessmentId: assessment.assessment_id,
  ...(actorId ? { actorId } : {}),
  traceId,
});

const applyTransitionIfAllowed = async (
  deps: AppDependencies,
  assessment: AssessmentRecord,
  nextState: AssessmentRecord["snapshot"]["state"],
  traceId: string,
  actorId: string,
  approvalEvent?: Parameters<typeof executeTransition>[2]["approvalEvent"],
): Promise<void> => {
  if (!getAllowedNextStates(assessment.snapshot.state).includes(nextState))
    return;
  const result = executeTransition(assessment.snapshot, nextState, {
    organizationId: assessment.organization_id,
    assessmentId: assessment.assessment_id,
    actorId,
    reason: `Gap Analysis workflow advanced to ${nextState}.`,
    traceId,
    occurredAt: new Date().toISOString(),
    ...(approvalEvent ? { approvalEvent } : {}),
  });
  assessment.snapshot = result.assessment;
  assessment.trace_id = traceId;
  await deps.assessments
    .withOrganization(assessment.organization_id)
    .save(assessment);
  await deps.lifecycleEvents
    .withOrganization(assessment.organization_id)
    .record(result.event);
};

export const gapAnalysisRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/evidence-analysis/run",
    protected: true,
    requireActor: true,
    permissions: ["gap:create"],
    bodySchema: RunEvidenceAnalysisRequestSchema,
    handler: async ({
      validatedBody,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const assessment = await requireAssessment(
        deps,
        routeUuidParam(params, "assessmentId"),
        requireOrganizationId({ organizationId }),
      );
      const body = validatedBody as { soa_version_id: string };
      try {
        const result = await new EvidenceAnalysisService(
          deps.gapAnalysis,
        ).runEvidenceAnalysis(
          assessment.assessment_id,
          body.soa_version_id,
          contextFor(assessment, traceId, actorId!),
        );
        await applyTransitionIfAllowed(
          deps,
          assessment,
          "evidence_analysis_ready",
          traceId,
          actorId!,
        );
        return json(result, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/evidence-findings",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      const assessment = await requireAssessment(
        deps,
        routeUuidParam(params, "assessmentId"),
        requireOrganizationId({ organizationId }),
      );
      const page = parsePagination(request);
      const data = await new EvidenceAnalysisService(
        deps.gapAnalysis,
      ).listEvidenceFindings(
        assessment.assessment_id,
        {},
        contextFor(assessment, traceId),
      );
      const result = applyPagination(data, page, "evidence_finding_id");
      return json({
        data: result.data,
        pagination: result.pagination,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/evidence-findings/:evidenceFindingId",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantEvDb =
        deps.gapAnalysis.repositories.evidenceFindings.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const finding = await tenantEvDb.get(
        routeUuidParam(params, "evidenceFindingId"),
      );
      if (!finding)
        throw new ApiError("NOT_FOUND", "Evidence finding not found.", 404);
      return json({ ...finding, trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/evidence-findings/:evidenceFindingId/refresh",
    protected: true,
    requireActor: true,
    permissions: ["gap:update"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      await parseJson(request, RefreshEvidenceFindingRequestSchema);
      const tenantEvDb =
        deps.gapAnalysis.repositories.evidenceFindings.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const existing = await tenantEvDb.get(
        routeUuidParam(params, "evidenceFindingId"),
      );
      if (!existing)
        throw new ApiError("NOT_FOUND", "Evidence finding not found.", 404);
      const assessment = await requireAssessment(
        deps,
        existing.assessment_id,
        requireOrganizationId({ organizationId }),
      );
      try {
        return json(
          await new EvidenceAnalysisService(
            deps.gapAnalysis,
          ).refreshEvidenceFinding(
            existing.evidence_finding_id,
            contextFor(assessment, traceId, actorId!),
          ),
        );
      } catch (error) {
        return toApiError(error);
      }
    },
  },
  {
    method: "GET",
    path: "/api/v1/evidence-findings/:evidenceFindingId/sources",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantSourcesDb =
        deps.gapAnalysis.repositories.evidenceSources.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const data = await tenantSourcesDb.listByFinding(
        routeUuidParam(params, "evidenceFindingId"),
      );
      return json({ data, trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/gap-analysis/draft",
    protected: true,
    requireActor: true,
    permissions: ["gap:create"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const assessment = await requireAssessment(
        deps,
        routeUuidParam(params, "assessmentId"),
        requireOrganizationId({ organizationId }),
      );
      const body = await parseJson(
        request,
        CreateGapAnalysisDraftRequestSchema,
      );
      try {
        const draft = await new GapDraftService(
          deps.gapAnalysis,
        ).createGapAnalysisDraft(
          assessment.assessment_id,
          body.soa_version_id,
          contextFor(assessment, traceId, actorId!),
        );
        await applyTransitionIfAllowed(
          deps,
          assessment,
          "gap_analysis_drafted",
          traceId,
          actorId!,
        );
        return json(draft, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/gap-analysis",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const assessment = await requireAssessment(
        deps,
        routeUuidParam(params, "assessmentId"),
        requireOrganizationId({ organizationId }),
      );
      const tenantGapVersionDb =
        deps.gapAnalysis.repositories.gapVersions.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const data = await tenantGapVersionDb.listByAssessment(
        assessment.assessment_id,
      );
      return json({ data, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantGapVersionDb =
        deps.gapAnalysis.repositories.gapVersions.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const version = await tenantGapVersionDb.get(
        routeUuidParam(params, "gapAnalysisVersionId"),
      );
      if (!version)
        throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      return json({ ...version, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/findings",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      const tenantGapVersionDb =
        deps.gapAnalysis.repositories.gapVersions.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const version = await tenantGapVersionDb.get(
        routeUuidParam(params, "gapAnalysisVersionId"),
      );
      if (!version)
        throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(
        deps,
        version.assessment_id,
        requireOrganizationId({ organizationId }),
      );
      const page = parsePagination(request);
      const allData = await new GapDraftService(
        deps.gapAnalysis,
      ).listGapFindings(
        version.gap_analysis_version_id,
        {},
        contextFor(assessment, traceId),
      );

      // ?mcr_only=true â€” filter to Minimum Compliance Requirement gaps only (SCRMS-PIG Step 1c)
      const url = new URL(request.url);
      const mcrOnly = url.searchParams.get("mcr_only") === "true";
      const data = mcrOnly ? allData.filter((f) => f.is_mcr_gap) : allData;
      const mcrCount = allData.filter((f) => f.is_mcr_gap).length;

      const result = applyPagination(data, page, "gap_finding_id");
      return json({
        data: result.data,
        pagination: result.pagination,
        meta: {
          total_findings: allData.length,
          mcr_findings: mcrCount,
          mcr_only_filter: mcrOnly,
        },
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/gap-findings/:gapFindingId",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantGapFindingDb =
        deps.gapAnalysis.repositories.gapFindings.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const finding = await tenantGapFindingDb.get(
        routeUuidParam(params, "gapFindingId"),
      );
      if (!finding)
        throw new ApiError("NOT_FOUND", "Gap finding not found.", 404);
      return json({ ...finding, trace_id: traceId });
    },
  },
  {
    method: "PATCH",
    path: "/api/v1/gap-findings/:gapFindingId",
    protected: true,
    requireActor: true,
    permissions: ["gap:update"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const tenantGapFindingDb =
        deps.gapAnalysis.repositories.gapFindings.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const tenantGapVersionDb =
        deps.gapAnalysis.repositories.gapVersions.withOrganization(
          requireOrganizationId({ organizationId }),
        );

      const finding = await tenantGapFindingDb.get(
        routeUuidParam(params, "gapFindingId"),
      );
      if (!finding)
        throw new ApiError("NOT_FOUND", "Gap finding not found.", 404);
      // Immutability guard: reject mutations on approved versions
      const parentVersion = await tenantGapVersionDb.get(
        finding.gap_analysis_version_id,
      );
      if (parentVersion && parentVersion.status === "approved") {
        throw new ApiError(
          "CONFLICT",
          "Cannot modify findings in an approved Gap Analysis version. Create a new draft instead.",
          409,
        );
      }
      const assessment = await requireAssessment(
        deps,
        finding.assessment_id,
        requireOrganizationId({ organizationId }),
      );
      const body = await parseJson(request, UpdateGapFindingRequestSchema);
      try {
        return json(
          await new GapReviewService(deps.gapAnalysis).updateGapFinding(
            finding.gap_finding_id,
            body,
            contextFor(assessment, traceId, actorId!),
          ),
        );
      } catch (error) {
        return toApiError(error);
      }
    },
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/validate",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantGapVersionDb =
        deps.gapAnalysis.repositories.gapVersions.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const version = await tenantGapVersionDb.get(
        routeUuidParam(params, "gapAnalysisVersionId"),
      );
      if (!version)
        throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(
        deps,
        version.assessment_id,
        requireOrganizationId({ organizationId }),
      );
      return json(
        await new GapValidationService(
          deps.gapAnalysis,
        ).validateGapAnalysisForReview(
          version.gap_analysis_version_id,
          contextFor(assessment, traceId),
        ),
      );
    },
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/submit-review",
    protected: true,
    requireActor: true,
    permissions: ["gap:update"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const tenantGapVersionDb =
        deps.gapAnalysis.repositories.gapVersions.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const version = await tenantGapVersionDb.get(
        routeUuidParam(params, "gapAnalysisVersionId"),
      );
      if (!version)
        throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(
        deps,
        version.assessment_id,
        requireOrganizationId({ organizationId }),
      );
      const body = await parseJson(
        request,
        SubmitGapAnalysisReviewRequestSchema,
      );
      try {
        const submitted = await new GapReviewService(
          deps.gapAnalysis,
        ).submitGapAnalysisForReview(
          version.gap_analysis_version_id,
          contextFor(assessment, traceId, actorId!),
          body.exception_rationale,
        );
        await applyTransitionIfAllowed(
          deps,
          assessment,
          "gap_analysis_under_review",
          traceId,
          actorId!,
        );
        return json(submitted);
      } catch (error) {
        return toApiError(error);
      }
    },
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/approve",
    protected: true,
    requireActor: true,
    permissions: ["gap:approve"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const tenantGapVersionDb =
        deps.gapAnalysis.repositories.gapVersions.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const version = await tenantGapVersionDb.get(
        routeUuidParam(params, "gapAnalysisVersionId"),
      );
      if (!version)
        throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(
        deps,
        version.assessment_id,
        requireOrganizationId({ organizationId }),
      );
      const body = await parseJson(request, ApproveGapAnalysisRequestSchema);
      try {
        const approvalEvent = await deps.approvals
          .withOrganization(requireOrganizationId({ organizationId }))
          .getForGate(body.approval_event_id, "gap_analysis");
        if (!approvalEvent || approvalEvent.approvedBy !== actorId)
          throw new ApiError(
            "APPROVAL_REQUIRED",
            "Valid human Gap Analysis approval_event is required.",
            409,
          );
        const approved = await new GapApprovalService(
          deps.gapAnalysis,
        ).approveGapAnalysis(
          version.gap_analysis_version_id,
          body,
          contextFor(assessment, traceId, actorId!),
        );
        await applyTransitionIfAllowed(
          deps,
          assessment,
          "gap_analysis_approved",
          traceId,
          actorId!,
          approvalEvent,
        );
        return json(approved);
      } catch (error) {
        return toApiError(error);
      }
    },
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/regenerate",
    protected: true,
    requireActor: true,
    permissions: ["gap:create"],
    handler: async ({ deps, params, organizationId, actorId, traceId }) => {
      const tenantGapVersionDb =
        deps.gapAnalysis.repositories.gapVersions.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const version = await tenantGapVersionDb.get(
        routeUuidParam(params, "gapAnalysisVersionId"),
      );
      if (!version)
        throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(
        deps,
        version.assessment_id,
        requireOrganizationId({ organizationId }),
      );
      try {
        return json(
          await new GapDraftService(
            deps.gapAnalysis,
          ).regenerateGapAnalysisDraft(
            version.gap_analysis_version_id,
            {},
            contextFor(assessment, traceId, actorId!),
          ),
          { status: 201 },
        );
      } catch (error) {
        return toApiError(error);
      }
    },
  },
  {
    method: "POST",
    path: "/api/v1/gap-analysis/:gapAnalysisVersionId/findings/bulk-update",
    protected: true,
    requireActor: true,
    permissions: ["gap:update"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const tenantGapVersionDb =
        deps.gapAnalysis.repositories.gapVersions.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const version = await tenantGapVersionDb.get(
        routeUuidParam(params, "gapAnalysisVersionId"),
      );
      if (!version)
        throw new ApiError("NOT_FOUND", "Gap Analysis version not found.", 404);
      const assessment = await requireAssessment(
        deps,
        version.assessment_id,
        requireOrganizationId({ organizationId }),
      );
      const body = await parseJson(request, UpdateGapFindingRequestSchema);
      try {
        const data = await new GapReviewService(
          deps.gapAnalysis,
        ).bulkUpdateGapFindings(
          version.gap_analysis_version_id,
          body,
          contextFor(assessment, traceId, actorId!),
        );
        return json({ data, trace_id: traceId });
      } catch (error) {
        return toApiError(error);
      }
    },
  },
  {
    method: "POST",
    path: "/api/v1/gap/evaluate-evidence",
    authRequired: true,
    tenantRequired: true,
    openapi: {
      summary: "Evaluate Evidence",
      description: "Checks evidence against a control requirement.",
      tags: ["Gap Analysis"],
      request: {
        body: {
          content: {
            "application/json": { schema: EvaluateEvidenceRequestSchema },
          },
        },
      },
      responses: {
        200: { description: "Evaluation result" },
      },
    },
    bodySchema: EvaluateEvidenceRequestSchema,
    handler: async (ctx) => {
      try {
        const body = ctx.validatedBody as {
          controlRequirement: string;
          evidenceDescription: string;
        };

        const llmProvider = ctx.deps.agentRuntime.llm;
        if (!llmProvider) {
          throw new ApiError(
            "INTERNAL_ERROR",
            "LLM Provider is not configured in dependencies.",
            500,
          );
        }

        const usecase = new EvidenceEvaluatorUseCase(llmProvider);
        const result = await usecase.evaluate({
          controlRequirement: body.controlRequirement,
          evidenceDescription: body.evidenceDescription,
          organizationId: requireOrganizationId(ctx),
        });

        await ctx.deps.audit.record("gap.evidence.evaluated", {
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
          compliant: result.is_compliant,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        console.error("[POST /api/v1/gap/evaluate-evidence] Failure:", e);
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          "INTERNAL_ERROR",
          `Agent Evidence evaluation failed: ${e instanceof Error ? e.message : String(e)}`,
          500,
          e instanceof Error ? [e.message] : [],
        );
      }
    },
  },
  {
    method: "POST",
    path: "/api/v1/gap/evaluate-evidence/batch",
    authRequired: true,
    tenantRequired: true,
    openapi: {
      summary: "Evaluate Evidence (Batch)",
      description: "Checks multiple evidences in batch.",
      tags: ["Gap Analysis"],
      request: {
        body: {
          content: {
            "application/json": { schema: EvaluateEvidenceBatchRequestSchema },
          },
        },
      },
      responses: {
        202: { description: "Batch evaluation queued" },
      },
    },
    bodySchema: EvaluateEvidenceBatchRequestSchema,
    handler: async (ctx) => {
      const body = ctx.validatedBody as z.infer<
        typeof EvaluateEvidenceBatchRequestSchema
      >;
      const jobId = crypto.randomUUID();

      const backgroundTask = async () => {
        const llmProvider = ctx.deps.agentRuntime.llm;
        if (!llmProvider) return;
        const usecase = new EvidenceEvaluatorUseCase(llmProvider);

        const results = await Promise.allSettled(
          body.items.map(async (item) => {
            const result = await usecase.evaluate({
              controlRequirement: item.payload.controlRequirement,
              evidenceDescription: item.payload.evidenceDescription,
              organizationId: requireOrganizationId(ctx),
            });
            await ctx.deps.audit.record("gap.evidence.batch.item_evaluated", {
              job_id: jobId,
              correlation_id: item.correlation_id,
              compliant: result.is_compliant,
            });
            return result;
          }),
        );

        await ctx.deps.audit.record("gap.evidence.batch.completed", {
          job_id: jobId,
          total: body.items.length,
          successful: results.filter((r) => r.status === "fulfilled").length,
        });
      };

      if (ctx.execCtx?.waitUntil) {
        ctx.execCtx.waitUntil(backgroundTask());
      } else {
        Promise.resolve().then(backgroundTask).catch(console.error);
      }

      return json({ status: "queued", job_id: jobId }, { status: 202 });
    },
  },
  {
    method: "POST",
    path: "/api/v1/poam/architect-remediation",
    authRequired: true,
    tenantRequired: true,
    openapi: {
      summary: "Architect Remediation",
      description: "Generates PoAM architecture remediation plan.",
      tags: ["PoAM"],
      request: {
        body: {
          content: {
            "application/json": { schema: ArchitectRemediationRequestSchema },
          },
        },
      },
      responses: {
        200: { description: "Remediation plan" },
      },
    },
    bodySchema: ArchitectRemediationRequestSchema,
    handler: async (ctx) => {
      try {
        const body = ctx.validatedBody as {
          evidenceContext: unknown;
          systemArchitectureDescription: string;
        };

        const llmProvider = ctx.deps.agentRuntime.llm;
        if (!llmProvider) {
          throw new ApiError(
            "INTERNAL_ERROR",
            "LLM Provider is not configured in dependencies.",
            500,
          );
        }

        const usecase = new PoamArchitectUseCase(llmProvider);
        const result = await usecase.architect({
          evidenceContext:
            body.evidenceContext as import("@standard/agent-runtime").EvidenceEvaluationOutput,
          systemArchitectureDescription: body.systemArchitectureDescription,
          organizationId: requireOrganizationId(ctx),
        });

        await ctx.deps.audit.record("poam.architectured", {
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
          priority: result.priority_level,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        console.error("[POST /api/v1/poam/architect-remediation] Failure:", e);
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          "INTERNAL_ERROR",
          `Agent PoAM Architecture failed: ${e instanceof Error ? e.message : String(e)}`,
          500,
          e instanceof Error ? [e.message] : [],
        );
      }
    },
  },
];

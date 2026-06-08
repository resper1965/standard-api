import { executeTransition, getAllowedNextStates } from "@standard/assessment-engine";
import { AuditEventService, MetricsService } from "@standard/observability";
import {
  ApproveReportRequestSchema,
  AuditPackageService,
  CreateReportDraftRequestSchema,
  ExportJobService,
  ExportRequestSchema,
  RegenerateReportRequestSchema,
  RenderReportRequestSchema,
  ReportApprovalService,
  ReportComposerService,
  ReportDraftService,
  ReportRendererService,
  ReportReviewService,
  ReportStorageService,
  ReportValidationService,
  ReportingWorkflowError,
  SubmitReportReviewRequestSchema
} from "@standard/reporting";
import { ApiError } from "../errors/api-error";
import type { ApiErrorCode } from "../errors/error-codes";
import type { AppDependencies, AssessmentRecord, RouteDefinition } from "../http";
import { json, parseJson, routeParam, routeUuidParam , requireOrganizationId } from "../http";

const toApiError = (error: unknown): never => {
  if (error instanceof ReportingWorkflowError) {
    const status = error.code.endsWith("_NOT_FOUND") ? 404 : error.code.includes("IMMUTABLE") || error.code.includes("APPROVAL") || error.code.includes("REVIEW_BLOCKED") ? 409 : 400;
    throw new ApiError(error.code as ApiErrorCode, error.message.replace(`${error.code}: `, ""), status, [error.details]);
  }
  throw error;
};

const requireAssessment = async (deps: AppDependencies, assessmentId: string, organizationId: string): Promise<AssessmentRecord> => {
  const tenantAssessmentsDb = deps.assessments.withOrganization(organizationId);
  const assessment = await tenantAssessmentsDb.get(assessmentId);
  if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
  return assessment;
};

const contextFor = (assessment: AssessmentRecord, traceId: string, actorId?: string) => ({
  organizationId: assessment.organization_id,
  assessmentId: assessment.assessment_id,
  ...(actorId ? { actorId } : {}),
  traceId
});

const applyTransitionIfAllowed = async (deps: AppDependencies, assessment: AssessmentRecord, nextState: AssessmentRecord["snapshot"]["state"], traceId: string, actorId: string): Promise<void> => {
  if (!getAllowedNextStates(assessment.snapshot.state).includes(nextState)) return;
  const result = executeTransition(assessment.snapshot, nextState, {
    organizationId: assessment.organization_id,
    assessmentId: assessment.assessment_id,
    actorId,
    reason: `Reporting workflow advanced to ${nextState}.`,
    traceId,
    occurredAt: new Date().toISOString()
  });
  assessment.snapshot = result.assessment;
  assessment.trace_id = traceId;
  await deps.assessments.withOrganization(assessment.organization_id).save(assessment);
  await deps.lifecycleEvents.withOrganization(assessment.organization_id).record(result.event);
};

export const reportingRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/reports/draft",
    protected: true,
    permissions: ["report:create"],
    requireActor: true,
    handler: async ({ request, params, deps, organizationId, actorId, traceId }) => {
      const assessment = await requireAssessment(deps, routeUuidParam(params, "assessmentId"), requireOrganizationId({ organizationId }));
      const body = await parseJson(request, CreateReportDraftRequestSchema);
      try {
        const draft = await new ReportDraftService(deps.reporting).createReportDraft(assessment.assessment_id, body.report_type, body, contextFor(assessment, traceId, actorId!));
        return json(draft, { status: 201 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/reports",
    protected: true,
    permissions: ["report:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const assessment = await requireAssessment(deps, routeUuidParam(params, "assessmentId"), requireOrganizationId({ organizationId }));
      return json(await new ReportDraftService(deps.reporting).listReportVersions(assessment.assessment_id, contextFor(assessment, traceId)));
    }
  },
  {
    method: "GET",
    path: "/api/v1/reports/:reportVersionId",
    protected: true,
    permissions: ["report:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const report = await deps.reporting.repositories.versions.get(routeUuidParam(params, "reportVersionId"), requireOrganizationId({ organizationId }));
      if (!report) throw new ApiError("REPORT_NOT_FOUND", "Report version not found.", 404);
      const assessment = await requireAssessment(deps, report.assessment_id, requireOrganizationId({ organizationId }));
      return json(report, { headers: { "x-trace-id": traceId } });
    }
  },
  {
    method: "GET",
    path: "/api/v1/reports/:reportVersionId/sections",
    protected: true,
    permissions: ["report:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const report = await deps.reporting.repositories.versions.get(routeUuidParam(params, "reportVersionId"), requireOrganizationId({ organizationId }));
      if (!report) throw new ApiError("REPORT_NOT_FOUND", "Report version not found.", 404);
      const assessment = await requireAssessment(deps, report.assessment_id, requireOrganizationId({ organizationId }));
      return json(await new ReportComposerService(deps.reporting).composeFullAssessmentReport(report.report_version_id, contextFor(assessment, traceId)));
    }
  },
  {
    method: "GET",
    path: "/api/v1/reports/:reportVersionId/artifacts",
    protected: true,
    permissions: ["report:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const report = await deps.reporting.repositories.versions.get(routeUuidParam(params, "reportVersionId"), requireOrganizationId({ organizationId }));
      if (!report) throw new ApiError("REPORT_NOT_FOUND", "Report version not found.", 404);
      const assessment = await requireAssessment(deps, report.assessment_id, requireOrganizationId({ organizationId }));
      return json(await new ReportStorageService(deps.reporting).listArtifacts(report.report_version_id, contextFor(assessment, traceId)));
    }
  },
  {
    method: "POST",
    path: "/api/v1/reports/:reportVersionId/validate",
    protected: true,
    permissions: ["report:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const report = await deps.reporting.repositories.versions.get(routeUuidParam(params, "reportVersionId"), requireOrganizationId({ organizationId }));
      if (!report) throw new ApiError("REPORT_NOT_FOUND", "Report version not found.", 404);
      const assessment = await requireAssessment(deps, report.assessment_id, requireOrganizationId({ organizationId }));
      return json(await new ReportValidationService(deps.reporting).validateReportForReview(report.report_version_id, contextFor(assessment, traceId)));
    }
  },
  {
    method: "POST",
    path: "/api/v1/reports/:reportVersionId/render",
    protected: true,
    permissions: ["report:create"],
    requireActor: true,
    handler: async ({ request, params, deps, organizationId, actorId, traceId }) => {
      const report = await deps.reporting.repositories.versions.get(routeUuidParam(params, "reportVersionId"), requireOrganizationId({ organizationId }));
      if (!report) throw new ApiError("REPORT_NOT_FOUND", "Report version not found.", 404);
      const assessment = await requireAssessment(deps, report.assessment_id, requireOrganizationId({ organizationId }));
      const body = await parseJson(request, RenderReportRequestSchema);
      const service = new ReportRendererService(deps.reporting);
      const rendered = body.format === "markdown" ? await service.renderMarkdown(report.report_version_id, contextFor(assessment, traceId, actorId!)) : await service.renderJson(report.report_version_id, contextFor(assessment, traceId, actorId!));
      const artifact = body.store_artifact ? await new ReportStorageService(deps.reporting).storeArtifact(report.report_version_id, rendered, contextFor(assessment, traceId, actorId!)) : undefined;
      await applyTransitionIfAllowed(deps, assessment, "report_generated", traceId, actorId!);
      return json({ rendered, artifact });
    }
  },
  {
    method: "POST",
    path: "/api/v1/reports/:reportVersionId/submit-review",
    protected: true,
    permissions: ["report:update"],
    requireActor: true,
    handler: async ({ request, params, deps, organizationId, actorId, traceId }) => {
      await parseJson(request, SubmitReportReviewRequestSchema);
      const report = await deps.reporting.repositories.versions.get(routeUuidParam(params, "reportVersionId"), requireOrganizationId({ organizationId }));
      if (!report) throw new ApiError("REPORT_NOT_FOUND", "Report version not found.", 404);
      const assessment = await requireAssessment(deps, report.assessment_id, requireOrganizationId({ organizationId }));
      try {
        return json(await new ReportReviewService(deps.reporting).submitReportForReview(report.report_version_id, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/reports/:reportVersionId/approve",
    protected: true,
    permissions: ["report:approve"],
    requireActor: true,
    handler: async ({ request, params, deps, organizationId, actorId, traceId }) => {
      const body = await parseJson(request, ApproveReportRequestSchema);
      const report = await deps.reporting.repositories.versions.get(routeUuidParam(params, "reportVersionId"), requireOrganizationId({ organizationId }));
      if (!report) throw new ApiError("REPORT_NOT_FOUND", "Report version not found.", 404);
      const assessment = await requireAssessment(deps, report.assessment_id, requireOrganizationId({ organizationId }));
      const approval = await deps.approvals.withOrganization(requireOrganizationId({ organizationId })).getForGate(body.approval_event_id, "report");
      if (!approval) throw new ApiError("APPROVAL_REQUIRED", "A valid report approval_event is required.", 409);
      try {
        return json(await new ReportApprovalService(deps.reporting).approveReport(report.report_version_id, body, contextFor(assessment, traceId, actorId!)));
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "POST",
    path: "/api/v1/reports/:reportVersionId/regenerate",
    protected: true,
    permissions: ["report:update"],
    requireActor: true,
    handler: async ({ request, params, deps, organizationId, actorId, traceId }) => {
      await parseJson(request, RegenerateReportRequestSchema);
      const report = await deps.reporting.repositories.versions.get(routeUuidParam(params, "reportVersionId"), requireOrganizationId({ organizationId }));
      if (!report) throw new ApiError("REPORT_NOT_FOUND", "Report version not found.", 404);
      const assessment = await requireAssessment(deps, report.assessment_id, requireOrganizationId({ organizationId }));
      return json(await new ReportDraftService(deps.reporting).regenerateReportDraft(report.report_version_id, {}, contextFor(assessment, traceId, actorId!)), { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/report-artifacts/:artifactId",
    protected: true,
    permissions: ["report:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const artifact = await deps.reporting.repositories.artifacts.get(routeUuidParam(params, "artifactId"), requireOrganizationId({ organizationId }));
      if (!artifact) throw new ApiError("REPORT_ARTIFACT_NOT_FOUND", "Report artifact not found.", 404);
      await requireAssessment(deps, artifact.assessment_id, requireOrganizationId({ organizationId }));
      return json(artifact, { headers: { "x-trace-id": traceId } });
    }
  },
  {
    method: "GET",
    path: "/api/v1/report-artifacts/:artifactId/download-url",
    protected: true,
    permissions: ["report:download"],
    handler: async ({ params, deps, organizationId, traceId, actorId }) => {
      const artifact = await deps.reporting.repositories.artifacts.get(routeUuidParam(params, "artifactId"), requireOrganizationId({ organizationId }));
      if (!artifact) throw new ApiError("REPORT_ARTIFACT_NOT_FOUND", "Report artifact not found.", 404);
      const assessment = await requireAssessment(deps, artifact.assessment_id, requireOrganizationId({ organizationId }));
      await new AuditEventService(deps.observability).record({
        organization_id: assessment.organization_id,
        assessment_id: assessment.assessment_id,
        actor_id: actorId,
        action: "report_downloaded",
        resource_type: "report_artifact",
        resource_id: artifact.report_artifact_id,
        outcome: "success",
        trace_id: traceId,
        metadata_safe: { format: artifact.format, artifact_type: artifact.artifact_type }
      });
      await new MetricsService(deps.observability).record({
        organization_id: assessment.organization_id,
        assessment_id: assessment.assessment_id,
        metric_name: "report_download_count",
        metric_type: "counter",
        metric_value: 1,
        unit: "count",
        dimensions: { format: artifact.format },
        trace_id: traceId
      });
      return json({ download_url: await new ReportStorageService(deps.reporting).generateDownloadUrl(artifact.report_artifact_id, contextFor(assessment, traceId)) });
    }
  },
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/exports",
    protected: true,
    permissions: ["report:create"],
    requireActor: true,
    handler: async ({ request, params, deps, organizationId, actorId, traceId }) => {
      const assessment = await requireAssessment(deps, routeUuidParam(params, "assessmentId"), requireOrganizationId({ organizationId }));
      const body = await parseJson(request, ExportRequestSchema);
      return json(await new ExportJobService(deps.reporting).requestExport(assessment.assessment_id, body.format, body.report_type, contextFor(assessment, traceId, actorId!)), { status: 202 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/exports",
    protected: true,
    permissions: ["report:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const assessment = await requireAssessment(deps, routeUuidParam(params, "assessmentId"), requireOrganizationId({ organizationId }));
      return json(await new ExportJobService(deps.reporting).listExportJobs(assessment.assessment_id, contextFor(assessment, traceId)));
    }
  },
  {
    method: "GET",
    path: "/api/v1/export-jobs/:exportJobId",
    protected: true,
    permissions: ["report:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const job = await deps.reporting.repositories.exportJobs.get(routeUuidParam(params, "exportJobId"), requireOrganizationId({ organizationId }));
      if (!job) throw new ApiError("EXPORT_JOB_NOT_FOUND", "Export job not found.", 404);
      await requireAssessment(deps, job.assessment_id, requireOrganizationId({ organizationId }));
      return json(job, { headers: { "x-trace-id": traceId } });
    }
  },
  {
    method: "POST",
    path: "/api/v1/reports/:reportVersionId/exports/:format",
    protected: true,
    permissions: ["report:create"],
    requireActor: true,
    handler: async ({ params, deps, organizationId, actorId, traceId }) => {
      const report = await deps.reporting.repositories.versions.get(routeUuidParam(params, "reportVersionId"), requireOrganizationId({ organizationId }));
      if (!report) throw new ApiError("REPORT_NOT_FOUND", "Report version not found.", 404);
      const assessment = await requireAssessment(deps, report.assessment_id, requireOrganizationId({ organizationId }));
      const format = routeUuidParam(params, "format");
      const service = new ReportRendererService(deps.reporting);
      let rendered;
      if (format === "markdown") {
        rendered = await service.renderMarkdown(report.report_version_id, contextFor(assessment, traceId, actorId!));
      } else if (format === "pdf") {
        rendered = await service.renderPdf(report.report_version_id, contextFor(assessment, traceId, actorId!));
      } else if (format === "docx") {
        rendered = await service.renderDocx(report.report_version_id, contextFor(assessment, traceId, actorId!));
      } else {
        rendered = await service.renderJson(report.report_version_id, contextFor(assessment, traceId, actorId!));
      }
      return json(await new ReportStorageService(deps.reporting).storeArtifact(report.report_version_id, rendered, contextFor(assessment, traceId, actorId!)), { status: 201 });
    }
  },
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/audit-package",
    protected: true,
    permissions: ["report:create"],
    requireActor: true,
    handler: async ({ params, deps, organizationId, actorId, traceId, request }) => {
      const assessment = await requireAssessment(deps, routeUuidParam(params, "assessmentId"), requireOrganizationId({ organizationId }));
      const locale = new URL(request.url).searchParams.get("locale") as import("@standard/schemas").SupportedLocale | null;
      try {
        const result = await new AuditPackageService(deps.reporting).generatePackage(
          assessment.assessment_id,
          contextFor(assessment, traceId, actorId!),
          locale ?? undefined
        );
        return json(result, { status: 202 });
      } catch (error) {
        return toApiError(error);
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/export-jobs/:exportJobId/download",
    protected: true,
    permissions: ["report:download"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const job = await deps.reporting.repositories.exportJobs.get(routeUuidParam(params, "exportJobId"), requireOrganizationId({ organizationId }));
      if (!job) throw new ApiError("EXPORT_JOB_NOT_FOUND", "Export job not found.", 404);
      if (job.status !== "succeeded") throw new ApiError("EXPORT_JOB_FAILED", `Export job status: ${job.status}. Only succeeded jobs can be downloaded.`, 409);
      const assessment = await requireAssessment(deps, job.assessment_id, requireOrganizationId({ organizationId }));
      return json({
        export_job_id: job.export_job_id,
        status: job.status,
        report_version_id: job.report_version_id,
        download_url: job.report_version_id
          ? await new ReportStorageService(deps.reporting).generateDownloadUrl(job.report_version_id, contextFor(assessment, traceId))
          : null,
        trace_id: traceId
      });
    }
  }
];

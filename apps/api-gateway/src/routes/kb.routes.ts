import {
  KbIndexRequestSchema,
  KbReindexDocumentRequestSchema,
  KbSearchRequestSchema,
} from "@standard/schemas";
import {
  KbIndexingService,
  KbReprocessService,
  KbSearchService,
  processKbEmbeddingJob,
} from "@standard/kb";
import { CostTrackingService, MetricsService } from "@standard/observability";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import {
  json,
  parseJson,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";

const getAssessmentContext = async (
  deps: Parameters<RouteDefinition["handler"]>[0]["deps"],
  assessmentId: string,
  organizationId: string,
) => {
  const assessment = await deps.assessments
    .withOrganization(organizationId)
    .get(assessmentId);
  if (!assessment)
    throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
  return {
    organizationId: assessment.organization_id,
    assessmentId: assessment.assessment_id,
  };
};

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

export const kbRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/kb/index",
    protected: true,
    requireActor: true,
    permissions: ["kb:index"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const assessmentContext = await getAssessmentContext(
        deps,
        routeUuidParam(params, "assessmentId"),
        requireOrganizationId({ organizationId }),
      );
      const body = await parseJson(request, KbIndexRequestSchema);
      const service = new KbIndexingService(deps.kb);
      const result = await service.indexAssessment(
        {
          ...assessmentContext,
          ...(actorId ? { actorId, requestedBy: actorId } : {}),
          traceId,
        },
        body,
      );
      return json(result, { status: 202 });
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/kb/indexing-jobs",
    protected: true,
    permissions: ["kb:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const assessment = await getAssessmentContext(
        deps,
        routeUuidParam(params, "assessmentId"),
        requireOrganizationId({ organizationId }),
      );
      const jobs =
        await deps.kb.repositories.embeddingJobs.listJobsByAssessment(
          assessment.assessmentId,
          requireOrganizationId({ organizationId }),
        );
      return json({ data: jobs, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/kb/indexing-jobs/:jobId",
    protected: true,
    permissions: ["kb:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const job = await deps.kb.repositories.embeddingJobs.getJob(
        routeUuidParam(params, "jobId"),
        requireOrganizationId({ organizationId }),
      );
      if (!job)
        throw new ApiError("NOT_FOUND", "KB indexing job not found.", 404);
      return json({ ...job, trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/documents/:documentId/kb/reindex",
    protected: true,
    requireActor: true,
    permissions: ["kb:index"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      await parseJson(request, KbReindexDocumentRequestSchema);
      const document =
        await deps.documentIngestion.repositories.documents.getDocument(
          routeUuidParam(params, "documentId"),
          requireOrganizationId({ organizationId }),
        );
      if (!document)
        throw new ApiError("NOT_FOUND", "Document not found.", 404);
      const service = new KbReprocessService(deps.kb);
      const result = await service.reindexDocument(document.document_id, {
        organizationId: document.organization_id,
        assessmentId: document.assessment_id,
        ...(actorId ? { actorId, requestedBy: actorId } : {}),
        traceId,
      });
      return json(result, { status: 202 });
    },
  },
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/kb/search",
    protected: true,
    permissions: ["kb:search"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      const assessmentContext = await getAssessmentContext(
        deps,
        routeUuidParam(params, "assessmentId"),
        requireOrganizationId({ organizationId }),
      );
      const body = await parseJson(request, KbSearchRequestSchema);
      const service = new KbSearchService(deps.kb);
      const started = Date.now();
      const result =
        body.search_type === "hybrid"
          ? await service.hybridSearch(
              {
                ...assessmentContext,
                ...(actorId ? { actorId } : {}),
                traceId,
              },
              body,
            )
          : await service.semanticSearch(
              {
                ...assessmentContext,
                ...(actorId ? { actorId } : {}),
                traceId,
              },
              body,
            );
      const queryHash = await sha256(body.query);
      await new MetricsService(deps.observability).record({
        organization_id: assessmentContext.organizationId,
        assessment_id: assessmentContext.assessmentId,
        metric_name: "kb_search_count",
        metric_type: "counter",
        metric_value: 1,
        unit: "count",
        dimensions: {
          search_type: body.search_type ?? "semantic",
          query_hash: queryHash,
        },
        trace_id: traceId,
      });
      await new MetricsService(deps.observability).record({
        organization_id: assessmentContext.organizationId,
        assessment_id: assessmentContext.assessmentId,
        metric_name: "kb_search_duration_ms",
        metric_type: "histogram",
        metric_value: Date.now() - started,
        unit: "ms",
        dimensions: {
          search_type: body.search_type ?? "semantic",
          query_hash: queryHash,
        },
        trace_id: traceId,
      });
      await new CostTrackingService(deps.observability).recordUsage({
        organization_id: assessmentContext.organizationId,
        assessment_id: assessmentContext.assessmentId,
        service_name: "vectorize",
        operation_name: "query",
        usage_quantity: 1,
        usage_unit: "query",
        provider: "cloudflare_vectorize",
        trace_id: traceId,
        metadata_safe: {
          query_hash: queryHash,
          search_type: body.search_type ?? "semantic",
        },
      });
      return json(result);
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/kb/vector-references",
    protected: true,
    permissions: ["kb:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const assessment = await getAssessmentContext(
        deps,
        routeUuidParam(params, "assessmentId"),
        requireOrganizationId({ organizationId }),
      );
      const refs = await deps.kb.repositories.vectorReferences.listByAssessment(
        assessment.assessmentId,
        requireOrganizationId({ organizationId }),
      );
      return json({ data: refs, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/documents/:documentId/kb/vector-references",
    protected: true,
    permissions: ["kb:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const document =
        await deps.documentIngestion.repositories.documents.getDocument(
          routeUuidParam(params, "documentId"),
          requireOrganizationId({ organizationId }),
        );
      if (!document)
        throw new ApiError("NOT_FOUND", "Document not found.", 404);
      const refs = await deps.kb.repositories.vectorReferences.listByDocument(
        document.document_id,
        requireOrganizationId({ organizationId }),
      );
      return json({ data: refs, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/chunks/:chunkId/context",
    protected: true,
    permissions: ["kb:read"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      const assessmentId = new URL(request.url).searchParams.get(
        "assessment_id",
      );
      if (!assessmentId)
        throw new ApiError(
          "VALIDATION_ERROR",
          "assessment_id query parameter is required.",
          400,
        );
      const assessmentContext = await getAssessmentContext(
        deps,
        assessmentId,
        requireOrganizationId({ organizationId }),
      );
      const service = new KbSearchService(deps.kb);
      const context = await service.getChunkContext(
        routeUuidParam(params, "chunkId"),
        { ...assessmentContext, traceId },
      );
      if (!context)
        throw new ApiError("NOT_FOUND", "Chunk context not found.", 404);
      return json({
        organization_id: context.chunk.organization_id,
        assessment_id: context.chunk.assessment_id,
        document_id: context.chunk.document_id,
        chunk_id: context.chunk.chunk_id,
        snippet: context.chunk.chunk_text
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500),
        ...(context.previous
          ? { previous_chunk_id: context.previous.chunk_id }
          : {}),
        ...(context.next ? { next_chunk_id: context.next.chunk_id } : {}),
        candidate_evidence: true,
        trace_id: traceId,
      });
    },
  },
  {
    method: "POST",
    path: "/api/v1/kb/indexing-jobs/:jobId/process",
    protected: true,
    requireActor: true,
    permissions: ["kb:write"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const job = await deps.kb.repositories.embeddingJobs.getJob(
        routeUuidParam(params, "jobId"),
        requireOrganizationId({ organizationId }),
      );
      if (!job || !job.chunk_id || !job.vector_reference_id)
        throw new ApiError("NOT_FOUND", "KB indexing job not found.", 404);
      await processKbEmbeddingJob(
        {
          organization_id: job.organization_id,
          assessment_id: job.assessment_id,
          document_id: job.document_id,
          chunk_id: job.chunk_id,
          vector_reference_id: job.vector_reference_id,
          job_id: job.job_id,
          embedding_model: job.embedding_model,
          vector_index_name: job.vector_index_name,
          trace_id: traceId,
          created_at: job.queued_at,
        },
        deps.kb,
      );
      const updated = await deps.kb.repositories.embeddingJobs.getJob(
        job.job_id,
        requireOrganizationId({ organizationId }),
      );
      return json(updated);
    },
  },
];

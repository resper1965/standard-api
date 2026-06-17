import {
  DocumentIngestionService,
  maxUploadSizeBytes,
  processDocumentIngestionJob,
} from "@standard/document-ingestion";
import { ReprocessDocumentRequestSchema } from "@standard/schemas";
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
import { scanForMalware } from "../utils/malware-scanner";

const mapUploadError = (error: unknown): ApiError => {
  const message =
    error instanceof Error ? error.message : "Document upload failed.";
  if (message.includes("FILE_TOO_LARGE")) {
    return new ApiError(
      "FILE_TOO_LARGE",
      "File exceeds the configured upload limit.",
      413,
    );
  }
  if (
    message.includes("UNSUPPORTED_EXTENSION") ||
    message.includes("UNSUPPORTED_MIME_TYPE") ||
    message.includes("INVALID_FILE_SIGNATURE") ||
    message.includes("INVALID_TEXT_FILE")
  ) {
    return new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Unsupported or invalid document type.",
      415,
      message.split(","),
    );
  }
  return new ApiError("INTERNAL_ERROR", "Document upload failed.", 500);
};

type UploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

const isUploadFile = (value: unknown): value is UploadFile =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  "type" in value &&
  "size" in value &&
  "arrayBuffer" in value &&
  typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function";

const readUploadForm = async (request: Request) => {
  const form = await request.formData();
  const file = form.get("file") as unknown;
  if (!isUploadFile(file)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Multipart field file is required.",
      400,
    );
  }
  if (file.size > maxUploadSizeBytes) {
    throw new ApiError(
      "FILE_TOO_LARGE",
      "File exceeds the configured upload limit.",
      413,
    );
  }
  return {
    file,
    metadata: {
      ...(form.get("classification")
        ? { classification: form.get("classification")!.toString() }
        : {}),
      ...(form.get("document_type")
        ? { documentType: form.get("document_type")!.toString() }
        : {}),
      ...(form.get("language")
        ? { language: form.get("language")!.toString() }
        : {}),
      ...(form.get("version_label")
        ? { versionLabel: form.get("version_label")!.toString() }
        : {}),
      ...(form.get("effective_date")
        ? { effectiveDate: form.get("effective_date")!.toString() }
        : {}),
    },
  };
};

export const documentsRoutes: RouteDefinition[] = [
  {
    method: "POST",
    idempotencyRequired: true,
    path: "/api/v1/assessments/:assessmentId/documents",
    protected: true,
    requireActor: true,
    permissions: ["document:upload"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
      env,
    }) => {
      const assessmentId = routeUuidParam(params, "assessmentId");
      const tenantAssessmentsDb = deps.assessments.withOrganization(
        requireOrganizationId({ organizationId }),
      );
      const assessment = await tenantAssessmentsDb.get(assessmentId);
      if (!assessment)
        throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      const { file, metadata } = await readUploadForm(request);

      // Anti-malware scan before persisting
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const scanResult = await scanForMalware(
        fileBytes,
        file.name,
        env?.CLAMAV_API_URL,
        env?.STANDARD_ENV === "production",
      );
      if (!scanResult.clean) {
        throw new ApiError(
          "MALWARE_DETECTED" as any,
          `File rejected: malware threat detected (${scanResult.threat}).`,
          422,
          [
            {
              threat: scanResult.threat,
              scanner: scanResult.scanner,
              scanned_at: scanResult.scanned_at,
            },
          ],
        );
      }

      const service = new DocumentIngestionService(deps.documentIngestion);
      try {
        const result = await service.uploadDocument({
          documentId: newId(),
          jobId: newId(),
          file: {
            originalFilename: file.name,
            mimeType: file.type,
            bytes: fileBytes,
          },
          context: {
            organizationId: assessment.organization_id,
            assessmentId: assessment.assessment_id,
            actorId: actorId!,
            traceId,
            now: new Date().toISOString(),
          },
          metadata,
        });

        await tenantAssessmentsDb.save({
          ...assessment,
          snapshot: {
            ...assessment.snapshot,
            documentCount: assessment.snapshot.documentCount + 1,
          },
        });

        const tenantJobsDb =
          deps.documentIngestion.repositories.jobs.withOrganization(
            requireOrganizationId({ organizationId }),
          );
        const job = await tenantJobsDb.getJob(result.message.job_id);
        return json(
          { document: result.document, job, trace_id: traceId },
          { status: 202 },
        );
      } catch (error) {
        throw mapUploadError(error);
      }
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/documents",
    protected: true,
    permissions: ["document:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantDocDb =
        deps.documentIngestion.repositories.documents.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const documents = await tenantDocDb.listDocuments(
        routeUuidParam(params, "assessmentId"),
      );
      return json({ data: documents, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/documents/:documentId",
    protected: true,
    permissions: ["document:read"],
    handler: async ({ deps, params, organizationId }) => {
      const tenantDocDb =
        deps.documentIngestion.repositories.documents.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const document = await tenantDocDb.getDocument(
        routeUuidParam(params, "documentId"),
      );
      if (!document)
        throw new ApiError("NOT_FOUND", "Document not found.", 404);
      return json(document);
    },
  },
  {
    method: "GET",
    path: "/api/v1/documents/:documentId/chunks",
    protected: true,
    permissions: ["document:read"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      const url = new URL(request.url);
      const limit = Math.min(
        Number.parseInt(url.searchParams.get("limit") ?? "25", 10),
        100,
      );
      const cursor = url.searchParams.get("cursor") ?? undefined;
      const tenantChunksDb =
        deps.documentIngestion.repositories.chunks.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const chunks = await tenantChunksDb.listChunks(
        routeUuidParam(params, "documentId"),
        limit,
        cursor,
      );
      return json({ data: chunks, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/documents/:documentId/jobs",
    protected: true,
    permissions: ["document:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantJobDb =
        deps.documentIngestion.repositories.jobs.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const jobs = await tenantJobDb.listJobsByDocument(
        routeUuidParam(params, "documentId"),
      );
      return json({ data: jobs, trace_id: traceId });
    },
  },
  {
    method: "POST",
    idempotencyRequired: true,
    path: "/api/v1/documents/:documentId/reprocess",
    protected: true,
    requireActor: true,
    permissions: ["document:reprocess"],
    handler: async ({
      request,
      deps,
      params,
      organizationId,
      actorId,
      traceId,
    }) => {
      await parseJson(request, ReprocessDocumentRequestSchema);
      const tenantDocDb =
        deps.documentIngestion.repositories.documents.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const tenantJobDb =
        deps.documentIngestion.repositories.jobs.withOrganization(
          requireOrganizationId({ organizationId }),
        );

      const document = await tenantDocDb.getDocument(
        routeUuidParam(params, "documentId"),
      );
      if (!document)
        throw new ApiError("NOT_FOUND", "Document not found.", 404);

      const job = {
        job_id: newId(),
        organization_id: document.organization_id,
        assessment_id: document.assessment_id,
        document_id: document.document_id,
        job_type: "reprocess" as const,
        status: "queued" as const,
        attempt_count: 0,
        queued_at: new Date().toISOString(),
        trace_id: traceId,
        metadata: { reprocess_requested_by: actorId },
      };
      await tenantJobDb.saveJob(job);
      await deps.documentIngestion.queue.enqueue({
        organization_id: document.organization_id,
        assessment_id: document.assessment_id,
        document_id: document.document_id,
        job_id: job.job_id,
        storage_key: document.storage_key,
        mime_type: document.mime_type,
        trace_id: traceId,
        requested_by: actorId!,
        created_at: job.queued_at,
      });
      return json(job, { status: 202 });
    },
  },
  {
    method: "DELETE",
    path: "/api/v1/documents/:documentId",
    protected: true,
    requireActor: true,
    permissions: ["document:delete"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantDocDb =
        deps.documentIngestion.repositories.documents.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const document = await tenantDocDb.getDocument(
        routeUuidParam(params, "documentId"),
      );
      if (!document)
        throw new ApiError("NOT_FOUND", "Document not found.", 404);
      const archived = {
        ...document,
        status: "archived" as const,
        trace_id: traceId,
      };
      await tenantDocDb.updateDocument(archived);
      return json(archived);
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/ingestion-jobs",
    protected: true,
    permissions: ["document:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantJobsDb =
        deps.documentIngestion.repositories.jobs.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const jobs = await tenantJobsDb.listJobsByAssessment(
        routeUuidParam(params, "assessmentId"),
      );
      return json({ data: jobs, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ingestion-jobs/:jobId",
    protected: true,
    permissions: ["document:read"],
    handler: async ({ deps, params, organizationId }) => {
      const tenantJobsDb =
        deps.documentIngestion.repositories.jobs.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const job = await tenantJobsDb.getJob(routeUuidParam(params, "jobId"));
      if (!job)
        throw new ApiError("NOT_FOUND", "Ingestion job not found.", 404);
      return json(job);
    },
  },
  {
    method: "POST",
    idempotencyRequired: true,
    path: "/api/v1/documents/:documentId/submit-for-embedding",
    protected: true,
    requireActor: true,
    permissions: ["document:write"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantDocDb =
        deps.documentIngestion.repositories.documents.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const document = await tenantDocDb.getDocument(
        routeUuidParam(params, "documentId"),
      );
      if (!document)
        throw new ApiError("NOT_FOUND", "Document not found.", 404);
      const updated = {
        ...document,
        status: "queued_for_embedding" as const,
        trace_id: traceId,
      };
      await tenantDocDb.updateDocument(updated);
      return json(updated, { status: 202 });
    },
  },
  {
    method: "POST",
    idempotencyRequired: true,
    path: "/api/v1/ingestion-jobs/:jobId/process",
    protected: true,
    requireActor: true,
    permissions: ["document:write"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const tenantJobsDb =
        deps.documentIngestion.repositories.jobs.withOrganization(
          requireOrganizationId({ organizationId }),
        );
      const tenantDocDb =
        deps.documentIngestion.repositories.documents.withOrganization(
          requireOrganizationId({ organizationId }),
        );

      const job = await tenantJobsDb.getJob(routeUuidParam(params, "jobId"));
      if (!job)
        throw new ApiError("NOT_FOUND", "Ingestion job not found.", 404);
      const document = await tenantDocDb.getDocument(job.document_id);
      if (!document)
        throw new ApiError("NOT_FOUND", "Document not found.", 404);
      await processDocumentIngestionJob(
        {
          organization_id: job.organization_id,
          assessment_id: job.assessment_id,
          document_id: job.document_id,
          job_id: job.job_id,
          storage_key: document.storage_key,
          mime_type: document.mime_type,
          trace_id: traceId,
          requested_by: document.uploaded_by,
          created_at: job.queued_at,
        },
        deps.documentIngestion,
      );
      const updated = await tenantJobsDb.getJob(job.job_id);
      return json(updated);
    },
  },
];

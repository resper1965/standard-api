import {
  CreatePrivacyActivityRequestSchema,
  UpdatePrivacyActivityRequestSchema,
  UpdatePrivacyActivityStatusRequestSchema,
  CreatePrivacyDataSubjectRequestSchema,
  CreatePrivacyDataCategoryRequestSchema,
  CreatePrivacyThirdPartyRequestSchema,
  CreatePrivacyFieldReviewRequestSchema,
  UpdatePrivacyFieldReviewRequestSchema,
  PrivacyCrudService,
  PrivacyCompletenessService,
  PrivacyStatusService,
  PrivacyScreeningService,
  PrivacyAiService,
  PrivacyReportService,
  PrivacyError,
} from "@standard/privacy";
import {
  RopaAnalyzerUseCase,
  DpiaAssessorUseCase,
  VendorScannerUseCase,
} from "@standard/agent-runtime";
import { z } from "zod";
import {
  VendorScannerInputSchema,
  VendorScannerBatchInputSchema,
  VendorScannerOutputSchema,
} from "../openapi/schemas";
import { ApiError } from "../errors/api-error";
import type { ApiErrorCode } from "../errors/error-codes";
import type { RouteDefinition } from "../http";
import {
  json,
  parseJson,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";

const toApiError = (error: unknown): never => {
  if (error instanceof PrivacyError) {
    throw new ApiError(
      error.code as ApiErrorCode,
      error.message.replace(`${error.code}: `, ""),
      error.code.endsWith("_NOT_FOUND") ? 404 : 400,
      [error.details],
    );
  }
  throw error;
};

const privacyContext = (ctx: any) => ({
  organizationId: requireOrganizationId(ctx),
  actorId: ctx.actorId,
  traceId: ctx.traceId,
});

export const privacyRoutes: RouteDefinition[] = [
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 1: Activity CRUD
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          CreatePrivacyActivityRequestSchema,
        );
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.createActivity(body, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.activity.created", {
          activity_id: result.id,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const url = new URL(ctx.request.url);
      const filters = {
        status: url.searchParams.get("status") ?? undefined,
        assessment_id: url.searchParams.get("assessment_id") ?? undefined,
        limit: url.searchParams.has("limit")
          ? Math.min(Number(url.searchParams.get("limit")), 100)
          : undefined,
        offset: url.searchParams.has("offset")
          ? Number(url.searchParams.get("offset"))
          : undefined,
      };
      const results = await svc.listActivities(
        requireOrganizationId(ctx),
        filters,
      );
      return json({ data: results, trace_id: ctx.traceId });
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const activity = await svc.getActivity(
        routeUuidParam(ctx.params, "id"),
        requireOrganizationId(ctx),
      );
      if (!activity)
        throw new ApiError("NOT_FOUND", "Processing activity not found.", 404);
      return json({ data: activity, trace_id: ctx.traceId });
    },
  },

  {
    method: "PUT",
    path: "/api/v1/privacy/processing-activities/:id",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          UpdatePrivacyActivityRequestSchema,
        );
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.updateActivity(
          routeUuidParam(ctx.params, "id"),
          body,
          privacyContext(ctx),
        );
        await ctx.deps.audit.record("privacy.activity.updated", {
          activity_id: result.id,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  {
    method: "DELETE",
    path: "/api/v1/privacy/processing-activities/:id",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const id = routeUuidParam(ctx.params, "id");
        await svc.deleteActivity(id, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.activity.deleted", {
          activity_id: id,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: { deleted: true }, trace_id: ctx.traceId });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Status + Completeness
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/status",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          UpdatePrivacyActivityStatusRequestSchema,
        );
        const svc = new PrivacyStatusService(ctx.deps.privacy);
        const result = await svc.transition(
          routeUuidParam(ctx.params, "id"),
          body.status,
          privacyContext(ctx),
          body.reason,
        );
        await ctx.deps.audit.record("privacy.activity.status_changed", {
          activity_id: routeUuidParam(ctx.params, "id"),
          ...result,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/completeness",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const svc = new PrivacyCompletenessService(ctx.deps.privacy);
        const result = await svc.analyze(
          routeUuidParam(ctx.params, "id"),
          requireOrganizationId(ctx),
        );
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Data Subjects
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/data-subjects",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          CreatePrivacyDataSubjectRequestSchema.array().min(1),
        );
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.addDataSubjects(
          routeUuidParam(ctx.params, "id"),
          body,
          privacyContext(ctx),
        );
        await ctx.deps.audit.record("privacy.data_subjects.added", {
          activity_id: routeUuidParam(ctx.params, "id"),
          count: result.length,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/data-subjects",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const result = await svc.listDataSubjects(
        routeUuidParam(ctx.params, "id"),
        requireOrganizationId(ctx),
      );
      return json({ data: result, trace_id: ctx.traceId });
    },
  },

  {
    method: "DELETE",
    path: "/api/v1/privacy/processing-activities/:id/data-subjects/:subjectId",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      await svc.removeDataSubject(
        routeUuidParam(ctx.params, "subjectId"),
        requireOrganizationId(ctx),
      );
      await ctx.deps.audit.record("privacy.data_subject.removed", {
        subject_id: routeUuidParam(ctx.params, "subjectId"),
        organization_id: ctx.organizationId,
        trace_id: ctx.traceId,
      });
      return json({ data: { deleted: true }, trace_id: ctx.traceId });
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Data Categories
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/data-categories",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          CreatePrivacyDataCategoryRequestSchema.array().min(1),
        );
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.addDataCategories(
          routeUuidParam(ctx.params, "id"),
          body,
          privacyContext(ctx),
        );
        await ctx.deps.audit.record("privacy.data_categories.added", {
          activity_id: routeUuidParam(ctx.params, "id"),
          count: result.length,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/data-categories",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const result = await svc.listDataCategories(
        routeUuidParam(ctx.params, "id"),
        requireOrganizationId(ctx),
      );
      return json({ data: result, trace_id: ctx.traceId });
    },
  },

  {
    method: "DELETE",
    path: "/api/v1/privacy/processing-activities/:id/data-categories/:categoryId",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      await svc.removeDataCategory(
        routeUuidParam(ctx.params, "categoryId"),
        requireOrganizationId(ctx),
      );
      await ctx.deps.audit.record("privacy.data_category.removed", {
        category_id: routeUuidParam(ctx.params, "categoryId"),
        organization_id: ctx.organizationId,
        trace_id: ctx.traceId,
      });
      return json({ data: { deleted: true }, trace_id: ctx.traceId });
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 2: Third Parties
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/third-parties",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          CreatePrivacyThirdPartyRequestSchema.array().min(1),
        );
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.addThirdParties(
          routeUuidParam(ctx.params, "id"),
          body,
          privacyContext(ctx),
        );
        await ctx.deps.audit.record("privacy.third_parties.added", {
          activity_id: routeUuidParam(ctx.params, "id"),
          count: result.length,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/third-parties",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const result = await svc.listThirdParties(
        routeUuidParam(ctx.params, "id"),
        requireOrganizationId(ctx),
      );
      return json({ data: result, trace_id: ctx.traceId });
    },
  },

  {
    method: "DELETE",
    path: "/api/v1/privacy/processing-activities/:id/third-parties/:partyId",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      await svc.removeThirdParty(
        routeUuidParam(ctx.params, "partyId"),
        requireOrganizationId(ctx),
      );
      await ctx.deps.audit.record("privacy.third_party.removed", {
        party_id: routeUuidParam(ctx.params, "partyId"),
        organization_id: ctx.organizationId,
        trace_id: ctx.traceId,
      });
      return json({ data: { deleted: true }, trace_id: ctx.traceId });
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 3: Screenings (DPIA / LIA / TIA)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/screen",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const svc = new PrivacyScreeningService(ctx.deps.privacy);
        const result = await svc.screen(
          routeUuidParam(ctx.params, "id"),
          privacyContext(ctx),
        );
        await ctx.deps.audit.record("privacy.screening.executed", {
          activity_id: routeUuidParam(ctx.params, "id"),
          results: result.length,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/screenings",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyScreeningService(ctx.deps.privacy);
      const result = await svc.listScreenings(
        routeUuidParam(ctx.params, "id"),
        requireOrganizationId(ctx),
      );
      return json({ data: result, trace_id: ctx.traceId });
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 4: Field Reviews (Human-in-the-Loop)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/field-reviews",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          CreatePrivacyFieldReviewRequestSchema,
        );
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.addFieldReview(
          routeUuidParam(ctx.params, "id"),
          body,
          privacyContext(ctx),
        );
        await ctx.deps.audit.record("privacy.field_review.created", {
          activity_id: routeUuidParam(ctx.params, "id"),
          field: body.field_name,
          source: body.source,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/field-reviews",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const result = await svc.listFieldReviews(
        routeUuidParam(ctx.params, "id"),
        requireOrganizationId(ctx),
      );
      return json({ data: result, trace_id: ctx.traceId });
    },
  },

  {
    method: "PUT",
    path: "/api/v1/privacy/processing-activities/:id/field-reviews/:reviewId",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          UpdatePrivacyFieldReviewRequestSchema,
        );
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.updateFieldReview(
          routeUuidParam(ctx.params, "reviewId"),
          body,
          privacyContext(ctx),
        );
        await ctx.deps.audit.record("privacy.field_review.updated", {
          review_id: routeUuidParam(ctx.params, "reviewId"),
          status: body.review_status,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 6: AI Extraction (Text â†’ ROPA)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/from-text",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          z.object({
            text: z.string().min(10).max(50000),
          }),
        );
        const svc = new PrivacyAiService(ctx.deps.privacy);
        const result = await svc.extractFromText(
          body.text,
          privacyContext(ctx),
        );
        await ctx.deps.audit.record("privacy.ai.extraction", {
          activity_id: result.activity.id,
          confidence: result.confidence,
          agent_model: result.agent_model,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) {
        return toApiError(e);
      }
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 6.1: Agentic Structured Output (ROPA Analyzer)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/analyze-ropa",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          z.object({
            text: z.string().min(5).max(50000),
          }),
        );

        // Use default Cloudflare Workers AI or another provider configured in app deps
        // We assume agentRuntime.llm is available
        const llmProvider = ctx.deps.agentRuntime.llm;
        if (!llmProvider) {
          throw new ApiError(
            "INTERNAL_ERROR",
            "LLM Provider is not configured in dependencies.",
            500,
          );
        }

        const usecase = new RopaAnalyzerUseCase(llmProvider);
        const result = await usecase.analyze({
          naturalLanguageDescription: body.text,
          organizationId: requireOrganizationId(ctx),
        });

        await ctx.deps.audit.record("privacy.ropa.analyzed", {
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        console.error("[POST /api/v1/privacy/analyze-ropa] Failure:", e);
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          "INTERNAL_ERROR",
          `Agent generation failed: ${e instanceof Error ? e.message : String(e)}`,
          500,
          e instanceof Error ? [e.message] : [],
        );
      }
    },
  },

  {
    method: "POST",
    path: "/api/v1/privacy/assess-dpia",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        // Zod enforcement for Agentic Chaining
        // The API explicitly rejects requests if 'ropaContext' from upstream agent is missing.
        const body = await parseJson(
          ctx.request,
          z.object({
            projectDescription: z.string().min(5),
            ropaContext: z.object({
              suggested_risk_level: z.enum([
                "low",
                "medium",
                "high",
                "critical",
              ]),
              required_controls: z.array(
                z.object({
                  control_id: z.string(),
                  name: z.string(),
                  reason: z.string(),
                }),
              ),
              suggested_legal_basis: z.string(),
              is_dpia_required: z.boolean(),
            }),
          }),
        );

        const llmProvider = ctx.deps.agentRuntime.llm;
        if (!llmProvider) {
          throw new ApiError(
            "INTERNAL_ERROR",
            "LLM Provider is not configured in dependencies.",
            500,
          );
        }

        const usecase = new DpiaAssessorUseCase(llmProvider);
        const result = await usecase.assess({
          ropaContext: body.ropaContext,
          projectDescription: body.projectDescription,
          organizationId: requireOrganizationId(ctx),
        });

        await ctx.deps.audit.record("privacy.dpia.assessed", {
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
          draft: result.is_draft,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        console.error("[POST /api/v1/privacy/assess-dpia] Failure:", e);
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          "INTERNAL_ERROR",
          `Agent DPIA assessment failed: ${e instanceof Error ? e.message : String(e)}`,
          500,
          e instanceof Error ? [e.message] : [],
        );
      }
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 6.2: Vendor Risk Contract Scanner
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "POST",
    path: "/api/v1/privacy/scan-vendor-contract/batch",
    authRequired: true,
    tenantRequired: true,
    bodySchema: z.object({
      batch_id: z.string().optional(),
      items: z
        .array(
          z.object({
            correlation_id: z.string(),
            payload: z.object({
              vendorName: z.string().min(2),
              contractExcerpt: z.string().min(20),
            }),
          }),
        )
        .max(500),
    }),
    handler: async (ctx) => {
      const body = ctx.validatedBody as {
        batch_id?: string;
        items: {
          correlation_id: string;
          payload: { vendorName: string; contractExcerpt: string };
        }[];
      };
      const jobId = crypto.randomUUID();

      const backgroundTask = async () => {
        const llmProvider = ctx.deps.agentRuntime.llm;
        if (!llmProvider) return;
        const usecase = new VendorScannerUseCase(llmProvider);

        const results = await Promise.allSettled(
          body.items.map(async (item) => {
            const result = await usecase.scan({
              vendorName: item.payload.vendorName,
              contractExcerpt: item.payload.contractExcerpt,
              organizationId: requireOrganizationId(ctx),
            });
            await ctx.deps.audit.record(
              "privacy.vendor_contract.batch.item_evaluated",
              {
                job_id: jobId,
                correlation_id: item.correlation_id,
                vendor: item.payload.vendorName,
                compliant: result.is_dpa_compliant,
              },
            );
            return result;
          }),
        );

        await ctx.deps.audit.record("privacy.vendor_contract.batch.completed", {
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
    openapi: {
      summary: "Scan Vendor Contracts in Bulk (Async)",
      description:
        "Dispatches long-running analysis across up to 500 contract snippets simultaneously. Returns a jobId for polling.",
      request: {
        body: {
          content: {
            "application/json": {
              schema: VendorScannerBatchInputSchema,
            },
          },
        },
      },
      responses: {
        202: {
          description: "Batch job dispatched successfully",
          content: {
            "application/json": {
              schema: z.object({ status: z.string(), job_id: z.string() }),
            },
          },
        },
      },
    },
  },

  {
    method: "POST",
    path: "/api/v1/privacy/scan-vendor-contract",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(
          ctx.request,
          z.object({
            vendorName: z.string().min(2),
            contractExcerpt: z.string().min(20),
          }),
        );

        const llmProvider = ctx.deps.agentRuntime.llm;
        if (!llmProvider) {
          throw new ApiError(
            "INTERNAL_ERROR",
            "LLM Provider is not configured in dependencies.",
            500,
          );
        }

        const usecase = new VendorScannerUseCase(llmProvider);
        const result = await usecase.scan({
          vendorName: body.vendorName,
          contractExcerpt: body.contractExcerpt,
          organizationId: requireOrganizationId(ctx),
        });

        await ctx.deps.audit.record("vendor.contract.scanned", {
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
          vendor: body.vendorName,
          complete_dpa: result.is_dpa_compliant,
        });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        console.error(
          "[POST /api/v1/privacy/scan-vendor-contract] Failure:",
          e,
        );
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          "INTERNAL_ERROR",
          `Agent Vendor Contract Scanning failed: ${e instanceof Error ? e.message : String(e)}`,
          500,
          e instanceof Error ? [e.message] : [],
        );
      }
    },
    openapi: {
      summary: "B2B Legal Analyzer (Vendor Risk Scanner)",
      description:
        "Transforms raw contract text into executive intelligence about sub-processors and LGPD/GDPR privacy compliance.",
      request: {
        body: {
          content: {
            "application/json": {
              schema: VendorScannerInputSchema,
            },
          },
        },
      },
      responses: {
        200: {
          description: "Vendor risks and compliance gaps",
          content: {
            "application/json": { schema: VendorScannerOutputSchema },
          },
        },
      },
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // DPMP: Data Privacy Management Principles
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "GET",
    path: "/api/v1/dpmp/principles",
    authRequired: true,
    handler: async (ctx) => {
      const url = new URL(ctx.request.url);
      const scfVersionId = url.searchParams.get("scf_version") ?? undefined;
      const domain = url.searchParams.get("domain") ?? undefined;
      const frameworkId = url.searchParams.get("framework_id") ?? undefined;
      const q = url.searchParams.get("q") ?? undefined;
      const limit = url.searchParams.get("limit")
        ? parseInt(url.searchParams.get("limit")!, 10)
        : 100;
      const offset = url.searchParams.get("offset")
        ? parseInt(url.searchParams.get("offset")!, 10)
        : 0;

      const principles = await (ctx.deps as any).dpmp.listPrinciples({
        scf_version_id: scfVersionId,
        domain: domain as any,
        framework_id: frameworkId,
        q,
        limit,
        offset,
      });
      return json({
        data: principles,
        total: principles.length,
        trace_id: ctx.traceId,
      });
    },
  },

  {
    method: "GET",
    path: "/api/v1/dpmp/principles/:principleId",
    authRequired: true,
    handler: async (ctx) => {
      const principleId = routeParam(ctx.params, "principleId");
      const principle = await (ctx.deps as any).dpmp.getPrincipleWithMappings(
        principleId,
      );
      if (!principle)
        throw new ApiError("NOT_FOUND", "DPMP principle not found.", 404);
      return json({ ...principle, trace_id: ctx.traceId });
    },
  },

  {
    method: "GET",
    path: "/api/v1/dpmp/domains",
    authRequired: true,
    handler: async (ctx) => {
      const url = new URL(ctx.request.url);
      const scfVersionId = url.searchParams.get("scf_version") ?? undefined;
      const domains = await (ctx.deps as any).dpmp.listDomains(scfVersionId);
      return json({ data: domains, trace_id: ctx.traceId });
    },
  },

  {
    method: "GET",
    path: "/api/v1/dpmp/frameworks",
    authRequired: true,
    handler: async (ctx) => {
      const url = new URL(ctx.request.url);
      const scfVersionId = url.searchParams.get("scf_version") ?? undefined;
      const frameworks = await (ctx.deps as any).dpmp.listFrameworks(
        scfVersionId,
      );
      return json({ data: frameworks, trace_id: ctx.traceId });
    },
  },

  {
    method: "GET",
    path: "/api/v1/dpmp/frameworks/:frameworkId/principles",
    authRequired: true,
    handler: async (ctx) => {
      const frameworkId = routeParam(ctx.params, "frameworkId");
      const url = new URL(ctx.request.url);
      const scfVersionId = url.searchParams.get("scf_version") ?? undefined;
      const principles = await (ctx.deps as any).dpmp.listPrinciplesByFramework(
        frameworkId,
        scfVersionId,
      );
      return json({
        framework_id: frameworkId,
        data: principles,
        total: principles.length,
        trace_id: ctx.traceId,
      });
    },
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Phase 7: Report Generation
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/report",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const url = new URL(ctx.request.url);
        const format =
          url.searchParams.get("format") === "markdown"
            ? ("markdown" as const)
            : ("json" as const);
        const svc = new PrivacyReportService(ctx.deps.privacy);
        const result = await svc.generateReport(
          routeUuidParam(ctx.params, "id"),
          requireOrganizationId(ctx),
          format,
        );
        await ctx.deps.audit.record("privacy.report.generated", {
          activity_id: routeUuidParam(ctx.params, "id"),
          format,
          report_id: result.report_id,
          organization_id: ctx.organizationId,
          trace_id: ctx.traceId,
        });
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) {
        return toApiError(e);
      }
    },
  },
];

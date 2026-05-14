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
import { RopaAnalyzerUseCase, DpiaAssessorUseCase, VendorScannerUseCase } from "@standard/agent-runtime";
import { z } from "zod";
import { ApiError } from "../errors/api-error";
import type { ApiErrorCode } from "../errors/error-codes";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";

const toApiError = (error: unknown): never => {
  if (error instanceof PrivacyError) {
    throw new ApiError(
      error.code as ApiErrorCode,
      error.message.replace(`${error.code}: `, ""),
      error.code.endsWith("_NOT_FOUND") ? 404 : 400,
      [error.details]
    );
  }
  throw error;
};

const privacyContext = (ctx: any) => ({
  tenantId: ctx.tenantId!,
  actorId: ctx.actorId,
  traceId: ctx.traceId,
});

export const privacyRoutes: RouteDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Phase 1: Activity CRUD
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, CreatePrivacyActivityRequestSchema);
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.createActivity(body, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.activity.created", { activity_id: result.id, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) { return toApiError(e); }
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
        limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
        offset: url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : undefined,
      };
      const results = await svc.listActivities(ctx.tenantId!, filters);
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
      const activity = await svc.getActivity(routeParam(ctx.params, "id"), ctx.tenantId!);
      if (!activity) throw new ApiError("NOT_FOUND", "Processing activity not found.", 404);
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
        const body = await parseJson(ctx.request, UpdatePrivacyActivityRequestSchema);
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.updateActivity(routeParam(ctx.params, "id"), body, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.activity.updated", { activity_id: result.id, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) { return toApiError(e); }
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
        const id = routeParam(ctx.params, "id");
        await svc.deleteActivity(id, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.activity.deleted", { activity_id: id, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: { deleted: true }, trace_id: ctx.traceId });
      } catch (e) { return toApiError(e); }
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Status + Completeness
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/status",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, UpdatePrivacyActivityStatusRequestSchema);
        const svc = new PrivacyStatusService(ctx.deps.privacy);
        const result = await svc.transition(routeParam(ctx.params, "id"), body.status, privacyContext(ctx), body.reason);
        await ctx.deps.audit.record("privacy.activity.status_changed", { activity_id: routeParam(ctx.params, "id"), ...result, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) { return toApiError(e); }
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
        const result = await svc.analyze(routeParam(ctx.params, "id"), ctx.tenantId!);
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) { return toApiError(e); }
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Data Subjects
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/data-subjects",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, CreatePrivacyDataSubjectRequestSchema.array().min(1));
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.addDataSubjects(routeParam(ctx.params, "id"), body, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.data_subjects.added", { activity_id: routeParam(ctx.params, "id"), count: result.length, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) { return toApiError(e); }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/data-subjects",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const result = await svc.listDataSubjects(routeParam(ctx.params, "id"), ctx.tenantId!);
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
      await svc.removeDataSubject(routeParam(ctx.params, "subjectId"), ctx.tenantId!);
      await ctx.deps.audit.record("privacy.data_subject.removed", { subject_id: routeParam(ctx.params, "subjectId"), tenant_id: ctx.tenantId, trace_id: ctx.traceId });
      return json({ data: { deleted: true }, trace_id: ctx.traceId });
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Data Categories
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/data-categories",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, CreatePrivacyDataCategoryRequestSchema.array().min(1));
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.addDataCategories(routeParam(ctx.params, "id"), body, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.data_categories.added", { activity_id: routeParam(ctx.params, "id"), count: result.length, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) { return toApiError(e); }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/data-categories",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const result = await svc.listDataCategories(routeParam(ctx.params, "id"), ctx.tenantId!);
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
      await svc.removeDataCategory(routeParam(ctx.params, "categoryId"), ctx.tenantId!);
      await ctx.deps.audit.record("privacy.data_category.removed", { category_id: routeParam(ctx.params, "categoryId"), tenant_id: ctx.tenantId, trace_id: ctx.traceId });
      return json({ data: { deleted: true }, trace_id: ctx.traceId });
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Phase 2: Third Parties
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/third-parties",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, CreatePrivacyThirdPartyRequestSchema.array().min(1));
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.addThirdParties(routeParam(ctx.params, "id"), body, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.third_parties.added", { activity_id: routeParam(ctx.params, "id"), count: result.length, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) { return toApiError(e); }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/third-parties",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const result = await svc.listThirdParties(routeParam(ctx.params, "id"), ctx.tenantId!);
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
      await svc.removeThirdParty(routeParam(ctx.params, "partyId"), ctx.tenantId!);
      await ctx.deps.audit.record("privacy.third_party.removed", { party_id: routeParam(ctx.params, "partyId"), tenant_id: ctx.tenantId, trace_id: ctx.traceId });
      return json({ data: { deleted: true }, trace_id: ctx.traceId });
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Phase 3: Screenings (DPIA / LIA / TIA)
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/screen",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const svc = new PrivacyScreeningService(ctx.deps.privacy);
        const result = await svc.screen(routeParam(ctx.params, "id"), privacyContext(ctx));
        await ctx.deps.audit.record("privacy.screening.executed", { activity_id: routeParam(ctx.params, "id"), results: result.length, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) { return toApiError(e); }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/screenings",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyScreeningService(ctx.deps.privacy);
      const result = await svc.listScreenings(routeParam(ctx.params, "id"), ctx.tenantId!);
      return json({ data: result, trace_id: ctx.traceId });
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Phase 4: Field Reviews (Human-in-the-Loop)
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/:id/field-reviews",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, CreatePrivacyFieldReviewRequestSchema);
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.addFieldReview(routeParam(ctx.params, "id"), body, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.field_review.created", { activity_id: routeParam(ctx.params, "id"), field: body.field_name, source: body.source, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) { return toApiError(e); }
    },
  },

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/field-reviews",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      const svc = new PrivacyCrudService(ctx.deps.privacy);
      const result = await svc.listFieldReviews(routeParam(ctx.params, "id"), ctx.tenantId!);
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
        const body = await parseJson(ctx.request, UpdatePrivacyFieldReviewRequestSchema);
        const svc = new PrivacyCrudService(ctx.deps.privacy);
        const result = await svc.updateFieldReview(routeParam(ctx.params, "reviewId"), body, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.field_review.updated", { review_id: routeParam(ctx.params, "reviewId"), status: body.review_status, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) { return toApiError(e); }
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Phase 6: AI Extraction (Text → ROPA)
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/processing-activities/from-text",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, z.object({
          text: z.string().min(10).max(50000),
        }));
        const svc = new PrivacyAiService(ctx.deps.privacy);
        const result = await svc.extractFromText(body.text, privacyContext(ctx));
        await ctx.deps.audit.record("privacy.ai.extraction", { activity_id: result.activity.id, confidence: result.confidence, agent_model: result.agent_model, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId }, { status: 201 });
      } catch (e) { return toApiError(e); }
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Phase 6.1: Agentic Structured Output (ROPA Analyzer)
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/analyze-ropa",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, z.object({
          text: z.string().min(5).max(50000),
        }));
        
        // Use default Cloudflare Workers AI or another provider configured in app deps
        // We assume agentRuntime.llm is available
        const llmProvider = ctx.deps.agentRuntime.llm; 
        if (!llmProvider) {
          throw new ApiError("INTERNAL_ERROR", "LLM Provider is not configured in dependencies.", 500);
        }

        const usecase = new RopaAnalyzerUseCase(llmProvider);
        const result = await usecase.analyze({
          naturalLanguageDescription: body.text,
          tenantId: ctx.tenantId!
        });
        
        await ctx.deps.audit.record("privacy.ropa.analyzed", { tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("INTERNAL_ERROR", "Agent generation failed", 500);
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
        const body = await parseJson(ctx.request, z.object({
          projectDescription: z.string().min(5),
          ropaContext: z.object({
            suggested_risk_level: z.enum(["low", "medium", "high", "critical"]),
            required_controls: z.array(z.object({
              control_id: z.string(),
              name: z.string(),
              reason: z.string()
            })),
            suggested_legal_basis: z.string(),
            is_dpia_required: z.boolean()
          })
        }));
        
        const llmProvider = ctx.deps.agentRuntime.llm; 
        if (!llmProvider) {
          throw new ApiError("INTERNAL_ERROR", "LLM Provider is not configured in dependencies.", 500);
        }

        const usecase = new DpiaAssessorUseCase(llmProvider);
        const result = await usecase.assess({
          ropaContext: body.ropaContext,
          projectDescription: body.projectDescription,
          tenantId: ctx.tenantId!
        });
        
        await ctx.deps.audit.record("privacy.dpia.assessed", { tenant_id: ctx.tenantId, trace_id: ctx.traceId, draft: result.is_draft });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("INTERNAL_ERROR", "Agent DPIA assessment failed", 500);
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Phase 6.2: Vendor Risk Contract Scanner
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "POST",
    path: "/api/v1/privacy/scan-vendor-contract",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const body = await parseJson(ctx.request, z.object({
          vendorName: z.string().min(2),
          contractExcerpt: z.string().min(20)
        }));
        
        const llmProvider = ctx.deps.agentRuntime.llm; 
        if (!llmProvider) {
          throw new ApiError("INTERNAL_ERROR", "LLM Provider is not configured in dependencies.", 500);
        }

        const usecase = new VendorScannerUseCase(llmProvider);
        const result = await usecase.scan({
          vendorName: body.vendorName,
          contractExcerpt: body.contractExcerpt,
          tenantId: ctx.tenantId!
        });
        
        await ctx.deps.audit.record("vendor.contract.scanned", { tenant_id: ctx.tenantId, trace_id: ctx.traceId, vendor: body.vendorName, complete_dpa: result.is_dpa_compliant });
        return json({ data: result, trace_id: ctx.traceId }, { status: 200 });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("INTERNAL_ERROR", "Agent Vendor Contract Scanning failed", 500);
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // Phase 7: Report Generation
  // ═══════════════════════════════════════════════════════════════════

  {
    method: "GET",
    path: "/api/v1/privacy/processing-activities/:id/report",
    authRequired: true,
    tenantRequired: true,
    handler: async (ctx) => {
      try {
        const url = new URL(ctx.request.url);
        const format = url.searchParams.get("format") === "markdown" ? "markdown" as const : "json" as const;
        const svc = new PrivacyReportService(ctx.deps.privacy);
        const result = await svc.generateReport(routeParam(ctx.params, "id"), ctx.tenantId!, format);
        await ctx.deps.audit.record("privacy.report.generated", { activity_id: routeParam(ctx.params, "id"), format, report_id: result.report_id, tenant_id: ctx.tenantId, trace_id: ctx.traceId });
        return json({ data: result, trace_id: ctx.traceId });
      } catch (e) { return toApiError(e); }
    },
  },
];

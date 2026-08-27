import {
  z,
  // SCF
  ScfVersionResponseSchema,
  ScfDomainResponseSchema,
  ScfControlResponseSchema,
  ScfFrameworkResponseSchema,
  ScfRequirementResponseSchema,
  ScfMappingResponseSchema,
  ScfFrameworkCoverageResponseSchema,
  ScfStrmRelationshipResponseSchema,
  ScfStrmCoverageResponseSchema,
  ScfImportRunSchema,
  ScfImportResultSchema,
  ScfAssessmentObjectiveSchema,
  ScfEvidenceRequestSchema,
  ScfMaturityCriteriaSchema,
  ScfRiskSchema,
  ScfThreatSchema,
  PptdfDimensionSchema,
  // Gap analysis
  EvidenceFindingResponseSchema,
  EvidenceSourceResponseSchema,
  RunEvidenceAnalysisResponseSchema,
  GapAnalysisVersionResponseSchema,
  GapFindingResponseSchema,
  GapAnalysisValidationResponseSchema,
  // POA&M
  PoamVersionResponseSchema,
  PoamItemResponseSchema,
  PoamMilestoneResponseSchema,
  PoamDependencyResponseSchema,
  PoamValidationResponseSchema,
  PoamSummaryResponseSchema,
  // Risk
  RiskRegisterEntrySchema,
  RiskRegisterExportSchema,
  ScfRiskResponseSchema,
  ScfThreatResponseSchema,
} from "@standard/schemas";

/**
 * Response schemas for the route families a customer integrates against first.
 *
 * Routes carry no `openapi` block, so the generator synthesizes an operation
 * from the route definition. That covers the path, its parameters and the
 * permissions it needs, but says nothing about the body — a client sees the
 * endpoint exists and still has to guess its shape. This map fills that in
 * without touching the route files: the generator looks up `METHOD path` and
 * uses the schema for the 200 response.
 *
 * Every entry below was read off the handler's actual `return json(...)`, not
 * inferred from the route name. Where a handler returns extra top-level fields
 * next to `data` (`scf_version_id`, `count`, `mcr_only`), they are modelled
 * here too — a schema that quietly omits half the payload is worse than none,
 * because a client trusts it.
 *
 * Adding a family here is the cheap path to real documentation. Nothing breaks
 * if a route is missing: it keeps the generic synthesized response.
 */

const traceId = z.string().openapi({ example: "abc-123-def" });

/** `{ ...payload, trace_id }` — the single-resource shape. */
const item = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({ trace_id: traceId });

/** `{ data: [...], trace_id }` — the plain list shape. */
const list = (schema: z.ZodTypeAny, extra: z.ZodRawShape = {}) =>
  z.object({ data: z.array(schema), trace_id: traceId, ...extra });

/** `{ data: [...], pagination, trace_id }`. */
const paginated = (schema: z.ZodTypeAny, extra: z.ZodRawShape = {}) =>
  z.object({
    data: z.array(schema),
    pagination: z.object({
      has_more: z.boolean(),
      next_cursor: z.string().nullable().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
      total: z.number().optional(),
    }),
    trace_id: traceId,
    ...extra,
  });

const count = { count: z.number() };
const total = { total: z.number() };
const scfVersionId = { scf_version_id: z.string() };
const controlId = { control_id: z.string() };

const frameworkSide = z.object({
  id: z.string(),
  name: z.string(),
  requirement_count: z.number(),
  control_count: z.number(),
});

export const RESPONSE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  // ── SCF: versions, domains, controls ──────────────────────────────────
  "GET /api/v1/scf/versions": list(ScfVersionResponseSchema),
  "GET /api/v1/scf/versions/latest": item(ScfVersionResponseSchema),
  "GET /api/v1/scf/versions/:scfVersionId": item(ScfVersionResponseSchema),
  "GET /api/v1/scf/versions/:scfVersionId/domains": list(
    ScfDomainResponseSchema,
    scfVersionId,
  ),
  // Three response shapes, and declaring only one of them was wrong: a
  // customer read `pagination` off the spec, never received it, and had to
  // terminate their walk by guessing that a short page meant the last page.
  //
  //   ?after=<cursor>  -> { data, pagination: { has_more, next_cursor? } }
  //   default          -> { data, page, per_page }        no pagination object
  //   Accept: application/x-ndjson -> a stream, not JSON
  //
  // Neither JSON shape carries a total.
  "GET /api/v1/scf/versions/:scfVersionId/controls": z
    .union([
      z.object({
        data: z.array(ScfControlResponseSchema),
        pagination: z.object({
          has_more: z.boolean(),
          next_cursor: z.string().optional(),
        }),
        scf_version_id: z.string(),
        trace_id: traceId,
      }),
      z.object({
        data: z.array(ScfControlResponseSchema),
        scf_version_id: z.string(),
        page: z.number(),
        per_page: z.number(),
        trace_id: traceId,
      }),
    ])
    .openapi({
      description:
        "Cursor form when `after` is present, offset form otherwise. Start a cursor walk with an empty `after=`; the response carries `pagination.next_cursor` for the following page. Only the cursor form returns a `pagination` object; neither returns a total \u2014 stream the catalogue with `Accept: application/x-ndjson` to size it.",
    }),
  "GET /api/v1/scf/domains/:domainCode/controls": list(
    ScfControlResponseSchema,
    { domain_code: z.string(), ...scfVersionId },
  ),
  "GET /api/v1/scf/controls/:controlId": item(ScfControlResponseSchema),
  "GET /api/v1/scf/controls/by-code/:controlCode": item(
    ScfControlResponseSchema,
  ),
  "GET /api/v1/scf/controls/:controlId/linked-entities": list(z.unknown()),

  // ── SCF: frameworks, requirements, mappings ───────────────────────────
  "GET /api/v1/scf/frameworks": list(ScfFrameworkResponseSchema),
  "GET /api/v1/scf/frameworks/:frameworkId": item(ScfFrameworkResponseSchema),
  "GET /api/v1/scf/frameworks/:frameworkId/requirements": list(
    ScfRequirementResponseSchema,
    { framework_id: z.string(), mcr_only: z.boolean() },
  ),
  "GET /api/v1/scf/requirements/:requirementId/mappings": list(
    ScfMappingResponseSchema,
    scfVersionId,
  ),
  "GET /api/v1/scf/controls/:controlId/mappings": item(
    z.object({ data: z.array(ScfMappingResponseSchema) }),
  ),
  "GET /api/v1/scf/frameworks/:frameworkId/coverage": item(
    ScfFrameworkCoverageResponseSchema,
  ),
  "GET /api/v1/scf/cross-mapping/:frameworkA/:frameworkB": z.object({
    data: z.object({
      framework_a: frameworkSide,
      framework_b: frameworkSide,
      overlap: z.object({
        shared_control_count: z.number(),
        only_in_a: z.number(),
        only_in_b: z.number(),
        overlap_percentage: z.number(),
      }),
      interpretation: z.string().openapi({
        description:
          "Prose reading of overlap_percentage: high at 80 or above, moderate from 50, otherwise low.",
      }),
    }),
    scf_version_id: z.string(),
    trace_id: traceId,
  }),

  // ── SCF: control detail sub-resources ─────────────────────────────────
  "GET /api/v1/scf/controls/:controlId/assessment-objectives": list(
    ScfAssessmentObjectiveSchema,
    { ...controlId, ...count },
  ),
  "GET /api/v1/scf/controls/:controlId/evidence-requests": list(
    ScfEvidenceRequestSchema,
    { ...controlId, ...count },
  ),
  "GET /api/v1/scf/controls/:controlId/maturity-criteria": list(
    ScfMaturityCriteriaSchema,
    { ...controlId, ...count },
  ),
  "GET /api/v1/scf/controls/:controlId/risks": list(ScfRiskSchema, {
    ...controlId,
    ...count,
  }),
  "GET /api/v1/scf/controls/:controlId/threats": list(ScfThreatSchema, {
    ...controlId,
    ...count,
  }),
  "GET /api/v1/scf/controls/:controlId/pptdf-profile": z.object({
    control_id: z.string(),
    active_dimensions: z.array(PptdfDimensionSchema),
    pptdf_profile: z.record(z.string(), z.unknown()),
    trace_id: traceId,
  }),

  // ── SCF: risks and threats catalogues ─────────────────────────────────
  "GET /api/v1/scf/risks": list(ScfRiskSchema, total),
  "GET /api/v1/scf/risks/:riskId": z.object({
    data: ScfRiskSchema.extend({ mapped_control_ids: z.array(z.string()) }),
    trace_id: traceId,
  }),
  "GET /api/v1/scf/threats": list(ScfThreatSchema, total),
  "GET /api/v1/scf/threats/:threatId": z.object({
    data: ScfThreatSchema.extend({ mapped_control_ids: z.array(z.string()) }),
    trace_id: traceId,
  }),

  // ── SCF: STRM ─────────────────────────────────────────────────────────
  "GET /api/v1/scf/strm": list(ScfStrmRelationshipResponseSchema, count),
  "GET /api/v1/scf/strm/lookup": list(ScfStrmRelationshipResponseSchema, {
    fde_code: z.string(),
    ...count,
  }),
  "GET /api/v1/scf/strm/control/:control_code": list(
    ScfStrmRelationshipResponseSchema,
    { control_code: z.string(), ...count },
  ),
  "GET /api/v1/scf/strm/compare": item(ScfStrmCoverageResponseSchema),

  // ── SCF: admin imports ────────────────────────────────────────────────
  "GET /api/v1/admin/scf/import-runs": list(ScfImportRunSchema),
  "GET /api/v1/admin/scf/import-runs/:importRunId": item(ScfImportRunSchema),
  "POST /api/v1/admin/scf/import-runs": item(ScfImportResultSchema),
  "POST /api/v1/admin/scf/import-runs/:importRunId/dry-run": item(
    ScfImportResultSchema.extend({ import_run_id: z.string() }),
  ),
  "POST /api/v1/admin/scf/import-xlsx": item(
    ScfImportResultSchema.extend({
      source_filename: z.string(),
      file_size_bytes: z.number(),
    }),
  ),
  "POST /api/v1/admin/scf/import-xlsx/dry-run": item(
    ScfImportResultSchema.extend({
      source_filename: z.string(),
      file_size_bytes: z.number(),
    }),
  ),

  // ── Gap: evidence analysis ────────────────────────────────────────────
  "POST /api/v1/assessments/:assessmentId/evidence-analysis/run":
    RunEvidenceAnalysisResponseSchema,
  "GET /api/v1/assessments/:assessmentId/evidence-findings": paginated(
    EvidenceFindingResponseSchema,
  ),
  "GET /api/v1/evidence-findings/:evidenceFindingId": item(
    EvidenceFindingResponseSchema,
  ),
  "POST /api/v1/evidence-findings/:evidenceFindingId/refresh":
    EvidenceFindingResponseSchema,
  "GET /api/v1/evidence-findings/:evidenceFindingId/sources": list(
    EvidenceSourceResponseSchema,
  ),

  // ── Gap: analysis versions and findings ───────────────────────────────
  "POST /api/v1/assessments/:assessmentId/gap-analysis/draft":
    GapAnalysisVersionResponseSchema,
  "GET /api/v1/assessments/:assessmentId/gap-analysis": list(
    GapAnalysisVersionResponseSchema,
  ),
  "GET /api/v1/gap-analysis/:gapAnalysisVersionId": item(
    GapAnalysisVersionResponseSchema,
  ),
  "GET /api/v1/gap-analysis/:gapAnalysisVersionId/findings": paginated(
    GapFindingResponseSchema,
    { meta: z.record(z.string(), z.unknown()) },
  ),
  "GET /api/v1/gap-findings/:gapFindingId": item(GapFindingResponseSchema),
  "PATCH /api/v1/gap-findings/:gapFindingId": GapFindingResponseSchema,
  "POST /api/v1/gap-analysis/:gapAnalysisVersionId/validate":
    GapAnalysisValidationResponseSchema,
  "POST /api/v1/gap-analysis/:gapAnalysisVersionId/submit-review":
    GapAnalysisVersionResponseSchema,
  "POST /api/v1/gap-analysis/:gapAnalysisVersionId/approve":
    GapAnalysisVersionResponseSchema,
  "POST /api/v1/gap-analysis/:gapAnalysisVersionId/regenerate":
    GapAnalysisVersionResponseSchema,
  "POST /api/v1/gap-analysis/:gapAnalysisVersionId/findings/bulk-update": list(
    GapFindingResponseSchema,
  ),
  "POST /api/v1/gap-findings/bulk-delete": z.object({
    success: z.boolean(),
    count: z.number(),
    trace_id: traceId,
  }),

  // ── Gap: agent-backed endpoints (ADR-003: batch is async) ─────────────
  "POST /api/v1/gap/evaluate-evidence": z.object({
    data: z.record(z.string(), z.unknown()),
    trace_id: traceId,
  }),
  "POST /api/v1/gap/evaluate-evidence/batch": z.object({
    status: z.literal("queued"),
    job_id: z.string(),
  }),
  "POST /api/v1/poam/architect-remediation": z.object({
    data: z.record(z.string(), z.unknown()),
    trace_id: traceId,
  }),

  // ── POA&M ─────────────────────────────────────────────────────────────
  "POST /api/v1/assessments/:assessmentId/poam/draft":
    PoamVersionResponseSchema,
  "GET /api/v1/assessments/:assessmentId/poam": list(PoamVersionResponseSchema),
  "GET /api/v1/assessments/:assessmentId/poam-summary":
    PoamSummaryResponseSchema,
  // Same summarize() call as the assessment-scoped route above, addressed by
  // version instead.
  "GET /api/v1/poam/:poamVersionId/summary": PoamSummaryResponseSchema,
  // `terminology` carries the localised labels the UI renders POA&M states
  // with; it sits alongside the version rather than inside it.
  "GET /api/v1/poam/:poamVersionId": item(
    PoamVersionResponseSchema.extend({
      terminology: z.record(z.string(), z.unknown()),
    }),
  ),
  "GET /api/v1/poam/:poamVersionId/items": paginated(PoamItemResponseSchema),
  "POST /api/v1/poam/:poamVersionId/validate": PoamValidationResponseSchema,
  "POST /api/v1/poam/:poamVersionId/submit-review": PoamVersionResponseSchema,
  "POST /api/v1/poam/:poamVersionId/approve": PoamVersionResponseSchema,
  "POST /api/v1/poam/:poamVersionId/regenerate": PoamVersionResponseSchema,
  "POST /api/v1/poam/:poamVersionId/items/bulk-update": list(
    PoamItemResponseSchema,
  ),
  "POST /api/v1/poam/:poamVersionId/dependencies/detect": list(
    PoamDependencyResponseSchema,
    total,
  ),
  "GET /api/v1/poam-items/:poamItemId": item(PoamItemResponseSchema),
  "PATCH /api/v1/poam-items/:poamItemId": PoamItemResponseSchema,
  "GET /api/v1/poam-items/:poamItemId/milestones": list(
    PoamMilestoneResponseSchema,
  ),
  "POST /api/v1/poam-items/:poamItemId/milestones": PoamMilestoneResponseSchema,
  "PATCH /api/v1/poam-milestones/:milestoneId": PoamMilestoneResponseSchema,

  // ── Risk register ─────────────────────────────────────────────────────
  "POST /api/v1/assessments/:id/risk-register": z.object({
    data: RiskRegisterEntrySchema,
    trace_id: traceId,
  }),
  "GET /api/v1/assessments/:id/risk-register": list(
    RiskRegisterEntrySchema,
    total,
  ),
  "GET /api/v1/assessments/:id/risk-register/:entryId": z.object({
    data: RiskRegisterEntrySchema,
    trace_id: traceId,
  }),
  "PATCH /api/v1/assessments/:id/risk-register/:entryId": z.object({
    data: RiskRegisterEntrySchema,
    trace_id: traceId,
  }),
  "DELETE /api/v1/assessments/:id/risk-register/:entryId": z.object({
    success: z.boolean(),
    trace_id: traceId,
  }),
  "GET /api/v1/assessments/:id/risk-register/export": RiskRegisterExportSchema,

  // ── Risk and threat catalogues ────────────────────────────────────────
  "GET /api/v1/risk-catalog": list(ScfRiskResponseSchema, total),
  "GET /api/v1/risk-catalog/:riskId": z.object({
    data: ScfRiskResponseSchema,
    trace_id: traceId,
  }),
  "GET /api/v1/threat-catalog": list(ScfThreatResponseSchema, total),
  "GET /api/v1/threat-catalog/:threatId": z.object({
    data: ScfThreatResponseSchema,
    trace_id: traceId,
  }),
};

/** Looks up the documented 200 body for a route, if this map covers it. */
export function responseSchemaFor(
  method: string,
  path: string,
): z.ZodTypeAny | undefined {
  return RESPONSE_SCHEMAS[`${method.toUpperCase()} ${path}`];
}

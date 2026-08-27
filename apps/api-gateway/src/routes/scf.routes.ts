import {
  ScfImportRunSchema,
  ScfStrmCoverageResponseSchema,
  ScfStrmRelationshipResponseSchema,
  ScfThreatSchema,
  ScfRiskSchema,
  ScfMaturityCriteriaSchema,
  ScfEvidenceRequestSchema,
  ScfAssessmentObjectiveSchema,
  ScfFrameworkCoverageResponseSchema,
  ScfMappingResponseSchema,
  ScfRequirementResponseSchema,
  ScfFrameworkResponseSchema,
  ScfControlResponseSchema,
  ScfDomainResponseSchema,
  ScfVersionResponseSchema,
  z,
  ScfImportSourceSchema,
  type ScfControl,
  type ScfFramework,
  type ScfFrameworkRequirement,
  type ScfVersion,
  ComplianceStrategyRequestSchema,
} from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition, AppDependencies } from "../http";
import { json, parseJson, routeParam, routeUuidParam } from "../http";
import { REGULATIONS } from "./regulations.routes";
import { RISK_TAXONOMY } from "./risk.routes";
import { DATA_CATEGORIES, RETENTION_RULES } from "./reference-data.routes";
import {
  ComplianceOptimizerService,
  normaliseRelationshipType,
} from "@standard/assessment-engine";
import { eq, and } from "drizzle-orm";
import { createDrizzleScfRiskCatalogRepository } from "../adapters/scf-risk-catalog.repository";

const resolveVersionId = async (
  deps: AppDependencies,
  versionParam: string,
  organizationId?: string,
): Promise<string> => {
  if (versionParam === "latest") {
    const latest = await deps.scf.versions.getLatestVersion(organizationId);
    if (!latest)
      throw new ApiError("NOT_FOUND", "No published SCF versions found.", 404);
    return latest.id;
  }
  return versionParam;
};

const requireVersionQuery = async (
  request: Request,
  deps: AppDependencies,
  name = "scf_version",
): Promise<string> => {
  const value = new URL(request.url).searchParams.get(name);
  if (!value)
    throw new ApiError(
      "VALIDATION_ERROR",
      `Missing query parameter: ${name}.`,
      400,
    );
  return resolveVersionId(deps, value);
};

const versionResponse = (version: ScfVersion) => ({
  scf_version_id: version.id,
  version_label: version.version_label,
  ...(version.release_date ? { release_date: version.release_date } : {}),
  source_hash: version.source_hash,
  import_status: version.import_status,
  ...(version.imported_at ? { imported_at: version.imported_at } : {}),
  is_synthetic: version.is_synthetic,
});

// â”€â”€ Sparse Fields Whitelist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CONTROL_FIELD_WHITELIST = new Set([
  "control_id",
  "scf_version_id",
  "scf_domain_id",
  "control_code",
  "control_title",
  "control_description",
  "control_question",
  "control_intent",
  "implementation_guidance",
  "expected_evidence",
  "control_weight",
  "compensating_control_guidance",
  "status",
  "is_synthetic",
]);

/** Parse `?fields=id,title,code` into validated field set. Returns null for full response. */
const parseSparseFields = (raw: string | null): Set<string> | null => {
  if (!raw) return null;
  const requested = raw
    .split(",")
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);
  // Normalize short aliases â†’ full field names
  const aliasMap: Record<string, string> = {
    id: "control_id",
    code: "control_code",
    title: "control_title",
    description: "control_description",
    question: "control_question",
    intent: "control_intent",
    guidance: "implementation_guidance",
    evidence: "expected_evidence",
    weight: "control_weight",
  };
  const resolved = requested.map((f) => aliasMap[f] ?? f);
  const valid = resolved.filter((f) => CONTROL_FIELD_WHITELIST.has(f));
  return valid.length > 0 ? new Set(valid) : null;
};

/**
 * Parse and normalise the `?relationship_type` query parameter.
 *
 * - Returns `undefined` when the parameter is absent (no filter applied).
 * - Normalises legacy/alias values: `intersecting`â†’`intersects`, `direct`â†’`equal`, etc.
 *   via the canonical LEGACY_MAP in strm-normaliser.ts (ADR-001).
 * - Throws 400 VALIDATION_ERROR for unrecognised values (security whitelist).
 *
 * @see packages/assessment-engine/src/strm-normaliser.ts
 */
const parseRelationshipType = (raw: string | null): string | undefined => {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const normalised = normaliseRelationshipType(raw.trim());
  if (normalised === null) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Invalid relationship_type: "${raw}". Allowed values: equal, subset, intersects, superset, no_relation.`,
      400,
    );
  }
  return normalised;
};

const controlResponseFull = (control: ScfControl) => ({
  control_id: control.id,
  scf_version_id: control.scf_version_id,
  scf_domain_id: control.scf_domain_id,
  control_code: control.control_code,
  control_title: control.control_title,
  ...(control.control_description
    ? { control_description: control.control_description }
    : {}),
  ...(control.control_question
    ? { control_question: control.control_question }
    : {}),
  ...(control.control_intent ? { control_intent: control.control_intent } : {}),
  ...(control.implementation_guidance
    ? { implementation_guidance: control.implementation_guidance }
    : {}),
  ...(control.expected_evidence
    ? { expected_evidence: control.expected_evidence }
    : {}),
  ...(control.control_weight ? { control_weight: control.control_weight } : {}),
  ...(control.compensating_control_guidance
    ? { compensating_control_guidance: control.compensating_control_guidance }
    : {}),
  status: control.status,
  is_synthetic: control.is_synthetic,
});

/** Build control response with optional sparse field projection. */
const controlResponse = (
  control: ScfControl,
  fields?: Set<string> | null,
): Record<string, unknown> => {
  const full = controlResponseFull(control);
  if (!fields) return full;
  // Always include control_id for cursor stability
  const result: Record<string, unknown> = { control_id: full.control_id };
  for (const key of fields) {
    if (key in full) result[key] = (full as Record<string, unknown>)[key];
  }
  return result;
};

const frameworkResponse = (framework: ScfFramework) => ({
  framework_id: framework.id,
  framework_code: framework.framework_code,
  framework_name: framework.framework_name,
  ...(framework.framework_version
    ? { framework_version: framework.framework_version }
    : {}),
  ...(framework.publisher ? { publisher: framework.publisher } : {}),
  ...(framework.jurisdiction ? { jurisdiction: framework.jurisdiction } : {}),
  ...(framework.category ? { category: framework.category } : {}),
  status: framework.status,
  is_synthetic: framework.is_synthetic,
});

const requirementResponse = (requirement: ScfFrameworkRequirement) => ({
  requirement_id: requirement.id,
  framework_id: requirement.scf_framework_id,
  requirement_code: requirement.requirement_code,
  ...(requirement.fde_code ? { fde_code: requirement.fde_code } : {}),
  requirement_title: requirement.requirement_title,
  ...(requirement.requirement_text
    ? { requirement_text: requirement.requirement_text }
    : {}),
  status: requirement.status,
  is_synthetic: requirement.is_synthetic,
  is_mcr: requirement.is_mcr,
  ...(requirement.mcr_rationale
    ? { mcr_rationale: requirement.mcr_rationale }
    : {}),
});

const resolveFrameworkId = async (
  deps: AppDependencies,
  idOrCode: string,
): Promise<string> => {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrCode,
    );
  if (isUuid) return idOrCode;

  const frameworks = await deps.scf.frameworks.listFrameworks();
  const found = frameworks.find(
    (f) => f.framework_code.toLowerCase() === idOrCode.toLowerCase(),
  );
  if (!found) {
    throw new ApiError(
      "NOT_FOUND",
      `Framework not found for code: ${idOrCode}`,
      404,
    );
  }
  return found.id;
};

export const scfRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/linked-entities",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ params, traceId }) => {
      const controlId = routeParam(params, "controlId").toUpperCase();

      const linkedRegulations: any[] = [];
      const linkedRisks: any[] = [];
      const linkedDataCategories: any[] = [];
      const linkedRetentionRules: any[] = [];

      for (const cat of RISK_TAXONOMY.categories) {
        for (const r of cat.risks) {
          if (r.scf_controls.includes(controlId)) {
            linkedRisks.push({ category: cat.id, risk: r.name_i18n });
          }
        }
      }

      for (const reg of REGULATIONS) {
        let hit = false;
        if (reg.dpia_triggers.some((t) => t.scf_controls.includes(controlId)))
          hit = true;
        if (reg.consent_rules.scf_controls.includes(controlId)) hit = true;
        if (reg.breach_rules.scf_controls.includes(controlId)) hit = true;
        if (reg.legal_bases.some((lb) => lb.scf_controls.includes(controlId)))
          hit = true;
        if (
          reg.sensitive_legal_bases.some((lb) =>
            lb.scf_controls.includes(controlId),
          )
        )
          hit = true;
        if (
          reg.data_subject_rights.some((r) =>
            r.scf_controls.includes(controlId),
          )
        )
          hit = true;
        if (hit) linkedRegulations.push({ id: reg.id, name: reg.name_i18n });
      }

      for (const dc of DATA_CATEGORIES) {
        if ((dc as any).scf_controls?.includes(controlId)) {
          linkedDataCategories.push({ id: dc.id, name: dc.name_i18n });
        }
      }

      for (const rr of RETENTION_RULES) {
        if ((rr as any).scf_controls?.includes(controlId)) {
          linkedRetentionRules.push({
            category: rr.data_category_id,
            context: rr.context_id,
          });
        }
      }

      const result = {
        control_id: controlId,
        linked_entities: {
          risks: linkedRisks,
          regulations: linkedRegulations,
          data_categories: linkedDataCategories,
          retention_rules: linkedRetentionRules,
        },
      };

      return json({ data: result, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, traceId, organizationId }) => {
      const versions = await deps.scf.versions.listVersions(organizationId);
      return json({ data: versions.map(versionResponse), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/latest",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, traceId, organizationId }) => {
      const version = await deps.scf.versions.getLatestVersion(organizationId);
      if (!version)
        throw new ApiError("NOT_FOUND", "SCF version not found.", 404);
      return json({ ...versionResponse(version), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/:scfVersionId",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const resolvedId = await resolveVersionId(
        deps,
        routeParam(params, "scfVersionId"),
      );
      const version = await deps.scf.versions.getVersion(resolvedId);
      if (!version)
        throw new ApiError("NOT_FOUND", "SCF version not found.", 404);
      return json({ ...versionResponse(version), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/:scfVersionId/domains",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const scfVersionId = await resolveVersionId(
        deps,
        routeParam(params, "scfVersionId"),
      );
      try {
        const domains = await deps.scf.domains.listDomains(scfVersionId);
        return json({
          data: domains,
          scf_version_id: scfVersionId,
          trace_id: traceId,
        });
      } catch (err: any) {
        console.error(
          "[scf:domains] FAILED:",
          err?.message,
          err?.stack,
          JSON.stringify({ name: err?.name, code: err?.code }),
        );
        throw err;
      }
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/:scfVersionId/controls",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = await resolveVersionId(
        deps,
        routeParam(params, "scfVersionId"),
      );
      const url = new URL(request.url);
      const acceptHeader = request.headers.get("Accept") ?? "";
      const wantsStream = acceptHeader.includes("application/x-ndjson");

      // â”€â”€ NDJSON streaming path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Activated by Accept: application/x-ndjson
      // Fetches controls in batches of 50 via offset pagination, streams each
      // row immediately. Avoids loading 1400+ controls into Worker memory.
      if (wantsStream) {
        const { readable, writable } = new TransformStream<
          Uint8Array,
          Uint8Array
        >();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        const domainCode =
          url.searchParams.get("domain_code") ||
          url.searchParams.get("domain") ||
          undefined;
        const batchSize = 50;

        // Stream in background â€” do not await, response returns immediately
        (async () => {
          try {
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
              const batch = await deps.scf.controls.searchControls({
                scf_version_id: scfVersionId,
                ...(domainCode ? { domain_code: domainCode } : {}),
                ...(url.searchParams.get("fields")
                  ? { fields: url.searchParams.get("fields")! }
                  : {}),
                limit: batchSize,
                offset,
              });

              for (const control of batch) {
                await writer.write(
                  encoder.encode(
                    JSON.stringify(controlResponse(control)) + "\n",
                  ),
                );
              }

              hasMore = batch.length === batchSize;
              offset += batch.length;
            }
          } catch (err: any) {
            // Write error sentinel as last NDJSON line so clients can detect failure
            try {
              await writer.write(
                encoder.encode(
                  JSON.stringify({
                    _error: true,
                    message: err?.message ?? "Stream error",
                    trace_id: traceId,
                  }) + "\n",
                ),
              );
            } catch {
              // writer may already be closed â€” ignore
            }
          } finally {
            try {
              await writer.close();
            } catch {
              // already closed â€” ignore
            }
          }
        })();

        return new Response(readable, {
          status: 200,
          headers: {
            "Content-Type": "application/x-ndjson",
            "Transfer-Encoding": "chunked",
            "X-Standard-Stream": "controls",
            "X-Standard-Trace-Id": traceId ?? "",
          },
        });
      }

      // â”€â”€ Standard paginated JSON path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Backward compatible â€” used by all existing clients.
      const afterCursor = url.searchParams.get("after") ?? undefined;
      const sparseFields = parseSparseFields(url.searchParams.get("fields"));
      const limitStr =
        url.searchParams.get("limit") || url.searchParams.get("per_page");
      const pageStr = url.searchParams.get("page");
      const limit = limitStr ? Math.min(parseInt(limitStr, 10), 100) : 50;
      const page = pageStr ? parseInt(pageStr, 10) : 1;
      const offset = Math.max(0, (page - 1) * limit);

      const domainCode =
        url.searchParams.get("domain_code") || url.searchParams.get("domain");
      const weightMin = url.searchParams.get("weight_min")
        ? parseFloat(url.searchParams.get("weight_min")!)
        : undefined;
      const weightMax = url.searchParams.get("weight_max")
        ? parseFloat(url.searchParams.get("weight_max")!)
        : undefined;

      try {
        const controls = await deps.scf.controls.searchControls({
          scf_version_id: scfVersionId,
          ...(url.searchParams.get("control_code")
            ? { control_code: url.searchParams.get("control_code")! }
            : {}),
          ...(domainCode ? { domain_code: domainCode } : {}),
          ...(url.searchParams.get("q")
            ? { q: url.searchParams.get("q")! }
            : {}),
          ...(url.searchParams.get("tags")
            ? {
                tags: url.searchParams
                  .get("tags")!
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              }
            : {}),
          ...(weightMin !== undefined ? { weight_min: weightMin } : {}),
          ...(weightMax !== undefined ? { weight_max: weightMax } : {}),
          ...(url.searchParams.get("fields")
            ? { fields: url.searchParams.get("fields")! }
            : {}),
          limit,
          // When `after` is present, ignore page/offset â€” use cursor pagination
          ...(afterCursor ? { after: afterCursor } : { offset }),
        });

        // â”€â”€ Cursor pagination response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (afterCursor) {
          const hasMore = controls.length > limit;
          const pageControls = hasMore ? controls.slice(0, limit) : controls;
          const lastControl = pageControls[pageControls.length - 1];
          const nextCursor =
            hasMore && lastControl
              ? btoa(
                  JSON.stringify({
                    c: lastControl.control_code,
                    i: lastControl.id,
                  }),
                )
              : undefined;

          return json({
            data: pageControls.map((c) => controlResponse(c, sparseFields)),
            pagination: {
              has_more: hasMore,
              ...(nextCursor ? { next_cursor: nextCursor } : {}),
            },
            scf_version_id: scfVersionId,
            trace_id: traceId,
          });
        }

        // â”€â”€ Legacy offset pagination response (backward compat) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        return json({
          data:
            controls.length > limit
              ? controls
                  .slice(0, limit)
                  .map((c) => controlResponse(c, sparseFields))
              : controls.map((c) => controlResponse(c, sparseFields)),
          scf_version_id: scfVersionId,
          page,
          per_page: limit,
          trace_id: traceId,
        });
      } catch (err: any) {
        console.error(
          "[scf:controls] FAILED:",
          err?.message,
          err?.stack,
          JSON.stringify({ name: err?.name, code: err?.code }),
        );
        throw err;
      }
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/domains/:domainCode/controls",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const domainCode = routeParam(params, "domainCode").toUpperCase();
      const url = new URL(request.url);
      const scfVersionId = await resolveVersionId(
        deps,
        url.searchParams.get("scf_version") || "latest",
      );

      const limitStr = url.searchParams.get("limit");
      const limit = limitStr ? Math.min(parseInt(limitStr, 10), 200) : 100;

      const controls = await deps.scf.controls.searchControls({
        scf_version_id: scfVersionId,
        domain_code: domainCode,
        ...(url.searchParams.get("fields")
          ? { fields: url.searchParams.get("fields")! }
          : {}),
        limit,
        offset: 0,
      });

      return json({
        domain_code: domainCode,
        scf_version_id: scfVersionId,
        data: controls.map((c) => controlResponse(c)),
        total: controls.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/by-code/:controlCode",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const versionId = await requireVersionQuery(request, deps, "version");
      const control = await deps.scf.controls.getControlByCode(
        versionId,
        routeParam(params, "controlCode"),
      );
      if (!control)
        throw new ApiError("NOT_FOUND", "SCF control not found.", 404);
      return json({ ...controlResponse(control), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, traceId }) => {
      const frameworks = await deps.scf.frameworks.listFrameworks();
      return json({
        data: frameworks.map(frameworkResponse),
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks/:frameworkId",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const framework = await deps.scf.frameworks.getFramework(
        routeUuidParam(params, "frameworkId"),
      );
      if (!framework)
        throw new ApiError("NOT_FOUND", "SCF framework not found.", 404);
      return json({ ...frameworkResponse(framework), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const control = await deps.scf.controls.getControl(
        routeUuidParam(params, "controlId"),
      );
      if (!control)
        throw new ApiError("NOT_FOUND", "SCF control not found.", 404);
      return json({ ...controlResponse(control), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks/:frameworkId/requirements",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const frameworkId = routeUuidParam(params, "frameworkId");
      const mcrOnly =
        new URL(request.url).searchParams.get("mcr_only") === "true";

      const requirements = mcrOnly
        ? await deps.scf.frameworks.listMcrRequirements(frameworkId)
        : await deps.scf.frameworks.listRequirements(frameworkId);

      return json({
        data: requirements.map(requirementResponse),
        framework_id: frameworkId,
        mcr_only: mcrOnly,
        total: requirements.length,
        trace_id: traceId,
      });
    },
  },

  {
    method: "GET",
    path: "/api/v1/scf/requirements/:requirementId/mappings",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = await requireVersionQuery(request, deps);
      const mappings = await deps.scf.mappings.getMappingsForRequirement(
        routeUuidParam(params, "requirementId"),
        scfVersionId,
      );
      return json({
        data: await deps.scf.mappings.enrichMappings(mappings),
        scf_version_id: scfVersionId,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/mappings",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId, organizationId }) => {
      const controlId = routeParam(params, "controlId");
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          controlId,
        );

      if (!isUuid) {
        if (!organizationId) {
          throw new ApiError(
            "TENANT_CONTEXT_REQUIRED",
            "Tenant context is required.",
            400,
          );
        }

        const url = new URL(request.url);
        const frameworkFilter = url.searchParams.get("framework") ?? undefined;
        const versionQuery = url.searchParams.get("version") ?? undefined;

        let versionId: string;
        if (versionQuery) {
          versionId = versionQuery;
        } else {
          const latestVersion =
            await deps.scf.versions.getLatestVersion(organizationId);
          if (!latestVersion) {
            throw new ApiError(
              "NOT_FOUND",
              "No SCF versions found in database.",
              404,
            );
          }
          versionId = latestVersion.id;
        }

        const result = await deps.scf.controls.getControlCrossMappings(
          versionId,
          controlId,
          frameworkFilter,
        );

        if (!result) {
          throw new ApiError(
            "NOT_FOUND",
            `SCF control '${controlId}' not found.`,
            404,
          );
        }

        return json({
          ...result,
          trace_id: traceId,
        });
      }

      const url = new URL(request.url);
      const control = await deps.scf.controls.getControl(controlId);
      if (!control)
        throw new ApiError("NOT_FOUND", "SCF control not found.", 404);
      const mappings = await deps.scf.mappings.getMappingsForControl(
        control.id,
        control.scf_version_id,
        url.searchParams.get("framework") ?? undefined,
      );
      return json({
        data: await deps.scf.mappings.enrichMappings(mappings),
        scf_version_id: control.scf_version_id,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks/:frameworkId/coverage",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = await requireVersionQuery(request, deps);
      const coverage = await deps.scf.mappings.getCoverageSummary(
        routeUuidParam(params, "frameworkId"),
        scfVersionId,
      );
      return json({ ...coverage, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/cross-mapping/:frameworkA/:frameworkB",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = await requireVersionQuery(request, deps);
      const fwAId = routeUuidParam(params, "frameworkA");
      const fwBId = routeUuidParam(params, "frameworkB");

      // Validate both frameworks exist
      const [fwA, fwB] = await Promise.all([
        deps.scf.frameworks.getFramework(fwAId),
        deps.scf.frameworks.getFramework(fwBId),
      ]);
      if (!fwA)
        throw new ApiError("NOT_FOUND", `Framework not found: ${fwAId}`, 404);
      if (!fwB)
        throw new ApiError("NOT_FOUND", `Framework not found: ${fwBId}`, 404);

      // Get requirements for both frameworks
      const [reqsA, reqsB] = await Promise.all([
        deps.scf.frameworks.listRequirements(fwAId),
        deps.scf.frameworks.listRequirements(fwBId),
      ]);

      // For each requirement in Framework A, find SCF control mappings
      // and check if any of those controls also map to Framework B
      const controlIdsA = new Set<string>();
      const controlIdsB = new Set<string>();

      // Get all mappings for both frameworks in bulk
      const [mappingsA, mappingsB] = await Promise.all([
        Promise.all(
          reqsA
            .slice(0, 200)
            .map((r) =>
              deps.scf.mappings
                .getMappingsForRequirement(r.id, scfVersionId)
                .catch(() => []),
            ),
        ),
        Promise.all(
          reqsB
            .slice(0, 200)
            .map((r) =>
              deps.scf.mappings
                .getMappingsForRequirement(r.id, scfVersionId)
                .catch(() => []),
            ),
        ),
      ]);

      for (const batch of mappingsA)
        for (const m of batch) controlIdsA.add(m.scf_control_id);
      for (const batch of mappingsB)
        for (const m of batch) controlIdsB.add(m.scf_control_id);

      // Calculate overlap
      const sharedControls = [...controlIdsA].filter((id) =>
        controlIdsB.has(id),
      );
      const onlyInA = [...controlIdsA].filter((id) => !controlIdsB.has(id));
      const onlyInB = [...controlIdsB].filter((id) => !controlIdsA.has(id));

      const totalUnique = new Set([...controlIdsA, ...controlIdsB]).size;
      const overlapPct =
        totalUnique > 0
          ? Math.round((sharedControls.length / totalUnique) * 100)
          : 0;

      return json({
        data: {
          framework_a: {
            id: fwAId,
            name: fwA.framework_name,
            requirement_count: reqsA.length,
            control_count: controlIdsA.size,
          },
          framework_b: {
            id: fwBId,
            name: fwB.framework_name,
            requirement_count: reqsB.length,
            control_count: controlIdsB.size,
          },
          overlap: {
            shared_control_count: sharedControls.length,
            only_in_a: onlyInA.length,
            only_in_b: onlyInB.length,
            overlap_percentage: overlapPct,
          },
          interpretation:
            overlapPct >= 80
              ? `High overlap (${overlapPct}%). ${fwA.framework_name} compliance substantially covers ${fwB.framework_name}.`
              : overlapPct >= 50
                ? `Moderate overlap (${overlapPct}%). Significant gaps remain between the two frameworks.`
                : `Low overlap (${overlapPct}%). These frameworks have largely independent control sets.`,
        },
        scf_version_id: scfVersionId,
        trace_id: traceId,
      });
    },
  },
  {
    method: "POST",
    path: "/api/v1/admin/scf/import-runs",
    protected: true,
    requireActor: true,
    permissions: ["scf:import"],
    handler: async ({ deps, request, traceId }) => {
      const source = await parseJson(request, ScfImportSourceSchema);
      const result = await deps.scf.imports.importFromSource(source);
      return json(
        { ...result, trace_id: traceId },
        { status: result.import_run.status === "failed" ? 400 : 202 },
      );
    },
  },
  {
    method: "GET",
    path: "/api/v1/admin/scf/import-runs",
    protected: true,
    permissions: ["scf:read"],
    requireActor: true,
    handler: async ({ deps, traceId }) => {
      const runs = await deps.scf.repository.listImportRuns();
      return json({ data: runs, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/admin/scf/import-runs/:importRunId",
    protected: true,
    permissions: ["scf:read"],
    requireActor: true,
    handler: async ({ deps, params, traceId }) => {
      const run = await deps.scf.repository.getImportRun(
        routeUuidParam(params, "importRunId"),
      );
      if (!run)
        throw new ApiError("NOT_FOUND", "SCF import run not found.", 404);
      return json({ ...run, trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/admin/scf/import-runs/:importRunId/dry-run",
    protected: true,
    permissions: ["scf:import"],
    requireActor: true,
    handler: async ({ deps, params, request, traceId }) => {
      const source = await parseJson(request, ScfImportSourceSchema);
      const result = await deps.scf.imports.dryRunImport(source);
      return json({
        import_run_id: routeUuidParam(params, "importRunId"),
        ...result,
        trace_id: traceId,
      });
    },
  },
  {
    method: "POST",
    path: "/api/v1/admin/scf/import-xlsx",
    protected: true,
    requireActor: true,
    permissions: ["scf:import"],
    handler: async ({ deps, request, traceId }) => {
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

      const formData = await request.formData().catch(() => {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Request must be multipart/form-data with a file field.",
          400,
        );
      });

      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Missing required 'file' field in multipart upload.",
          400,
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new ApiError(
          "VALIDATION_ERROR",
          `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          400,
        );
      }

      const validMimeTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
      ];
      if (file.type && !validMimeTypes.includes(file.type)) {
        throw new ApiError(
          "VALIDATION_ERROR",
          `Invalid file type: ${file.type}. Expected XLSX.`,
          400,
        );
      }

      const versionLabel =
        formData.get("version_label")?.toString() || "SCF (auto-detected)";

      // Convert file to base64 for the importer
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // ZIP magic bytes check (ZIP signature is 50 4B 03 04)
      if (
        bytes.length < 4 ||
        bytes[0] !== 0x50 ||
        bytes[1] !== 0x4b ||
        bytes[2] !== 0x03 ||
        bytes[3] !== 0x04
      ) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Invalid XLSX file: missing ZIP file signature.",
          400,
        );
      }

      const base64 = btoa(String.fromCharCode(...bytes));

      const source = {
        source_type: "xlsx" as const,
        source_filename: file.name,
        version_label: versionLabel,
        content: base64,
      };

      const result = await deps.scf.imports.importFromSource(source);

      return json(
        {
          ...result,
          source_filename: file.name,
          file_size_bytes: file.size,
          trace_id: traceId,
        },
        { status: result.import_run.status === "failed" ? 400 : 202 },
      );
    },
  },
  {
    method: "POST",
    path: "/api/v1/admin/scf/import-xlsx/dry-run",
    protected: true,
    requireActor: true,
    permissions: ["scf:import"],
    handler: async ({ deps, request, traceId }) => {
      const formData = await request.formData().catch(() => {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Request must be multipart/form-data with a file field.",
          400,
        );
      });

      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Missing required 'file' field in multipart upload.",
          400,
        );
      }

      const versionLabel =
        formData.get("version_label")?.toString() || "SCF (dry-run)";

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // ZIP magic bytes check (ZIP signature is 50 4B 03 04)
      if (
        bytes.length < 4 ||
        bytes[0] !== 0x50 ||
        bytes[1] !== 0x4b ||
        bytes[2] !== 0x03 ||
        bytes[3] !== 0x04
      ) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Invalid XLSX file: missing ZIP file signature.",
          400,
        );
      }

      const base64 = btoa(String.fromCharCode(...bytes));

      const source = {
        source_type: "xlsx" as const,
        source_filename: file.name,
        version_label: versionLabel,
        content: base64,
      };

      const result = await deps.scf.imports.dryRunImport(source);

      return json({
        ...result,
        source_filename: file.name,
        file_size_bytes: file.size,
        is_dry_run: true,
        trace_id: traceId,
      });
    },
  },
  // â”€â”€ New SCF Meta-Model Entity Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/assessment-objectives",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const controlIdParam = routeParam(params, "controlId");
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          controlIdParam,
        );
      let controlId: string;
      if (isUuid) {
        controlId = controlIdParam;
      } else {
        const versionId = await requireVersionQuery(request, deps);
        const control = await deps.scf.controls.getControlByCode(
          versionId,
          controlIdParam,
        );
        if (!control)
          throw new ApiError(
            "NOT_FOUND",
            `SCF control '${controlIdParam}' not found.`,
            404,
          );
        controlId = control.id;
      }

      const allData =
        await deps.scf.repository.listAssessmentObjectivesForControl(controlId);

      // ?pptdf=people,process,technology,data,facility â€” filter by active dimensions
      const url = new URL(request.url);
      const rawPptdf = url.searchParams.get("pptdf");
      const pptdfFilter = rawPptdf
        ? rawPptdf
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];

      const data =
        pptdfFilter.length > 0
          ? allData.filter((obj) =>
              pptdfFilter.some((dim) =>
                (obj.pptdf_dimensions ?? []).includes(dim as never),
              ),
            )
          : allData;

      return json({
        data,
        control_id: controlIdParam,
        count: data.length,
        pptdf_filter: pptdfFilter.length > 0 ? pptdfFilter : null,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/pptdf-profile",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const controlIdParam = routeParam(params, "controlId");
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          controlIdParam,
        );
      let controlId: string;
      if (isUuid) {
        controlId = controlIdParam;
      } else {
        const versionId = await requireVersionQuery(request, deps);
        const control = await deps.scf.controls.getControlByCode(
          versionId,
          controlIdParam,
        );
        if (!control)
          throw new ApiError(
            "NOT_FOUND",
            `SCF control '${controlIdParam}' not found.`,
            404,
          );
        controlId = control.id;
      }

      const objectives =
        await deps.scf.repository.listAssessmentObjectivesForControl(controlId);

      // Compute union of active PPTDF dimensions across all objectives
      const active = new Set<string>();
      for (const obj of objectives) {
        for (const dim of obj.pptdf_dimensions ?? []) {
          active.add(dim);
        }
      }

      return json({
        control_id: controlIdParam,
        active_dimensions: [...active].sort(),
        pptdf_profile: {
          people: active.has("people"),
          process: active.has("process"),
          technology: active.has("technology"),
          data: active.has("data"),
          facility: active.has("facility"),
        },
        objectives_analyzed: objectives.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/evidence-requests",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const controlIdParam = routeParam(params, "controlId");
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          controlIdParam,
        );
      let controlId: string;
      if (isUuid) {
        controlId = controlIdParam;
      } else {
        const versionId = await requireVersionQuery(request, deps);
        const control = await deps.scf.controls.getControlByCode(
          versionId,
          controlIdParam,
        );
        if (!control)
          throw new ApiError(
            "NOT_FOUND",
            `SCF control '${controlIdParam}' not found.`,
            404,
          );
        controlId = control.id;
      }
      const data =
        await deps.scf.repository.listEvidenceRequestsForControl(controlId);
      return json({
        data,
        control_id: controlIdParam,
        count: data.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/maturity-criteria",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const controlIdParam = routeParam(params, "controlId");
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          controlIdParam,
        );
      let controlId: string;
      if (isUuid) {
        controlId = controlIdParam;
      } else {
        const versionId = await requireVersionQuery(request, deps);
        const control = await deps.scf.controls.getControlByCode(
          versionId,
          controlIdParam,
        );
        if (!control)
          throw new ApiError(
            "NOT_FOUND",
            `SCF control '${controlIdParam}' not found.`,
            404,
          );
        controlId = control.id;
      }
      const data =
        await deps.scf.repository.listMaturityCriteriaForControl(controlId);
      return json({
        data,
        control_id: controlIdParam,
        count: data.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/risks",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const controlIdParam = routeParam(params, "controlId");
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          controlIdParam,
        );
      let controlId: string;
      if (isUuid) {
        controlId = controlIdParam;
      } else {
        const versionId = await requireVersionQuery(request, deps);
        const control = await deps.scf.controls.getControlByCode(
          versionId,
          controlIdParam,
        );
        if (!control)
          throw new ApiError(
            "NOT_FOUND",
            `SCF control '${controlIdParam}' not found.`,
            404,
          );
        controlId = control.id;
      }
      const data = await deps.scf.repository.listRisksForControl(controlId);
      return json({
        data,
        control_id: controlIdParam,
        count: data.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/threats",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const controlIdParam = routeParam(params, "controlId");
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          controlIdParam,
        );
      let controlId: string;
      if (isUuid) {
        controlId = controlIdParam;
      } else {
        const versionId = await requireVersionQuery(request, deps);
        const control = await deps.scf.controls.getControlByCode(
          versionId,
          controlIdParam,
        );
        if (!control)
          throw new ApiError(
            "NOT_FOUND",
            `SCF control '${controlIdParam}' not found.`,
            404,
          );
        controlId = control.id;
      }
      const data = await deps.scf.repository.listThreatsForControl(controlId);
      return json({
        data,
        control_id: controlIdParam,
        count: data.length,
        trace_id: traceId,
      });
    },
  },
  {
    /**
     * GET /api/v1/scf/strm
     *
     * Search STRM relationships across all controls and frameworks.
     */
    method: "GET",
    path: "/api/v1/scf/strm",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, request, traceId, organizationId }) => {
      const url = new URL(request.url);

      const scfVersionIdQuery = url.searchParams.get("scf_version_id");
      const scfVersionId = scfVersionIdQuery
        ? await resolveVersionId(deps, scfVersionIdQuery)
        : (await deps.scf.versions.getLatestVersion(organizationId))?.id;

      if (!scfVersionId) {
        throw new ApiError("NOT_FOUND", "SCF version not found.", 404);
      }

      const rawQuery = {
        scf_version_id: scfVersionId,
        framework_id: url.searchParams.get("framework_id") ?? undefined,
        control_id: url.searchParams.get("control_id") ?? undefined,
        relationship_type:
          url.searchParams.get("relationship_type") ?? undefined,
        min_confidence_score:
          url.searchParams.get("min_confidence_score") ?? undefined,
        source_framework_id:
          url.searchParams.get("source_framework_id") ?? undefined,
        target_framework_id:
          url.searchParams.get("target_framework_id") ?? undefined,
        limit: url.searchParams.get("limit") ?? undefined,
        offset: url.searchParams.get("offset") ?? undefined,
      };

      const { ScfStrmQuerySchema } = await import("@standard/schemas");
      const query = ScfStrmQuerySchema.parse(rawQuery);

      const rows = await deps.scf.repository.searchStrm(query);

      return json({
        data: rows,
        count: rows.length,
        trace_id: traceId,
      });
    },
  },
  {
    /**
     * GET /api/v1/scf/strm/lookup?fde_code=AC-1
     *
     * Lookup all SCF controls mapped to a specific Focal Document Element (FDE) code.
     * Returns the STRM relationship type and strength for each mapping.
     *
     * Query params:
     *   - fde_code        (required) â€” FDE identifier, e.g. "AC-1", "A.5.1", "7.1.2"
     *   - relationship_type (optional) â€” filter: equal|subset|superset|intersecting
     *   - limit           (optional, default 100, max 500)
     */
    method: "GET",
    path: "/api/v1/scf/strm/lookup",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, request, traceId }) => {
      const url = new URL(request.url);
      const fdeCode = url.searchParams.get("fde_code");
      const relationshipType = parseRelationshipType(
        url.searchParams.get("relationship_type"),
      );
      const limitRaw = url.searchParams.get("limit");
      const limit = limitRaw
        ? Math.min(parseInt(limitRaw, 10) || 100, 500)
        : 100;

      if (!fdeCode) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Missing required query parameter: fde_code.",
          400,
        );
      }

      const rows = await deps.scf.repository.lookupStrmByFdeCode(fdeCode, {
        limit,
        ...(relationshipType ? { relationshipType } : {}),
      });

      const data = rows.map((r: any) => ({
        strm_id: r.id,
        fde_code: r.fde_code,
        fde_name: r.fde_name,
        scf_control_id: r.scf_control_id,
        control_code: r._control_code,
        control_title: r._control_title,
        relationship_type: r.relationship_type,
        relationship_strength: r.relationship_strength,
        rationale: r.rationale,
        source: r.source,
      }));

      return json({
        fde_code: fdeCode,
        count: data.length,
        data,
        trace_id: traceId,
      });
    },
  },
  {
    /**
     * GET /api/v1/scf/strm/control/:control_code
     *
     * Lookup all FDE (framework requirements) mapped to a specific SCF control code
     * with their STRM relationship type.
     *
     * Path params:
     *   - control_code â€” SCF control code, e.g. "GOV-001", "IAC-15"
     *
     * Query params:
     *   - relationship_type (optional) â€” filter: equal|subset|superset|intersecting
     *   - limit           (optional, default 100, max 500)
     */
    method: "GET",
    path: "/api/v1/scf/strm/control/:control_code",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, request, traceId, params, organizationId }) => {
      const controlCode = routeParam(params, "control_code");
      const url = new URL(request.url);
      const relationshipType = parseRelationshipType(
        url.searchParams.get("relationship_type"),
      );
      const limitRaw = url.searchParams.get("limit");
      const limit = limitRaw
        ? Math.min(parseInt(limitRaw, 10) || 100, 500)
        : 100;

      const rows = await deps.scf.repository.lookupStrmByControlCode(
        controlCode,
        {
          limit,
          ...(relationshipType ? { relationshipType } : {}),
        },
      );

      if (!rows.length) {
        const version =
          await deps.scf.versions.getLatestVersion(organizationId);
        const versionId = version?.id ?? "";
        const control = versionId
          ? await deps.scf.controls.getControlByCode(versionId, controlCode)
          : null;
        if (!control) {
          throw new ApiError(
            "NOT_FOUND",
            `SCF control not found: ${controlCode}`,
            404,
          );
        }
      }

      const data = rows.map((r) => ({
        strm_id: r.id,
        fde_code: r.fde_code,
        fde_name: r.fde_name,
        relationship_type: r.relationship_type,
        relationship_strength: r.relationship_strength,
        rationale: r.rationale,
        source: r.source,
      }));

      return json({
        control_code: controlCode,
        count: data.length,
        data,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/scf/strm/compare",

    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, request, traceId }) => {
      const url = new URL(request.url);
      const source = url.searchParams.get("source");
      const target = url.searchParams.get("target");
      const version = url.searchParams.get("version") ?? "latest";

      if (!source || !target) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "Both 'source' and 'target' query parameters are required.",
          400,
        );
      }

      const versionId = await resolveVersionId(deps, version);
      const sourceId = await resolveFrameworkId(deps, source);
      const targetId = await resolveFrameworkId(deps, target);

      const comparison = await deps.scf.mappings.compareFrameworks(
        sourceId,
        targetId,
        versionId,
      );

      return json({
        ...comparison,
        trace_id: traceId,
      });
    },
  },
  {
    method: "POST",
    path: "/api/v1/optimizer/compliance-strategy",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, deps, traceId }) => {
      const body = await parseJson(request, ComplianceStrategyRequestSchema);

      const frameworkIds = body.framework_ids;
      let scfVersionId = body.scf_version_id;

      if (!scfVersionId) {
        scfVersionId = await resolveVersionId(deps, "latest");
      } else {
        scfVersionId = await resolveVersionId(deps, scfVersionId);
      }

      const db = deps._db;
      if (!db) {
        throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);
      }

      const resolvedFrameworkIds = await Promise.all(
        frameworkIds.map((fId) => resolveFrameworkId(deps, fId)),
      );

      const optimizer = new ComplianceOptimizerService(db);
      const result = await optimizer.optimizePath({
        frameworkIds: resolvedFrameworkIds,
        scfVersionId,
      });

      return json({
        ...result,
        trace_id: traceId,
      });
    },
  },

  // ——————————————————————————————————————————————————————————————————————————
  // SCR-RMM: Global SCF Risk Catalog. Used to map assessment risks to SCF control risks.
  // Optional filter: ?category=<string>
  {
    method: "GET",
    path: "/api/v1/scf/risks",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ deps, request, traceId }) => {
      if (!deps._db)
        throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);
      const repo = createDrizzleScfRiskCatalogRepository(deps._db);
      const url = new URL(request.url);
      const category = url.searchParams.get("category") ?? undefined;
      const data = await repo.listRisks({ category });
      return json({ data, total: data.length, trace_id: traceId });
    },
  },

  // â”€â”€ GET /scf/risks/:riskId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/scf/risks/:riskId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ deps, params, traceId }) => {
      if (!deps._db)
        throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);
      const repo = createDrizzleScfRiskCatalogRepository(deps._db);
      const riskId = routeUuidParam(params, "riskId");
      const risk = await repo.getRisk(riskId);
      if (!risk) throw new ApiError("NOT_FOUND", "SCF Risk not found.", 404);
      return json({
        data: { ...risk, mapped_control_ids: risk.mitigating_control_ids },
        trace_id: traceId,
      });
    },
  },

  // â”€â”€ GET /scf/threats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // SCR-RMM: Global SCF Threat Catalog. Optional filter: ?category=<string>
  {
    method: "GET",
    path: "/api/v1/scf/threats",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ deps, request, traceId }) => {
      if (!deps._db)
        throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);
      const repo = createDrizzleScfRiskCatalogRepository(deps._db);
      const url = new URL(request.url);
      const category = url.searchParams.get("category") ?? undefined;
      const data = await repo.listThreats({ category });
      return json({ data, total: data.length, trace_id: traceId });
    },
  },

  // â”€â”€ GET /scf/threats/:threatId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    method: "GET",
    path: "/api/v1/scf/threats/:threatId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ deps, params, traceId }) => {
      if (!deps._db)
        throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);
      const repo = createDrizzleScfRiskCatalogRepository(deps._db);
      const threatId = routeUuidParam(params, "threatId");
      const threat = await repo.getThreat(threatId);
      if (!threat)
        throw new ApiError("NOT_FOUND", "SCF Threat not found.", 404);
      return json({
        data: { ...threat, mapped_control_ids: threat.mitigating_control_ids },
        trace_id: traceId,
      });
    },
  },
];

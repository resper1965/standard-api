import { ScfImportSourceSchema, type ScfControl, type ScfFramework, type ScfFrameworkRequirement, type ScfVersion } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition, AppDependencies } from "../http";
import { json, parseJson, routeParam, routeUuidParam } from "../http";
import { REGULATIONS } from "./regulations.routes";
import { RISK_TAXONOMY } from "./risk.routes";
import { DATA_CATEGORIES, RETENTION_RULES } from "./reference-data.routes";

const resolveVersionId = async (deps: AppDependencies, versionParam: string): Promise<string> => {
  if (versionParam === "latest") {
    const latest = await deps.scf.versions.getLatestVersion();
    if (!latest) throw new ApiError("NOT_FOUND", "No published SCF versions found.", 404);
    return latest.id;
  }
  return versionParam;
};

const requireVersionQuery = async (request: Request, deps: AppDependencies, name = "scf_version"): Promise<string> => {
  const value = new URL(request.url).searchParams.get(name);
  if (!value) throw new ApiError("VALIDATION_ERROR", `Missing query parameter: ${name}.`, 400);
  return resolveVersionId(deps, value);
};

const versionResponse = (version: ScfVersion) => ({
  scf_version_id: version.id,
  version_label: version.version_label,
  ...(version.release_date ? { release_date: version.release_date } : {}),
  source_hash: version.source_hash,
  import_status: version.import_status,
  ...(version.imported_at ? { imported_at: version.imported_at } : {}),
  is_synthetic: version.is_synthetic
});

const controlResponse = (control: ScfControl) => ({
  control_id: control.id,
  scf_version_id: control.scf_version_id,
  scf_domain_id: control.scf_domain_id,
  control_code: control.control_code,
  control_title: control.control_title,
  ...(control.control_description ? { control_description: control.control_description } : {}),
  ...(control.control_question ? { control_question: control.control_question } : {}),
  ...(control.control_intent ? { control_intent: control.control_intent } : {}),
  ...(control.implementation_guidance ? { implementation_guidance: control.implementation_guidance } : {}),
  ...(control.expected_evidence ? { expected_evidence: control.expected_evidence } : {}),
  ...(control.control_weight ? { control_weight: control.control_weight } : {}),
  status: control.status,
  is_synthetic: control.is_synthetic
});

const frameworkResponse = (framework: ScfFramework) => ({
  framework_id: framework.id,
  framework_code: framework.framework_code,
  framework_name: framework.framework_name,
  ...(framework.framework_version ? { framework_version: framework.framework_version } : {}),
  ...(framework.publisher ? { publisher: framework.publisher } : {}),
  ...(framework.jurisdiction ? { jurisdiction: framework.jurisdiction } : {}),
  ...(framework.category ? { category: framework.category } : {}),
  status: framework.status,
  is_synthetic: framework.is_synthetic
});

const requirementResponse = (requirement: ScfFrameworkRequirement) => ({
  requirement_id: requirement.id,
  framework_id: requirement.scf_framework_id,
  requirement_code: requirement.requirement_code,
  requirement_title: requirement.requirement_title,
  ...(requirement.requirement_text ? { requirement_text: requirement.requirement_text } : {}),
  status: requirement.status,
  is_synthetic: requirement.is_synthetic
});

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
          if (reg.dpia_triggers.some(t => t.scf_controls.includes(controlId))) hit = true;
          if (reg.consent_rules.scf_controls.includes(controlId)) hit = true;
          if (reg.breach_rules.scf_controls.includes(controlId)) hit = true;
          if (reg.legal_bases.some(lb => lb.scf_controls.includes(controlId))) hit = true;
          if (reg.sensitive_legal_bases.some(lb => lb.scf_controls.includes(controlId))) hit = true;
          if (reg.data_subject_rights.some(r => r.scf_controls.includes(controlId))) hit = true;
          if (hit) linkedRegulations.push({ id: reg.id, name: reg.name_i18n });
      }

      for (const dc of DATA_CATEGORIES) {
          if ((dc as any).scf_controls?.includes(controlId)) {
              linkedDataCategories.push({ id: dc.id, name: dc.name_i18n });
          }
      }

      for (const rr of RETENTION_RULES) {
          if ((rr as any).scf_controls?.includes(controlId)) {
              linkedRetentionRules.push({ category: rr.data_category_id, context: rr.context_id });
          }
      }

      const result = {
         control_id: controlId,
         linked_entities: {
            risks: linkedRisks,
            regulations: linkedRegulations,
            data_categories: linkedDataCategories,
            retention_rules: linkedRetentionRules
         }
      };
      
      return json({ data: result, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, traceId }) => {
      const versions = await deps.scf.versions.listVersions();
      return json({ data: versions.map(versionResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/latest",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, traceId }) => {
      const version = await deps.scf.versions.getLatestVersion();
      if (!version) throw new ApiError("NOT_FOUND", "SCF version not found.", 404);
      return json({ ...versionResponse(version), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/:scfVersionId",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const resolvedId = await resolveVersionId(deps, routeParam(params, "scfVersionId"));
      const version = await deps.scf.versions.getVersion(resolvedId);
      if (!version) throw new ApiError("NOT_FOUND", "SCF version not found.", 404);
      return json({ ...versionResponse(version), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/:scfVersionId/domains",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const scfVersionId = await resolveVersionId(deps, routeParam(params, "scfVersionId"));
      try {
        const domains = await deps.scf.domains.listDomains(scfVersionId);
        return json({ data: domains, scf_version_id: scfVersionId, trace_id: traceId });
      } catch (err: any) {
        console.error("[scf:domains] FAILED:", err?.message, err?.stack, JSON.stringify({ name: err?.name, code: err?.code }));
        throw err;
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/:scfVersionId/controls",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = await resolveVersionId(deps, routeParam(params, "scfVersionId"));
      const url = new URL(request.url);
      
      const limitStr = url.searchParams.get("limit") || url.searchParams.get("per_page");
      const pageStr = url.searchParams.get("page");
      const limit = limitStr ? Math.min(parseInt(limitStr, 10), 100) : 50;
      const page = pageStr ? parseInt(pageStr, 10) : 1;
      const offset = Math.max(0, (page - 1) * limit);

      const domainCode = url.searchParams.get("domain_code") || url.searchParams.get("domain");

      try {
        const controls = await deps.scf.controls.searchControls({
          scf_version_id: scfVersionId,
          ...(url.searchParams.get("control_code") ? { control_code: url.searchParams.get("control_code")! } : {}),
          ...(domainCode ? { domain_code: domainCode } : {}),
          ...(url.searchParams.get("q") ? { q: url.searchParams.get("q")! } : {}),
          ...(url.searchParams.get("tags") ? { tags: url.searchParams.get("tags")!.split(",").map(t => t.trim()).filter(Boolean) } : {}),
          limit,
          offset
        });
        return json({ data: controls.map(controlResponse), scf_version_id: scfVersionId, page, per_page: limit, trace_id: traceId });
      } catch (err: any) {
        console.error("[scf:controls] FAILED:", err?.message, err?.stack, JSON.stringify({ name: err?.name, code: err?.code }));
        throw err;
      }
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/by-code/:controlCode",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const versionId = await requireVersionQuery(request, deps, "version");
      const control = await deps.scf.controls.getControlByCode(versionId, routeParam(params, "controlCode"));
      if (!control) throw new ApiError("NOT_FOUND", "SCF control not found.", 404);
      return json({ ...controlResponse(control), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, traceId }) => {
      const frameworks = await deps.scf.frameworks.listFrameworks();
      return json({ data: frameworks.map(frameworkResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks/:frameworkId",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const framework = await deps.scf.frameworks.getFramework(routeUuidParam(params, "frameworkId"));
      if (!framework) throw new ApiError("NOT_FOUND", "SCF framework not found.", 404);
      return json({ ...frameworkResponse(framework), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const control = await deps.scf.controls.getControl(routeUuidParam(params, "controlId"));
      if (!control) throw new ApiError("NOT_FOUND", "SCF control not found.", 404);
      return json({ ...controlResponse(control), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks/:frameworkId/requirements",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, traceId }) => {
      const frameworkId = routeUuidParam(params, "frameworkId");
      const requirements = await deps.scf.frameworks.listRequirements(frameworkId);
      return json({ data: requirements.map(requirementResponse), framework_id: frameworkId, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/requirements/:requirementId/mappings",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = await requireVersionQuery(request, deps);
      const mappings = await deps.scf.mappings.getMappingsForRequirement(routeUuidParam(params, "requirementId"), scfVersionId);
      return json({ data: await deps.scf.mappings.enrichMappings(mappings), scf_version_id: scfVersionId, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/mappings",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId, organizationId }) => {
      const controlId = routeParam(params, "controlId");
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(controlId);

      if (!isUuid) {
        if (!organizationId) {
          throw new ApiError("TENANT_CONTEXT_REQUIRED", "Tenant context is required.", 400);
        }

        const url = new URL(request.url);
        const frameworkFilter = url.searchParams.get("framework") ?? undefined;
        const versionQuery = url.searchParams.get("version") ?? undefined;

        let versionId: string;
        if (versionQuery) {
          versionId = versionQuery;
        } else {
          const latestVersion = await deps.scf.versions.getLatestVersion();
          if (!latestVersion) {
            throw new ApiError("NOT_FOUND", "No SCF versions found in database.", 404);
          }
          versionId = latestVersion.id;
        }

        const result = await deps.scf.controls.getControlCrossMappings(
          versionId,
          controlId,
          frameworkFilter
        );

        if (!result) {
          throw new ApiError("NOT_FOUND", `SCF control '${controlId}' not found.`, 404);
        }

        return json({
          ...result,
          trace_id: traceId
        });
      }

      const url = new URL(request.url);
      const control = await deps.scf.controls.getControl(controlId);
      if (!control) throw new ApiError("NOT_FOUND", "SCF control not found.", 404);
      const mappings = await deps.scf.mappings.getMappingsForControl(control.id, control.scf_version_id, url.searchParams.get("framework") ?? undefined);
      return json({ data: await deps.scf.mappings.enrichMappings(mappings), scf_version_id: control.scf_version_id, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks/:frameworkId/coverage",
    protected: true,
    permissions: ["scf:read"],
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = await requireVersionQuery(request, deps);
      const coverage = await deps.scf.mappings.getCoverageSummary(routeUuidParam(params, "frameworkId"), scfVersionId);
      return json({ ...coverage, trace_id: traceId });
    }
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
      if (!fwA) throw new ApiError("NOT_FOUND", `Framework not found: ${fwAId}`, 404);
      if (!fwB) throw new ApiError("NOT_FOUND", `Framework not found: ${fwBId}`, 404);

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
        Promise.all(reqsA.slice(0, 200).map(r =>
          deps.scf.mappings.getMappingsForRequirement(r.id, scfVersionId).catch(() => [])
        )),
        Promise.all(reqsB.slice(0, 200).map(r =>
          deps.scf.mappings.getMappingsForRequirement(r.id, scfVersionId).catch(() => [])
        )),
      ]);

      for (const batch of mappingsA) for (const m of batch) controlIdsA.add(m.scf_control_id);
      for (const batch of mappingsB) for (const m of batch) controlIdsB.add(m.scf_control_id);

      // Calculate overlap
      const sharedControls = [...controlIdsA].filter(id => controlIdsB.has(id));
      const onlyInA = [...controlIdsA].filter(id => !controlIdsB.has(id));
      const onlyInB = [...controlIdsB].filter(id => !controlIdsA.has(id));

      const totalUnique = new Set([...controlIdsA, ...controlIdsB]).size;
      const overlapPct = totalUnique > 0 ? Math.round((sharedControls.length / totalUnique) * 100) : 0;

      return json({
        data: {
          framework_a: { id: fwAId, name: fwA.framework_name, requirement_count: reqsA.length, control_count: controlIdsA.size },
          framework_b: { id: fwBId, name: fwB.framework_name, requirement_count: reqsB.length, control_count: controlIdsB.size },
          overlap: {
            shared_control_count: sharedControls.length,
            only_in_a: onlyInA.length,
            only_in_b: onlyInB.length,
            overlap_percentage: overlapPct,
          },
          interpretation: overlapPct >= 80
            ? `High overlap (${overlapPct}%). ${fwA.framework_name} compliance substantially covers ${fwB.framework_name}.`
            : overlapPct >= 50
              ? `Moderate overlap (${overlapPct}%). Significant gaps remain between the two frameworks.`
              : `Low overlap (${overlapPct}%). These frameworks have largely independent control sets.`,
        },
        scf_version_id: scfVersionId,
        trace_id: traceId,
      });
    }
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
      return json({ ...result, trace_id: traceId }, { status: result.import_run.status === "failed" ? 400 : 202 });
    }
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
    }
  },
  {
    method: "GET",
    path: "/api/v1/admin/scf/import-runs/:importRunId",
    protected: true,
    permissions: ["scf:read"],
    requireActor: true,
    handler: async ({ deps, params, traceId }) => {
      const run = await deps.scf.repository.getImportRun(routeUuidParam(params, "importRunId"));
      if (!run) throw new ApiError("NOT_FOUND", "SCF import run not found.", 404);
      return json({ ...run, trace_id: traceId });
    }
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
      return json({ import_run_id: routeUuidParam(params, "importRunId"), ...result, trace_id: traceId });
    }
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
        throw new ApiError("VALIDATION_ERROR", "Request must be multipart/form-data with a file field.", 400);
      });

      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        throw new ApiError("VALIDATION_ERROR", "Missing required 'file' field in multipart upload.", 400);
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new ApiError("VALIDATION_ERROR", `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`, 400);
      }

      const validMimeTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream"
      ];
      if (file.type && !validMimeTypes.includes(file.type)) {
        throw new ApiError("VALIDATION_ERROR", `Invalid file type: ${file.type}. Expected XLSX.`, 400);
      }

      const versionLabel = formData.get("version_label")?.toString() || "SCF (auto-detected)";

      // Convert file to base64 for the importer
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // ZIP magic bytes check (ZIP signature is 50 4B 03 04)
      if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
        throw new ApiError("VALIDATION_ERROR", "Invalid XLSX file: missing ZIP file signature.", 400);
      }

      const base64 = btoa(String.fromCharCode(...bytes));

      const source = {
        source_type: "xlsx" as const,
        source_filename: file.name,
        version_label: versionLabel,
        content: base64
      };

      const result = await deps.scf.imports.importFromSource(source);

      return json({
        ...result,
        source_filename: file.name,
        file_size_bytes: file.size,
        trace_id: traceId
      }, { status: result.import_run.status === "failed" ? 400 : 202 });
    }
  },
  {
    method: "POST",
    path: "/api/v1/admin/scf/import-xlsx/dry-run",
    protected: true,
    requireActor: true,
    permissions: ["scf:import"],
    handler: async ({ deps, request, traceId }) => {
      const formData = await request.formData().catch(() => {
        throw new ApiError("VALIDATION_ERROR", "Request must be multipart/form-data with a file field.", 400);
      });

      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        throw new ApiError("VALIDATION_ERROR", "Missing required 'file' field in multipart upload.", 400);
      }

      const versionLabel = formData.get("version_label")?.toString() || "SCF (dry-run)";

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // ZIP magic bytes check (ZIP signature is 50 4B 03 04)
      if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
        throw new ApiError("VALIDATION_ERROR", "Invalid XLSX file: missing ZIP file signature.", 400);
      }

      const base64 = btoa(String.fromCharCode(...bytes));

      const source = {
        source_type: "xlsx" as const,
        source_filename: file.name,
        version_label: versionLabel,
        content: base64
      };

      const result = await deps.scf.imports.dryRunImport(source);

      return json({
        ...result,
        source_filename: file.name,
        file_size_bytes: file.size,
        is_dry_run: true,
        trace_id: traceId
      });
    }
  }
];


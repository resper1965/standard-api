import { ScfImportSourceSchema, type ScfControl, type ScfFramework, type ScfFrameworkRequirement, type ScfVersion } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";

const requireVersionQuery = (request: Request, name = "scf_version"): string => {
  const value = new URL(request.url).searchParams.get(name);
  if (!value) throw new ApiError("VALIDATION_ERROR", `Missing query parameter: ${name}.`, 400);
  return value;
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
    path: "/api/v1/scf/versions",
    protected: true,
    handler: async ({ deps, traceId }) => {
      const versions = await deps.scf.versions.listVersions();
      return json({ data: versions.map(versionResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/latest",
    protected: true,
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
    handler: async ({ deps, params, traceId }) => {
      const version = await deps.scf.versions.getVersion(routeParam(params, "scfVersionId"));
      if (!version) throw new ApiError("NOT_FOUND", "SCF version not found.", 404);
      return json({ ...versionResponse(version), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/versions/:scfVersionId/domains",
    protected: true,
    handler: async ({ deps, params, traceId }) => {
      const scfVersionId = routeParam(params, "scfVersionId");
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
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = routeParam(params, "scfVersionId");
      const url = new URL(request.url);
      try {
        const controls = await deps.scf.controls.searchControls({
          scf_version_id: scfVersionId,
          ...(url.searchParams.get("control_code") ? { control_code: url.searchParams.get("control_code")! } : {}),
          ...(url.searchParams.get("domain_code") ? { domain_code: url.searchParams.get("domain_code")! } : {}),
          ...(url.searchParams.get("q") ? { q: url.searchParams.get("q")! } : {}),
          ...(url.searchParams.get("tags") ? { tags: url.searchParams.get("tags")!.split(",").map(t => t.trim()).filter(Boolean) } : {})
        });
        return json({ data: controls.map(controlResponse), scf_version_id: scfVersionId, trace_id: traceId });
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
    handler: async ({ deps, params, request, traceId }) => {
      const versionId = requireVersionQuery(request, "version");
      const control = await deps.scf.controls.getControlByCode(versionId, routeParam(params, "controlCode"));
      if (!control) throw new ApiError("NOT_FOUND", "SCF control not found.", 404);
      return json({ ...controlResponse(control), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks",
    protected: true,
    handler: async ({ deps, traceId }) => {
      const frameworks = await deps.scf.frameworks.listFrameworks();
      return json({ data: frameworks.map(frameworkResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks/:frameworkId",
    protected: true,
    handler: async ({ deps, params, traceId }) => {
      const framework = await deps.scf.frameworks.getFramework(routeParam(params, "frameworkId"));
      if (!framework) throw new ApiError("NOT_FOUND", "SCF framework not found.", 404);
      return json({ ...frameworkResponse(framework), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId",
    protected: true,
    handler: async ({ deps, params, traceId }) => {
      const control = await deps.scf.controls.getControl(routeParam(params, "controlId"));
      if (!control) throw new ApiError("NOT_FOUND", "SCF control not found.", 404);
      return json({ ...controlResponse(control), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks/:frameworkId/requirements",
    protected: true,
    handler: async ({ deps, params, traceId }) => {
      const frameworkId = routeParam(params, "frameworkId");
      const requirements = await deps.scf.frameworks.listRequirements(frameworkId);
      return json({ data: requirements.map(requirementResponse), framework_id: frameworkId, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/requirements/:requirementId/mappings",
    protected: true,
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = requireVersionQuery(request);
      const mappings = await deps.scf.mappings.getMappingsForRequirement(routeParam(params, "requirementId"), scfVersionId);
      return json({ data: await deps.scf.mappings.enrichMappings(mappings), scf_version_id: scfVersionId, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/controls/:controlId/mappings",
    protected: true,
    handler: async ({ deps, params, request, traceId }) => {
      const url = new URL(request.url);
      const control = await deps.scf.controls.getControl(routeParam(params, "controlId"));
      if (!control) throw new ApiError("NOT_FOUND", "SCF control not found.", 404);
      const mappings = await deps.scf.mappings.getMappingsForControl(control.id, control.scf_version_id, url.searchParams.get("framework") ?? undefined);
      return json({ data: await deps.scf.mappings.enrichMappings(mappings), scf_version_id: control.scf_version_id, trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/scf/frameworks/:frameworkId/coverage",
    protected: true,
    handler: async ({ deps, params, request, traceId }) => {
      const scfVersionId = requireVersionQuery(request);
      const coverage = await deps.scf.mappings.getCoverageSummary(routeParam(params, "frameworkId"), scfVersionId);
      return json({ ...coverage, trace_id: traceId });
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
    requireActor: true,
    handler: async ({ deps, params, traceId }) => {
      const run = await deps.scf.repository.getImportRun(routeParam(params, "importRunId"));
      if (!run) throw new ApiError("NOT_FOUND", "SCF import run not found.", 404);
      return json({ ...run, trace_id: traceId });
    }
  },
  {
    method: "POST",
    path: "/api/v1/admin/scf/import-runs/:importRunId/dry-run",
    protected: true,
    requireActor: true,
    handler: async ({ deps, params, request, traceId }) => {
      const source = await parseJson(request, ScfImportSourceSchema);
      const result = await deps.scf.imports.dryRunImport(source);
      return json({ import_run_id: routeParam(params, "importRunId"), ...result, trace_id: traceId });
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


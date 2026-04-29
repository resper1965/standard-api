import type {
  ScfControl,
  ScfDomain,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfImportRun,
  ScfImportSource,
  ScfMapping,
  ScfVersion
} from "../types";
import type { ScfImporter } from "./scf-importer";
import { sha256Hex, validateBaseImportSource } from "./scf-importer";

const newId = (): string => crypto.randomUUID();

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

const parseCsv = (content: string): Record<string, string>[] => {
  const [headerLine, ...lines] = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!headerLine) return [];
  const headers = parseCsvLine(headerLine).map((header) => header.trim());
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
};

export const createCsvScfImporter = (): ScfImporter => ({
  sourceType: "csv",
  validate: async (source) => {
    const base = validateBaseImportSource(source);
    if (!base.valid) return base;
    const rows = parseCsv(source.content);
    const hasVersion = rows.some((row) => row.record_type === "version");
    return hasVersion
      ? { valid: true, errors: [], warnings: [] }
      : { valid: false, errors: ["CSV import must include a version row."], warnings: [] };
  },
  parse: async (source: ScfImportSource) => {
    const sourceHash = source.source_hash ?? `sha256:${await sha256Hex(source.content)}`;
    const rows = parseCsv(source.content);
    const versions: ScfVersion[] = [];
    const domains: ScfDomain[] = [];
    const controls: ScfControl[] = [];
    const frameworks: ScfFramework[] = [];
    const requirements: ScfFrameworkRequirement[] = [];
    const mappings: ScfMapping[] = [];
    const warnings: string[] = [];
    const versionId = newId();
    const domainByCode = new Map<string, string>();
    const controlByCode = new Map<string, string>();
    const frameworkByCode = new Map<string, string>();
    const requirementByCode = new Map<string, string>();

    for (const row of rows) {
      if (row.record_type === "version") {
        versions.push({
          id: row.id || versionId,
          version_label: row.version_label || source.version_label || "",
          ...(row.release_date ? { release_date: row.release_date } : {}),
          ...(source.source_url ? { source_url: source.source_url } : {}),
          source_hash: sourceHash,
          import_status: "succeeded",
          imported_at: new Date().toISOString(),
          imported_by: "csv-importer",
          notes: "Imported from structured CSV source.",
          is_synthetic: row.is_synthetic === "true"
        });
      }
      if (row.record_type === "domain") {
        const id = row.id || newId();
        const domainCode = row.domain_code ?? "";
        const domainName = row.domain_name ?? "";
        domainByCode.set(domainCode, id);
        domains.push({
          id,
          scf_version_id: row.scf_version_id || versionId,
          domain_code: domainCode,
          domain_name: domainName,
          ...(row.description ? { description: row.description } : {}),
          sort_order: Number(row.sort_order || 0),
          is_synthetic: row.is_synthetic === "true"
        });
      }
      if (row.record_type === "control") {
        const id = row.id || newId();
        const controlCode = row.control_code ?? "";
        const controlTitle = row.control_title ?? "";
        const domainId = row.scf_domain_id || domainByCode.get(row.domain_code ?? "");
        if (!domainId) {
          warnings.push(`Control ${controlCode} skipped because domain was not found.`);
          continue;
        }
        controlByCode.set(controlCode, id);
        controls.push({
          id,
          scf_version_id: row.scf_version_id || versionId,
          scf_domain_id: domainId,
          control_code: controlCode,
          control_title: controlTitle,
          ...(row.control_description ? { control_description: row.control_description } : {}),
          status: "active",
          is_synthetic: row.is_synthetic === "true"
        });
      }
      if (row.record_type === "framework") {
        const id = row.id || newId();
        const frameworkCode = row.framework_code ?? "";
        const frameworkName = row.framework_name ?? "";
        frameworkByCode.set(frameworkCode, id);
        frameworks.push({
          id,
          framework_code: frameworkCode,
          framework_name: frameworkName,
          ...(row.framework_version ? { framework_version: row.framework_version } : {}),
          ...(row.publisher ? { publisher: row.publisher } : {}),
          ...(row.category ? { category: row.category } : {}),
          status: "active",
          is_synthetic: row.is_synthetic === "true"
        });
      }
      if (row.record_type === "requirement") {
        const requirementCode = row.requirement_code ?? "";
        const requirementTitle = row.requirement_title ?? "";
        const frameworkId = row.scf_framework_id || frameworkByCode.get(row.framework_code ?? "");
        if (!frameworkId) {
          warnings.push(`Requirement ${requirementCode} skipped because framework was not found.`);
          continue;
        }
        const id = row.id || newId();
        requirementByCode.set(requirementCode, id);
        requirements.push({
          id,
          scf_framework_id: frameworkId,
          requirement_code: requirementCode,
          requirement_title: requirementTitle,
          ...(row.requirement_text ? { requirement_text: row.requirement_text } : {}),
          sort_order: Number(row.sort_order || 0),
          status: "active",
          is_synthetic: row.is_synthetic === "true"
        });
      }
      if (row.record_type === "mapping") {
        const frameworkId = row.scf_framework_id || frameworkByCode.get(row.framework_code ?? "");
        const requirementId = row.scf_framework_requirement_id || requirementByCode.get(row.requirement_code ?? "");
        const controlId = row.scf_control_id || controlByCode.get(row.control_code ?? "");
        if (!frameworkId || !requirementId || !controlId) {
          warnings.push(`Mapping ${row.requirement_code || row.scf_framework_requirement_id} skipped because relationship targets were not found.`);
          continue;
        }
        mappings.push({
          id: row.id || newId(),
          scf_version_id: row.scf_version_id || versionId,
          scf_framework_id: frameworkId,
          scf_framework_requirement_id: requirementId,
          scf_control_id: controlId,
          relationship_type: row.relationship_type === "equal" ? "equal" : row.relationship_type === "subset" ? "subset" : row.relationship_type === "superset" ? "superset" : "related",
          ...(row.relationship_strength ? { relationship_strength: row.relationship_strength } : {}),
          ...(row.mapping_rationale ? { mapping_rationale: row.mapping_rationale } : {}),
          mapping_source: row.mapping_source || source.source_filename || "csv",
          is_official: row.is_official !== "false",
          status: "active",
          is_synthetic: row.is_synthetic === "true"
        });
      }
    }

    const importRun: ScfImportRun = {
      id: newId(),
      ...(versions[0]?.id ? { scf_version_id: versions[0].id } : {}),
      source_type: "csv",
      ...(source.source_filename ? { source_filename: source.source_filename } : {}),
      source_hash: sourceHash,
      status: "succeeded",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      import_statistics: {
        versions: versions.length,
        domains: domains.length,
        controls: controls.length,
        frameworks: frameworks.length,
        requirements: requirements.length,
        mappings: mappings.length,
        strm_relationships: 0,
        warnings: warnings.length,
        synthetic_records: [...versions, ...domains, ...controls, ...frameworks, ...requirements, ...mappings].filter((item) => item.is_synthetic).length
      },
      trace_id: "csv-importer"
    };

    return {
      dataset: { versions, domains, controls, frameworks, requirements, mappings, strmRelationships: [], importRuns: [importRun] },
      warnings
    };
  }
});

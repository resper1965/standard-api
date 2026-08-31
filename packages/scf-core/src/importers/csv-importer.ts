import type {
  ScfControl,
  ScfDomain,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfImportRun,
  ScfImportSource,
  ScfMapping,
  ScfVersion,
} from "../types";
import type { ScfImporter } from "./scf-importer";
import { sha256Hex, validateBaseImportSource } from "./scf-importer";
import { toCanonicalOperator } from "./strm-operator";

const newId = (): string => crypto.randomUUID();

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
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
  const [headerLine, ...lines] = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (!headerLine) return [];
  const headers = parseCsvLine(headerLine).map((header) => header.trim());
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
};

interface ImportContext {
  versions: ScfVersion[];
  domains: ScfDomain[];
  controls: ScfControl[];
  frameworks: ScfFramework[];
  requirements: ScfFrameworkRequirement[];
  mappings: ScfMapping[];
  warnings: string[];
  versionId: string;
  sourceHash: string;
  source: ScfImportSource;
  domainByCode: Map<string, string>;
  controlByCode: Map<string, string>;
  frameworkByCode: Map<string, string>;
  requirementByCode: Map<string, string>;
}

const parseVersionRow = (row: Record<string, string>, ctx: ImportContext) => {
  ctx.versions.push({
    id: row.id || ctx.versionId,
    version_label: row.version_label || ctx.source.version_label || "",
    ...(row.release_date ? { release_date: row.release_date } : {}),
    ...(ctx.source.source_url ? { source_url: ctx.source.source_url } : {}),
    source_hash: ctx.sourceHash,
    import_status: "succeeded",
    imported_at: new Date().toISOString(),
    imported_by: "csv-importer",
    notes: "Imported from structured CSV source.",
    is_synthetic: row.is_synthetic === "true",
  });
};

const parseDomainRow = (row: Record<string, string>, ctx: ImportContext) => {
  const id = row.id || newId();
  const domainCode = row.domain_code ?? "";
  ctx.domainByCode.set(domainCode, id);
  ctx.domains.push({
    id,
    scf_version_id: row.scf_version_id || ctx.versionId,
    domain_code: domainCode,
    domain_name: row.domain_name ?? "",
    ...(row.description ? { description: row.description } : {}),
    sort_order: Number(row.sort_order || 0),
    is_synthetic: row.is_synthetic === "true",
  });
};

const parseControlRow = (row: Record<string, string>, ctx: ImportContext) => {
  const controlCode = row.control_code ?? "";
  const domainId =
    row.scf_domain_id || ctx.domainByCode.get(row.domain_code ?? "");
  if (!domainId) {
    ctx.warnings.push(
      `Control ${controlCode} skipped because domain was not found.`,
    );
    return;
  }
  const id = row.id || newId();
  ctx.controlByCode.set(controlCode, id);
  ctx.controls.push({
    id,
    scf_version_id: row.scf_version_id || ctx.versionId,
    scf_domain_id: domainId,
    control_code: controlCode,
    control_title: row.control_title ?? "",
    ...(row.control_description
      ? { control_description: row.control_description }
      : {}),
    status: "active",
    is_synthetic: row.is_synthetic === "true",
  });
};

const parseFrameworkRow = (row: Record<string, string>, ctx: ImportContext) => {
  const frameworkCode = row.framework_code ?? "";
  const id = row.id || newId();
  ctx.frameworkByCode.set(frameworkCode, id);
  ctx.frameworks.push({
    id,
    framework_code: frameworkCode,
    framework_name: row.framework_name ?? "",
    ...(row.framework_version
      ? { framework_version: row.framework_version }
      : {}),
    ...(row.publisher ? { publisher: row.publisher } : {}),
    ...(row.category ? { category: row.category } : {}),
    status: "active",
    is_synthetic: row.is_synthetic === "true",
  });
};

const parseRequirementRow = (
  row: Record<string, string>,
  ctx: ImportContext,
) => {
  const requirementCode = row.requirement_code ?? "";
  const frameworkId =
    row.scf_framework_id || ctx.frameworkByCode.get(row.framework_code ?? "");
  if (!frameworkId) {
    ctx.warnings.push(
      `Requirement ${requirementCode} skipped because framework was not found.`,
    );
    return;
  }
  const id = row.id || newId();
  ctx.requirementByCode.set(requirementCode, id);
  ctx.requirements.push({
    id,
    scf_framework_id: frameworkId,
    requirement_code: requirementCode,
    requirement_title: row.requirement_title ?? "",
    ...(row.requirement_text ? { requirement_text: row.requirement_text } : {}),
    sort_order: Number(row.sort_order || 0),
    status: "active",
    is_synthetic: row.is_synthetic === "true",
    is_mcr: row.is_mcr === "true",
    ...(row.mcr_rationale ? { mcr_rationale: row.mcr_rationale } : {}),
  });
};

const parseMappingRow = (row: Record<string, string>, ctx: ImportContext) => {
  const frameworkId =
    row.scf_framework_id || ctx.frameworkByCode.get(row.framework_code ?? "");
  const requirementId =
    row.scf_framework_requirement_id ||
    ctx.requirementByCode.get(row.requirement_code ?? "");
  const controlId =
    row.scf_control_id || ctx.controlByCode.get(row.control_code ?? "");
  if (!frameworkId || !requirementId || !controlId) {
    ctx.warnings.push(
      `Mapping ${row.requirement_code || row.scf_framework_requirement_id} skipped because relationship targets were not found.`,
    );
    return;
  }
  // ADR-001: an operator this source did not state is absence, not a claim
  // that the scopes intersect. Route through the single canonicaliser so a
  // blank/unrecognised value lands as null instead of a fabricated overlap.
  const relationship_type = toCanonicalOperator(row.relationship_type);

  ctx.mappings.push({
    id: row.id || newId(),
    scf_version_id: row.scf_version_id || ctx.versionId,
    scf_framework_id: frameworkId,
    scf_framework_requirement_id: requirementId,
    scf_control_id: controlId,
    relationship_type,
    ...(row.relationship_strength
      ? { relationship_strength: row.relationship_strength }
      : {}),
    ...(row.mapping_rationale
      ? { mapping_rationale: row.mapping_rationale }
      : {}),
    mapping_source: row.mapping_source || ctx.source.source_filename || "csv",
    is_official: row.is_official !== "false",
    status: "active",
    is_synthetic: row.is_synthetic === "true",
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
      : {
          valid: false,
          errors: ["CSV import must include a version row."],
          warnings: [],
        };
  },
  parse: async (source: ScfImportSource) => {
    const sourceHash =
      source.source_hash ?? `sha256:${await sha256Hex(source.content)}`;
    const rows = parseCsv(source.content);

    const ctx: ImportContext = {
      versions: [],
      domains: [],
      controls: [],
      frameworks: [],
      requirements: [],
      mappings: [],
      warnings: [],
      versionId: newId(),
      sourceHash,
      source,
      domainByCode: new Map(),
      controlByCode: new Map(),
      frameworkByCode: new Map(),
      requirementByCode: new Map(),
    };

    for (const row of rows) {
      if (row.record_type === "version") parseVersionRow(row, ctx);
      else if (row.record_type === "domain") parseDomainRow(row, ctx);
      else if (row.record_type === "control") parseControlRow(row, ctx);
      else if (row.record_type === "framework") parseFrameworkRow(row, ctx);
      else if (row.record_type === "requirement") parseRequirementRow(row, ctx);
      else if (row.record_type === "mapping") parseMappingRow(row, ctx);
    }

    const importRun: ScfImportRun = {
      id: newId(),
      ...(ctx.versions[0]?.id ? { scf_version_id: ctx.versions[0].id } : {}),
      source_type: "csv",
      ...(source.source_filename
        ? { source_filename: source.source_filename }
        : {}),
      source_hash: sourceHash,
      status: "succeeded",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      import_statistics: {
        versions: ctx.versions.length,
        domains: ctx.domains.length,
        controls: ctx.controls.length,
        frameworks: ctx.frameworks.length,
        requirements: ctx.requirements.length,
        mappings: ctx.mappings.length,
        strm_relationships: 0,
        warnings: ctx.warnings.length,
        synthetic_records: [
          ...ctx.versions,
          ...ctx.domains,
          ...ctx.controls,
          ...ctx.frameworks,
          ...ctx.requirements,
          ...ctx.mappings,
        ].filter((item) => item.is_synthetic).length,
      },
      trace_id: "csv-importer",
    };

    return {
      dataset: {
        versions: ctx.versions,
        domains: ctx.domains,
        controls: ctx.controls,
        frameworks: ctx.frameworks,
        requirements: ctx.requirements,
        mappings: ctx.mappings,
        strmRelationships: [],
        importRuns: [importRun],
      },
      warnings: ctx.warnings,
    };
  },
});


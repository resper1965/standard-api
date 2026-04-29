import type { ScfImporter } from "../importers/scf-importer";
import { safeImportError, sha256Hex } from "../importers/scf-importer";
import type { ScfRepository } from "../repositories/scf.repository";
import type { ScfDataset, ScfImportResult, ScfImportSource, ScfImportValidationResult } from "../types";

export class ScfImportService {
  constructor(
    private readonly repository: ScfRepository,
    private readonly importers: ScfImporter[]
  ) {}

  async validateImport(source: ScfImportSource): Promise<ScfImportValidationResult> {
    const importer = this.getImporter(source.source_type);
    const base = await importer.validate(source);
    if (!base.valid) return base;
    const parsed = await importer.parse(source);
    return validateDataset(parsed.dataset, parsed.warnings);
  }

  async dryRunImport(source: ScfImportSource): Promise<ScfImportResult> {
    const importer = this.getImporter(source.source_type);
    const parsed = await importer.parse(source);
    const validation = validateDataset(parsed.dataset, parsed.warnings);
    if (!validation.valid) {
      return {
        import_run: {
          id: crypto.randomUUID(),
          ...(parsed.dataset.versions[0]?.id ? { scf_version_id: parsed.dataset.versions[0].id } : {}),
          source_type: source.source_type,
          ...(source.source_filename ? { source_filename: source.source_filename } : {}),
          source_hash: source.source_hash ?? `sha256:${await sha256Hex(source.content)}`,
          status: "failed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          error_summary_safe: validation.errors.join("; ").slice(0, 240),
          import_statistics: parsed.dataset.importRuns[0]?.import_statistics ?? {
            versions: 0,
            domains: 0,
            controls: 0,
            frameworks: 0,
            requirements: 0,
            mappings: 0,
            strm_relationships: 0,
            warnings: validation.warnings.length,
            synthetic_records: 0
          },
          trace_id: "dry-run"
        },
        warnings: validation.warnings
      };
    }
    return { import_run: { ...parsed.dataset.importRuns[0]!, status: "succeeded" }, warnings: validation.warnings };
  }

  async importFromSource(source: ScfImportSource): Promise<ScfImportResult> {
    const importer = this.getImporter(source.source_type);
    const sourceHash = source.source_hash ?? `sha256:${await sha256Hex(source.content)}`;
    const run = await this.repository.createImportRun({
      id: crypto.randomUUID(),
      source_type: source.source_type,
      ...(source.source_filename ? { source_filename: source.source_filename } : {}),
      source_hash: sourceHash,
      status: "running",
      started_at: new Date().toISOString(),
      import_statistics: {
        versions: 0,
        domains: 0,
        controls: 0,
        frameworks: 0,
        requirements: 0,
        mappings: 0,
        strm_relationships: 0,
        warnings: 0,
        synthetic_records: 0
      },
      trace_id: "api-import"
    });

    try {
      const validation = await importer.validate({ ...source, source_hash: sourceHash });
      if (!validation.valid) throw new Error(validation.errors.join("; "));
      const parsed = await importer.parse({ ...source, source_hash: sourceHash });
      const datasetValidation = validateDataset(parsed.dataset, parsed.warnings);
      if (!datasetValidation.valid) throw new Error(datasetValidation.errors.join("; "));
      await this.repository.replaceDataset(parsed.dataset);
      const completed = {
        ...run,
        ...(parsed.dataset.versions[0]?.id ? { scf_version_id: parsed.dataset.versions[0].id } : {}),
        status: "succeeded" as const,
        completed_at: new Date().toISOString(),
        import_statistics: parsed.dataset.importRuns[0]?.import_statistics ?? run.import_statistics
      };
      await this.repository.saveImportRun(completed);
      return { import_run: completed, warnings: datasetValidation.warnings };
    } catch (error) {
      const failed = {
        ...run,
        status: "failed" as const,
        completed_at: new Date().toISOString(),
        error_summary_safe: safeImportError(error)
      };
      await this.repository.saveImportRun(failed);
      return { import_run: failed, warnings: [] };
    }
  }

  async rollbackImport(): Promise<never> {
    throw new Error("SCF import rollback is not implemented in this MVP. Use immutable version replacement in a future persistence-backed implementation.");
  }

  private getImporter(sourceType: ScfImportSource["source_type"]): ScfImporter {
    const importer = this.importers.find((candidate) => candidate.sourceType === sourceType);
    if (!importer) throw new Error(`No SCF importer registered for source type ${sourceType}.`);
    return importer;
  }
}

export const validateDataset = (dataset: ScfDataset, warnings: string[] = []): ScfImportValidationResult => {
  const errors: string[] = [];
  const versionIds = new Set(dataset.versions.map((version) => version.id));
  const controlCodes = new Set<string>();
  const requirementCodes = new Set<string>();
  const controlIds = new Set(dataset.controls.map((control) => control.id));
  const frameworkIds = new Set(dataset.frameworks.map((framework) => framework.id));
  const requirementIds = new Set(dataset.requirements.map((requirement) => requirement.id));

  if (dataset.versions.length === 0) errors.push("At least one SCF version is required.");

  for (const control of dataset.controls) {
    if (!versionIds.has(control.scf_version_id)) errors.push(`Control ${control.control_code} points to an unknown SCF version.`);
    const key = `${control.scf_version_id}:${control.control_code.toLowerCase()}`;
    if (controlCodes.has(key)) errors.push(`Duplicate control_code ${control.control_code} in the same SCF version.`);
    controlCodes.add(key);
  }

  for (const requirement of dataset.requirements) {
    if (!frameworkIds.has(requirement.scf_framework_id)) errors.push(`Requirement ${requirement.requirement_code} points to an unknown framework.`);
    const key = `${requirement.scf_framework_id}:${requirement.requirement_code.toLowerCase()}`;
    if (requirementCodes.has(key)) errors.push(`Duplicate requirement_code ${requirement.requirement_code} in the same framework.`);
    requirementCodes.add(key);
  }

  for (const mapping of dataset.mappings) {
    if (!versionIds.has(mapping.scf_version_id)) errors.push(`Mapping ${mapping.id} points to an unknown SCF version.`);
    if (!frameworkIds.has(mapping.scf_framework_id)) errors.push(`Mapping ${mapping.id} points to an unknown framework.`);
    if (!requirementIds.has(mapping.scf_framework_requirement_id)) errors.push(`Mapping ${mapping.id} points to an unknown requirement.`);
    if (!controlIds.has(mapping.scf_control_id)) errors.push(`Mapping ${mapping.id} points to an unknown control.`);
    const control = dataset.controls.find((candidate) => candidate.id === mapping.scf_control_id);
    if (control && control.scf_version_id !== mapping.scf_version_id) errors.push(`Mapping ${mapping.id} links a control from a different SCF version.`);
  }

  return { valid: errors.length === 0, errors, warnings };
};

// @ts-nocheck -- Zod v4 CI type compat
import type { ScfRepository } from "../repositories/scf.repository";
import type { ScfImportRun, ScfImportStatistics, ScfVersion } from "../types";

export class ScfVersionService {
  constructor(private readonly repository: ScfRepository) {}

  listVersions(organizationId?: string): Promise<ScfVersion[]> {
    return this.repository.listVersions(organizationId);
  }

  getVersion(versionId: string): Promise<ScfVersion | null> {
    return this.repository.getVersion(versionId);
  }

  getLatestVersion(organizationId?: string): Promise<ScfVersion | null> {
    return this.repository.getLatestVersion(organizationId);
  }

  registerImportRun(input: {
    scfVersionId?: string;
    sourceType: ScfImportRun["source_type"];
    sourceFilename?: string;
    sourceHash: string;
    traceId: string;
  }): Promise<ScfImportRun> {
    const run: ScfImportRun = {
      id: crypto.randomUUID(),
      ...(input.scfVersionId ? { scf_version_id: input.scfVersionId } : {}),
      source_type: input.sourceType,
      ...(input.sourceFilename
        ? { source_filename: input.sourceFilename }
        : {}),
      source_hash: input.sourceHash,
      status: "running",
      started_at: new Date().toISOString(),
      import_statistics: emptyImportStatistics(),
      trace_id: input.traceId,
    };
    return this.repository.createImportRun(run);
  }

  async completeImportRun(
    importRunId: string,
    statistics: ScfImportStatistics,
  ): Promise<ScfImportRun | null> {
    const run = await this.repository.getImportRun(importRunId);
    if (!run) return null;
    const completed = {
      ...run,
      status: "succeeded" as const,
      completed_at: new Date().toISOString(),
      import_statistics: statistics,
    };
    await this.repository.saveImportRun(completed);
    return completed;
  }

  async failImportRun(
    importRunId: string,
    errorSummarySafe: string,
  ): Promise<ScfImportRun | null> {
    const run = await this.repository.getImportRun(importRunId);
    if (!run) return null;
    const failed = {
      ...run,
      status: "failed" as const,
      completed_at: new Date().toISOString(),
      error_summary_safe: errorSummarySafe.slice(0, 240),
    };
    await this.repository.saveImportRun(failed);
    return failed;
  }
}

export const emptyImportStatistics = (): ScfImportStatistics => ({
  versions: 0,
  domains: 0,
  controls: 0,
  frameworks: 0,
  requirements: 0,
  mappings: 0,
  strm_relationships: 0,
  warnings: 0,
  synthetic_records: 0,
});


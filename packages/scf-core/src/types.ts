import type {
  ScfControl,
  ScfControlSearchQuery,
  ScfDomain,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfImportRun,
  ScfImportSource,
  ScfImportStatistics,
  ScfImportResult,
  ScfMapping,
  ScfStrmRelationship,
  ScfVersion
} from "@standard/schemas";

export type {
  ScfControl,
  ScfControlSearchQuery,
  ScfDomain,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfImportRun,
  ScfImportSource,
  ScfImportStatistics,
  ScfImportResult,
  ScfMapping,
  ScfStrmRelationship,
  ScfVersion
};

export type ScfDataset = {
  versions: ScfVersion[];
  domains: ScfDomain[];
  controls: ScfControl[];
  frameworks: ScfFramework[];
  requirements: ScfFrameworkRequirement[];
  mappings: ScfMapping[];
  strmRelationships: ScfStrmRelationship[];
  importRuns: ScfImportRun[];
};

export type ScfImportValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type ScfImportParsedDataset = {
  dataset: ScfDataset;
  warnings: string[];
};


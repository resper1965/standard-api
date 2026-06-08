import type {
  ScfAssessmentObjective,
  ScfControl,
  ScfControlSearchQuery,
  ScfDomain,
  ScfEvidenceRequest,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfImportRun,
  ScfImportSource,
  ScfImportStatistics,
  ScfImportResult,
  ScfMapping,
  ScfMaturityCriteria,
  ScfRisk,
  ScfStrmRelationship,
  ScfThreat,
  ScfVersion,
} from "@standard/schemas";

export type {
  ScfAssessmentObjective,
  ScfControl,
  ScfControlSearchQuery,
  ScfDomain,
  ScfEvidenceRequest,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfImportRun,
  ScfImportSource,
  ScfImportStatistics,
  ScfImportResult,
  ScfMapping,
  ScfMaturityCriteria,
  ScfRisk,
  ScfStrmRelationship,
  ScfThreat,
  ScfVersion,
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

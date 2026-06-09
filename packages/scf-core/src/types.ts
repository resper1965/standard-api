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
  DpmpPrinciple,
  DpmpFrameworkMapping,
  CdpasStandard,
  CdpasSubRequirement,
  CdpasControlMapping,
  MadStandard,
  MadSubRequirement,
  MadMaturityCriteria,
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
  DpmpPrinciple,
  DpmpFrameworkMapping,
  CdpasStandard,
  CdpasSubRequirement,
  CdpasControlMapping,
  MadStandard,
  MadSubRequirement,
  MadMaturityCriteria,
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
  assessmentObjectives?: ScfAssessmentObjective[];
  evidenceRequests?: ScfEvidenceRequest[];
  maturityCriteria?: ScfMaturityCriteria[];
  risks?: ScfRisk[];
  threats?: ScfThreat[];
  riskControlMappings?: {
    id: string;
    scf_version_id: string;
    scf_risk_id: string;
    scf_control_id: string;
  }[];
  threatControlMappings?: {
    id: string;
    scf_version_id: string;
    scf_threat_id: string;
    scf_control_id: string;
  }[];
  dpmpPrinciples?: DpmpPrinciple[];
  dpmpFrameworkMappings?: DpmpFrameworkMapping[];
  cdpasStandards?: CdpasStandard[];
  cdpasSubRequirements?: CdpasSubRequirement[];
  cdpasControlMappings?: CdpasControlMapping[];
  madStandards?: MadStandard[];
  madSubRequirements?: MadSubRequirement[];
  madMaturityCriteria?: MadMaturityCriteria[];
  madControlMappings?: Array<{
    id: string;
    scf_version_id: string;
    mad_sub_requirement_id: string;
    scf_control_id: string;
    relationship_note: null;
    is_synthetic: false;
  }>;
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

import type { KbSearchResult, KbServiceDependencies } from "@aegis/kb";
import type { ScfCoreServices } from "@aegis/scf-core";
import type {
  AssessmentStatus,
  EvidenceFindingResponse,
  EvidenceSourceResponse,
  EvidenceStatus,
  EvidenceStrength,
  GapAnalysisValidationResponse,
  GapAnalysisVersionResponse,
  GapFindingResponse,
  GapSeverity,
  GapType,
  SoaItemResponse,
  SoaVersionResponse,
  UpdateGapFindingRequest
} from "@aegis/schemas";
import type { SoaDependencies } from "@aegis/soa";

export type {
  AssessmentStatus,
  EvidenceFindingResponse,
  EvidenceSourceResponse,
  EvidenceStatus,
  EvidenceStrength,
  GapAnalysisValidationResponse,
  GapAnalysisVersionResponse,
  GapFindingResponse,
  GapSeverity,
  GapType,
  KbSearchResult,
  SoaItemResponse,
  SoaVersionResponse,
  UpdateGapFindingRequest
};

export type GapAnalysisContext = {
  tenantId: string;
  organizationId: string;
  assessmentId: string;
  actorId?: string;
  traceId: string;
};

export type EvidenceFindingRepository = {
  save(finding: EvidenceFindingResponse): Promise<void>;
  update(finding: EvidenceFindingResponse): Promise<void>;
  get(evidenceFindingId: string, tenantId: string): Promise<EvidenceFindingResponse | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<EvidenceFindingResponse[]>;
  findBySoaItem(soaItemId: string, tenantId: string): Promise<EvidenceFindingResponse | null>;
};

export type EvidenceSourceRepository = {
  saveMany(sources: EvidenceSourceResponse[]): Promise<void>;
  listByFinding(evidenceFindingId: string, tenantId: string): Promise<EvidenceSourceResponse[]>;
};

export type GapAnalysisVersionRepository = {
  save(version: GapAnalysisVersionResponse): Promise<void>;
  update(version: GapAnalysisVersionResponse): Promise<void>;
  get(gapAnalysisVersionId: string, tenantId: string): Promise<GapAnalysisVersionResponse | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<GapAnalysisVersionResponse[]>;
};

export type GapFindingRepository = {
  saveMany(findings: GapFindingResponse[]): Promise<void>;
  update(finding: GapFindingResponse): Promise<void>;
  get(gapFindingId: string, tenantId: string): Promise<GapFindingResponse | null>;
  listByVersion(gapAnalysisVersionId: string, tenantId: string): Promise<GapFindingResponse[]>;
};

export type GapAnalysisRepositories = {
  evidenceFindings: EvidenceFindingRepository;
  evidenceSources: EvidenceSourceRepository;
  gapVersions: GapAnalysisVersionRepository;
  gapFindings: GapFindingRepository;
};

export type GapAnalysisDependencies = {
  repositories: GapAnalysisRepositories;
  soa: SoaDependencies;
  kb?: KbServiceDependencies;
  scf?: ScfCoreServices;
};

export type EvidenceClassificationResult = {
  evidence_strength: EvidenceStrength;
  evidence_status: EvidenceStatus;
  evidence_summary: string;
  evidence_limitations: string[];
  confidence_score: number;
};

export type EvidenceFindingFilters = {
  evidence_status?: EvidenceStatus;
  soa_item_id?: string;
};

export type GapFindingFilters = {
  assessment_status?: AssessmentStatus;
};

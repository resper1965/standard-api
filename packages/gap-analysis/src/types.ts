import type { KbSearchResult, KbServiceDependencies } from "@standard/kb";
import type { ScfCoreServices } from "@standard/scf-core";
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
} from "@standard/schemas";
import type { SoaDependencies } from "@standard/soa";

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

export interface TenantScopedEvidenceFindingRepository {
  save(finding: EvidenceFindingResponse): Promise<void>;
  update(finding: EvidenceFindingResponse): Promise<void>;
  get(evidenceFindingId: string): Promise<EvidenceFindingResponse | null>;
  listByAssessment(assessmentId: string): Promise<EvidenceFindingResponse[]>;
  findBySoaItem(soaItemId: string): Promise<EvidenceFindingResponse | null>;
}

export type EvidenceFindingRepository = {
  save(finding: EvidenceFindingResponse): Promise<void>;
  update(finding: EvidenceFindingResponse): Promise<void>;
  get(evidenceFindingId: string, tenantId: string): Promise<EvidenceFindingResponse | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<EvidenceFindingResponse[]>;
  findBySoaItem(soaItemId: string, tenantId: string): Promise<EvidenceFindingResponse | null>;
  withTenant(tenantId: string): TenantScopedEvidenceFindingRepository;
};

export interface TenantScopedEvidenceSourceRepository {
  saveMany(sources: EvidenceSourceResponse[]): Promise<void>;
  listByFinding(evidenceFindingId: string): Promise<EvidenceSourceResponse[]>;
}

export type EvidenceSourceRepository = {
  saveMany(sources: EvidenceSourceResponse[]): Promise<void>;
  listByFinding(evidenceFindingId: string, tenantId: string): Promise<EvidenceSourceResponse[]>;
  withTenant(tenantId: string): TenantScopedEvidenceSourceRepository;
};

export interface TenantScopedGapAnalysisVersionRepository {
  save(version: GapAnalysisVersionResponse): Promise<void>;
  update(version: GapAnalysisVersionResponse): Promise<void>;
  get(gapAnalysisVersionId: string): Promise<GapAnalysisVersionResponse | null>;
  listByAssessment(assessmentId: string): Promise<GapAnalysisVersionResponse[]>;
}

export type GapAnalysisVersionRepository = {
  save(version: GapAnalysisVersionResponse): Promise<void>;
  update(version: GapAnalysisVersionResponse): Promise<void>;
  get(gapAnalysisVersionId: string, tenantId: string): Promise<GapAnalysisVersionResponse | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<GapAnalysisVersionResponse[]>;
  withTenant(tenantId: string): TenantScopedGapAnalysisVersionRepository;
};

export interface TenantScopedGapFindingRepository {
  saveMany(findings: GapFindingResponse[]): Promise<void>;
  update(finding: GapFindingResponse): Promise<void>;
  get(gapFindingId: string): Promise<GapFindingResponse | null>;
  listByVersion(gapAnalysisVersionId: string): Promise<GapFindingResponse[]>;
}

export type GapFindingRepository = {
  saveMany(findings: GapFindingResponse[]): Promise<void>;
  update(finding: GapFindingResponse): Promise<void>;
  get(gapFindingId: string, tenantId: string): Promise<GapFindingResponse | null>;
  listByVersion(gapAnalysisVersionId: string, tenantId: string): Promise<GapFindingResponse[]>;
  withTenant(tenantId: string): TenantScopedGapFindingRepository;
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


import type {
  EvidenceFindingRepository,
  EvidenceFindingResponse,
  EvidenceSourceRepository,
  EvidenceSourceResponse,
  GapAnalysisVersionRepository,
  GapAnalysisVersionResponse,
  GapFindingRepository,
  GapFindingResponse
} from "../types";

export class InMemoryEvidenceFindingRepository implements EvidenceFindingRepository {
  private readonly records = new Map<string, EvidenceFindingResponse>();

  async save(finding: EvidenceFindingResponse): Promise<void> {
    this.records.set(finding.evidence_finding_id, finding);
  }

  async update(finding: EvidenceFindingResponse): Promise<void> {
    this.records.set(finding.evidence_finding_id, finding);
  }

  async get(evidenceFindingId: string, tenantId: string): Promise<EvidenceFindingResponse | null> {
    const finding = this.records.get(evidenceFindingId);
    return finding?.tenant_id === tenantId ? finding : null;
  }

  async listByAssessment(assessmentId: string, tenantId: string): Promise<EvidenceFindingResponse[]> {
    return [...this.records.values()].filter((finding) => finding.assessment_id === assessmentId && finding.tenant_id === tenantId);
  }

  async findBySoaItem(soaItemId: string, tenantId: string): Promise<EvidenceFindingResponse | null> {
    return [...this.records.values()].find((finding) => finding.soa_item_id === soaItemId && finding.tenant_id === tenantId) ?? null;
  }
}

export class InMemoryEvidenceSourceRepository implements EvidenceSourceRepository {
  private readonly records = new Map<string, EvidenceSourceResponse>();

  async saveMany(sources: EvidenceSourceResponse[]): Promise<void> {
    for (const source of sources) this.records.set(source.evidence_source_id, source);
  }

  async listByFinding(evidenceFindingId: string, tenantId: string): Promise<EvidenceSourceResponse[]> {
    return [...this.records.values()].filter((source) => source.evidence_finding_id === evidenceFindingId && source.tenant_id === tenantId);
  }
}

export class InMemoryGapAnalysisVersionRepository implements GapAnalysisVersionRepository {
  private readonly records = new Map<string, GapAnalysisVersionResponse>();

  async save(version: GapAnalysisVersionResponse): Promise<void> {
    this.records.set(version.gap_analysis_version_id, version);
  }

  async update(version: GapAnalysisVersionResponse): Promise<void> {
    this.records.set(version.gap_analysis_version_id, version);
  }

  async get(gapAnalysisVersionId: string, tenantId: string): Promise<GapAnalysisVersionResponse | null> {
    const version = this.records.get(gapAnalysisVersionId);
    return version?.tenant_id === tenantId ? version : null;
  }

  async listByAssessment(assessmentId: string, tenantId: string): Promise<GapAnalysisVersionResponse[]> {
    return [...this.records.values()].filter((version) => version.assessment_id === assessmentId && version.tenant_id === tenantId);
  }
}

export class InMemoryGapFindingRepository implements GapFindingRepository {
  private readonly records = new Map<string, GapFindingResponse>();

  async saveMany(findings: GapFindingResponse[]): Promise<void> {
    for (const finding of findings) this.records.set(finding.gap_finding_id, finding);
  }

  async update(finding: GapFindingResponse): Promise<void> {
    this.records.set(finding.gap_finding_id, finding);
  }

  async get(gapFindingId: string, tenantId: string): Promise<GapFindingResponse | null> {
    const finding = this.records.get(gapFindingId);
    return finding?.tenant_id === tenantId ? finding : null;
  }

  async listByVersion(gapAnalysisVersionId: string, tenantId: string): Promise<GapFindingResponse[]> {
    return [...this.records.values()].filter((finding) => finding.gap_analysis_version_id === gapAnalysisVersionId && finding.tenant_id === tenantId);
  }
}

export const createInMemoryGapAnalysisRepositories = () => ({
  evidenceFindings: new InMemoryEvidenceFindingRepository(),
  evidenceSources: new InMemoryEvidenceSourceRepository(),
  gapVersions: new InMemoryGapAnalysisVersionRepository(),
  gapFindings: new InMemoryGapFindingRepository()
});

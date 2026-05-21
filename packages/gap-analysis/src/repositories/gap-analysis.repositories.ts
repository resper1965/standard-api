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

  withTenant(tenantId: string) {
    return {
      save: async (finding: EvidenceFindingResponse) => this.save(finding),
      update: async (finding: EvidenceFindingResponse) => this.update(finding),
      get: async (evidenceFindingId: string) => this.get(evidenceFindingId, tenantId),
      listByAssessment: async (assessmentId: string) => this.listByAssessment(assessmentId, tenantId),
      findBySoaItem: async (soaItemId: string) => this.findBySoaItem(soaItemId, tenantId)
    };
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

  withTenant(tenantId: string) {
    return {
      saveMany: async (sources: EvidenceSourceResponse[]) => this.saveMany(sources),
      listByFinding: async (evidenceFindingId: string) => this.listByFinding(evidenceFindingId, tenantId)
    };
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

  withTenant(tenantId: string) {
    return {
      save: async (version: GapAnalysisVersionResponse) => this.save(version),
      update: async (version: GapAnalysisVersionResponse) => this.update(version),
      get: async (gapAnalysisVersionId: string) => this.get(gapAnalysisVersionId, tenantId),
      listByAssessment: async (assessmentId: string) => this.listByAssessment(assessmentId, tenantId)
    };
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

  withTenant(tenantId: string) {
    return {
      saveMany: async (findings: GapFindingResponse[]) => this.saveMany(findings),
      update: async (finding: GapFindingResponse) => this.update(finding),
      get: async (gapFindingId: string) => this.get(gapFindingId, tenantId),
      listByVersion: async (gapAnalysisVersionId: string) => this.listByVersion(gapAnalysisVersionId, tenantId)
    };
  }
}

export const createInMemoryGapAnalysisRepositories = () => ({
  evidenceFindings: new InMemoryEvidenceFindingRepository(),
  evidenceSources: new InMemoryEvidenceSourceRepository(),
  gapVersions: new InMemoryGapAnalysisVersionRepository(),
  gapFindings: new InMemoryGapFindingRepository()
});

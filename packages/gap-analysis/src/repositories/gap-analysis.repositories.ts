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

  async get(evidenceFindingId: string, organizationId: string): Promise<EvidenceFindingResponse | null> {
    const finding = this.records.get(evidenceFindingId);
    return finding?.organization_id === organizationId ? finding : null;
  }

  async listByAssessment(assessmentId: string, organizationId: string): Promise<EvidenceFindingResponse[]> {
    return [...this.records.values()].filter((finding) => finding.assessment_id === assessmentId && finding.organization_id === organizationId);
  }

  async findBySoaItem(soaItemId: string, organizationId: string): Promise<EvidenceFindingResponse | null> {
    return [...this.records.values()].find((finding) => finding.soa_item_id === soaItemId && finding.organization_id === organizationId) ?? null;
  }

  withOrganization(organizationId: string) {
    return {
      save: async (finding: EvidenceFindingResponse) => this.save(finding),
      update: async (finding: EvidenceFindingResponse) => this.update(finding),
      get: async (evidenceFindingId: string) => this.get(evidenceFindingId, organizationId),
      listByAssessment: async (assessmentId: string) => this.listByAssessment(assessmentId, organizationId),
      findBySoaItem: async (soaItemId: string) => this.findBySoaItem(soaItemId, organizationId)
    };
  }
}

export class InMemoryEvidenceSourceRepository implements EvidenceSourceRepository {
  private readonly records = new Map<string, EvidenceSourceResponse>();

  async saveMany(sources: EvidenceSourceResponse[]): Promise<void> {
    for (const source of sources) this.records.set(source.evidence_source_id, source);
  }

  async listByFinding(evidenceFindingId: string, organizationId: string): Promise<EvidenceSourceResponse[]> {
    return [...this.records.values()].filter((source) => source.evidence_finding_id === evidenceFindingId && source.organization_id === organizationId);
  }

  withOrganization(organizationId: string) {
    return {
      saveMany: async (sources: EvidenceSourceResponse[]) => this.saveMany(sources),
      listByFinding: async (evidenceFindingId: string) => this.listByFinding(evidenceFindingId, organizationId)
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

  async get(gapAnalysisVersionId: string, organizationId: string): Promise<GapAnalysisVersionResponse | null> {
    const version = this.records.get(gapAnalysisVersionId);
    return version?.organization_id === organizationId ? version : null;
  }

  async listByAssessment(assessmentId: string, organizationId: string): Promise<GapAnalysisVersionResponse[]> {
    return [...this.records.values()].filter((version) => version.assessment_id === assessmentId && version.organization_id === organizationId);
  }

  withOrganization(organizationId: string) {
    return {
      save: async (version: GapAnalysisVersionResponse) => this.save(version),
      update: async (version: GapAnalysisVersionResponse) => this.update(version),
      get: async (gapAnalysisVersionId: string) => this.get(gapAnalysisVersionId, organizationId),
      listByAssessment: async (assessmentId: string) => this.listByAssessment(assessmentId, organizationId)
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

  async get(gapFindingId: string, organizationId: string): Promise<GapFindingResponse | null> {
    const finding = this.records.get(gapFindingId);
    return finding?.organization_id === organizationId ? finding : null;
  }

  async listByVersion(gapAnalysisVersionId: string, organizationId: string): Promise<GapFindingResponse[]> {
    return [...this.records.values()].filter((finding) => finding.gap_analysis_version_id === gapAnalysisVersionId && finding.organization_id === organizationId);
  }

  withOrganization(organizationId: string) {
    return {
      saveMany: async (findings: GapFindingResponse[]) => this.saveMany(findings),
      update: async (finding: GapFindingResponse) => this.update(finding),
      get: async (gapFindingId: string) => this.get(gapFindingId, organizationId),
      listByVersion: async (gapAnalysisVersionId: string) => this.listByVersion(gapAnalysisVersionId, organizationId)
    };
  }
}

export const createInMemoryGapAnalysisRepositories = () => ({
  evidenceFindings: new InMemoryEvidenceFindingRepository(),
  evidenceSources: new InMemoryEvidenceSourceRepository(),
  gapVersions: new InMemoryGapAnalysisVersionRepository(),
  gapFindings: new InMemoryGapFindingRepository()
});

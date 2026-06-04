import type { ScopeRepository, ScopeResponse, SoaItemRepository, SoaItemResponse, SoaVersionRepository, SoaVersionResponse } from "../types";

export class InMemoryScopeRepository implements ScopeRepository {
  private readonly records = new Map<string, ScopeResponse>();

  async save(scope: ScopeResponse): Promise<void> {
    this.records.set(scope.scope_id, scope);
  }

  async update(scope: ScopeResponse): Promise<void> {
    this.records.set(scope.scope_id, scope);
  }

  async get(scopeId: string, organizationId: string): Promise<ScopeResponse | null> {
    const scope = this.records.get(scopeId);
    return scope?.organization_id === organizationId ? scope : null;
  }

  async listByAssessment(assessmentId: string, organizationId: string): Promise<ScopeResponse[]> {
    return [...this.records.values()].filter((scope) => scope.assessment_id === assessmentId && scope.organization_id === organizationId);
  }
}

export class InMemorySoaVersionRepository implements SoaVersionRepository {
  private readonly records = new Map<string, SoaVersionResponse>();

  async save(version: SoaVersionResponse): Promise<void> {
    this.records.set(version.soa_version_id, version);
  }

  async update(version: SoaVersionResponse): Promise<void> {
    this.records.set(version.soa_version_id, version);
  }

  async get(soaVersionId: string, organizationId: string): Promise<SoaVersionResponse | null> {
    const version = this.records.get(soaVersionId);
    return version?.organization_id === organizationId ? version : null;
  }

  async listByAssessment(assessmentId: string, organizationId: string): Promise<SoaVersionResponse[]> {
    return [...this.records.values()].filter((version) => version.assessment_id === assessmentId && version.organization_id === organizationId);
  }
}

export class InMemorySoaItemRepository implements SoaItemRepository {
  private readonly records = new Map<string, SoaItemResponse>();

  async saveMany(items: SoaItemResponse[]): Promise<void> {
    for (const item of items) this.records.set(item.soa_item_id, item);
  }

  async update(item: SoaItemResponse): Promise<void> {
    this.records.set(item.soa_item_id, item);
  }

  async get(soaItemId: string, organizationId: string): Promise<SoaItemResponse | null> {
    const item = this.records.get(soaItemId);
    return item?.organization_id === organizationId ? item : null;
  }

  async listByVersion(soaVersionId: string, organizationId: string): Promise<SoaItemResponse[]> {
    return [...this.records.values()].filter((item) => item.soa_version_id === soaVersionId && item.organization_id === organizationId);
  }
}

export const createInMemorySoaRepositories = () => ({
  scopes: new InMemoryScopeRepository(),
  versions: new InMemorySoaVersionRepository(),
  items: new InMemorySoaItemRepository()
});

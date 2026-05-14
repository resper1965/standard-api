import type { ScopeRepository, ScopeResponse, SoaItemRepository, SoaItemResponse, SoaVersionRepository, SoaVersionResponse } from "../types";

export class InMemoryScopeRepository implements ScopeRepository {
  private readonly records = new Map<string, ScopeResponse>();

  async save(scope: ScopeResponse): Promise<void> {
    this.records.set(scope.scope_id, scope);
  }

  async update(scope: ScopeResponse): Promise<void> {
    this.records.set(scope.scope_id, scope);
  }

  async get(scopeId: string, tenantId: string): Promise<ScopeResponse | null> {
    const scope = this.records.get(scopeId);
    return scope?.tenant_id === tenantId ? scope : null;
  }

  async listByAssessment(assessmentId: string, tenantId: string): Promise<ScopeResponse[]> {
    return [...this.records.values()].filter((scope) => scope.assessment_id === assessmentId && scope.tenant_id === tenantId);
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

  async get(soaVersionId: string, tenantId: string): Promise<SoaVersionResponse | null> {
    const version = this.records.get(soaVersionId);
    return version?.tenant_id === tenantId ? version : null;
  }

  async listByAssessment(assessmentId: string, tenantId: string): Promise<SoaVersionResponse[]> {
    return [...this.records.values()].filter((version) => version.assessment_id === assessmentId && version.tenant_id === tenantId);
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

  async get(soaItemId: string, tenantId: string): Promise<SoaItemResponse | null> {
    const item = this.records.get(soaItemId);
    return item?.tenant_id === tenantId ? item : null;
  }

  async listByVersion(soaVersionId: string, tenantId: string): Promise<SoaItemResponse[]> {
    return [...this.records.values()].filter((item) => item.soa_version_id === soaVersionId && item.tenant_id === tenantId);
  }
}

export const createInMemorySoaRepositories = () => ({
  scopes: new InMemoryScopeRepository(),
  versions: new InMemorySoaVersionRepository(),
  items: new InMemorySoaItemRepository()
});

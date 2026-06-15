import type {
  ScopeRepository,
  ScopeResponse,
  SoaItemRepository,
  SoaItemResponse,
  SoaVersionRepository,
  SoaVersionResponse,
} from "../types";

export class InMemoryScopeRepository implements ScopeRepository {
  private readonly records = new Map<string, ScopeResponse>();

  async save(scope: ScopeResponse): Promise<void> {
    this.records.set((scope as any).scope_id as string, scope);
  }

  async update(scope: ScopeResponse): Promise<void> {
    this.records.set((scope as any).scope_id as string, scope);
  }

  async get(
    scopeId: string,
    organizationId: string,
  ): Promise<ScopeResponse | null> {
    const scope = this.records.get(scopeId);
    if (!scope) return null;
    return (scope as any).organization_id === organizationId ? scope : null;
  }

  async listByAssessment(
    assessmentId: string,
    organizationId: string,
  ): Promise<ScopeResponse[]> {
    return [...this.records.values()].filter(
      (scope) =>
        (scope as any).assessment_id === assessmentId &&
        (scope as any).organization_id === organizationId,
    );
  }
}

export class InMemorySoaVersionRepository implements SoaVersionRepository {
  private readonly records = new Map<string, SoaVersionResponse>();

  async save(version: SoaVersionResponse): Promise<void> {
    this.records.set((version as any).soa_version_id as string, version);
  }

  async update(version: SoaVersionResponse): Promise<void> {
    this.records.set((version as any).soa_version_id as string, version);
  }

  async get(
    soaVersionId: string,
    organizationId: string,
  ): Promise<SoaVersionResponse | null> {
    const version = this.records.get(soaVersionId);
    if (!version) return null;
    return (version as any).organization_id === organizationId ? version : null;
  }

  async listByAssessment(
    assessmentId: string,
    organizationId: string,
  ): Promise<SoaVersionResponse[]> {
    return [...this.records.values()].filter(
      (version) =>
        (version as any).assessment_id === assessmentId &&
        (version as any).organization_id === organizationId,
    );
  }
}

export class InMemorySoaItemRepository implements SoaItemRepository {
  private readonly records = new Map<string, SoaItemResponse>();

  async saveMany(items: SoaItemResponse[]): Promise<void> {
    for (const item of items)
      this.records.set((item as any).soa_item_id as string, item);
  }

  async update(item: SoaItemResponse): Promise<void> {
    this.records.set((item as any).soa_item_id as string, item);
  }

  async get(
    soaItemId: string,
    organizationId: string,
  ): Promise<SoaItemResponse | null> {
    const item = this.records.get(soaItemId);
    if (!item) return null;
    return (item as any).organization_id === organizationId ? item : null;
  }

  async listByVersion(
    soaVersionId: string,
    organizationId: string,
  ): Promise<SoaItemResponse[]> {
    return [...this.records.values()].filter(
      (item) =>
        (item as any).soa_version_id === soaVersionId &&
        (item as any).organization_id === organizationId,
    );
  }
}

export const createInMemorySoaRepositories = () => ({
  scopes: new InMemoryScopeRepository(),
  versions: new InMemorySoaVersionRepository(),
  items: new InMemorySoaItemRepository(),
});

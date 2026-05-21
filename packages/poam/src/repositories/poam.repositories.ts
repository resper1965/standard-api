import { PoamWorkflowError } from "../errors";
import type { PoamDependencyResponse, PoamItemFilters, PoamItemResponse, PoamMilestoneResponse, PoamRepositories, PoamVersionResponse } from "../types";

export class InMemoryPoamVersionRepository {
  private readonly versions = new Map<string, PoamVersionResponse>();

  async save(version: PoamVersionResponse): Promise<void> {
    this.versions.set(version.poam_version_id, version);
  }

  async update(version: PoamVersionResponse): Promise<void> {
    this.versions.set(version.poam_version_id, version);
  }

  async get(poamVersionId: string, tenantId: string): Promise<PoamVersionResponse | null> {
    const version = this.versions.get(poamVersionId);
    return version && version.tenant_id === tenantId ? version : null;
  }

  async listByAssessment(assessmentId: string, tenantId: string): Promise<PoamVersionResponse[]> {
    return [...this.versions.values()].filter((version) => version.assessment_id === assessmentId && version.tenant_id === tenantId);
  }

  withTenant(tenantId: string) {
    return {
      save: async (version: PoamVersionResponse) => this.save(version),
      update: async (version: PoamVersionResponse) => this.update(version),
      get: async (poamVersionId: string) => this.get(poamVersionId, tenantId),
      listByAssessment: async (assessmentId: string) => this.listByAssessment(assessmentId, tenantId)
    };
  }
}

export class InMemoryPoamItemRepository {
  private readonly items = new Map<string, PoamItemResponse>();

  async saveMany(items: PoamItemResponse[]): Promise<void> {
    for (const item of items) this.items.set(item.poam_item_id, item);
  }

  async update(item: PoamItemResponse): Promise<void> {
    this.items.set(item.poam_item_id, item);
  }

  async get(poamItemId: string, tenantId: string): Promise<PoamItemResponse | null> {
    const item = this.items.get(poamItemId);
    return item && item.tenant_id === tenantId ? item : null;
  }

  async listByVersion(poamVersionId: string, tenantId: string, filters: PoamItemFilters = {}): Promise<PoamItemResponse[]> {
    return [...this.items.values()].filter((item) =>
      item.poam_version_id === poamVersionId &&
      item.tenant_id === tenantId &&
      (!filters.priority || item.priority === filters.priority) &&
      (!filters.severity || item.severity === filters.severity) &&
      (!filters.status || item.status === filters.status) &&
      (!filters.action_type || item.action_type === filters.action_type) &&
      (!filters.owner_role || item.owner_role === filters.owner_role) &&
      (filters.requires_validation === undefined || item.requires_user_validation === filters.requires_validation)
    );
  }

  withTenant(tenantId: string) {
    return {
      saveMany: async (items: PoamItemResponse[]) => this.saveMany(items),
      update: async (item: PoamItemResponse) => this.update(item),
      get: async (poamItemId: string) => this.get(poamItemId, tenantId),
      listByVersion: async (poamVersionId: string, filters?: PoamItemFilters) => this.listByVersion(poamVersionId, tenantId, filters)
    };
  }
}

export class InMemoryPoamMilestoneRepository {
  private readonly milestones = new Map<string, PoamMilestoneResponse>();

  async save(milestone: PoamMilestoneResponse): Promise<void> {
    this.milestones.set(milestone.poam_milestone_id, milestone);
  }

  async saveMany(milestones: PoamMilestoneResponse[]): Promise<void> {
    for (const milestone of milestones) await this.save(milestone);
  }

  async update(milestone: PoamMilestoneResponse): Promise<void> {
    this.milestones.set(milestone.poam_milestone_id, milestone);
  }

  async get(milestoneId: string, tenantId: string): Promise<PoamMilestoneResponse | null> {
    const milestone = this.milestones.get(milestoneId);
    return milestone && milestone.tenant_id === tenantId ? milestone : null;
  }

  async listByItem(poamItemId: string, tenantId: string): Promise<PoamMilestoneResponse[]> {
    return [...this.milestones.values()].filter((milestone) => milestone.poam_item_id === poamItemId && milestone.tenant_id === tenantId);
  }

  withTenant(tenantId: string) {
    return {
      save: async (milestone: PoamMilestoneResponse) => this.save(milestone),
      saveMany: async (milestones: PoamMilestoneResponse[]) => this.saveMany(milestones),
      update: async (milestone: PoamMilestoneResponse) => this.update(milestone),
      get: async (milestoneId: string) => this.get(milestoneId, tenantId),
      listByItem: async (poamItemId: string) => this.listByItem(poamItemId, tenantId)
    };
  }
}

export class InMemoryPoamDependencyRepository {
  private readonly dependencies = new Map<string, PoamDependencyResponse>();
  private readonly itemTenantIndex = new Map<string, string>();

  registerItem(item: PoamItemResponse): void {
    this.itemTenantIndex.set(item.poam_item_id, item.tenant_id);
  }

  async save(dependency: PoamDependencyResponse): Promise<void> {
    const sourceTenant = this.itemTenantIndex.get(dependency.poam_item_id);
    const targetTenant = dependency.depends_on_poam_item_id ? this.itemTenantIndex.get(dependency.depends_on_poam_item_id) : dependency.tenant_id;
    if ((sourceTenant && sourceTenant !== dependency.tenant_id) || (targetTenant && targetTenant !== dependency.tenant_id)) {
      throw new PoamWorkflowError("POAM_TENANT_MISMATCH", "POA&M dependency cannot cross tenant boundaries.");
    }
    this.dependencies.set(dependency.poam_dependency_id, dependency);
  }

  async saveMany(dependencies: PoamDependencyResponse[]): Promise<void> {
    for (const dependency of dependencies) await this.save(dependency);
  }

  async listByItem(poamItemId: string, tenantId: string): Promise<PoamDependencyResponse[]> {
    return [...this.dependencies.values()].filter((dependency) => dependency.poam_item_id === poamItemId && dependency.tenant_id === tenantId);
  }

  withTenant(tenantId: string) {
    return {
      save: async (dependency: PoamDependencyResponse) => this.save(dependency),
      saveMany: async (dependencies: PoamDependencyResponse[]) => this.saveMany(dependencies),
      listByItem: async (poamItemId: string) => this.listByItem(poamItemId, tenantId)
    };
  }
}

export const createInMemoryPoamRepositories = (): PoamRepositories => {
  const dependencies = new InMemoryPoamDependencyRepository();
  const items = new InMemoryPoamItemRepository();
  const originalSaveMany = items.saveMany.bind(items);
  items.saveMany = async (poamItems: PoamItemResponse[]) => {
    await originalSaveMany(poamItems);
    for (const item of poamItems) dependencies.registerItem(item);
  };
  return {
    versions: new InMemoryPoamVersionRepository(),
    items,
    milestones: new InMemoryPoamMilestoneRepository(),
    dependencies
  };
};

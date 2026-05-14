import type {
  PrivacyActivityResponse,
  PrivacyDataSubjectResponse,
  PrivacyDataCategoryResponse,
  PrivacyThirdPartyResponse,
  PrivacyScreeningResponse,
  PrivacyFieldReviewResponse,
  PrivacyScfControlResponse,
} from "@standard/schemas";
import type {
  PrivacyActivityRepository,
  PrivacyDataSubjectRepository,
  PrivacyDataCategoryRepository,
  PrivacyThirdPartyRepository,
  PrivacyScreeningRepository,
  PrivacyFieldReviewRepository,
  PrivacyScfControlRepository,
  PrivacyRepositories,
  PrivacyActivityFilters,
} from "../types";

// ─── InMemory Activity Repository ───────────────────────────────────

export const createInMemoryPrivacyActivityRepository = (): PrivacyActivityRepository => {
  const store = new Map<string, PrivacyActivityResponse>();
  return {
    async save(activity) { store.set(activity.id, activity); },
    async get(id, tenantId) {
      const item = store.get(id);
      if (!item || item.tenant_id !== tenantId) return null;
      return item;
    },
    async list(tenantId, filters) {
      let results = Array.from(store.values()).filter((a) => a.tenant_id === tenantId);
      if (filters?.status) results = results.filter((a) => a.status === filters.status);
      if (filters?.assessment_id) results = results.filter((a) => a.assessment_id === filters.assessment_id);
      if (filters?.limit) results = results.slice(filters.offset ?? 0, (filters.offset ?? 0) + filters.limit);
      return results;
    },
    async update(activity) { store.set(activity.id, activity); },
    async softDelete(id, tenantId) {
      const item = store.get(id);
      if (item && item.tenant_id === tenantId) store.delete(id);
    },
  };
};

// ─── Generic InMemory Repository (shared pattern) ───────────────────

const createSimpleListRepo = <T extends { id: string; tenant_id: string; activity_id: string }>() => {
  const store = new Map<string, T>();
  return {
    async saveMany(items: T[]) { for (const i of items) store.set(i.id, i); },
    async save(item: T) { store.set(item.id, item); },
    async listByActivity(activityId: string, tenantId: string) {
      return Array.from(store.values()).filter((i) => i.activity_id === activityId && i.tenant_id === tenantId);
    },
    async get(id: string, tenantId: string) {
      const item = store.get(id);
      if (!item || item.tenant_id !== tenantId) return null;
      return item;
    },
    async update(item: T) { store.set(item.id, item); },
    async remove(id: string, tenantId: string) {
      const item = store.get(id);
      if (item && item.tenant_id === tenantId) store.delete(id);
    },
  };
};

export const createInMemoryPrivacyDataSubjectRepository = (): PrivacyDataSubjectRepository => createSimpleListRepo<PrivacyDataSubjectResponse>();
export const createInMemoryPrivacyDataCategoryRepository = (): PrivacyDataCategoryRepository => createSimpleListRepo<PrivacyDataCategoryResponse>();
export const createInMemoryPrivacyThirdPartyRepository = (): PrivacyThirdPartyRepository => createSimpleListRepo<PrivacyThirdPartyResponse>();
export const createInMemoryPrivacyScreeningRepository = (): PrivacyScreeningRepository => createSimpleListRepo<PrivacyScreeningResponse>();
export const createInMemoryPrivacyFieldReviewRepository = (): PrivacyFieldReviewRepository => createSimpleListRepo<PrivacyFieldReviewResponse>();
export const createInMemoryPrivacyScfControlRepository = (): PrivacyScfControlRepository => createSimpleListRepo<PrivacyScfControlResponse>();

// ─── Factory ────────────────────────────────────────────────────────

export const createInMemoryPrivacyRepositories = (): PrivacyRepositories => ({
  activities: createInMemoryPrivacyActivityRepository(),
  dataSubjects: createInMemoryPrivacyDataSubjectRepository(),
  dataCategories: createInMemoryPrivacyDataCategoryRepository(),
  thirdParties: createInMemoryPrivacyThirdPartyRepository(),
  screenings: createInMemoryPrivacyScreeningRepository(),
  fieldReviews: createInMemoryPrivacyFieldReviewRepository(),
  scfControls: createInMemoryPrivacyScfControlRepository(),
});

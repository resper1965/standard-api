import type { TenantRecord, TenantRepositoryAdapter } from "../http";
import { newId } from "../http";

export const createTenantRepository = (): TenantRepositoryAdapter => {
  const records = new Map<string, TenantRecord>();

  return {
    async create(input) {
      const record = { tenant_id: newId(), status: "active", ...input };
      records.set(record.tenant_id, record);
      return record;
    },
    async get(tenantId) {
      return records.get(tenantId) ?? null;
    },
    async update(tenantId, patch) {
      const current = records.get(tenantId);
      if (!current) return null;
      const updated = { ...current, ...patch };
      records.set(tenantId, updated);
      return updated;
    }
  };
};

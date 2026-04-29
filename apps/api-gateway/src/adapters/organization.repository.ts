import type { OrganizationRecord, OrganizationRepositoryAdapter } from "../http";
import { newId } from "../http";

export const createOrganizationRepository = (): OrganizationRepositoryAdapter => {
  const records = new Map<string, OrganizationRecord>();

  return {
    async create(input) {
      const record = { organization_id: newId(), status: "active", ...input };
      records.set(record.organization_id, record);
      return record;
    },
    async get(organizationId, tenantId) {
      const record = records.get(organizationId);
      return record?.tenant_id === tenantId ? record : null;
    },
    async listByTenant(tenantId) {
      return [...records.values()].filter((record) => record.tenant_id === tenantId);
    }
  };
};

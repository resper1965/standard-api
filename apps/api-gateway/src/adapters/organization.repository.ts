import { eq, and } from "drizzle-orm";
import { organizations } from "@standard/schemas";
import type { OrganizationRecord, OrganizationRepositoryAdapter } from "../http";
import type { DbClient } from "./db";
import { newId } from "../http";

export const createOrganizationRepository = (): OrganizationRepositoryAdapter => {
  const records = new Map<string, OrganizationRecord>();

  return {
    async create(input) {
      const record = { organization_id: newId(), status: "active" as const, ...input };
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

export const createDrizzleOrganizationRepository = (db: DbClient): OrganizationRepositoryAdapter => {
  return {
    async create(input) {
      const record = { id: newId(), status: "active" as const, tenantId: input.tenant_id, name: input.name, slug: input.slug };
      const [inserted] = await db.insert(organizations).values(record).returning();
      return {
        organization_id: inserted!.id,
        tenant_id: inserted!.tenantId,
        slug: inserted!.slug,
        name: inserted!.name,
        status: inserted!.status as "active" | "inactive"
      };
    },
    async get(organizationId, tenantId) {
      const [found] = await db.select().from(organizations)
        .where(
          and(
            eq(organizations.id, organizationId), 
            eq(organizations.tenantId, tenantId)
          )
        )
        .limit(1);
      if (!found) return null;
      
      return {
        organization_id: found.id,
        tenant_id: found.tenantId,
        slug: found.slug,
        name: found.name,
        status: found.status as "active" | "inactive"
      };
    },
    async listByTenant(tenantId) {
      const results = await db.select().from(organizations).where(eq(organizations.tenantId, tenantId));
      return results.map(found => ({
        organization_id: found.id,
        tenant_id: found.tenantId,
        slug: found.slug,
        name: found.name,
        status: found.status as "active" | "inactive"
      }));
    }
  };
};


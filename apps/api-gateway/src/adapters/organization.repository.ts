import { eq, and } from "drizzle-orm";
import { organizations } from "@standard/schemas";
import type { OrganizationRecord, OrganizationRepositoryAdapter } from "../http";
import type { DbClient } from "./db";
import { newId } from "../http";

export const createOrganizationRepository = (): OrganizationRepositoryAdapter => {
  const records = new Map<string, OrganizationRecord>();

  return {
    async create(input) {
      const record = { organization_id: newId(), status: "active" as const, billing_tier: "free", ...input };
      records.set(record.organization_id, record);
      return record;
    },
    async get(organizationId, tenantId) {
      const record = records.get(organizationId);
      return record?.tenant_id === tenantId ? record : null;
    },
    async update(organizationId, tenantId, patch) {
      const existing = records.get(organizationId);
      if (!existing || existing.tenant_id !== tenantId) return null;
      const updated = { ...existing, ...patch };
      records.set(organizationId, updated);
      return updated;
    },
    async listByTenant(tenantId) {
      return [...records.values()].filter((record) => record.tenant_id === tenantId);
    },
    withTenant(tenantId) {
      return {
        create: async (input) => this.create({ ...input, tenant_id: tenantId }),
        get: async (orgId) => this.get(orgId, tenantId),
        list: async () => this.listByTenant(tenantId),
        update: async (orgId, patch) => this.update(orgId, tenantId, patch)
      };
    }
  };
};

export const createDrizzleOrganizationRepository = (db: DbClient): OrganizationRepositoryAdapter => {
  return {
    async create(input) {
      const record = { id: newId(), status: "active" as const, tenantId: input.tenant_id, name: input.name, slug: input.slug, billingTier: "free" };
      const [inserted] = await db.insert(organizations).values(record).returning();
      return {
        organization_id: inserted!.id,
        tenant_id: inserted!.tenantId,
        slug: inserted!.slug,
        name: inserted!.name,
        status: inserted!.status as "active" | "inactive",
        billing_tier: inserted!.billingTier
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
        status: found.status as "active" | "inactive",
        billing_tier: found.billingTier
      };
    },
    async listByTenant(tenantId) {
      const results = await db.select().from(organizations).where(eq(organizations.tenantId, tenantId));
      return results.map(found => ({
        organization_id: found.id,
        tenant_id: found.tenantId,
        slug: found.slug,
        name: found.name,
        status: found.status as "active" | "inactive",
        billing_tier: found.billingTier
      }));
    },
    async update(organizationId, tenantId, patch) {
      const [updated] = await db.update(organizations)
        .set({
          name: patch.name,
          slug: patch.slug,
          status: patch.status,
          billingTier: patch.billing_tier
        })
        .where(
          and(
            eq(organizations.id, organizationId),
            eq(organizations.tenantId, tenantId)
          )
        )
        .returning();
      
      if (!updated) return null;

      return {
        organization_id: updated.id,
        tenant_id: updated.tenantId,
        slug: updated.slug,
        name: updated.name,
        status: updated.status as "active" | "inactive",
        billing_tier: updated.billingTier
      };
    },
    withTenant(tenantId) {
      return {
        create: async (input) => this.create({ ...input, tenant_id: tenantId }),
        get: async (orgId) => this.get(orgId, tenantId),
        list: async () => this.listByTenant(tenantId),
        update: async (orgId, patch) => this.update(orgId, tenantId, patch)
      };
    }
  };
};


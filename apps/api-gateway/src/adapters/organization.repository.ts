import { eq } from "drizzle-orm";
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
    async get(organizationId) {
      return records.get(organizationId) ?? null;
    },
    async update(organizationId, patch) {
      const existing = records.get(organizationId);
      if (!existing) return null;
      const updated = { ...existing, ...patch };
      records.set(organizationId, updated);
      return updated;
    },
    async listByTenant(organizationId) {
      return [...records.values()];
    },
    withOrganization(organizationId) {
      return {
        create: async (input) => this.create(input),
        get: async (orgId) => this.get(orgId),
        list: async () => this.listByTenant(organizationId),
        update: async (orgId, patch) => this.update(orgId, patch)
      };
    }
  };
};

export const createDrizzleOrganizationRepository = (db: DbClient): OrganizationRepositoryAdapter => {
  return {
    async create(input) {
      const [inserted] = await db.insert(organizations).values({
        id: newId(),
        status: "active" as const,
        name: input.name,
        slug: input.slug,
        billingTier: "free"
      }).returning();
      return {
        organization_id: inserted!.id,
        slug: inserted!.slug,
        name: inserted!.name,
        status: inserted!.status as "active" | "inactive",
        billing_tier: inserted!.billingTier
      };
    },
    async get(organizationId) {
      const [found] = await db.select().from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!found) return null;

      return {
        organization_id: found.id,
        slug: found.slug,
        name: found.name,
        status: found.status as "active" | "inactive",
        billing_tier: found.billingTier
      };
    },
    async listByTenant(organizationId) {
      const results = await db.select().from(organizations);
      return results.map(found => ({
        organization_id: found.id,
        slug: found.slug,
        name: found.name,
        status: found.status as "active" | "inactive",
        billing_tier: found.billingTier
      }));
    },
    async update(organizationId, patch) {
      const [updated] = await db.update(organizations)
        .set({
          name: patch.name,
          slug: patch.slug,
          status: patch.status,
          billingTier: patch.billing_tier
        })
        .where(eq(organizations.id, organizationId))
        .returning();

      if (!updated) return null;

      return {
        organization_id: updated.id,
        slug: updated.slug,
        name: updated.name,
        status: updated.status as "active" | "inactive",
        billing_tier: updated.billingTier
      };
    },
    withOrganization(organizationId) {
      return {
        create: async (input) => this.create(input),
        get: async (orgId) => this.get(orgId),
        list: async () => this.listByTenant(organizationId),
        update: async (orgId, patch) => this.update(orgId, patch)
      };
    }
  };
};

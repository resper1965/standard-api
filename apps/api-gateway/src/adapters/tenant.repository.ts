/**
 * @module tenant.repository
 * @description ADR 0002 Phase 2/3 — tenants table removed.
 * This stub proxies TenantRepositoryAdapter calls to the organizations table
 * for backward compat with callers that still reference AppDependencies.tenants.
 */
import { eq } from "drizzle-orm";
import { organizations } from "@standard/schemas";
import type { TenantRecord, TenantRepositoryAdapter } from "../http";
import type { DbClient } from "./db";
import { newId } from "../http";

export const createTenantRepository = (): TenantRepositoryAdapter => {
  const records = new Map<string, TenantRecord>();
  return {
    async create(input) {
      const record = { organization_id: newId(), status: "active" as const, ...input };
      records.set(record.organization_id, record);
      return record;
    },
    async get(organizationId) {
      return records.get(organizationId) ?? null;
    },
    async update(organizationId, patch) {
      const record = records.get(organizationId);
      if (!record) return null;
      const updated = { ...record, ...patch };
      records.set(organizationId, updated);
      return updated;
    }
  };
};

export const createDrizzleTenantRepository = (db: DbClient): TenantRepositoryAdapter => {
  return {
    async create(input) {
      const [inserted] = await db
        .insert(organizations)
        .values({ slug: input.slug, name: input.name, status: "active", userId: "system" })
        .returning();
      return {
        organization_id: inserted!.id,
        slug: inserted!.slug,
        name: inserted!.name,
        status: inserted!.status as "active" | "inactive"
      };
    },
    async get(organizationId) {
      const [found] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!found) return null;
      return {
        organization_id: found.id,
        slug: found.slug,
        name: found.name,
        status: found.status as "active" | "inactive"
      };
    },
    async update(organizationId, patch) {
      const [updated] = await db
        .update(organizations)
        .set({ ...patch })
        .where(eq(organizations.id, organizationId))
        .returning();
      if (!updated) return null;
      return {
        organization_id: updated.id,
        slug: updated.slug,
        name: updated.name,
        status: updated.status as "active" | "inactive"
      };
    }
  };
};

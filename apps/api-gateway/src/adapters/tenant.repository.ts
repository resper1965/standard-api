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
      const record = { tenant_id: newId(), status: "active" as const, ...input };
      records.set(record.tenant_id, record);
      return record;
    },
    async get(tenantId) {
      return records.get(tenantId) ?? null;
    },
    async update(tenantId, patch) {
      const record = records.get(tenantId);
      if (!record) return null;
      const updated = { ...record, ...patch };
      records.set(tenantId, updated);
      return updated;
    }
  };
};

export const createDrizzleTenantRepository = (db: DbClient): TenantRepositoryAdapter => {
  return {
    async create(input) {
      const [inserted] = await db
        .insert(organizations)
        .values({ slug: input.slug, name: input.name, status: "active" })
        .returning();
      return {
        tenant_id: inserted!.id,
        slug: inserted!.slug,
        name: inserted!.name,
        status: inserted!.status as "active" | "inactive"
      };
    },
    async get(tenantId) {
      const [found] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, tenantId))
        .limit(1);
      if (!found) return null;
      return {
        tenant_id: found.id,
        slug: found.slug,
        name: found.name,
        status: found.status as "active" | "inactive"
      };
    },
    async update(tenantId, patch) {
      const [updated] = await db
        .update(organizations)
        .set({ ...patch })
        .where(eq(organizations.id, tenantId))
        .returning();
      if (!updated) return null;
      return {
        tenant_id: updated.id,
        slug: updated.slug,
        name: updated.name,
        status: updated.status as "active" | "inactive"
      };
    }
  };
};

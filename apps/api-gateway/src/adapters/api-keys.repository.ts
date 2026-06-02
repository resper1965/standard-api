import { apiKeys, organizations } from "@standard/schemas";
import { eq, and } from "drizzle-orm";
import type { DbClient } from "./db";

export type ApiKeyRecord = {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  keyHash: string;
  maskedKey: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  /** Null means active. Set to a timestamp when revoked (soft-delete). */
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateApiKeyInput = {
  tenantId: string;
  organizationId: string;
  name: string;
  keyHash: string;
  maskedKey: string;
  scopes?: string[];
  expiresAt?: Date | undefined;
};

export type UpdateApiKeyPatch = {
  name?: string;
  expiresAt?: Date | null;
  scopes?: string[];
};

export type ApiKeysRepositoryAdapter = {
  create(input: CreateApiKeyInput): Promise<ApiKeyRecord>;
  getById(id: string, organizationId: string): Promise<ApiKeyRecord | null>;
  update(id: string, organizationId: string, patch: UpdateApiKeyPatch): Promise<ApiKeyRecord | null>;
  verifyKey(keyHash: string): Promise<ApiKeyRecord | null>;
  markUsed(id: string): Promise<void>;
  revokeKey(id: string, organizationId: string): Promise<boolean>;
  listByOrganization(organizationId: string, activeOnly?: boolean): Promise<ApiKeyRecord[]>;
};

export const createDrizzleApiKeysRepository = (db: DbClient): ApiKeysRepositoryAdapter => {
  return {
    async create(input) {
      const [record] = await db
        .insert(apiKeys)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          keyHash: input.keyHash,
          maskedKey: input.maskedKey,
          scopes: input.scopes ?? [],
          expiresAt: input.expiresAt ?? null,
        })
        .returning();
      if (!record) throw new Error("Failed to create API key");
      return record;
    },
    async getById(id, organizationId) {
      const [record] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
        .limit(1);
      return record ?? null;
    },
    async update(id, organizationId, patch) {
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (patch.name !== undefined) set.name = patch.name;
      if ("expiresAt" in patch) set.expiresAt = patch.expiresAt ?? null;
      if (patch.scopes !== undefined) set.scopes = patch.scopes;
      const [updated] = await db
        .update(apiKeys)
        .set(set)
        .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
        .returning();
      return updated ?? null;
    },
    async verifyKey(keyHash) {
      const records = await db
        .select({
          apiKey: apiKeys,
          orgStatus: organizations.status
        })
        .from(apiKeys)
        .innerJoin(organizations, eq(apiKeys.organizationId, organizations.id))
        .where(eq(apiKeys.keyHash, keyHash));

      if (records.length === 0) return null;
      const firstRecord = records[0];
      if (!firstRecord) return null;
      const { apiKey: record, orgStatus } = firstRecord;

      // Reject if organization is not active
      if (orgStatus !== "active") return null;

      // Reject expired keys
      if (record.expiresAt && record.expiresAt < new Date()) return null;
      // Reject soft-deleted (revoked) keys
      if (record.revokedAt) return null;
      
      return record;
    },
    async markUsed(id) {
      await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
    },
    async revokeKey(id, organizationId) {
      // Soft-delete: set revokedAt instead of deleting the row,
      // so the key remains visible in the list with status "revoked".
      const [updated] = await db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
        .returning({ id: apiKeys.id });
      return !!updated;
    },
    async listByOrganization(organizationId, activeOnly = false) {
      const rows = await db.select().from(apiKeys).where(eq(apiKeys.organizationId, organizationId));
      return activeOnly ? rows.filter(k => !k.revokedAt) : rows;
    }
  };
};

export const createMockApiKeysRepository = (): ApiKeysRepositoryAdapter => {
  const store: Record<string, ApiKeyRecord> = {};
  return {
    async create(input) {
      const record: ApiKeyRecord = {
        id: crypto.randomUUID(),
        tenantId: input.organizationId, // alias
        organizationId: input.organizationId,
        name: input.name,
        keyHash: input.keyHash,
        maskedKey: input.maskedKey,
        scopes: input.scopes ?? [],
        expiresAt: input.expiresAt ?? null,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store[record.id] = record;
      return record;
    },
    async getById(id, organizationId) {
      const r = store[id];
      return r && r.organizationId === organizationId ? r : null;
    },
    async update(id, organizationId, patch) {
      const r = store[id];
      if (!r || r.organizationId !== organizationId) return null;
      if (patch.name !== undefined) r.name = patch.name;
      if ("expiresAt" in patch) r.expiresAt = patch.expiresAt ?? null;
      if (patch.scopes !== undefined) r.scopes = patch.scopes;
      r.updatedAt = new Date();
      return r;
    },
    async verifyKey(keyHash) {
      const record = Object.values(store).find(k => k.keyHash === keyHash);
      if (!record) return null;
      if (record.expiresAt && record.expiresAt < new Date()) return null;
      if (record.revokedAt) return null;
      return record;
    },
    async markUsed(id) {
      if (store[id]) store[id]!.lastUsedAt = new Date();
    },
    async revokeKey(id, orgId) {
      const exist = store[id];
      if (exist && exist.organizationId === orgId) {
        exist.revokedAt = new Date();
        return true;
      }
      return false;
    },
    async listByOrganization(organizationId, activeOnly = false) {
      const rows = Object.values(store).filter(k => k.organizationId === organizationId);
      return activeOnly ? rows.filter(k => !k.revokedAt) : rows;
    }
  };
};

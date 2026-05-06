import { apiKeys } from "@standard/schemas";
import { eq, and } from "drizzle-orm";
import type { DbClient } from "./db";

export type ApiKeyRecord = {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  keyHash: string;
  maskedKey: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateApiKeyInput = {
  tenantId: string;
  organizationId: string;
  name: string;
  keyHash: string;
  maskedKey: string;
  expiresAt?: Date;
};

export type ApiKeysRepositoryAdapter = {
  create(input: CreateApiKeyInput): Promise<ApiKeyRecord>;
  verifyKey(keyHash: string): Promise<ApiKeyRecord | null>;
  markUsed(id: string): Promise<void>;
  revokeKey(id: string, organizationId: string): Promise<boolean>;
  listByOrganization(organizationId: string): Promise<ApiKeyRecord[]>;
};

export const createDrizzleApiKeysRepository = (db: DbClient): ApiKeysRepositoryAdapter => {
  return {
    async create(input) {
      const [record] = await db
        .insert(apiKeys)
        .values({
          tenantId: input.tenantId,
          organizationId: input.organizationId,
          name: input.name,
          keyHash: input.keyHash,
          maskedKey: input.maskedKey,
          expiresAt: input.expiresAt ?? null,
        })
        .returning();
      if (!record) throw new Error("Failed to create API key");
      return record;
    },
    async verifyKey(keyHash) {
      const [record] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
      if (!record) return null;
      if (record.expiresAt && record.expiresAt < new Date()) return null;
      return record;
    },
    async markUsed(id) {
      await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
    },
    async revokeKey(id, organizationId) {
      // Just delete it
      const [deleted] = await db
        .delete(apiKeys)
        .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
        .returning({ id: apiKeys.id });
      return !!deleted;
    },
    async listByOrganization(organizationId) {
      return db.select().from(apiKeys).where(eq(apiKeys.organizationId, organizationId));
    }
  };
};

export const createMockApiKeysRepository = (): ApiKeysRepositoryAdapter => {
  const store: Record<string, ApiKeyRecord> = {};
  return {
    async create(input) {
      const record = { ...input, id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), lastUsedAt: null, expiresAt: input.expiresAt ?? null };
      store[record.id] = record;
      return record;
    },
    async verifyKey(keyHash) {
      const record = Object.values(store).find(k => k.keyHash === keyHash);
      if (!record) return null;
      if (record.expiresAt && record.expiresAt < new Date()) return null;
      return record;
    },
    async markUsed(id) {
      if (store[id]) store[id]!.lastUsedAt = new Date();
    },
    async revokeKey(id, orgId) {
      const exist = store[id];
      if (exist && exist.organizationId === orgId) {
        delete store[id];
        return true;
      }
      return false;
    },
    async listByOrganization(organizationId) {
      return Object.values(store).filter(k => k.organizationId === organizationId);
    }
  };
};


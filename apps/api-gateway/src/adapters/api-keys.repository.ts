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
          scopes: input.scopes ?? [],
          expiresAt: input.expiresAt ?? null,
        })
        .returning();
      if (!record) throw new Error("Failed to create API key");
      return record;
    },
    async verifyKey(keyHash) {
      const [record] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
      if (!record) return null;
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
    async listByOrganization(organizationId) {
      return db.select().from(apiKeys).where(eq(apiKeys.organizationId, organizationId));
    }
  };
};

export const createMockApiKeysRepository = (): ApiKeysRepositoryAdapter => {
  const store: Record<string, ApiKeyRecord> = {};
  return {
    async create(input) {
      const record: ApiKeyRecord = {
        id: crypto.randomUUID(),
        tenantId: input.tenantId,
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
    async listByOrganization(organizationId) {
      return Object.values(store).filter(k => k.organizationId === organizationId);
    }
  };
};



/**
 * Drizzle-backed Membership Repository
 *
 * Replaces the in-memory Map in members.routes.ts.
 * Scoped by tenant_id on every operation.
 */
import { sql } from "drizzle-orm";
import type { DrizzleDb } from "./db";
import { ApiError } from "../errors/api-error";

export type MembershipRecord = {
  membership_id: string;
  tenant_id: string;
  organization_id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  role: string;
  status: string;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MembershipCreateInput = {
  membership_id: string;
  tenant_id: string;
  organization_id: string;
  user_id?: string | null;
  email?: string | null;
  display_name?: string | null;
  role: string;
  status?: string;
  invited_at?: string | null;
  accepted_at?: string | null;
};

export type MembershipRepositoryAdapter = {
  create(input: MembershipCreateInput): Promise<MembershipRecord>;
  listByOrganization(organizationId: string, tenantId: string): Promise<MembershipRecord[]>;
  getById(membershipId: string, tenantId: string): Promise<MembershipRecord | null>;
  updateRole(membershipId: string, tenantId: string, role: string): Promise<MembershipRecord | null>;
  remove(membershipId: string, tenantId: string): Promise<boolean>;
};

export function createDrizzleMembershipRepository(db: DrizzleDb): MembershipRepositoryAdapter {
  return {
    async create(input): Promise<MembershipRecord> {
      const rows = await db.execute(
        sql`INSERT INTO memberships (id, tenant_id, organization_id, user_id, email, display_name, role, status, invited_at, accepted_at, created_at, updated_at)
            VALUES (
              ${input.membership_id}::uuid,
              ${input.tenant_id}::uuid,
              ${input.organization_id}::uuid,
              ${input.user_id ?? null}::uuid,
              ${input.email ?? null},
              ${input.display_name ?? null},
              ${input.role},
              ${input.status ?? 'invited'},
              ${input.invited_at ? sql`${input.invited_at}::timestamptz` : sql`NOW()`},
              ${input.accepted_at ? sql`${input.accepted_at}::timestamptz` : sql`NULL`},
              NOW(),
              NOW()
            )
            RETURNING id AS membership_id, tenant_id, organization_id, user_id, email, display_name, role, status,
                      invited_at, accepted_at, created_at, updated_at`
      );
      const row = (rows as any)[0] ?? (rows as any).rows?.[0];
      if (!row) throw new ApiError("INTERNAL_ERROR", "Failed to create membership.", 500);
      return mapRow(row);
    },

    async listByOrganization(organizationId, tenantId): Promise<MembershipRecord[]> {
      const rows = await db.execute(
        sql`SELECT id AS membership_id, tenant_id, organization_id, user_id, email, display_name, role, status,
                   invited_at, accepted_at, created_at, updated_at
            FROM memberships
            WHERE organization_id = ${organizationId}::uuid
              AND tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND status != 'removed'
            ORDER BY created_at DESC`
      );
      const list = (rows as any).rows ?? rows as any;
      return Array.isArray(list) ? list.map(mapRow) : [];
    },

    async getById(membershipId, tenantId): Promise<MembershipRecord | null> {
      const rows = await db.execute(
        sql`SELECT id AS membership_id, tenant_id, organization_id, user_id, email, display_name, role, status,
                   invited_at, accepted_at, created_at, updated_at
            FROM memberships
            WHERE id = ${membershipId}::uuid
              AND tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
            LIMIT 1`
      );
      const list = (rows as any).rows ?? rows as any;
      const row = Array.isArray(list) ? list[0] : null;
      return row ? mapRow(row) : null;
    },

    async updateRole(membershipId, tenantId, role): Promise<MembershipRecord | null> {
      const rows = await db.execute(
        sql`UPDATE memberships
            SET role = ${role}, updated_at = NOW()
            WHERE id = ${membershipId}::uuid
              AND tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
            RETURNING id AS membership_id, tenant_id, organization_id, user_id, email, display_name, role, status,
                      invited_at, accepted_at, created_at, updated_at`
      );
      const list = (rows as any).rows ?? rows as any;
      const row = Array.isArray(list) ? list[0] : null;
      return row ? mapRow(row) : null;
    },

    async remove(membershipId, tenantId): Promise<boolean> {
      const rows = await db.execute(
        sql`UPDATE memberships
            SET status = 'removed', updated_at = NOW()
            WHERE id = ${membershipId}::uuid
              AND tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
            RETURNING id`
      );
      const list = (rows as any).rows ?? rows as any;
      return Array.isArray(list) && list.length > 0;
    },
  };
}

function mapRow(row: Record<string, unknown>): MembershipRecord {
  return {
    membership_id: String(row['membership_id'] ?? row['id'] ?? ''),
    tenant_id: String(row['tenant_id'] ?? ''),
    organization_id: String(row['organization_id'] ?? ''),
    user_id: row['user_id'] ? String(row['user_id']) : null,
    email: row['email'] ? String(row['email']) : null,
    display_name: row['display_name'] ? String(row['display_name']) : null,
    role: String(row['role'] ?? 'member'),
    status: String(row['status'] ?? 'invited'),
    invited_at: row['invited_at'] ? String(row['invited_at']) : null,
    accepted_at: row['accepted_at'] ? String(row['accepted_at']) : null,
    created_at: String(row['created_at'] ?? new Date().toISOString()),
    updated_at: String(row['updated_at'] ?? new Date().toISOString()),
  };
}

export function createMockMembershipRepository(): MembershipRepositoryAdapter {
  const store = new Map<string, MembershipRecord>();
  return {
    async create(input) {
      const now = new Date().toISOString();
      const record: MembershipRecord = {
        membership_id: input.membership_id,
        tenant_id: input.tenant_id,
        organization_id: input.organization_id,
        user_id: input.user_id ?? null,
        email: input.email ?? null,
        display_name: input.display_name ?? null,
        role: input.role,
        status: input.status ?? 'invited',
        invited_at: input.invited_at ?? now,
        accepted_at: input.accepted_at ?? null,
        created_at: now,
        updated_at: now,
      };
      store.set(record.membership_id, record);
      return record;
    },
    async listByOrganization(organizationId, tenantId) {
      return [...store.values()].filter(
        m => m.organization_id === organizationId && m.tenant_id === tenantId && m.status !== 'removed'
      );
    },
    async getById(id, tenantId) {
      const m = store.get(id);
      return m && m.tenant_id === tenantId ? m : null;
    },
    async updateRole(id, tenantId, role) {
      const m = store.get(id);
      if (!m || m.tenant_id !== tenantId) return null;
      m.role = role; m.updated_at = new Date().toISOString();
      store.set(id, m);
      return m;
    },
    async remove(id, tenantId) {
      const m = store.get(id);
      if (!m || m.tenant_id !== tenantId) return false;
      m.status = 'removed'; m.updated_at = new Date().toISOString();
      store.set(id, m);
      return true;
    },
  };
}

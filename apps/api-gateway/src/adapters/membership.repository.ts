/**
 * Drizzle-backed Membership Repository
 *
 * Replaces the in-memory Map in members.routes.ts.
 * Scoped by organization_id on every operation.
 */
import { sql } from "drizzle-orm";
import type { DbClient } from "./db";
import { ApiError } from "../errors/api-error";

export type MembershipRecord = {
  membership_id: string;
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
  listByOrganization(organizationId: string): Promise<MembershipRecord[]>;
  getById(
    membershipId: string,
    organizationId: string,
  ): Promise<MembershipRecord | null>;
  updateRole(
    membershipId: string,
    organizationId: string,
    role: string,
  ): Promise<MembershipRecord | null>;
  remove(membershipId: string, organizationId: string): Promise<boolean>;
  /**
   * Counts the number of active org memberships for a user in the Standard domain.
   * Used to enforce the one-org-per-non-admin rule.
   * @param userId - Standard domain user UUID
   */
  countActiveOrgsByUser(userId: string): Promise<number>;
};

/**
 * Safely extract rows from Drizzle result regardless of driver shape.
 * neon-http returns { rows: [...] }, drizzle-node returns [...] directly. (C1 fix)
 */
function extractRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result;
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as any).rows)
  ) {
    return (result as any).rows;
  }
  return [];
}

export function createDrizzleMembershipRepository(
  db: DbClient,
): MembershipRepositoryAdapter {
  return {
    async create(input): Promise<MembershipRecord> {
      const result = await db.execute(
        sql`INSERT INTO memberships (id, organization_id, user_id, email, display_name, role, status, invited_at, accepted_at, created_at, updated_at)
            VALUES (
              ${input.membership_id}::uuid,
              ${input.organization_id}::uuid,
              ${input.user_id ?? null}::uuid,
              ${input.email ?? null},
              ${input.display_name ?? null},
              ${input.role},
              ${input.status ?? "invited"},
              ${input.invited_at ? sql`${input.invited_at}::timestamptz` : sql`NOW()`},
              ${input.accepted_at ? sql`${input.accepted_at}::timestamptz` : sql`NULL`},
              NOW(),
              NOW()
            )
            RETURNING id AS membership_id, organization_id, user_id, email, display_name, role, status,
                      invited_at, accepted_at, created_at, updated_at`,
      );
      const row = extractRows(result)[0];
      if (!row)
        throw new ApiError(
          "INTERNAL_ERROR",
          "Failed to create membership.",
          500,
        );
      return mapRow(row);
    },

    async listByOrganization(organizationId): Promise<MembershipRecord[]> {
      const result = await db.execute(
        sql`SELECT id AS membership_id, organization_id, user_id, email, display_name, role, status,
                   invited_at, accepted_at, created_at, updated_at
            FROM memberships
            WHERE organization_id = ${organizationId}::uuid
              AND deleted_at IS NULL
              AND status != 'removed'
            ORDER BY created_at DESC`,
      );
      return extractRows(result).map(mapRow);
    },

    async getById(
      membershipId,
      organizationId,
    ): Promise<MembershipRecord | null> {
      const result = await db.execute(
        sql`SELECT id AS membership_id, organization_id, user_id, email, display_name, role, status,
                   invited_at, accepted_at, created_at, updated_at
            FROM memberships
            WHERE id = ${membershipId}::uuid
              AND organization_id = ${organizationId}::uuid
              AND deleted_at IS NULL
            LIMIT 1`,
      );
      const row = extractRows(result)[0];
      return row ? mapRow(row) : null;
    },

    async updateRole(
      membershipId,
      organizationId,
      role,
    ): Promise<MembershipRecord | null> {
      const result = await db.execute(
        sql`UPDATE memberships
            SET role = ${role}, updated_at = NOW()
            WHERE id = ${membershipId}::uuid
              AND organization_id = ${organizationId}::uuid
              AND deleted_at IS NULL
            RETURNING id AS membership_id, organization_id, user_id, email, display_name, role, status,
                      invited_at, accepted_at, created_at, updated_at`,
      );
      const row = extractRows(result)[0];
      return row ? mapRow(row) : null;
    },

    async remove(membershipId, organizationId): Promise<boolean> {
      const result = await db.execute(
        sql`UPDATE memberships
            SET status = 'removed', updated_at = NOW()
            WHERE id = ${membershipId}::uuid
              AND organization_id = ${organizationId}::uuid
              AND deleted_at IS NULL
            RETURNING id`,
      );
      return extractRows(result).length > 0;
    },

    async countActiveOrgsByUser(userId): Promise<number> {
      // Count active, non-removed memberships for the user across all orgs.
      // Excludes 'removed' status entries.
      const result = await db.execute(
        sql`SELECT COUNT(*)::int AS count
            FROM memberships
            WHERE user_id = ${userId}::uuid
              AND status != 'removed'
              AND deleted_at IS NULL`,
      );
      const first = extractRows(result)[0];
      return Number(first?.count ?? 0);
    },
  };
}

function mapRow(row: Record<string, unknown>): MembershipRecord {
  return {
    membership_id: String(row["membership_id"] ?? row["id"] ?? ""),
    organization_id: String(row["organization_id"] ?? ""),
    user_id: row["user_id"] ? String(row["user_id"]) : null,
    email: row["email"] ? String(row["email"]) : null,
    display_name: row["display_name"] ? String(row["display_name"]) : null,
    role: String(
      row["role"] && row["role"] !== "member" && row["role"] !== "user"
        ? row["role"]
        : "customer",
    ),
    status: String(row["status"] ?? "invited"),
    invited_at: row["invited_at"] ? String(row["invited_at"]) : null,
    accepted_at: row["accepted_at"] ? String(row["accepted_at"]) : null,
    created_at: String(row["created_at"] ?? new Date().toISOString()),
    updated_at: String(row["updated_at"] ?? new Date().toISOString()),
  };
}

export function createMockMembershipRepository(): MembershipRepositoryAdapter {
  const store = new Map<string, MembershipRecord>();
  return {
    async create(input) {
      const now = new Date().toISOString();
      const record: MembershipRecord = {
        membership_id: input.membership_id,
        organization_id: input.organization_id,
        user_id: input.user_id ?? null,
        email: input.email ?? null,
        display_name: input.display_name ?? null,
        role: input.role,
        status: input.status ?? "invited",
        invited_at: input.invited_at ?? now,
        accepted_at: input.accepted_at ?? null,
        created_at: now,
        updated_at: now,
      };
      store.set(record.membership_id, record);
      return record;
    },
    async listByOrganization(organizationId) {
      return [...store.values()].filter(
        (m) => m.organization_id === organizationId && m.status !== "removed",
      );
    },
    async getById(id, organizationId) {
      const m = store.get(id);
      return m && m.organization_id === organizationId ? m : null;
    },
    async updateRole(id, organizationId, role) {
      const m = store.get(id);
      if (!m || m.organization_id !== organizationId) return null;
      m.role = role;
      m.updated_at = new Date().toISOString();
      store.set(id, m);
      return m;
    },
    async remove(id, organizationId) {
      const m = store.get(id);
      if (!m || m.organization_id !== organizationId) return false;
      m.status = "removed";
      m.updated_at = new Date().toISOString();
      store.set(id, m);
      return true;
    },
    async countActiveOrgsByUser(userId) {
      return [...store.values()].filter(
        (m) => m.user_id === userId && m.status !== "removed",
      ).length;
    },
  };
}

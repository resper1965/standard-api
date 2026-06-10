/**
 * @module tenant-mapping
 * @description Bridge between Standard Native Auth identity (text IDs) and Standard domain (UUID IDs).
 *
 * ADR 0002 Phase 2/3 — tenants table removed. organization_id === organization_id.
 *
 * Two responsibilities, deliberately split (see ADR 0002):
 *  - `resolveOrganizationContext`  — READ-ONLY lookup. Returns `null` when the org has
 *    not been provisioned. Never writes. Safe to call on every request.
 *  - `provisionOrganizationContext` — explicit creation. Call this only at well-defined
 *    provisioning points (org creation, platform-admin bootstrap).
 *
 * Request-time code must NOT create domain rows: silent JIT provisioning used to
 * mask resolution bugs by inventing "phantom" tenants.
 */
import { eq, or } from "drizzle-orm";
import { organizations } from "@standard/schemas";
import type { DbClient } from "./db";

export interface ResolvedTenantContext {
  organization_id: string; // UUID from `organizations` table
  ba_org_id: string; // Original Org ID or slug
  org_name: string; // Organization display name
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * READ-ONLY resolution of an identifier (UUID, slug, or baUser.id) into Standard
 * domain UUIDs. Returns `null` if the org has not been provisioned.
 */
export async function resolveOrganizationContext(
  db: DbClient,
  identifier: string,
): Promise<ResolvedTenantContext | null> {
  if (UUID_RE.test(identifier)) {
    // Resolve by organization UUID directly.
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, identifier))
      .limit(1);

    if (existingOrg) {
      return {
        organization_id: existingOrg.id,
        ba_org_id: existingOrg.slug,
        org_name: existingOrg.name,
      };
    }
    return null;
  }

  // Non-UUID: could be a baUser.id or a slug.
  const [existingOrg] = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
    })
    .from(organizations)
    .where(
      or(
        eq(organizations.userId, identifier),
        eq(organizations.slug, identifier),
      ),
    )
    .limit(1);

  if (existingOrg) {
    return {
      organization_id: existingOrg.id,
      ba_org_id: existingOrg.slug,
      org_name: existingOrg.name,
    };
  }

  // organizations.userId IS the baUser.id (1:1 model — set in auth simplification A2)
  // No memberships join needed
  return null;
}

/**
 * Explicit provisioning: resolve the org, creating the domain organization when
 * missing. Call ONLY from deliberate provisioning points (org creation, platform-admin bootstrap).
 */
export async function provisionOrganizationContext(
  db: DbClient,
  identifier: string,
): Promise<ResolvedTenantContext> {
  const existing = await resolveOrganizationContext(db, identifier);
  if (existing) return existing;

  const slug = identifier;
  const name = `Org ${identifier.substring(0, 8)}`;

  // ADR 0002 Phase 2/3: tenants table gone. Organizations IS the tenant.
  const convergedId = UUID_RE.test(identifier) ? identifier : undefined;

  const [newOrg] = await db
    .insert(organizations)
    .values({
      ...(convergedId ? { id: convergedId } : {}),
      slug,
      name,
      status: "active",
      userId: identifier, // Set userId to baUser.id or identifier
    })
    .returning();

  // C3 fix: guard INSERT result — Drizzle may return empty on constraint violations
  if (!newOrg) {
    throw new Error(
      `[standard:tenant-mapping] Failed to provision organization for identifier=${identifier} — possible duplicate slug or DB constraint violation.`,
    );
  }

  console.log(
    `[standard:tenant-mapping] provisioned org=${newOrg.id} for identifier=${identifier}`,
  );

  return {
    organization_id: newOrg.id,
    ba_org_id: newOrg.slug,
    org_name: name,
  };
}

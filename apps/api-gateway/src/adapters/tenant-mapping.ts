/**
 * @module tenant-mapping
 * @description Bridge between Standard Native Auth identity (text IDs) and Standard domain (UUID IDs).
 *
 * ADR 0002 Phase 2/3 — tenants table removed. tenant_id === organization_id.
 *
 * Two responsibilities, deliberately split (see ADR 0002):
 *  - `resolveTenantContext`  — READ-ONLY lookup. Returns `null` when the org has
 *    not been provisioned. Never writes. Safe to call on every request.
 *  - `provisionTenantContext` — explicit creation. Call this only at well-defined
 *    provisioning points (org creation, platform-admin bootstrap).
 *
 * Request-time code must NOT create domain rows: silent JIT provisioning used to
 * mask resolution bugs by inventing "phantom" tenants.
 */
import { eq } from "drizzle-orm";
import { organizations, baOrganization } from "@standard/schemas";
import type { DbClient } from "./db";

export interface ResolvedTenantContext {
  /** @deprecated Alias of organization_id — kept for backward compat with callers */
  tenant_id: string;
  organization_id: string; // UUID from `organizations` table
  ba_org_id: string;       // Original Org ID
  org_name: string;        // Organization display name
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * READ-ONLY resolution of a Standard Native Auth org ID / slug into Standard
 * domain UUIDs. Returns `null` if the org has not been provisioned — callers
 * decide whether that is a 404 or a trigger to provision explicitly.
 */
export async function resolveTenantContext(
  db: DbClient,
  orgId: string
): Promise<ResolvedTenantContext | null> {
  if (UUID_RE.test(orgId)) {
    // Resolve by organization UUID directly.
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (existingOrg) {
      return {
        tenant_id: existingOrg.id,
        organization_id: existingOrg.id,
        ba_org_id: existingOrg.slug,
        org_name: existingOrg.name,
      };
    }
    return null;
  }

  // Non-UUID: could be a BA org ID (nanoid) or a slug.
  // Translate BA org ID → slug when applicable, then resolve by slug.
  const [baOrg] = await db
    .select({ slug: baOrganization.slug })
    .from(baOrganization)
    .where(eq(baOrganization.id, orgId))
    .limit(1);

  const slug = baOrg?.slug && baOrg.slug !== orgId ? baOrg.slug : orgId;

  const [existingOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (existingOrg) {
    return {
      tenant_id: existingOrg.id,
      organization_id: existingOrg.id,
      ba_org_id: orgId,
      org_name: existingOrg.name,
    };
  }

  return null;
}

/**
 * Explicit provisioning: resolve the org, creating the domain organization when
 * missing. Idempotent and keyed on slug. Call ONLY from deliberate provisioning
 * points (org creation, platform-admin bootstrap).
 */
export async function provisionTenantContext(
  db: DbClient,
  orgId: string
): Promise<ResolvedTenantContext> {
  const existing = await resolveTenantContext(db, orgId);
  if (existing) return existing;

  // Translate BA org ID → slug so provisioning is keyed deterministically.
  const [baOrg] = await db
    .select({ slug: baOrganization.slug, name: baOrganization.name })
    .from(baOrganization)
    .where(eq(baOrganization.id, orgId))
    .limit(1);

  const slug = baOrg?.slug ?? orgId;
  const name = baOrg?.name ?? `Org ${orgId.substring(0, 8)}`;

  // ADR 0002 Phase 2/3: tenants table gone. Organizations IS the tenant.
  // Reuse the BA org UUID as the organization ID when it's a UUID.
  const convergedId = UUID_RE.test(orgId) ? orgId : undefined;

  const [newOrg] = await db
    .insert(organizations)
    .values({ ...(convergedId ? { id: convergedId } : {}), slug, name, status: "active" })
    .returning();

  console.log(
    `[standard:tenant-mapping] provisioned org=${newOrg!.id} for BA org=${orgId}`
  );

  return {
    tenant_id: newOrg!.id,
    organization_id: newOrg!.id,
    ba_org_id: orgId,
    org_name: name,
  };
}

/**
 * @module tenant-mapping
 * @description Bridge between Standard Native Auth identity (text IDs) and Standard domain (UUID IDs).
 *
 * Standard Native Auth creates organizations with text IDs (e.g. "org_pa5khl").
 * The Standard domain schema uses UUID columns with FK relationships.
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
import { tenants, organizations, baOrganization } from "@standard/schemas";
import type { DbClient } from "./db";

export interface ResolvedTenantContext {
  tenant_id: string;      // UUID from `tenants` table
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
    // 1. Try resolving by organization ID first (routers often pass org UUID).
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (existingOrg) {
      const [existingTenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, existingOrg.tenantId))
        .limit(1);

      if (existingTenant) {
        return {
          tenant_id: existingTenant.id,
          organization_id: existingOrg.id,
          ba_org_id: existingOrg.slug,
          org_name: existingOrg.name,
        };
      }
    }

    // 2. Fall back to resolving by tenant ID.
    const [existingTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, orgId))
      .limit(1);

    if (existingTenant) {
      const [existingOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.tenantId, existingTenant.id))
        .limit(1);

      if (existingOrg) {
        return {
          tenant_id: existingTenant.id,
          organization_id: existingOrg.id,
          ba_org_id: existingOrg.slug,
          org_name: existingOrg.name,
        };
      }
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

  const [existingTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (existingTenant) {
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.tenantId, existingTenant.id))
      .limit(1);

    if (existingOrg) {
      return {
        tenant_id: existingTenant.id,
        organization_id: existingOrg.id,
        ba_org_id: orgId,
        org_name: existingOrg.name,
      };
    }
  }

  return null;
}

/**
 * Explicit provisioning: resolve the org, creating the domain tenant and/or
 * organization when missing. Idempotent and keyed on slug. Call ONLY from
 * deliberate provisioning points (org creation, platform-admin bootstrap).
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

  // ADR 0002 Phase 1 — ID convergence: when the BA org ID is a UUID (every org
  // created through the user-orgs route is), reuse it as BOTH tenants.id and
  // organizations.id. The three IDs converge, so resolution becomes identity and
  // the future tenant→org merge (Phase 2/3) is a no-op: tenant_id already equals
  // organization_id for converged rows. Legacy non-UUID orgs (e.g. seeded
  // operator org) keep auto-generated IDs.
  const convergedId = UUID_RE.test(orgId) ? orgId : undefined;

  // Tenant may already exist (e.g. created without its org). Reuse it.
  const [existingTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  const tenantId =
    existingTenant?.id ??
    (await db
      .insert(tenants)
      .values({ ...(convergedId ? { id: convergedId } : {}), slug, name, status: "active" })
      .returning())[0]!.id;

  const [newOrg] = await db
    .insert(organizations)
    .values({ ...(convergedId ? { id: convergedId } : {}), tenantId, slug, name, status: "active" })
    .returning();

  console.log(
    `[standard:tenant-mapping] provisioned tenant=${tenantId} org=${newOrg!.id} for BA org=${orgId}`
  );

  return {
    tenant_id: tenantId,
    organization_id: newOrg!.id,
    ba_org_id: orgId,
    org_name: name,
  };
}


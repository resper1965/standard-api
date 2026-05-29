/**
 * @module tenant-mapping
 * @description Bridge between Better Auth identity (text IDs) and Standard domain (UUID IDs).
 *
 * Better Auth creates organizations with text IDs (e.g. "org_pa5khl").
 * The Standard domain schema uses UUID columns with FK relationships.
 *
 * This module resolves the active Better Auth organization into valid
 * Standard tenant + organization UUIDs, creating them on-demand if needed
 * (lazy provisioning / "just-in-time" tenant setup).
 */
import { eq } from "drizzle-orm";
import { tenants, organizations } from "@standard/schemas";
import type { DbClient } from "./db";

export interface ResolvedTenantContext {
  tenant_id: string;      // UUID from `tenants` table
  organization_id: string; // UUID from `organizations` table
  ba_org_id: string;       // Original Org ID
  org_name: string;        // Organization display name
}

/**
 * Resolve a Neon/Legacy Org ID into Standard domain UUIDs.
 */
export async function resolveTenantContext(
  db: DbClient,
  orgId: string
): Promise<ResolvedTenantContext | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);

  if (isUuid) {
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

  const slug = orgId;
  const name = `Org ${orgId.substring(0, 8)}`;

  // Step 2: Check if Standard tenant already exists for this BA org
  // We use the BA org ID as the tenant slug for deterministic mapping
  const [existingTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (existingTenant) {
    // Step 2a: Tenant exists — find its organization
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
        org_name: name,
      };
    }

    // Tenant exists but no org — create org under this tenant
    const [newOrg] = await db
      .insert(organizations)
      .values({
        tenantId: existingTenant.id,
        slug,
        name,
        status: "active",
      })
      .returning();

    return {
      tenant_id: existingTenant.id,
      organization_id: newOrg!.id,
      ba_org_id: orgId,
      org_name: name,
    };
  }

  // Step 3: JIT provisioning — create both tenant and organization
  const [newTenant] = await db
    .insert(tenants)
    .values({
      slug,
      name,
      status: "active",
    })
    .returning();

  const [newOrg] = await db
    .insert(organizations)
    .values({
      tenantId: newTenant!.id,
      slug,
      name,
      status: "active",
    })
    .returning();

  console.log(
    `[standard:tenant-mapping] JIT provisioned tenant=${newTenant!.id} org=${newOrg!.id} for BA org=${orgId}`
  );

  return {
    tenant_id: newTenant!.id,
    organization_id: newOrg!.id,
    ba_org_id: orgId,
    org_name: name,
  };
}

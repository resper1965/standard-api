/**
 * @module tenant-db (adapter)
 * @deprecated This module is dead code with the Neon HTTP driver.
 *
 * `set_config('app.current_org_id', ..., true)` scopes to the current
 * transaction, but the Neon HTTP driver executes each statement as an
 * independent HTTP call (separate transaction). The value does NOT
 * persist to the callback's queries.
 *
 * Use `context.tenantScope` (from middleware/tenant-db.middleware.ts)
 * for application-level tenant scoping instead.
 *
 * When migrating to Neon WebSocket Pool driver, this module can be
 * resurrected with `pool.transaction()` for real RLS enforcement.
 *
 * @see middleware/tenant-db.middleware.ts for the active implementation
 */
import { sql } from "drizzle-orm";
import type { DbClient } from "./db";

/**
 * @deprecated Does NOT work with Neon HTTP driver. Use context.tenantScope instead.
 */
export async function withTenantContext<T>(
  db: DbClient,
  organizationId: string,
  fn: (db: DbClient) => Promise<T>,
): Promise<T> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(organizationId)) {
    throw new Error(`[tenant-db] Invalid organization UUID: ${organizationId}`);
  }

  // ⚠️ This set_config dies with the HTTP statement — fn() never sees it
  await db.execute(sql`SELECT set_config('app.current_org_id', ${organizationId}, true)`);

  return fn(db);
}

/**
 * @deprecated Does NOT work with Neon HTTP driver.
 */
export async function clearTenantContext(db: DbClient): Promise<void> {
  await db.execute(sql`SELECT set_config('app.current_org_id', '', true)`);
}

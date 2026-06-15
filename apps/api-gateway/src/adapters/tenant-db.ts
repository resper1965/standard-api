// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module tenant-db (adapter)
 *
 * Provides PostgreSQL Row-Level Security (RLS) enforcement via SET LOCAL
 * within a Drizzle transaction. Requires the Pool (WebSocket) driver â€”
 * see adapters/db.ts.
 *
 * Usage in app.ts (wrapped around every authenticated route handler):
 *   withRlsTenantContext(db, organizationId, (tx) => handler(ctx with tx))
 *
 * The SET LOCAL call scopes app.current_org_id to the current transaction.
 * All queries within the callback execute against that same transaction, so
 * the RLS policies in migrations 0028 and 0053 enforce tenant isolation at
 * the database layer â€” defence-in-depth on top of the application-level
 * scopeWhere() helpers in middleware/tenant-db.middleware.ts.
 */
import { sql } from "drizzle-orm";
import type { DbClient } from "./db";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Executes `fn` within a PostgreSQL transaction that binds `app.current_org_id`
 * to `organizationId` via SET LOCAL. Because SET LOCAL scopes to the current
 * transaction, every query issued through `tx` will be subject to the RLS
 * policies that filter by `app.current_org_id`.
 */
export async function withRlsTenantContext<T>(
  db: DbClient,
  organizationId: string,
  fn: (tx: DbClient) => Promise<T>,
): Promise<T> {
  if (!UUID_REGEX.test(organizationId)) {
    throw new Error(`[tenant-db] Invalid organization UUID: ${organizationId}`);
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_org_id', ${organizationId}, true)`,
    );
    return fn(tx as unknown as DbClient);
  });
}

/** @deprecated â€” alias kept for backward compatibility; use withRlsTenantContext */
export async function withTenantContext<T>(
  db: DbClient,
  organizationId: string,
  fn: (db: DbClient) => Promise<T>,
): Promise<T> {
  return withRlsTenantContext(db, organizationId, fn);
}

/** @deprecated â€” SET LOCAL is cleared automatically on transaction end */
export async function clearTenantContext(_db: DbClient): Promise<void> {
  // no-op
}


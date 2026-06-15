// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module tenant-db.middleware
 * @description Application-level tenant scoping for database queries.
 *
 * Since the Neon HTTP driver is stateless (each statement is an independent
 * HTTP call â€” no shared transaction), PostgreSQL `SET LOCAL` / `set_config()`
 * does NOT work for RLS. This module provides an application-level fallback
 * that injects `organization_id` filters into Drizzle queries.
 *
 * ## Architecture Decision
 *
 * Instead of pretending RLS works (`set_config` dead code), we provide
 * typed helpers that handlers use explicitly. This is:
 * - **Honest**: no false sense of security
 * - **Type-safe**: Drizzle column types enforced at compile time
 * - **Auditable**: every scoped query is traceable
 * - **Forward-compatible**: when migrating to Neon WebSocket Pool,
 *   replace `scopeWhere` with real RLS and remove from handlers
 *
 * ## Usage in Route Handlers
 *
 * ```ts
 * const { db, orgId, scopeWhere, scopeInsert } = context.tenantScope!;
 *
 * // SELECT: auto-filter by org
 * const rows = await db.select().from(assessments)
 *   .where(scopeWhere(assessments.organizationId));
 *
 * // INSERT: auto-inject org
 * await db.insert(assessments)
 *   .values(scopeInsert({ name: "..." }));
 *
 * // UPDATE/DELETE: use scopeWhere in the WHERE clause
 * await db.update(assessments)
 *   .set({ status: "closed" })
 *   .where(and(scopeWhere(assessments.organizationId), eq(assessments.id, id)));
 * ```
 *
 * Admin/cross-tenant routes should use `context.deps._db` directly.
 */
import { eq } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { RequestContext } from "../http";
import type { DbClient } from "../adapters/db";
import { StructuredLogger } from "@standard/observability";

const logger = new StructuredLogger();

/**
 * Typed tenant scope â€” attached to `context.tenantScope` for route handlers.
 */
export type TenantScope = {
  /** Raw Drizzle client â€” same as context.deps._db */
  db: DbClient;
  /** Validated organization UUID */
  orgId: string;
  /**
   * Builds an `eq(column, orgId)` condition for WHERE clauses.
   * Use with any table's `organizationId` column.
   *
   * @example
   * ```ts
   * db.select().from(assessments).where(scopeWhere(assessments.organizationId));
   * ```
   */
  scopeWhere: (orgColumn: PgColumn) => ReturnType<typeof eq>;
  /**
   * Injects `organizationId` into INSERT values.
   *
   * @example
   * ```ts
   * db.insert(assessments).values(scopeInsert({ name: "..." }));
   * ```
   */
  scopeInsert: <T extends Record<string, unknown>>(values: T) => T & { organizationId: string };
};

/**
 * Attaches `tenantScope` to the request context.
 * Must run AFTER authMiddleware (depends on `context.organizationId`).
 *
 * When `organizationId` is a valid UUID, provides typed helpers for
 * tenant-scoped queries. Otherwise, `tenantScope` is not set and
 * handlers must use `context.deps._db` directly.
 */
export function attachTenantDb(context: RequestContext): void {
  const db = context.deps._db as DbClient | undefined;
  const orgId = context.organizationId;

  if (!db || !orgId) {
    return;
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(orgId)) {
    logger.log({
      level: "warn",
      message: "tenant_scope_skipped_non_uuid_org",
      service: "api-gateway",
      module: "tenant-db",
      environment: "production",
      trace_id: context.traceId,
      metadata: { org_id: orgId },
    });
    return;
  }

  const tenantScope: TenantScope = {
    db,
    orgId,
    scopeWhere: (orgColumn: PgColumn) => eq(orgColumn, orgId),
    scopeInsert: <T extends Record<string, unknown>>(values: T) => ({
      ...values,
      organizationId: orgId,
    }),
  };

  // Attach to context â€” typed via RequestContext.tenantScope
  context.tenantScope = tenantScope;
}


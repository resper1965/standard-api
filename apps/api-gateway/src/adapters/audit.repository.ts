import { auditLogs } from "@standard/schemas";
import type { AuditRepositoryAdapter } from "../http";
import type { DbClient } from "./db";

/**
 * In-memory audit repository — used only for local dev / mock mode.
 * Logs are discarded at the end of each request lifecycle.
 */
export const createAuditRepository = (): AuditRepositoryAdapter => {
  const records: Array<{ event: string; metadata: Record<string, unknown> }> = [];

  return {
    async record(event, metadata) {
      records.push({ event, metadata });
    }
  };
};

/**
 * Drizzle-backed audit repository — persists every audit event
 * into the `audit_logs` table on the Neon PostgreSQL database.
 *
 * Follows AGENTS.md §13: Audit logs for state changes, approvals,
 * uploads, agent outputs, and exports.
 *
 * Fields mapping:
 *   - event    -> action
 *   - metadata -> metadata jsonb + extracted keys for indexed columns
 */
export const createDrizzleAuditRepository = (db: DbClient): AuditRepositoryAdapter => {
  return {
    async record(event, metadata) {
      const tenantId = typeof metadata.tenant_id === "string" ? metadata.tenant_id : undefined;
      const organizationId = typeof metadata.organization_id === "string" ? metadata.organization_id : undefined;
      const actorId = typeof metadata.actor_id === "string" ? metadata.actor_id : undefined;
      const resourceType = typeof metadata.resource_type === "string" ? metadata.resource_type : event;
      const resourceId = typeof metadata.resource_id === "string" ? metadata.resource_id : undefined;
      const traceId = typeof metadata.trace_id === "string" ? metadata.trace_id : undefined;
      const ipAddress = typeof metadata.ip_address === "string" ? metadata.ip_address : undefined;
      const userAgent = typeof metadata.user_agent === "string" ? metadata.user_agent : undefined;

      // Sanitize metadata: strip sensitive content per AGENTS.md §13
      const safeMeta = { ...metadata };
      delete safeMeta.tenant_id;
      delete safeMeta.organization_id;
      delete safeMeta.actor_id;
      delete safeMeta.resource_type;
      delete safeMeta.resource_id;
      delete safeMeta.trace_id;
      delete safeMeta.ip_address;
      delete safeMeta.user_agent;

      await db.insert(auditLogs).values({
        action: event,
        tenantId: tenantId ?? null,
        organizationId: organizationId ?? null,
        actorId: actorId ?? null,
        resourceType,
        resourceId: resourceId ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        traceId: traceId ?? null,
        metadata: safeMeta
      });
    }
  };
};


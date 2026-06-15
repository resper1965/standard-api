import { auditLogs, AUDIT_METADATA_ALLOWLIST } from "@standard/schemas";
import type { AuditRepositoryAdapter } from "../http";
import type { DbClient } from "./db";

/**
 * In-memory audit repository â€” used only for local dev / mock mode.
 * Logs are discarded at the end of each request lifecycle.
 */
export const createAuditRepository = (): AuditRepositoryAdapter => {
  const records: Array<{ event: string; metadata: Record<string, unknown> }> =
    [];

  return {
    async record(event, metadata) {
      records.push({ event, metadata });
    },
  };
};

/**
 * Drizzle-backed audit repository â€” persists every audit event
 * into the `audit_logs` table on the Neon PostgreSQL database.
 *
 * Follows AGENTS.md Â§13: Audit logs for state changes, approvals,
 * uploads, agent outputs, and exports.
 *
 * Fields mapping:
 *   - event    -> action
 *   - metadata -> metadata jsonb + extracted keys for indexed columns
 */
export const createDrizzleAuditRepository = (
  db: DbClient,
): AuditRepositoryAdapter => {
  const isUuid = (val: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      val,
    );
  };

  return {
    async record(event, metadata) {
      const organizationId =
        typeof metadata.organization_id === "string" &&
        isUuid(metadata.organization_id)
          ? metadata.organization_id
          : undefined;
      const actorId =
        typeof metadata.actor_id === "string" && isUuid(metadata.actor_id)
          ? metadata.actor_id
          : undefined;
      const resourceType =
        typeof metadata.resource_type === "string"
          ? metadata.resource_type
          : event;
      const resourceId =
        typeof metadata.resource_id === "string" && isUuid(metadata.resource_id)
          ? metadata.resource_id
          : undefined;
      const traceId =
        typeof metadata.trace_id === "string" ? metadata.trace_id : undefined;
      const ipAddress =
        typeof metadata.ip_address === "string"
          ? metadata.ip_address
          : undefined;
      const userAgent =
        typeof metadata.user_agent === "string"
          ? metadata.user_agent
          : undefined;

      // Sanitize metadata: only copy allowlisted keys, then delete columns
      const safeMeta: Record<string, unknown> = {};
      for (const key of Object.keys(metadata)) {
        if (AUDIT_METADATA_ALLOWLIST.includes(key as any)) {
          safeMeta[key] = metadata[key];
        }
      }
      if (organizationId) delete safeMeta.organization_id;
      if (actorId) delete safeMeta.actor_id;
      if (resourceId) delete safeMeta.resource_id;
      delete safeMeta.resource_type;
      delete safeMeta.trace_id;
      delete safeMeta.ip_address;
      delete safeMeta.user_agent;

      await db.insert(auditLogs).values({
        action: event,
        organizationId: organizationId ?? null,
        actorId: actorId ?? null,
        resourceType,
        resourceId: resourceId ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        traceId: traceId ?? null,
        metadata: safeMeta,
      });
    },
  };
};

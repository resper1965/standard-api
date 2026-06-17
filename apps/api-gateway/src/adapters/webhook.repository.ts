/**
 * Webhook repository adapter â€” Drizzle + In-Memory implementations.
 *
 * Implements WebhookRepositoryAdapter from @standard/schemas/webhooks.
 */
import { webhookEndpoints, webhookDeliveries } from "@standard/schemas";
import type {
  WebhookRepositoryAdapter,
  WebhookEndpointRecord,
  WebhookDeliveryLog,
  WebhookEventType,
  WebhookDeliveryStatus,
} from "@standard/schemas";
import { eq, and, desc } from "drizzle-orm";
import type { DbClient } from "./db";

// â”€â”€ Helper: map Drizzle row â†’ WebhookEndpointRecord â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function toEndpointRecord(row: typeof webhookEndpoints.$inferSelect): WebhookEndpointRecord {
  return {
    id: row.id,
    organization_id: row.organizationId,
    url: row.url,
    events: row.events as WebhookEventType[],
    description: row.description,
    enabled: row.enabled,
    signing_secret_hash: row.signingSecretHash,
    signing_secret_masked: row.signingSecretMasked,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function toDeliveryLog(row: typeof webhookDeliveries.$inferSelect): WebhookDeliveryLog {
  return {
    delivery_id: row.id,
    endpoint_id: row.endpointId,
    event_id: row.eventId,
    event_type: row.eventType as WebhookEventType,
    status: row.status as WebhookDeliveryStatus,
    http_status: row.httpStatus,
    attempt_count: row.attemptCount,
    max_attempts: row.maxAttempts,
    last_attempted_at: row.lastAttemptedAt?.toISOString() ?? null,
    next_retry_at: row.nextRetryAt?.toISOString() ?? null,
    response_body: row.responseBody,
    created_at: row.createdAt.toISOString(),
  };
}

// â”€â”€ Drizzle Implementation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createDrizzleWebhookRepository = (db: DbClient): WebhookRepositoryAdapter => ({
  async createEndpoint(input) {
    const [row] = await db.insert(webhookEndpoints).values({
      organizationId: input.organization_id,
      url: input.url,
      events: input.events,
      description: input.description ?? null,
      signingSecretHash: input.signing_secret_hash,
      signingSecretMasked: input.signing_secret_masked,
    }).returning();
    if (!row) throw new Error("Failed to create webhook endpoint");
    return toEndpointRecord(row);
  },

  async getEndpoint(id, organization_id) {
    const [row] = await db.select().from(webhookEndpoints)
      .where(and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.organizationId, organization_id)
      ))
      .limit(1);
    return row ? toEndpointRecord(row) : null;
  },

  async listEndpoints(organization_id) {
    const rows = await db.select().from(webhookEndpoints)
      .where(eq(webhookEndpoints.organizationId, organization_id));
    return rows.map(toEndpointRecord);
  },

  async updateEndpoint(id, organization_id, patch) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.url !== undefined) updates["url"] = patch.url;
    if (patch.events !== undefined) updates["events"] = patch.events;
    if (patch.description !== undefined) updates["description"] = patch.description;
    if (patch.enabled !== undefined) updates["enabled"] = patch.enabled;

    const [row] = await db.update(webhookEndpoints)
      .set(updates)
      .where(and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.organizationId, organization_id)
      ))
      .returning();
    return row ? toEndpointRecord(row) : null;
  },

  async deleteEndpoint(id, organization_id) {
    const [deleted] = await db.delete(webhookEndpoints)
      .where(and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.organizationId, organization_id)
      ))
      .returning({ id: webhookEndpoints.id });
    return !!deleted;
  },

  async findSubscribers(organization_id, event_type) {
    const rows = await db.select().from(webhookEndpoints)
      .where(and(
        eq(webhookEndpoints.organizationId, organization_id),
        eq(webhookEndpoints.enabled, true)
      ));
    // Filter: endpoints with empty events array subscribe to all events
    return rows
      .filter(r => (r.events as string[]).length === 0 || (r.events as string[]).includes(event_type))
      .map(toEndpointRecord);
  },

  async logDelivery(log) {
    await db.insert(webhookDeliveries).values({
      id: log.delivery_id,
      endpointId: log.endpoint_id,
      eventId: log.event_id,
      eventType: log.event_type,
      status: log.status as "pending" | "delivered" | "failed" | "retrying",
      httpStatus: log.http_status,
      attemptCount: log.attempt_count,
      maxAttempts: log.max_attempts,
      lastAttemptedAt: log.last_attempted_at ? new Date(log.last_attempted_at) : null,
      nextRetryAt: log.next_retry_at ? new Date(log.next_retry_at) : null,
      responseBody: log.response_body,
    });
  },

  async listDeliveries(endpoint_id, limit = 50) {
    const rows = await db.select().from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpoint_id))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
    return rows.map(toDeliveryLog);
  },

  async rotateSecret(id, organization_id, newSecretHash, newSecretMasked) {
    const [row] = await db.update(webhookEndpoints)
      .set({ signingSecretHash: newSecretHash, signingSecretMasked: newSecretMasked, updatedAt: new Date() })
      .where(and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.organizationId, organization_id)
      ))
      .returning();
    return row ? toEndpointRecord(row) : null;
  },
});

// â”€â”€ In-Memory Implementation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createInMemoryWebhookRepository = (): WebhookRepositoryAdapter => {
  const endpoints: Map<string, WebhookEndpointRecord> = new Map();
  const deliveries: WebhookDeliveryLog[] = [];

  return {
    async createEndpoint(input) {
      const record: WebhookEndpointRecord = {
        id: crypto.randomUUID(),
        organization_id: input.organization_id,
        url: input.url,
        events: input.events,
        description: input.description ?? null,
        enabled: true,
        signing_secret_hash: input.signing_secret_hash,
        signing_secret_masked: input.signing_secret_masked,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      endpoints.set(record.id, record);
      return record;
    },

    async getEndpoint(id, organization_id) {
      const ep = endpoints.get(id);
      return ep && ep.organization_id === organization_id ? ep : null;
    },

    async listEndpoints(organization_id) {
      return [...endpoints.values()].filter(
        e => e.organization_id === organization_id && e.organization_id === organization_id
      );
    },

    async updateEndpoint(id, organization_id, patch) {
      const ep = endpoints.get(id);
      if (!ep || ep.organization_id !== organization_id) return null;
      const updated = { ...ep, ...patch, updated_at: new Date().toISOString() };
      endpoints.set(id, updated);
      return updated;
    },

    async deleteEndpoint(id, organization_id) {
      const ep = endpoints.get(id);
      if (!ep || ep.organization_id !== organization_id) return false;
      endpoints.delete(id);
      return true;
    },

    async findSubscribers(organization_id, event_type) {
      return [...endpoints.values()].filter(
        e => e.organization_id === organization_id &&
             e.organization_id === organization_id &&
             e.enabled &&
             (e.events.length === 0 || e.events.includes(event_type))
      );
    },

    async logDelivery(log) {
      deliveries.push(log);
    },

    async listDeliveries(endpoint_id, limit = 50) {
      return deliveries
        .filter(d => d.endpoint_id === endpoint_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit);
    },

    async rotateSecret(id, organization_id, newSecretHash, newSecretMasked) {
      const ep = endpoints.get(id);
      if (!ep || ep.organization_id !== organization_id) return null;
      const updated = {
        ...ep,
        signing_secret_hash: newSecretHash,
        signing_secret_masked: newSecretMasked,
        updated_at: new Date().toISOString()
      };
      endpoints.set(id, updated);
      return updated;
    },
  };
};


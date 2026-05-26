/**
 * @module lifecycle-webhook-bridge
 * @description Bridges assessment lifecycle events to webhook dispatch.
 * When an assessment transitions state, dispatches webhook events
 * to all registered endpoints with HMAC-SHA256 signed payloads.
 */
import type { WebhookEventType, WebhookDeliveryPayload, WebhookRepositoryAdapter } from "@standard/schemas";
import { WebhookDispatcher } from "./webhook-dispatcher";

export type LifecycleEvent = {
  tenant_id: string;
  organization_id: string;
  assessment_id: string;
  event_type: WebhookEventType;
  trace_id: string;
  data: Record<string, unknown>;
};

export type LifecycleWebhookBridgeDeps = {
  webhooks: WebhookRepositoryAdapter;
};

export class LifecycleWebhookBridge {
  private readonly dispatcher = new WebhookDispatcher();

  constructor(private readonly deps: LifecycleWebhookBridgeDeps) {}

  /**
   * Fan-out: deliver the lifecycle event to all matching webhook endpoints.
   * Best-effort — failures are logged, not thrown.
   */
  async dispatch(event: LifecycleEvent): Promise<void> {
    const matchingEndpoints = await this.deps.webhooks.findSubscribers(
      event.tenant_id,
      event.organization_id,
      event.event_type
    );

    if (matchingEndpoints.length === 0) return;

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const payload: WebhookDeliveryPayload = {
      schema_version: "1.0",
      event_id: eventId,
      event_type: event.event_type,
      timestamp,
      tenant_id: event.tenant_id,
      organization_id: event.organization_id,
      assessment_id: event.assessment_id,
      trace_id: event.trace_id,
      data: event.data,
    };

    const results = await Promise.allSettled(
      matchingEndpoints.map(async (ep) => {
        const result = await this.dispatcher.deliver({
          endpoint_url: ep.url,
          signing_secret: ep.signing_secret_hash,
          payload,
        });

        // Record delivery attempt
        try {
          await this.deps.webhooks.logDelivery({
            delivery_id: crypto.randomUUID(),
            endpoint_id: ep.id,
            event_id: eventId,
            event_type: event.event_type,
            status: result.success ? "delivered" : "failed",
            http_status: result.http_status,
            attempt_count: 1,
            max_attempts: 3,
            last_attempted_at: timestamp,
            next_retry_at: result.success ? null : new Date(Date.now() + 60_000).toISOString(),
            response_body: result.response_body,
            created_at: timestamp,
          });
        } catch (recordErr) {
          console.error(`[webhook-bridge] Failed to log delivery for ${ep.id}:`, recordErr);
        }

        return { endpoint_id: ep.id, ...result };
      })
    );

    const failures = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
    );
    if (failures.length > 0) {
      console.warn(
        `[webhook-bridge] ${failures.length}/${matchingEndpoints.length} webhook deliveries failed for ${event.event_type}`
      );
    }
  }
}

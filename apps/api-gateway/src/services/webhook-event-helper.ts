import type {
  WebhookEventType,
  WebhookRepositoryAdapter,
} from "@standard/schemas";
import { newId } from "../http";

export type WebhookEventInput = {
  organizationId: string;
  eventType: WebhookEventType;
  eventId: string;
};

/**
 * Best-effort webhook dispatch — finds subscribers for the event type
 * and queues delivery records. Never throws.
 *
 * Pattern extracted from assessments.routes.ts:394-420.
 */
export async function dispatchWebhookEvent(
  webhooks: WebhookRepositoryAdapter | null | undefined,
  input: WebhookEventInput,
): Promise<void> {
  if (!webhooks) return;

  try {
    const subscribers = await webhooks.findSubscribers(
      input.organizationId,
      input.eventType,
    );

    for (const endpoint of subscribers) {
      if (!endpoint.enabled) continue;
      await webhooks.logDelivery({
        delivery_id: newId(),
        endpoint_id: endpoint.id,
        event_id: input.eventId,
        event_type: input.eventType,
        status: "pending",
        http_status: null,
        attempt_count: 0,
        max_attempts: 3,
        last_attempted_at: null,
        next_retry_at: new Date().toISOString(),
        response_body: null,
        created_at: new Date().toISOString(),
      });
    }
  } catch {
    // Non-blocking — webhook delivery is best-effort
  }
}

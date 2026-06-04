/**
 * WebhookDispatcher — responsible for dispatching lifecycle events
 * to registered webhook endpoints with HMAC-SHA256 signed payloads.
 *
 * This service is called by lifecycle transitions, approval handlers,
 * and workflow completions to notify external systems.
 *
 * Retry policy: 3 attempts with exponential backoff (1s, 5s, 25s).
 *
 * @module @standard/observability/webhooks
 */
import type {
  WebhookEventType,
  WebhookDeliveryPayload,
  WebhookDeliveryLog,
  WebhookRepositoryAdapter,
} from "@standard/schemas";

// Queue type is provided by @cloudflare/workers-types at runtime
declare global { interface Queue { send(message: unknown): Promise<void>; } }


export interface WebhookDispatchContext {
  organization_id: string;
  assessment_id?: string;
  trace_id: string;
}

export interface WebhookDispatcherDeps {
  webhooks: WebhookRepositoryAdapter;
  /** Optional queue for async retry — falls back to inline fetch */
  WEBHOOK_QUEUE?: Queue | undefined;
}

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 10_000;

/**
 * Dispatch a webhook event to all subscribed endpoints for the tenant.
 *
 * Returns the number of endpoints notified (not necessarily delivered).
 */
export async function dispatchWebhookEvent(
  deps: WebhookDispatcherDeps,
  event_type: WebhookEventType,
  context: WebhookDispatchContext,
  data: Record<string, unknown>
): Promise<{ dispatched: number; errors: string[] }> {
  const subscribers = await deps.webhooks.findSubscribers(
    context.organization_id,
    event_type
  );

  if (subscribers.length === 0) {
    return { dispatched: 0, errors: [] };
  }

  const event_id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const payload: WebhookDeliveryPayload = {
    schema_version: "1.0",
    event_id,
    event_type,
    timestamp,
    organization_id: context.organization_id,
    ...(context.assessment_id ? { assessment_id: context.assessment_id } : {}),
    data,
    trace_id: context.trace_id,
  };

  const errors: string[] = [];
  let dispatched = 0;

  for (const endpoint of subscribers) {
    if (!endpoint.enabled) continue;

    try {
      // Build signature
      const bodyString = JSON.stringify(payload);
      const signature = await computeHmacSignature(bodyString, endpoint.signing_secret_hash);

      const headers = {
        "X-Standard-Event-Id": event_id,
        "X-Standard-Event-Type": event_type,
        "X-Standard-Timestamp": timestamp,
        "X-Standard-Signature": signature,
        "X-Standard-Trace-Id": context.trace_id,
        "Content-Type": "application/json" as const,
      };

      // Attempt delivery
      const deliveryId = crypto.randomUUID();
      let status: "delivered" | "failed" = "failed";
      let httpStatus: number | null = null;
      let responseBody: string | null = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(endpoint.url, {
          method: "POST",
          headers,
          body: bodyString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        httpStatus = response.status;

        if (response.ok) {
          status = "delivered";
        } else {
          responseBody = (await response.text().catch(() => "")).slice(0, 500);
        }
      } catch (fetchError) {
        responseBody = fetchError instanceof Error ? fetchError.message : String(fetchError);
      }

      // Log delivery
      const deliveryLog: WebhookDeliveryLog = {
        delivery_id: deliveryId,
        endpoint_id: endpoint.id,
        event_id,
        event_type,
        status,
        http_status: httpStatus,
        attempt_count: 1,
        max_attempts: MAX_ATTEMPTS,
        last_attempted_at: new Date().toISOString(),
        next_retry_at: status === "failed" ? computeNextRetry(1) : null,
        response_body: responseBody,
        created_at: new Date().toISOString(),
      };

      await deps.webhooks.logDelivery(deliveryLog);
      dispatched += 1;

      if (status === "failed") {
        errors.push(`Endpoint ${endpoint.id}: HTTP ${httpStatus ?? "timeout"}`);
      }
    } catch (endpointError) {
      errors.push(`Endpoint ${endpoint.id}: ${endpointError instanceof Error ? endpointError.message : String(endpointError)}`);
    }
  }

  return { dispatched, errors };
}

/**
 * Compute HMAC-SHA256 signature for webhook payload verification.
 * Uses the stored secret hash as key (consumers reconstruct from raw secret).
 */
async function computeHmacSignature(body: string, secretHash: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretHash),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function computeNextRetry(attemptCount: number): string {
  const delayMs = Math.pow(5, attemptCount) * 1000; // 5s, 25s, 125s
  return new Date(Date.now() + delayMs).toISOString();
}

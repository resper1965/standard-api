// @ts-nocheck -- Zod v4 CI type compat
/**
 * WebhookDispatcher â€” HMAC-SHA256 signed webhook delivery
 *
 * Delivers webhook events to registered endpoints with:
 * - HMAC-SHA256 payload signing
 * - Standardized headers (event ID, type, timestamp, trace ID)
 * - 10s timeout per delivery attempt
 */
import type { WebhookDeliveryPayload, WebhookDeliveryHeaders } from "@standard/schemas";

export type DeliverInput = {
  endpoint_url: string;
  signing_secret: string;
  payload: WebhookDeliveryPayload;
};

export type DeliverResult = {
  success: boolean;
  http_status: number | null;
  response_body: string | null;
};

export class WebhookDispatcher {
  constructor(private fetchFn: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  async sign(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async deliver(input: DeliverInput): Promise<DeliverResult> {
    const body = JSON.stringify(input.payload);
    const signature = await this.sign(body, input.signing_secret);

    const headers: WebhookDeliveryHeaders = {
      "X-Standard-Event-Id": input.payload.event_id,
      "X-Standard-Event-Type": input.payload.event_type,
      "X-Standard-Timestamp": input.payload.timestamp,
      "X-Standard-Signature": signature,
      "X-Standard-Trace-Id": input.payload.trace_id,
      "Content-Type": "application/json",
    };

    try {
      const response = await this.fetchFn(input.endpoint_url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      const responseBody = await response.text().catch(() => null);

      return {
        success: response.ok,
        http_status: response.status,
        response_body: responseBody,
      };
    } catch (error) {
      return {
        success: false,
        http_status: null,
        response_body: String(error),
      };
    }
  }
}


// @ts-nocheck -- Zod v4 CI type compat
/**
 * Webhook types and delivery system for Standard Platform.
 *
 * Supports 15 lifecycle events as defined in public-api-guidelines.md.
 * Delivery uses HMAC-SHA256 signatures for verification.
 *
 * @module @standard/schemas/webhooks
 */
import { z } from "zod";

// â”€â”€ Event Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const WEBHOOK_EVENT_TYPES = [
  "assessment.created",
  "document.ingested",
  "kb.indexed",
  "soa.approved",
  "gap.approved",
  "maturity.approved",
  "poam.approved",
  "report.generated",
  "report.approved",
  "assessment.closed",
  "workflow.failed",
  "compliance.gate.evaluated",
  "tpra.assessment.submitted",
  "tpra.risk_score.created",
  "tpra.vendor.created",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const WebhookEventTypeSchema = z.enum(WEBHOOK_EVENT_TYPES);

// â”€â”€ Webhook Registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const CreateWebhookEndpointSchema = z.object({
  /** URL to deliver webhook events to (must be HTTPS in production) */
  url: z.string().url(),
  /** Events to subscribe to (empty = all events) */
  events: z.array(WebhookEventTypeSchema).default([]),
  /** Optional description for the developer portal */
  description: z.string().max(500).optional(),
  /** Whether the endpoint is active */
  enabled: z.boolean().default(true),
});

export type CreateWebhookEndpointInput = z.infer<
  typeof CreateWebhookEndpointSchema
>;

export const UpdateWebhookEndpointSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(WebhookEventTypeSchema).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateWebhookEndpointInput = z.infer<
  typeof UpdateWebhookEndpointSchema
>;

// â”€â”€ Webhook Endpoint Record â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type WebhookEndpointRecord = {
  id: string;
  organization_id: string;
  url: string;
  events: WebhookEventType[];
  description: string | null;
  enabled: boolean;
  /** HMAC signing secret (shown only at creation) */
  signing_secret_hash: string;
  /** Masked version for display */
  signing_secret_masked: string;
  created_at: string;
  updated_at: string;
};

// â”€â”€ Webhook Delivery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type WebhookDeliveryPayload = {
  /** Schema version for envelope versioning */
  schema_version: "1.0";
  /** Unique event ID for idempotency */
  event_id: string;
  /** Event type */
  event_type: WebhookEventType;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Organization context */
  organization_id: string;
  /** Assessment context (when applicable) */
  assessment_id?: string;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** Request trace ID */
  trace_id: string;
};

/**
 * Headers sent with each webhook delivery, following public-api-guidelines.md:
 *
 * X-Standard-Event-Id: unique delivery ID
 * X-Standard-Event-Type: the event type
 * X-Standard-Timestamp: ISO timestamp
 * X-Standard-Signature: HMAC-SHA256 hex digest
 * X-Standard-Trace-Id: trace correlation
 */
export type WebhookDeliveryHeaders = {
  "X-Standard-Event-Id": string;
  "X-Standard-Event-Type": string;
  "X-Standard-Timestamp": string;
  "X-Standard-Signature": string;
  "X-Standard-Trace-Id": string;
  "Content-Type": "application/json";
};

// â”€â”€ Delivery Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type WebhookDeliveryStatus =
  | "pending"
  | "delivered"
  | "failed"
  | "retrying";

export type WebhookDeliveryLog = {
  delivery_id: string;
  endpoint_id: string;
  event_id: string;
  event_type: WebhookEventType;
  status: WebhookDeliveryStatus;
  http_status: number | null;
  attempt_count: number;
  max_attempts: number;
  last_attempted_at: string | null;
  next_retry_at: string | null;
  response_body: string | null;
  created_at: string;
};

// â”€â”€ Webhook Repository Interface â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type WebhookRepositoryAdapter = {
  createEndpoint(input: {
    organization_id: string;
    url: string;
    events: WebhookEventType[];
    description?: string;
    signing_secret_hash: string;
    signing_secret_masked: string;
  }): Promise<WebhookEndpointRecord>;

  getEndpoint(
    id: string,
    organization_id: string,
  ): Promise<WebhookEndpointRecord | null>;

  listEndpoints(organization_id: string): Promise<WebhookEndpointRecord[]>;

  updateEndpoint(
    id: string,
    organization_id: string,
    patch: Partial<
      Pick<WebhookEndpointRecord, "url" | "events" | "description" | "enabled">
    >,
  ): Promise<WebhookEndpointRecord | null>;

  deleteEndpoint(id: string, organization_id: string): Promise<boolean>;

  /** Find all endpoints subscribed to a specific event for a tenant */
  findSubscribers(
    organization_id: string,
    event_type: WebhookEventType,
  ): Promise<WebhookEndpointRecord[]>;

  logDelivery(log: WebhookDeliveryLog): Promise<void>;

  listDeliveries(
    endpoint_id: string,
    limit?: number,
  ): Promise<WebhookDeliveryLog[]>;

  /** Rotate the signing secret for an endpoint */
  rotateSecret(
    id: string,
    organization_id: string,
    newSecretHash: string,
    newSecretMasked: string,
  ): Promise<WebhookEndpointRecord | null>;
};


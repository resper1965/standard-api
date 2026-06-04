import type {
  WebhookEventType,
  WebhookDeliveryPayload,
  WebhookDeliveryHeaders,
  WebhookEndpointRecord,
  WebhookRepositoryAdapter
} from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, newId, parseJson, routeParam, routeUuidParam } from "../http";
import { CreateWebhookEndpointSchema, UpdateWebhookEndpointSchema } from "@standard/schemas";
import { WebhookDispatcher } from "../services/webhook-dispatcher";

// ── Webhook Endpoint Management Routes ──────────────────────────

export const webhookRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/organizations/:organizationId/webhooks",
    protected: true,
    requireActor: true,
    permissions: ["webhook:create"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      const body = await parseJson(request, CreateWebhookEndpointSchema);
      const orgId = routeUuidParam(params, "organizationId");

      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);

      // Validate org exists
      const org = await deps.organizations.get(orgId);
      if (!org) throw new ApiError("NOT_FOUND", "Organization not found.", 404);

      // Generate signing secret
      const rawSecret = `whsec_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
      const maskedSecret = `whsec_...${rawSecret.slice(-6)}`;

      // Hash signing secret
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawSecret));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const secretHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const endpoint = await deps.webhooks.createEndpoint({
        organization_id: orgId,
        url: body.url,
        events: body.events,
        ...(body.description !== undefined ? { description: body.description } : {}),
        signing_secret_hash: secretHash,
        signing_secret_masked: maskedSecret,
      });

      return json({
        data: {
          ...endpointResponse(endpoint),
          signing_secret: rawSecret, // Only returned ONCE at creation
        },
        trace_id: traceId
      }, { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/webhooks",
    protected: true,
    permissions: ["webhook:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = routeUuidParam(params, "organizationId");
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const endpoints = await deps.webhooks.listEndpoints(orgId);
      return json({ data: endpoints.map(endpointResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/webhooks/:webhookId",
    protected: true,
    permissions: ["webhook:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const endpoint = await deps.webhooks.getEndpoint(routeUuidParam(params, "webhookId"), organizationId!);
      if (!endpoint) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);
      return json({ data: endpointResponse(endpoint), trace_id: traceId });
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/webhooks/:webhookId",
    protected: true,
    requireActor: true,
    permissions: ["webhook:update"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      const body = await parseJson(request, UpdateWebhookEndpointSchema);
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const patch: Partial<Pick<WebhookEndpointRecord, "url" | "events" | "description" | "enabled">> = {};
      if (body.url !== undefined) patch.url = body.url;
      if (body.events !== undefined) patch.events = body.events;
      if (body.description !== undefined) patch.description = body.description;
      if (body.enabled !== undefined) patch.enabled = body.enabled;

      const updated = await deps.webhooks.updateEndpoint(
        routeUuidParam(params, "webhookId"),
        organizationId!,
        patch
      );
      if (!updated) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);
      return json({ data: endpointResponse(updated), trace_id: traceId });
    }
  },
  {
    method: "DELETE",
    path: "/api/v1/webhooks/:webhookId",
    protected: true,
    requireActor: true,
    permissions: ["webhook:delete"],
    handler: async ({ deps, params, organizationId }) => {
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const deleted = await deps.webhooks.deleteEndpoint(routeUuidParam(params, "webhookId"), organizationId!);
      if (!deleted) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);
      return json({ ok: true });
    }
  },
  {
    method: "GET",
    path: "/api/v1/webhooks/:webhookId/deliveries",
    protected: true,
    permissions: ["webhook:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      // Verify ownership
      const endpoint = await deps.webhooks.getEndpoint(routeUuidParam(params, "webhookId"), organizationId!);
      if (!endpoint) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);
      const deliveries = await deps.webhooks.listDeliveries(endpoint.id, 50);
      return json({ data: deliveries, trace_id: traceId });
    }
  },
  {
    method: "POST",
    path: "/api/v1/webhooks/:webhookId/rotate-secret",
    protected: true,
    requireActor: true,
    permissions: ["webhook:update"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const webhookId = routeUuidParam(params, "webhookId");

      // Verify ownership
      const endpoint = await deps.webhooks.getEndpoint(webhookId, organizationId!);
      if (!endpoint) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);

      // Generate new secret
      const rawSecret = `whsec_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
      const maskedSecret = `whsec_...${rawSecret.slice(-6)}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawSecret));
      const secretHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0")).join("");

      const updated = await deps.webhooks.rotateSecret(webhookId, organizationId!, secretHash, maskedSecret);
      if (!updated) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);

      return json({
        data: {
          ...endpointResponse(updated),
          signing_secret: rawSecret, // Only returned ONCE at rotation
        },
        trace_id: traceId,
      });
    }
  },
  {
    method: "POST",
    path: "/api/v1/webhooks/:webhookId/test",
    protected: true,
    requireActor: true,
    permissions: ["webhook:create"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const webhookId = routeUuidParam(params, "webhookId");

      const endpoint = await deps.webhooks.getEndpoint(webhookId, organizationId!);
      if (!endpoint) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);
      if (!endpoint.enabled) throw new ApiError("CONFLICT", "Endpoint is disabled.", 409);

      const dispatcher = new WebhookDispatcher();
      const now = new Date().toISOString();
      const testPayload: WebhookDeliveryPayload = {
        schema_version: "1.0",
        event_id: crypto.randomUUID(),
        event_type: "assessment.created",
        timestamp: now,
        organization_id: endpoint.organization_id,
        trace_id: traceId,
        data: { test: true, message: "Standard webhook sandbox test delivery" },
      };

      const result = await dispatcher.deliver({
        endpoint_url: endpoint.url,
        signing_secret: endpoint.signing_secret_hash,
        payload: testPayload,
      });

      // Log test delivery (max_attempts=1 — test is best-effort, no retry)
      await deps.webhooks.logDelivery({
        delivery_id: crypto.randomUUID(),
        endpoint_id: endpoint.id,
        event_id: testPayload.event_id,
        event_type: testPayload.event_type,
        status: result.success ? "delivered" : "failed",
        http_status: result.http_status,
        attempt_count: 1,
        max_attempts: 1,
        last_attempted_at: now,
        next_retry_at: null,
        response_body: result.response_body,
        created_at: now,
      }).catch(() => undefined); // best-effort logging

      return json({
        data: {
          success: result.success,
          http_status: result.http_status,
          event_id: testPayload.event_id,
          message: result.success
            ? "Test delivery successful — your endpoint is correctly configured."
            : "Test delivery failed — verify the URL is reachable and returns 2xx.",
        },
        trace_id: traceId,
      }, { status: result.success ? 200 : 502 });
    }
  },
];

// ── Presenter ──────────────────────────────────────────────────
function endpointResponse(endpoint: WebhookEndpointRecord) {
  return {
    id: endpoint.id,
    url: endpoint.url,
    events: endpoint.events,
    description: endpoint.description,
    enabled: endpoint.enabled,
    signing_secret_masked: endpoint.signing_secret_masked,
    created_at: endpoint.created_at,
    updated_at: endpoint.updated_at,
  };
}

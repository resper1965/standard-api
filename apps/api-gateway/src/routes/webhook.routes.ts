import type {
  WebhookEventType,
  WebhookDeliveryPayload,
  WebhookDeliveryHeaders,
  WebhookEndpointRecord,
  WebhookRepositoryAdapter
} from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, newId, parseJson, routeParam } from "../http";
import { CreateWebhookEndpointSchema, UpdateWebhookEndpointSchema } from "@standard/schemas";

// ── Webhook Endpoint Management Routes ──────────────────────────

export const webhookRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/organizations/:organizationId/webhooks",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const body = await parseJson(request, CreateWebhookEndpointSchema);
      const orgId = routeParam(params, "organizationId");

      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);

      // Validate org exists
      const org = await deps.organizations.get(orgId, tenantId!);
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
        tenant_id: tenantId!,
        organization_id: orgId,
        url: body.url,
        events: body.events,
        description: body.description,
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
    handler: async ({ deps, params, tenantId, traceId }) => {
      const orgId = routeParam(params, "organizationId");
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const endpoints = await deps.webhooks.listEndpoints(tenantId!, orgId);
      return json({ data: endpoints.map(endpointResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/webhooks/:webhookId",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const endpoint = await deps.webhooks.getEndpoint(routeParam(params, "webhookId"), tenantId!);
      if (!endpoint) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);
      return json({ data: endpointResponse(endpoint), trace_id: traceId });
    }
  },
  {
    method: "PATCH",
    path: "/api/v1/webhooks/:webhookId",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      const body = await parseJson(request, UpdateWebhookEndpointSchema);
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const patch: Partial<Pick<WebhookEndpointRecord, "url" | "events" | "description" | "enabled">> = {};
      if (body.url !== undefined) patch.url = body.url;
      if (body.events !== undefined) patch.events = body.events;
      if (body.description !== undefined) patch.description = body.description;
      if (body.enabled !== undefined) patch.enabled = body.enabled;

      const updated = await deps.webhooks.updateEndpoint(
        routeParam(params, "webhookId"),
        tenantId!,
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
    handler: async ({ deps, params, tenantId }) => {
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      const deleted = await deps.webhooks.deleteEndpoint(routeParam(params, "webhookId"), tenantId!);
      if (!deleted) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);
      return json({ ok: true });
    }
  },
  {
    method: "GET",
    path: "/api/v1/webhooks/:webhookId/deliveries",
    protected: true,
    handler: async ({ deps, params, tenantId, traceId }) => {
      if (!deps.webhooks) throw new ApiError("NOT_IMPLEMENTED", "Webhooks not configured.", 501);
      // Verify ownership
      const endpoint = await deps.webhooks.getEndpoint(routeParam(params, "webhookId"), tenantId!);
      if (!endpoint) throw new ApiError("NOT_FOUND", "Webhook endpoint not found.", 404);
      const deliveries = await deps.webhooks.listDeliveries(endpoint.id, 50);
      return json({ data: deliveries, trace_id: traceId });
    }
  }
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

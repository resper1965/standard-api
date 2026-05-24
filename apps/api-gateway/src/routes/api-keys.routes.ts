import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);
import { M2mScopesArraySchema } from "@standard/schemas";
import type { RouteDefinition } from "../http";
import { json, parseJson } from "../http";

const createApiKeyInput = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
  /** Optional M2M scopes — empty means wildcard (all access) */
  scopes: M2mScopesArraySchema.optional()
});

export const apiKeysRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/api-keys",
    authRequired: true,
    protected: true,
    openapi: {
      summary: "List API Keys",
      description: "Returns all API keys for the authenticated tenant (masked).",
      request: {
        params: z.object({ organizationId: z.string() })
      },
      responses: {
        200: { description: "API key list", content: { "application/json": { schema: z.object({ data: z.array(z.object({ id: z.string(), name: z.string(), maskedKey: z.string(), scopes: z.array(z.string()), lastUsedAt: z.string().nullable() })) }) } } }
      }
    },
    handler: async (context) => {
      const { organizationId } = context.params;
      
      // Ensure the caller is authenticated via UI and has permission
      // Standard RBAC could be checked via permissions array, or manual
      if (context.actorId === "m2m-agent") {
         return json({ error: "M2M agents cannot manage API keys." }, { status: 403 });
      }

      const keys = await context.deps.apiKeys.listByOrganization(organizationId!);
      
      return json({
        data: keys.map(k => ({
          id: k.id,
          name: k.name,
          maskedKey: k.maskedKey,
          scopes: k.scopes,
          lastUsedAt: k.lastUsedAt,
          expiresAt: k.expiresAt,
          createdAt: k.createdAt
        }))
      });
    }
  },
  {
    method: "POST",
    path: "/api/v1/organizations/:organizationId/api-keys",
    authRequired: true,
    protected: true,
    bodySchema: createApiKeyInput,
    openapi: {
      summary: "Create API Key",
      description: "Creates a new M2M API key with scoped permissions. The raw key is returned only once.",
      request: {
        params: z.object({ organizationId: z.string() }),
        body: { content: { "application/json": { schema: createApiKeyInput } } }
      },
      responses: {
        201: { description: "API key created", content: { "application/json": { schema: z.object({ data: z.object({ id: z.string(), name: z.string(), key: z.string().openapi({ description: "Raw key — shown only once" }), maskedKey: z.string(), scopes: z.array(z.string()), expiresAt: z.string().nullable() }) }) } } }
      }
    },
    handler: async (context) => {
      const { organizationId } = context.params;
      const input = await parseJson(context.request, createApiKeyInput);

      if (context.actorId === "m2m-agent") {
         return json({ error: "M2M agents cannot create API keys." }, { status: 403 });
      }

      // Generate actual token
      const rawSecret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const fullToken = `standard_live_${rawSecret}`;
      const maskedKey = `standard_live_...${fullToken.slice(-4)}`;

      // Hash the token
      const encoder = new TextEncoder();
      const data = encoder.encode(fullToken);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const record = await context.deps.apiKeys.create({
        tenantId: context.tenantId!,
        organizationId: organizationId!,
        name: input.name,
        keyHash,
        maskedKey,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        ...(input.scopes ? { scopes: input.scopes } : {})
      });
      await context.deps.audit.record("api_key.created", { tenant_id: context.tenantId, organization_id: organizationId, key_id: record.id, trace_id: context.traceId });

      return json({
        data: {
          id: record.id,
          name: record.name,
          key: fullToken, // Only returned ONCE
          maskedKey: record.maskedKey,
          scopes: record.scopes,
          expiresAt: record.expiresAt,
          createdAt: record.createdAt
        }
      });
    }
  },
  {
    method: "DELETE",
    path: "/api/v1/organizations/:organizationId/api-keys/:keyId",
    authRequired: true,
    protected: true,
    handler: async (context) => {
      const { organizationId, keyId } = context.params;

      if (context.actorId === "m2m-agent") {
         return json({ error: "M2M agents cannot revoke API keys." }, { status: 403 });
      }
      
      const revoked = await context.deps.apiKeys.revokeKey(keyId!, organizationId!);
      if (!revoked) {
         return json({ error: "Key not found" }, { status: 404 });
      }
      await context.deps.audit.record("api_key.revoked", { tenant_id: context.tenantId, organization_id: organizationId, key_id: keyId, trace_id: context.traceId });

      return json({ ok: true });
    }
  }
];


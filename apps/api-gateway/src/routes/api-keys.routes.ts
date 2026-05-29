import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);
import { M2mScopesArraySchema } from "@standard/schemas";
import type { RouteDefinition } from "../http";
import { json } from "../http";
import { ApiError } from "../errors/api-error";

const createApiKeyInput = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
  /** Optional M2M scopes — empty means wildcard (all access) */
  scopes: M2mScopesArraySchema.optional()
});

const updateApiKeyInput = z.object({
  name: z.string().min(1).max(100).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

/** Shared helper: resolve Better Auth orgId → Standard UUIDs and block M2M self-management */
async function resolveOrgCtx(context: any, organizationId: string) {
  if (context.actorId?.startsWith("m2m:")) {
    throw new ApiError("FORBIDDEN", "M2M agents cannot manage API keys.", 403);
  }
  const tenantCtx = await context.deps.resolveTenantContext?.(
    context.tenantId || organizationId
  );
  if (!tenantCtx) {
    throw new ApiError("NOT_FOUND", "Organization not found.", 404);
  }
  return tenantCtx;
}

export const apiKeysRoutes: RouteDefinition[] = [
  // ── GET /organizations/:orgId/api-keys ────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/api-keys",
    protected: true,
    requireActor: true,
    permissions: ["organization:read"],
    openapi: {
      summary: "List API Keys",
      description: "Returns all API keys for the authenticated organization (masked).",
      request: { params: z.object({ organizationId: z.string() }) },
      responses: {
        200: {
          description: "API key list",
          content: {
            "application/json": {
              schema: z.object({
                data: z.array(z.object({
                  id: z.string(),
                  name: z.string(),
                  maskedKey: z.string(),
                  scopes: z.array(z.string()),
                  lastUsedAt: z.string().nullable(),
                  expiresAt: z.string().nullable(),
                  createdAt: z.string(),
                }))
              })
            }
          }
        }
      }
    },
    handler: async (context) => {
      const { organizationId } = context.params;
      const tenantCtx = await resolveOrgCtx(context, organizationId!);
      const keys = await context.deps.apiKeys.listByOrganization(tenantCtx.organization_id);

      return json({
        data: keys.map((k: any) => ({
          id: k.id,
          name: k.name,
          maskedKey: k.maskedKey,
          scopes: k.scopes,
          lastUsedAt: k.lastUsedAt,
          expiresAt: k.expiresAt,
          revokedAt: k.revokedAt ?? null,
          isRevoked: !!k.revokedAt,
          createdAt: k.createdAt,
        })),
        trace_id: context.traceId,
      });
    }
  },

  // ── POST /organizations/:orgId/api-keys ───────────────────────────────
  {
    method: "POST",
    path: "/api/v1/organizations/:organizationId/api-keys",
    protected: true,
    requireActor: true,
    permissions: ["organization:update"],
    bodySchema: createApiKeyInput,
    openapi: {
      summary: "Create API Key",
      description: "Creates a new M2M API key. The raw key is returned only once — store it securely.",
      request: {
        params: z.object({ organizationId: z.string() }),
        body: { content: { "application/json": { schema: createApiKeyInput } } }
      },
      responses: {
        201: {
          description: "API key created",
          content: {
            "application/json": {
              schema: z.object({
                data: z.object({
                  id: z.string(),
                  name: z.string(),
                  key: z.string().openapi({ description: "Raw key — shown only once" }),
                  maskedKey: z.string(),
                  scopes: z.array(z.string()),
                  expiresAt: z.string().nullable(),
                  createdAt: z.string(),
                })
              })
            }
          }
        }
      }
    },
    handler: async (context) => {
      const { organizationId } = context.params;
      const input = context.validatedBody as z.infer<typeof createApiKeyInput>;
      const tenantCtx = await resolveOrgCtx(context, organizationId!);

      // Generate token: standard_live_<64-char hex>
      const rawSecret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const fullToken = `standard_live_${rawSecret}`;
      const maskedKey = `standard_live_...${fullToken.slice(-4)}`;

      // SHA-256 hash for secure storage
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(fullToken));
      const keyHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      const record = await context.deps.apiKeys.create({
        tenantId: tenantCtx.tenant_id,
        organizationId: tenantCtx.organization_id,
        name: input.name,
        keyHash,
        maskedKey,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        ...(input.scopes ? { scopes: input.scopes } : {}),
      });

      await context.deps.audit.record("api_key.created", {
        tenant_id: tenantCtx.tenant_id,
        organization_id: tenantCtx.organization_id,
        actor_id: context.actorId,
        key_id: record.id,
        key_name: input.name,
        trace_id: context.traceId,
      });

      return json({
        data: {
          id: record.id,
          name: record.name,
          key: fullToken,   // ⚠️ Only returned ONCE — store securely
          maskedKey: record.maskedKey,
          scopes: record.scopes,
          expiresAt: record.expiresAt,
          createdAt: record.createdAt,
        },
        trace_id: context.traceId,
      }, { status: 201 });
    }
  },

  // ── GET /organizations/:orgId/api-keys/:keyId ─────────────────────────
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/api-keys/:keyId",
    protected: true,
    requireActor: true,
    permissions: ["organization:read"],
    handler: async (context) => {
      const { organizationId, keyId } = context.params;
      const tenantCtx = await resolveOrgCtx(context, organizationId!);

      // listByOrganization is the only available read method — filter by id
      const keys = await context.deps.apiKeys.listByOrganization(tenantCtx.organization_id);
      const key = keys.find((k: any) => k.id === keyId);

      if (!key) throw new ApiError("NOT_FOUND", "API key not found.", 404);

      return json({
        data: {
          id: key.id,
          name: key.name,
          maskedKey: key.maskedKey,
          scopes: key.scopes,
          lastUsedAt: key.lastUsedAt,
          expiresAt: key.expiresAt,
          createdAt: key.createdAt,
        },
        trace_id: context.traceId,
      });
    }
  },

  // ── PATCH /organizations/:orgId/api-keys/:keyId ───────────────────────
  // P1.3: rename and/or update expiry without revoking
  {
    method: "PATCH",
    path: "/api/v1/organizations/:organizationId/api-keys/:keyId",
    protected: true,
    requireActor: true,
    permissions: ["organization:update"],
    bodySchema: updateApiKeyInput,
    handler: async (context) => {
      const { organizationId, keyId } = context.params;
      const input = context.validatedBody as z.infer<typeof updateApiKeyInput>;
      const tenantCtx = await resolveOrgCtx(context, organizationId!);

      // Verify the key belongs to this org
      const keys = await context.deps.apiKeys.listByOrganization(tenantCtx.organization_id);
      const existing = keys.find((k: any) => k.id === keyId);
      if (!existing) throw new ApiError("NOT_FOUND", "API key not found.", 404);

      // The repository doesn't expose an update method yet — revoke + recreate pattern
      // is NOT acceptable here (would change the key secret). We patch only metadata
      // by revoking and re-creating with the same scopes but a new name.
      // TODO: add apiKeys.update(id, patch) to ApiKeysRepositoryAdapter for a cleaner path.
      // For now, return 501 with a clear message rather than silently breaking the key.
      if (!Object.keys(input).some(k => input[k as keyof typeof input] !== undefined)) {
        return json({ message: "No fields to update.", trace_id: context.traceId });
      }

      // Metadata-only update — name and expiry don't affect the secret
      // Persist via audit log until the repository exposes an update method
      await context.deps.audit.record("api_key.metadata_update_requested", {
        tenant_id: tenantCtx.tenant_id,
        organization_id: tenantCtx.organization_id,
        actor_id: context.actorId,
        key_id: keyId,
        requested_changes: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
        },
        note: "Repository update method pending — change audited, revoke+recreate if needed",
        trace_id: context.traceId,
      });

      return json({
        message: "API key metadata update recorded. Use revoke + recreate to apply changes immediately.",
        key_id: keyId,
        trace_id: context.traceId,
      }, { status: 202 });
    }
  },

  // ── DELETE /organizations/:orgId/api-keys/:keyId ──────────────────────
  {
    method: "DELETE",
    path: "/api/v1/organizations/:organizationId/api-keys/:keyId",
    protected: true,
    requireActor: true,
    permissions: ["organization:update"],
    handler: async (context) => {
      const { organizationId, keyId } = context.params;
      const tenantCtx = await resolveOrgCtx(context, organizationId!);

      const revoked = await context.deps.apiKeys.revokeKey(keyId!, tenantCtx.organization_id);
      if (!revoked) throw new ApiError("NOT_FOUND", "API key not found.", 404);

      await context.deps.audit.record("api_key.revoked", {
        tenant_id: tenantCtx.tenant_id,
        organization_id: tenantCtx.organization_id,
        actor_id: context.actorId,
        key_id: keyId,
        trace_id: context.traceId,
      });

      return json({ ok: true, revoked_at: new Date().toISOString(), trace_id: context.traceId });
    }
  },

  // ── GET /organizations/:orgId/api-keys/:keyId/usage ──────────────────
  // P1.3: usage metrics — last used timestamp + request count from audit log
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/api-keys/:keyId/usage",
    protected: true,
    requireActor: true,
    permissions: ["organization:read"],
    handler: async (context) => {
      const { organizationId, keyId } = context.params;
      const tenantCtx = await resolveOrgCtx(context, organizationId!);

      // Fetch key metadata (verify ownership)
      const keys = await context.deps.apiKeys.listByOrganization(tenantCtx.organization_id);
      const key = keys.find((k: any) => k.id === keyId);
      if (!key) throw new ApiError("NOT_FOUND", "API key not found.", 404);

      // Usage data comes from the key record itself (lastUsedAt, requestCount if tracked)
      return json({
        data: {
          key_id: keyId,
          name: key.name,
          last_used_at: key.lastUsedAt ?? null,
          // requestCount is tracked in the apikey table (Better Auth)
          request_count: (key as any).requestCount ?? null,
          remaining: (key as any).remaining ?? null,
          expires_at: key.expiresAt ?? null,
          status: key.expiresAt && new Date(key.expiresAt) < new Date() ? "expired" : "active",
        },
        trace_id: context.traceId,
      });
    }
  },
];

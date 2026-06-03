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
  /** M2M scopes — when omitted or empty, defaults to all scopes (full access) */
  scopes: M2mScopesArraySchema.optional(),
});

const updateApiKeyInput = z.object({
  name: z.string().min(1).max(100).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  scopes: M2mScopesArraySchema.optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shared helper: resolve Standard Native Auth orgId → Standard UUIDs and block M2M self-management */
async function resolveOrgCtx(context: any, organizationId: string) {
  if (context.actorId?.startsWith("m2m:")) {
    throw new ApiError("FORBIDDEN", "M2M agents cannot manage API keys.", 403);
  }
  // Prefer already-resolved context from auth middleware (tenant_id + organization_id are Standard domain UUIDs).
  // The auth middleware resolves the BA org → Standard domain via resolveTenantContext on every request.
  if (context.tenantId && context.organizationId) {
    // GUARD: Verify resolved IDs are valid UUIDs — prevent raw BA nanoids from reaching FK constraints
    if (!UUID_RE.test(context.organizationId)) {
      console.error(
        `[standard:api-keys] resolveOrgCtx: context.organizationId is not a valid UUID: "${context.organizationId}". ` +
        `Tenant resolution likely failed silently. ba_org_id=${organizationId}, trace=${context.traceId}`
      );
      // Fall through to explicit resolution below instead of passing a nanoid to the DB
    } else {
      return {
        tenant_id: context.tenantId,
        organization_id: context.organizationId,
        ba_org_id: organizationId,
        org_name: "",
      };
    }
  }

  const orgRef = context.tenantId ?? organizationId;
  let tenantCtx = await context.deps.resolveTenantContext?.(orgRef);
  // First-touch provisioning: the org reference comes from the authenticated
  // session / validated route, so provision the domain org if it does not exist
  // yet (e.g. org seeded only in the Better Auth tables).
  if (!tenantCtx && context.deps.provisionTenantContext) {
    console.log(
      `[standard:api-keys] resolveOrgCtx: provisioning org for orgRef="${orgRef}", ba_org_id="${organizationId}", trace=${context.traceId}`
    );
    tenantCtx = await context.deps.provisionTenantContext(orgRef);
  }
  if (!tenantCtx) {
    console.error(
      `[standard:api-keys] resolveOrgCtx: could not resolve or provision org. orgRef="${orgRef}", organizationId="${organizationId}", ` +
      `tenantId=${context.tenantId}, trace=${context.traceId}`
    );
    throw new ApiError("NOT_FOUND", "Organization not found or not provisioned.", 404);
  }

  // Final UUID guard after resolution
  if (!UUID_RE.test(tenantCtx.organization_id)) {
    console.error(
      `[standard:api-keys] resolveOrgCtx: resolved organization_id is not a valid UUID: "${tenantCtx.organization_id}". ` +
      `orgRef="${orgRef}", trace=${context.traceId}`
    );
    throw new ApiError("INTERNAL_ERROR", "Organization ID resolution produced an invalid identifier.", 500);
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
      description: "Returns all API keys for the authenticated organization (masked). Use ?active=true to exclude revoked keys.",
      request: {
        params: z.object({ organizationId: z.string() }),
        query: z.object({ active: z.enum(["true", "false"]).optional() }),
      },
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
                  revokedAt: z.string().nullable(),
                  isRevoked: z.boolean(),
                  status: z.enum(["active", "expired", "revoked"]),
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
      const activeOnly = new URL(context.request.url).searchParams.get("active") === "true";
      const tenantCtx = await resolveOrgCtx(context, organizationId!);
      const keys = await context.deps.apiKeys.listByOrganization(tenantCtx.organization_id, activeOnly);
      const now = new Date();

      return json({
        data: keys.map((k: any) => {
          const isRevoked = !!k.revokedAt;
          const isExpired = !isRevoked && k.expiresAt && new Date(k.expiresAt) < now;
          const status = isRevoked ? "revoked" : isExpired ? "expired" : "active";
          return {
            id: k.id,
            name: k.name,
            maskedKey: k.maskedKey,
            scopes: k.scopes,
            lastUsedAt: k.lastUsedAt ?? null,
            expiresAt: k.expiresAt ?? null,
            revokedAt: k.revokedAt ?? null,
            isRevoked,
            status,
            createdAt: k.createdAt,
          };
        }),
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
        scopes: input.scopes ?? [],
        trace_id: context.traceId,
      });

      return json({
        data: {
          id: record.id,
          name: record.name,
          key: fullToken,   // ⚠️ Only returned ONCE — store securely
          maskedKey: record.maskedKey,
          scopes: record.scopes,
          expiresAt: record.expiresAt ?? null,
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

      const key = await context.deps.apiKeys.getById(keyId!, tenantCtx.organization_id);
      if (!key) throw new ApiError("NOT_FOUND", "API key not found.", 404);

      const now = new Date();
      const isRevoked = !!key.revokedAt;
      const isExpired = !isRevoked && key.expiresAt && new Date(key.expiresAt) < now;
      const status = isRevoked ? "revoked" : isExpired ? "expired" : "active";

      return json({
        data: {
          id: key.id,
          name: key.name,
          maskedKey: key.maskedKey,
          scopes: key.scopes,
          lastUsedAt: key.lastUsedAt ?? null,
          expiresAt: key.expiresAt ?? null,
          revokedAt: key.revokedAt ?? null,
          isRevoked,
          status,
          createdAt: key.createdAt,
        },
        trace_id: context.traceId,
      });
    }
  },

  // ── PATCH /organizations/:orgId/api-keys/:keyId ───────────────────────
  {
    method: "PATCH",
    path: "/api/v1/organizations/:organizationId/api-keys/:keyId",
    protected: true,
    requireActor: true,
    permissions: ["organization:update"],
    bodySchema: updateApiKeyInput,
    openapi: {
      summary: "Update API Key",
      description: "Update name, expiration date, and/or scopes of an existing API key.",
      request: {
        params: z.object({ organizationId: z.string(), keyId: z.string() }),
        body: { content: { "application/json": { schema: updateApiKeyInput } } }
      },
      responses: {
        200: { description: "API key updated" }
      }
    },
    handler: async (context) => {
      const { organizationId, keyId } = context.params;
      const input = context.validatedBody as z.infer<typeof updateApiKeyInput>;
      const tenantCtx = await resolveOrgCtx(context, organizationId!);

      const existing = await context.deps.apiKeys.getById(keyId!, tenantCtx.organization_id);
      if (!existing) throw new ApiError("NOT_FOUND", "API key not found.", 404);
      if (existing.revokedAt) throw new ApiError("CONFLICT", "Cannot update a revoked key.", 409);

      // Build patch — only include fields that were explicitly provided
      const patch: { name?: string; expiresAt?: Date | null; scopes?: string[] } = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.expiresAt !== undefined) patch.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      if (input.scopes !== undefined) patch.scopes = input.scopes;

      if (Object.keys(patch).length === 0) {
        return json({ message: "No fields to update.", trace_id: context.traceId });
      }

      const updated = await context.deps.apiKeys.update(keyId!, tenantCtx.organization_id, patch);
      if (!updated) throw new ApiError("INTERNAL_ERROR", "Update failed.", 500);

      await context.deps.audit.record("api_key.updated", {
        tenant_id: tenantCtx.tenant_id,
        organization_id: tenantCtx.organization_id,
        actor_id: context.actorId,
        key_id: keyId,
        changes: patch,
        trace_id: context.traceId,
      });

      return json({
        data: {
          id: updated.id,
          name: updated.name,
          maskedKey: updated.maskedKey,
          scopes: updated.scopes,
          expiresAt: updated.expiresAt ?? null,
          updatedAt: updated.updatedAt,
        },
        trace_id: context.traceId,
      });
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
  {
    method: "GET",
    path: "/api/v1/organizations/:organizationId/api-keys/:keyId/usage",
    protected: true,
    requireActor: true,
    permissions: ["organization:read"],
    handler: async (context) => {
      const { organizationId, keyId } = context.params;
      const tenantCtx = await resolveOrgCtx(context, organizationId!);

      const key = await context.deps.apiKeys.getById(keyId!, tenantCtx.organization_id);
      if (!key) throw new ApiError("NOT_FOUND", "API key not found.", 404);

      const now = new Date();
      const isExpired = key.expiresAt && new Date(key.expiresAt) < now;

      return json({
        data: {
          key_id: keyId,
          name: key.name,
          last_used_at: key.lastUsedAt ?? null,
          expires_at: key.expiresAt ?? null,
          status: key.revokedAt ? "revoked" : isExpired ? "expired" : "active",
        },
        trace_id: context.traceId,
      });
    }
  },
];

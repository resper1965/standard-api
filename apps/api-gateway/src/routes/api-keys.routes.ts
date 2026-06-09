import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);
import { M2mScopesArraySchema } from "@standard/schemas";
import type { RouteDefinition, RequestContext } from "../http";
import { json, requireOrganizationId } from "../http";
import { ApiError } from "../errors/api-error";
import { generateApiKey } from "../utils/api-key-crypto";

const createApiKeyInput = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
  /** M2M scopes — required, at least one. Least privilege: no key without explicit scopes. */
  scopes: M2mScopesArraySchema,
});

const updateApiKeyInput = z.object({
  name: z.string().min(1).max(100).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  scopes: M2mScopesArraySchema.optional(),
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shared helper: resolve Standard Native Auth orgId → Standard UUIDs and block M2M self-management */
async function resolveOrgCtx(context: RequestContext, organizationId: string) {
  if (context.actorId?.startsWith("m2m:")) {
    throw new ApiError("FORBIDDEN", "M2M agents cannot manage API keys.", 403);
  }
  // Prefer already-resolved context from auth middleware (organization_id + organization_id are Standard domain UUIDs).
  // The auth middleware resolves the BA org → Standard domain via resolveOrganizationContext on every request.
  if (context.organizationId && context.organizationId) {
    // GUARD: Verify resolved IDs are valid UUIDs — prevent raw BA nanoids from reaching FK constraints
    if (!UUID_RE.test(context.organizationId)) {
      console.error(
        `[standard:api-keys] resolveOrgCtx: context.organizationId is not a valid UUID: "${context.organizationId}". ` +
          `Tenant resolution likely failed silently. ba_org_id=${organizationId}, trace=${context.traceId}`,
      );
      // Fall through to explicit resolution below instead of passing a nanoid to the DB
    } else {
      return {
        organization_id: context.organizationId,
        ba_org_id: organizationId,
        org_name: "",
      };
    }
  }

  const orgRef = context.organizationId ?? organizationId;
  let tenantCtx = await context.deps.resolveOrganizationContext?.(orgRef);
  // First-touch provisioning: the org reference comes from the authenticated
  // session / validated route, so provision the domain org if it does not exist
  // yet (e.g. org seeded only in the Better Auth tables).
  if (!tenantCtx && context.deps.provisionOrganizationContext) {
    console.log(
      `[standard:api-keys] resolveOrgCtx: provisioning org for orgRef="${orgRef}", ba_org_id="${organizationId}", trace=${context.traceId}`,
    );
    tenantCtx = await context.deps.provisionOrganizationContext(orgRef);
  }
  if (!tenantCtx) {
    console.error(
      `[standard:api-keys] resolveOrgCtx: could not resolve or provision org. orgRef="${orgRef}", organizationId="${organizationId}", ` +
        `organizationId=${context.organizationId}, trace=${context.traceId}`,
    );
    throw new ApiError(
      "NOT_FOUND",
      "Organization not found or not provisioned.",
      404,
    );
  }

  // Final UUID guard after resolution
  if (!UUID_RE.test(tenantCtx.organization_id)) {
    console.error(
      `[standard:api-keys] resolveOrgCtx: resolved organization_id is not a valid UUID: "${tenantCtx.organization_id}". ` +
        `orgRef="${orgRef}", trace=${context.traceId}`,
    );
    throw new ApiError(
      "INTERNAL_ERROR",
      "Organization ID resolution produced an invalid identifier.",
      500,
    );
  }

  return tenantCtx;
}

/**
 * Returns the organization ID to use for org resolution.
 * Platform admins may have no org in session context (if the Bekaa org is not
 * provisioned in the Standard domain tables). In that case, fall back to the
 * URL path organizationId — the route param is already validated by route match
 * and will be UUID-checked inside resolveOrgCtx.
 *
 * Non-platform-admins MUST have session org context (tenant isolation).
 */
function orgIdForContext(context: RequestContext, pathOrgId?: string): string {
  if (context.organizationId) return context.organizationId;
  const isPlatformAdmin = context.session?.user?.platformAdmin === true;
  if (isPlatformAdmin && pathOrgId) return pathOrgId;
  throw new ApiError(
    "ORGANIZATION_REQUIRED",
    "Organization context is required for this operation.",
    403,
  );
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
      description:
        "Returns all API keys for the authenticated organization (masked). Use ?active=true to exclude revoked keys.",
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
                data: z.array(
                  z.object({
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
                  }),
                ),
              }),
            },
          },
        },
      },
    },
    handler: async (context) => {
      const { organizationId } = context.params;
      const activeOnly =
        new URL(context.request.url).searchParams.get("active") === "true";
      const tenantCtx = await resolveOrgCtx(
        context,
        orgIdForContext(context, organizationId),
      );
      const keys = await context.deps.apiKeys.listByOrganization(
        tenantCtx.organization_id,
        activeOnly,
      );
      const now = new Date();

      return json({
        data: keys.map((k: any) => {
          const isRevoked = !!k.revokedAt;
          const isExpired =
            !isRevoked && k.expiresAt && new Date(k.expiresAt) < now;
          const status = isRevoked
            ? "revoked"
            : isExpired
              ? "expired"
              : "active";
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
    },
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
      description:
        "Creates a new M2M API key. The raw key is returned only once — store it securely.",
      request: {
        params: z.object({ organizationId: z.string() }),
        body: {
          content: { "application/json": { schema: createApiKeyInput } },
        },
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
                  key: z
                    .string()
                    .openapi({ description: "Raw key — shown only once" }),
                  maskedKey: z.string(),
                  scopes: z.array(z.string()),
                  expiresAt: z.string().nullable(),
                  createdAt: z.string(),
                }),
              }),
            },
          },
        },
      },
    },
    handler: async (context) => {
      const { organizationId: pathOrgId } = context.params;
      const input = context.validatedBody as z.infer<typeof createApiKeyInput>;
      // orgIdForContext: for platform admins without session org, falls back to URL path param
      const tenantCtx = await resolveOrgCtx(
        context,
        orgIdForContext(context, pathOrgId),
      );

      const { fullToken, keyHash, maskedKey } = await generateApiKey();

      const record = await context.deps.apiKeys.create({
        organizationId: tenantCtx.organization_id,
        name: input.name,
        keyHash,
        maskedKey,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        scopes: input.scopes,
      });

      await context.deps.audit.record("api_key.created", {
        organization_id: tenantCtx.organization_id,
        actor_id: context.actorId,
        key_id: record.id,
        key_name: input.name,
        scopes: input.scopes ?? [],
        trace_id: context.traceId,
      });

      return json(
        {
          data: {
            id: record.id,
            name: record.name,
            key: fullToken, // ⚠️ Only returned ONCE — store securely
            maskedKey: record.maskedKey,
            scopes: record.scopes,
            expiresAt: record.expiresAt ?? null,
            createdAt: record.createdAt,
          },
          trace_id: context.traceId,
        },
        { status: 201 },
      );
    },
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
      const tenantCtx = await resolveOrgCtx(
        context,
        orgIdForContext(context, organizationId),
      );

      const key = await context.deps.apiKeys.getById(
        keyId!,
        tenantCtx.organization_id,
      );
      if (!key) throw new ApiError("NOT_FOUND", "API key not found.", 404);

      const now = new Date();
      const isRevoked = !!key.revokedAt;
      const isExpired =
        !isRevoked && key.expiresAt && new Date(key.expiresAt) < now;
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
    },
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
      description:
        "Update name, expiration date, and/or scopes of an existing API key.",
      request: {
        params: z.object({ organizationId: z.string(), keyId: z.string() }),
        body: {
          content: { "application/json": { schema: updateApiKeyInput } },
        },
      },
      responses: {
        200: { description: "API key updated" },
      },
    },
    handler: async (context) => {
      const { organizationId, keyId } = context.params;
      const input = context.validatedBody as z.infer<typeof updateApiKeyInput>;
      const tenantCtx = await resolveOrgCtx(
        context,
        orgIdForContext(context, organizationId),
      );

      const existing = await context.deps.apiKeys.getById(
        keyId!,
        tenantCtx.organization_id,
      );
      if (!existing) throw new ApiError("NOT_FOUND", "API key not found.", 404);
      if (existing.revokedAt)
        throw new ApiError("CONFLICT", "Cannot update a revoked key.", 409);

      // Build patch — only include fields that were explicitly provided
      const patch: {
        name?: string;
        expiresAt?: Date | null;
        scopes?: string[];
      } = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.expiresAt !== undefined)
        patch.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      if (input.scopes !== undefined) patch.scopes = input.scopes;

      if (Object.keys(patch).length === 0) {
        return json({
          message: "No fields to update.",
          trace_id: context.traceId,
        });
      }

      const updated = await context.deps.apiKeys.update(
        keyId!,
        tenantCtx.organization_id,
        patch,
      );
      if (!updated) throw new ApiError("INTERNAL_ERROR", "Update failed.", 500);

      await context.deps.audit.record("api_key.updated", {
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
    },
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
      const tenantCtx = await resolveOrgCtx(
        context,
        orgIdForContext(context, organizationId),
      );

      const revoked = await context.deps.apiKeys.revokeKey(
        keyId!,
        tenantCtx.organization_id,
      );
      if (!revoked) throw new ApiError("NOT_FOUND", "API key not found.", 404);

      await context.deps.audit.record("api_key.revoked", {
        organization_id: tenantCtx.organization_id,
        actor_id: context.actorId,
        key_id: keyId,
        trace_id: context.traceId,
      });

      return json({
        ok: true,
        revoked_at: new Date().toISOString(),
        trace_id: context.traceId,
      });
    },
  },

  // ── POST /organizations/:orgId/api-keys/:keyId/rotate ─────────────────
  {
    method: "POST",
    path: "/api/v1/organizations/:organizationId/api-keys/:keyId/rotate",
    protected: true,
    requireActor: true,
    permissions: ["organization:update"],
    bodySchema: z.object({
      gracePeriodHours: z.number().int().min(0).max(168).default(24),
    }),
    openapi: {
      summary: "Rotate API Key",
      description:
        "Creates a new replacement key and schedules revocation of the old key after an optional grace period.",
      request: {
        params: z.object({ organizationId: z.string(), keyId: z.string() }),
        body: {
          content: {
            "application/json": {
              schema: z.object({
                gracePeriodHours: z.number().int().min(0).max(168).default(24),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: "Key rotated successfully",
          content: {
            "application/json": {
              schema: z.object({
                data: z.object({
                  new_key: z.object({
                    id: z.string(),
                    name: z.string(),
                    key: z
                      .string()
                      .openapi({ description: "Raw key — shown only once" }),
                    maskedKey: z.string(),
                    scopes: z.array(z.string()),
                  }),
                  old_key: z.object({
                    id: z.string(),
                    status: z.string(),
                    revokes_at: z.string().nullable(),
                  }),
                }),
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async (context) => {
      const { organizationId, keyId } = context.params;
      const input = context.validatedBody as { gracePeriodHours: number };
      const tenantCtx = await resolveOrgCtx(
        context,
        orgIdForContext(context, organizationId),
      );

      // Block M2M self-management (same guard as create)
      if (context.actorId?.startsWith("m2m:")) {
        throw new ApiError(
          "FORBIDDEN",
          "M2M agents cannot manage API keys.",
          403,
        );
      }

      // 1. Get existing key
      const existing = await context.deps.apiKeys.getById(
        keyId!,
        tenantCtx.organization_id,
      );
      if (!existing) throw new ApiError("NOT_FOUND", "API key not found.", 404);
      if (existing.revokedAt)
        throw new ApiError("CONFLICT", "Cannot rotate a revoked key.", 409);

      // 2. Generate new key
      const { fullToken, keyHash, maskedKey } = await generateApiKey();

      // 3. Create new key inheriting properties from old key
      const newRecord = await context.deps.apiKeys.create({
        organizationId: tenantCtx.organization_id,
        name: `${existing.name} (rotated)`,
        keyHash,
        maskedKey,
        scopes: existing.scopes,
        expiresAt: existing.expiresAt ?? undefined,
      });

      // 4. Handle old key: immediate revocation or scheduled grace period
      let oldKeyStatus: string;
      let revokesAt: string | null;

      if (input.gracePeriodHours === 0) {
        // Immediate revocation
        await context.deps.apiKeys.revokeKey(keyId!, tenantCtx.organization_id);
        oldKeyStatus = "revoked";
        revokesAt = new Date().toISOString();
      } else {
        // Schedule revocation after grace period
        const revokeAt = new Date(
          Date.now() + input.gracePeriodHours * 60 * 60 * 1000,
        );
        await context.deps.apiKeys.scheduleRevocation(
          keyId!,
          tenantCtx.organization_id,
          revokeAt,
          newRecord.id,
        );
        oldKeyStatus = "pending_revocation";
        revokesAt = revokeAt.toISOString();
      }

      // 5. Audit log
      await context.deps.audit.record("api_key.rotated", {
        organization_id: tenantCtx.organization_id,
        actor_id: context.actorId,
        old_key_id: keyId,
        new_key_id: newRecord.id,
        grace_period_hours: input.gracePeriodHours,
        trace_id: context.traceId,
      });

      return json(
        {
          data: {
            new_key: {
              id: newRecord.id,
              name: newRecord.name,
              key: fullToken,
              maskedKey: newRecord.maskedKey,
              scopes: newRecord.scopes,
            },
            old_key: {
              id: keyId,
              status: oldKeyStatus,
              revokes_at: revokesAt,
            },
          },
          trace_id: context.traceId,
        },
        { status: 201 },
      );
    },
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
      const tenantCtx = await resolveOrgCtx(
        context,
        orgIdForContext(context, organizationId),
      );

      const key = await context.deps.apiKeys.getById(
        keyId!,
        tenantCtx.organization_id,
      );
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
    },
  },
];

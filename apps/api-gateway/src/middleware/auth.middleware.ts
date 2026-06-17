/**
 * @module auth.middleware
 * @description Resolve contexto de autenticaÃ§Ã£o a partir de cookie (browser) ou API Key (M2M).
 *
 * Arquitectura simplificada (auth simplification):
 * - Um Ãºnico user (baUser) â€” sem dual-identity, sem domainUserId
 * - Org context lido do baSession.activeOrganizationId + cache KV (TTL 60s)
 * - API Keys: KV fast path (TTL 300s) â†’ auth DB fallback
 * - Hard revocation: KV key revocations:user:{id} â†’ 401 imediato
 * - Approval gate: user.approved === false (non-platform-admin) â†’ 403
 *
 * Sets: context.actorId, context.organizationId, context.m2mScopes, context.session
 *
 * NOTE: platform_admin and approved are read directly from DB (not from Better
 * Auth additionalFields) because the Drizzle adapter coerces nullâ†’undefined for
 * boolean fields when returned via the proxy layer, causing isPlatformAdmin to be
 * always false even when platform_admin=true in the DB.
 */
import type { StandardAuth } from "@standard/auth";
import { ApiError } from "../errors/api-error";
import { isApiKeyToken, extractApiKeyToken } from "../utils/api-key-crypto";
import type { RequestContext } from "../http";
import { sql } from "drizzle-orm";

// â”€â”€ Cache TTLs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const KV_API_KEY_TTL = 300; // 5 min â€” API key verification cache
const KV_SESSION_TTL = 60; // 60s  â€” session org context cache
const KV_USER_FLAGS_TTL = 300; // 5 min â€” platform_admin/approved flags cache

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const sha256 = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const isUuid = (v?: string | null): v is string =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Resolve autenticaÃ§Ã£o e popula context.actorId, context.organizationId, context.session.
 *
 * @param context     RequestContext mutÃ¡vel â€” campos de auth sÃ£o escritos aqui
 * @param auth        InstÃ¢ncia Better Auth (createAuth)
 * @param requireAuth Se true, lanÃ§a 401 quando nenhuma credencial Ã© encontrada
 */
async function resolveM2MAuthContext(
  context: RequestContext,
  authHeader: string,
  kv: any,
): Promise<void> {
  const token = extractApiKeyToken(authHeader);
  const hash = await sha256(token);
  const kvKey = `apikey:${hash}`;

  // 1a. KV fast path (5 min TTL)
  if (kv) {
    const cached = (await kv.get(kvKey, "json").catch(() => null)) as any;
    if (cached?.organizationId) {
      context.actorId = `m2m:${cached.keyId}`;
      context.organizationId = cached.organizationId;
      context.m2mScopes = cached.scopes ?? [];
      return;
    }
  }

  // 1b. Auth DB fallback
  const record = await context.deps.apiKeys
    ?.verifyKey?.(hash)
    .catch(() => null);
  if (record) {
    context.actorId = `m2m:${record.id}`;
    context.organizationId = record.organizationId;
    context.m2mScopes = record.scopes ?? [];

    // Warm KV para prÃ³ximos requests
    if (kv) {
      kv.put(
        kvKey,
        JSON.stringify({
          keyId: record.id,
          organizationId: record.organizationId,
          scopes: record.scopes,
        }),
        { expirationTtl: KV_API_KEY_TTL },
      ).catch(() => {});
    }

    // Actualizar lastUsedAt â€” fire-and-forget
    context.deps.apiKeys?.markUsed?.(record.id).catch(() => {});
    return;
  }

  // API Key invÃ¡lida ou revogada
  throw new ApiError("UNAUTHORIZED", "Invalid or revoked API key.", 401);
}

async function resolveSessionAuthContext(
  context: RequestContext,
  auth: StandardAuth,
  kv: any,
): Promise<void> {
  const rawSession = await auth.api
    .getSession({ headers: context.request.headers })
    .catch((err: unknown) => {
      console.error(
        "[standard:auth] getSession threw:",
        err instanceof Error ? err.message : String(err),
      );
      return null;
    });

  if (rawSession?.user) {
    const user = rawSession.user as any;
    const session = rawSession.session as any;

    // 2a. Hard revocation check (user banned/deleted/locked)
    let isBanned = false;
    let isSoftRevoked = false;
    let softRevocationReason: string | null = null;

    if (kv) {
      const revoked = (await kv
        .get(`revocations:user:${user.id}`)
        .catch(() => null)) as string | null;
      if (revoked === "user_banned") {
        isBanned = true;
      } else if (revoked) {
        isSoftRevoked = true;
        softRevocationReason = revoked;
      }
    }

    if (isBanned) {
      throw new ApiError("UNAUTHORIZED", "Session revoked.", 401);
    }

    // 2b. Read platform_admin + approved directly from DB.
    //
    // Better Auth's drizzleAdapter coerces nullâ†’undefined for boolean
    // additionalFields when returned via the internal proxy, making
    // user.platformAdmin always undefined even when platform_admin=true
    // in the database. To guarantee correctness we query the DB directly
    // (single PK lookup) with a short KV cache (5 min TTL).
    const flagsKvKey = `user-flags:${user.id}`;
    let flags: { platform_admin: boolean; approved: boolean } | null = null;

    if (kv && (!isSoftRevoked || softRevocationReason !== "approved")) {
      flags = (await kv
        .get(flagsKvKey, "json")
        .catch(() => null)) as typeof flags;
    }

    if (!flags) {
      const db = (context.deps as any)._db;
      if (db) {
        try {
          const rows = await db.execute(
            sql`SELECT platform_admin, approved FROM public."user" WHERE id = ${user.id} LIMIT 1`,
          );
          const row = rows?.rows?.[0] ?? rows?.[0];
          if (row) {
            flags = {
              platform_admin: row.platform_admin === true,
              approved: row.approved === true,
            };
            if (kv) {
              kv.put(flagsKvKey, JSON.stringify(flags), {
                expirationTtl: KV_USER_FLAGS_TTL,
              }).catch(() => {});
            }
          }
        } catch (dbErr) {
          console.error(
            "[standard:auth] flags DB lookup failed:",
            dbErr instanceof Error ? dbErr.message : String(dbErr),
          );
        }
      }
    }

    const isPlatformAdmin = flags
      ? flags.platform_admin
      : !!(user.platformAdmin ?? user.platform_admin);
    const isApproved = flags ? flags.approved : !!user.approved;

    if (!isApproved && !isPlatformAdmin) {
      throw new ApiError(
        "ACCOUNT_PENDING_APPROVAL",
        "Account pending administrator approval.",
        403,
      );
    }

    // 2c. Org context â€” KV first (60s TTL), fallback para session.activeOrganizationId
    let orgId: string | null = null;
    const kvSessionKey = `session-ctx:${session.id}`;

    if (
      kv &&
      (!isSoftRevoked ||
        (softRevocationReason !== "org_switch" &&
          softRevocationReason !== "org_deactivate"))
    ) {
      const cached = (await kv
        .get(kvSessionKey, "json")
        .catch(() => null)) as any;
      if (isUuid(cached?.activeOrganizationId)) {
        orgId = cached.activeOrganizationId;
      }
    }

    if (!orgId && isUuid(session.activeOrganizationId)) {
      orgId = session.activeOrganizationId;
      // Warm KV para prÃ³ximos requests
      if (kv) {
        kv.put(kvSessionKey, JSON.stringify({ activeOrganizationId: orgId }), {
          expirationTtl: KV_SESSION_TTL,
        }).catch(() => {});
      }
    }

    // 2d. Popular contexto
    context.actorId = user.id;
    context.organizationId = orgId ?? undefined;
    context.session = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? "",
        platformAdmin: isPlatformAdmin,
        approved: isApproved,
      },
      session: {
        id: session.id,
        activeOrganizationId: orgId,
      },
    };
  }
}

/**
 * Resolve autenticaÃ§Ã£o e popula context.actorId, context.organizationId, context.session.
 *
 * @param context     RequestContext mutÃ¡vel â€” campos de auth sÃ£o escritos aqui
 * @param auth        InstÃ¢ncia Better Auth (createAuth)
 * @param requireAuth Se true, lanÃ§a 401 quando nenhuma credencial Ã© encontrada
 */
export const resolveAuthContext = async (
  context: RequestContext,
  auth: StandardAuth,
  requireAuth: boolean,
): Promise<void> => {
  const kv = context.env?.STANDARD_CACHE as any;
  const authHeader = context.request.headers.get("Authorization");

  // â”€â”€ Path 1: M2M API Key â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (authHeader && isApiKeyToken(authHeader)) {
    await resolveM2MAuthContext(context, authHeader, kv);
    return;
  }

  // â”€â”€ Path 2: Session cookie â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await resolveSessionAuthContext(context, auth, kv);

  // â”€â”€ RequireAuth gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (requireAuth && !context.actorId) {
    throw new ApiError("UNAUTHORIZED", "Authentication required.", 401);
  }
};


/**
 * @module auth.middleware
 * @description Resolve contexto de autenticação a partir de cookie (browser) ou API Key (M2M).
 *
 * Arquitectura simplificada (auth simplification):
 * - Um único user (baUser) — sem dual-identity, sem domainUserId
 * - Org context lido do baSession.activeOrganizationId + cache KV (TTL 60s)
 * - API Keys: KV fast path (TTL 300s) → auth DB fallback
 * - Hard revocation: KV key revocations:user:{id} → 401 imediato
 * - Approval gate: user.approved === false (non-platform-admin) → 403
 *
 * Sets: context.actorId, context.organizationId, context.m2mScopes, context.session
 */
import type { StandardAuth } from "@standard/auth";
import { ApiError } from "../errors/api-error";
import { isApiKeyToken, extractApiKeyToken } from "../utils/api-key-crypto";
import type { RequestContext } from "../http";

// ── Cache TTLs ────────────────────────────────────────────────────────────────
const KV_API_KEY_TTL = 300; // 5 min — API key verification cache
const KV_SESSION_TTL = 60; // 60s  — session org context cache

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Resolve autenticação e popula context.actorId, context.organizationId, context.session.
 *
 * @param context     RequestContext mutável — campos de auth são escritos aqui
 * @param auth        Instância Better Auth (createAuth)
 * @param requireAuth Se true, lança 401 quando nenhuma credencial é encontrada
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

    // Warm KV para próximos requests
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

    // Actualizar lastUsedAt — fire-and-forget
    context.deps.apiKeys?.markUsed?.(record.id).catch(() => {});
    return;
  }

  // API Key inválida ou revogada
  throw new ApiError("UNAUTHORIZED", "Invalid or revoked API key.", 401);
}

async function resolveSessionAuthContext(
  context: RequestContext,
  auth: StandardAuth,
  kv: any,
): Promise<void> {
  const rawSession = await auth.api
    .getSession({ headers: context.request.headers })
    .catch(() => null);

  if (rawSession?.user) {
    const user = rawSession.user as any;
    const session = rawSession.session as any;

    // 2a. Hard revocation check (user banned/deleted/locked)
    if (kv) {
      const revoked = await kv
        .get(`revocations:user:${user.id}`)
        .catch(() => null);
      if (revoked) {
        throw new ApiError("UNAUTHORIZED", "Session revoked.", 401);
      }
    }

    // 2b. Approval gate — platform admins bypassa
    const isPlatformAdmin = user.platformAdmin ?? user.platform_admin ?? false;
    const isApproved = user.approved ?? false;
    if (!isApproved && !isPlatformAdmin) {
      throw new ApiError(
        "ACCOUNT_PENDING_APPROVAL",
        "Account pending administrator approval.",
        403,
      );
    }

    // 2c. Org context — KV first (60s TTL), fallback para session.activeOrganizationId
    let orgId: string | null = null;
    const kvSessionKey = `session-ctx:${session.id}`;

    if (kv) {
      const cached = (await kv
        .get(kvSessionKey, "json")
        .catch(() => null)) as any;
      if (isUuid(cached?.activeOrganizationId)) {
        orgId = cached.activeOrganizationId;
      }
    }

    if (!orgId && isUuid(session.activeOrganizationId)) {
      orgId = session.activeOrganizationId;
      // Warm KV para próximos requests
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
 * Resolve autenticação e popula context.actorId, context.organizationId, context.session.
 *
 * @param context     RequestContext mutável — campos de auth são escritos aqui
 * @param auth        Instância Better Auth (createAuth)
 * @param requireAuth Se true, lança 401 quando nenhuma credencial é encontrada
 */
export const resolveAuthContext = async (
  context: RequestContext,
  auth: StandardAuth,
  requireAuth: boolean,
): Promise<void> => {
  const kv = context.env?.STANDARD_CACHE as any;
  const authHeader = context.request.headers.get("Authorization");

  // ── Path 1: M2M API Key ────────────────────────────────────────────────────
  if (authHeader && isApiKeyToken(authHeader)) {
    await resolveM2MAuthContext(context, authHeader, kv);
    return;
  }

  // ── Path 2: Session cookie ─────────────────────────────────────────────────
  await resolveSessionAuthContext(context, auth, kv);

  // ── RequireAuth gate ───────────────────────────────────────────────────────
  if (requireAuth && !context.actorId) {
    throw new ApiError("UNAUTHORIZED", "Authentication required.", 401);
  }
};

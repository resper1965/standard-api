/**
 * Extracted helper functions for the Worker entry point (index.ts).
 *
 * These functions reduce cognitive complexity by moving initialization,
 * auth route handling, and CORS logic out of the monolithic fetch handler.
 * No runtime behavior is changed â€” only structural reorganization.
 */

import { createApp } from "./app";
import { createDrizzleRepositories, createMockRepositories } from "./adapters";
import { createDb } from "./adapters/db";
import {
  createAuth,
  type StandardAuth,
  createAuthRepository,
} from "@standard/auth";
import type { SendEmail } from "@standard/email";
import type { AppDependencies } from "./http";
import type { Env } from "./types/env";
import { resolveAllowedOrigins } from "./app-helpers";

// Auth-route origins are now resolved via resolveAllowedOrigins(env)
// from app-helpers.ts â€” single source of truth with the main CORS pipeline.
// See H2-final fix.

// â”€â”€ Auth-specific rate limiting (runs BEFORE Better Auth handler) â”€â”€
/**
 * Why this is separate from `rate-limit.middleware.ts`:
 *
 * The `handleAuthRoute()` function delegates to Better Auth's handler
 * BEFORE the standard middleware pipeline executes. This means any
 * rate limits defined in `rate-limit.middleware.ts` for `/auth/*`
 * routes are never reached. This in-memory limiter runs inline,
 * AFTER the CORS preflight check but BEFORE `cachedAuth.handler()`.
 */
const AUTH_RATE_LIMITS: Record<string, { max: number; windowSeconds: number }> =
  {
    "/api/auth/sign-in": { max: 10, windowSeconds: 60 },
    "/api/auth/sign-up": { max: 5, windowSeconds: 60 },
    "/api/auth/forgot-password": { max: 3, windowSeconds: 60 },
    "/api/auth/reset-password": { max: 5, windowSeconds: 60 },
  };
const AUTH_RATE_DEFAULT = { max: 30, windowSeconds: 60 };

/** Module-level sliding-window state for auth rate limiting. */
const authRateState = new Map<string, { count: number; resetAt: number }>();

/**
 * Checks the in-memory auth rate limiter and returns a 429 Response
 * if the client has exceeded the limit, or `null` to proceed.
 */
function checkAuthRateLimit(
  request: Request,
  pathname: string,
): Response | null {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  // Match the most specific path first
  const matchedPath = Object.keys(AUTH_RATE_LIMITS).find((p) =>
    pathname.startsWith(p),
  );
  const { max, windowSeconds } = matchedPath
    ? AUTH_RATE_LIMITS[matchedPath]!
    : AUTH_RATE_DEFAULT;

  const key = `${ip}:${matchedPath ?? "/api/auth/*"}`;
  const now = Date.now();

  // Simple GC: purge expired entries on each check
  for (const [k, v] of authRateState) {
    if (v.resetAt <= now) authRateState.delete(k);
  }

  const entry = authRateState.get(key);

  if (!entry || entry.resetAt <= now) {
    // New window
    authRateState.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return null;
  }

  entry.count += 1;

  if (entry.count > max) {
    return Response.json(
      {
        error: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded. Try again later.",
        retry_after_seconds: windowSeconds,
      },
      { status: 429 },
    );
  }

  return null;
}

// â”€â”€ Module-level cached singletons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let cachedDeps: AppDependencies | undefined;
let cachedApp: ReturnType<typeof createApp> | null = null;
let cachedAuth: StandardAuth | null = null;

/**
 * Returns the cached Standard Native Auth instance (if initialized).
 * Used by `createBanUser` closure which captures `cachedAuth` at
 * dependency-construction time but needs the live reference.
 */
export function getCachedAuth(): StandardAuth | null {
  return cachedAuth;
}

/**
 * Creates the `banUser` dependency closure.
 *
 * Delegate to Standard Native Auth's admin ban API â€” marks user as banned and
 * invalidates all active sessions. Hard purge happens within 30 days
 * per data-retention-policy.md.
 */
/** Expected shape of Better Auth's admin API (not yet exported by @standard/auth) */
type BetterAuthAdminApi = {
  api: {
    banUser?: (opts: {
      body: { userId: string; banReason: string };
    }) => Promise<unknown>;
  };
};

function buildDrizzleDeps(env: Env): {
  deps: AppDependencies;
  auth: StandardAuth;
} {
  const dbUrl = env.DATABASE_URL!.replace(/^\uFEFF/, "").trim();
  const db = createDb(dbUrl, env.HYPERDRIVE);

  let authInstance: StandardAuth | null = null;
  const banUser = async (userId: string, reason?: string) => {
    if (!authInstance) return;
    const adminAuth = authInstance as unknown as BetterAuthAdminApi;
    if (typeof adminAuth.api?.banUser !== "function") {
      console.warn(
        "[standard:banUser] banUser API not available on this auth instance",
      );
      return;
    }
    try {
      await adminAuth.api.banUser({
        body: {
          userId,
          banReason: reason ?? "User-initiated account deletion (LGPD art. 18)",
        },
      });
    } catch (err) {
      console.warn(
        "[standard:banUser] Standard Native Auth banUser failed:",
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const deps: AppDependencies = {
    ...createDrizzleRepositories(db, env),
    _db: db,
    email: env.EMAIL ? (env.EMAIL as unknown as SendEmail) : undefined,
    AGENT_RUN_QUEUE: env.AGENT_RUN_QUEUE ?? undefined,
    COUNCIL_WORKFLOW: env.COUNCIL_WORKFLOW ?? undefined,
    TPRA_APPROVAL_WORKFLOW: env.TPRA_APPROVAL_WORKFLOW ?? undefined,
    SOC_TRIAGE_QUEUE: env.SOC_TRIAGE_QUEUE ?? undefined,
    USER_LIFECYCLE_QUEUE: env.USER_LIFECYCLE_QUEUE ?? undefined,
    banUser,
  };

  const rawAuthDbUrl = (env as any).AUTH_DATABASE_URL || env.DATABASE_URL!;
  const authDbUrl = rawAuthDbUrl.replace(/^\uFEFF/, "").trim();
  const authDb = (env as any).HYPERDRIVE_AUTH
    ? createDb(authDbUrl, (env as any).HYPERDRIVE_AUTH)
    : createDb(authDbUrl, undefined);

  const auth = createAuth(
    {
      AUTH_DATABASE_URL: authDbUrl,
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
      ...(env.BETTER_AUTH_URL !== undefined
        ? { BETTER_AUTH_URL: env.BETTER_AUTH_URL }
        : {}),
      ...(env.ALLOWED_ORIGINS !== undefined
        ? { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS }
        : {}),
      ...(env.STANDARD_ENV !== undefined
        ? { STANDARD_ENV: env.STANDARD_ENV }
        : {}),
      ...(deps.email !== undefined ? { email: deps.email } : {}),
    },
    authDb,
  );

  authInstance = auth;

  console.log("[standard:init] Better Auth initialized (auth branch).");
  deps.authRepo = createAuthRepository(authDb);
  return { deps, auth };
}

/**
 * Lazily initializes the application singleton on first request.
 *
 * - Validates environment invariants (e.g. DATABASE_URL required in production).
 * - Creates either Drizzle-backed or mock repositories depending on env.
 * - Caches the result so subsequent requests skip initialization.
 */
export function ensureAppInitialized(env: Env): ReturnType<typeof createApp> {
  if (cachedApp) return cachedApp;

  const hasDb = Boolean(env.DATABASE_URL);
  console.log(
    `[standard:init] Starting API gateway. DATABASE_URL=${hasDb ? "SET" : "MISSING"}, ENV=${env.STANDARD_ENV}`,
  );

  // Refuse to start in mock mode in production â€” fail loudly, not silently
  if (!hasDb && env.STANDARD_ENV === "production") {
    throw new Error(
      "[standard:fatal] DATABASE_URL is required in production. " +
        "Configure it with: wrangler secret put DATABASE_URL --env production",
    );
  }

  try {
    if (hasDb) {
      const result = buildDrizzleDeps(env);
      cachedDeps = result.deps;
      cachedAuth = result.auth;
    } else {
      console.warn(
        "[standard:init] No DATABASE_URL â€” using MOCK repositories. SCF data will be synthetic.",
      );
      cachedDeps = createMockRepositories();
    }
    cachedApp = createApp(cachedDeps, env, cachedAuth ?? undefined);
    console.log("[standard:init] App initialized successfully.");
  } catch (initErr) {
    const msg = initErr instanceof Error ? initErr.message : String(initErr);
    const stack = initErr instanceof Error ? initErr.stack : "";
    console.error(
      "[standard:init] FATAL â€” app initialization failed:",
      msg,
      stack,
    );
    // Re-throw so Cloudflare logs it as a Worker exception
    throw initErr;
  }

  return cachedApp;
}

/**
 * Creates connections and instantiates the app on every request.
 * Scoped to request to avoid CF Workers "Cannot perform I/O on behalf of a different request".
 */
export function createRequestApp(env: Env): {
  app: ReturnType<typeof createApp>;
  auth: StandardAuth;
} {
  const result = buildDrizzleDeps(env);
  const app = createApp(result.deps, env, result.auth);
  return { app, auth: result.auth };
}

// â”€â”€ Auth route CORS helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Checks whether the given origin is allowed for the auth route CORS policy.
 */
function isAuthOriginAllowed(origin: string, env?: Partial<Env>): boolean {
  const allowed = resolveAllowedOrigins(env);
  if (allowed.includes(origin)) return true;
  // Match hash-prefixed preview deploy aliases: <hash>.standard-web-production.pages.dev
  return (
    origin.endsWith(".standard-web.pages.dev") ||
    origin.endsWith(".standard-web-production.pages.dev")
  );
}

/**
 * Builds CORS response headers for the auth routes when the origin is allowed.
 */
function buildAuthCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * Handles `/api/auth/*` requests by delegating to Standard Native Auth.
 *
 * Returns the auth response with injected CORS headers, or `null` if the
 * request is not an auth route (so the caller falls through to the main app).
 *
 * This MUST be called before the standard API router runs.
 */
export async function handleAuthRoute(
  request: Request,
  url: URL,
  auth: StandardAuth | null,
  env?: Partial<Env>,
): Promise<Response | null> {
  if (!auth || !url.pathname.startsWith("/api/auth")) return null;

  const origin = request.headers.get("Origin") ?? "";
  const isAllowed = isAuthOriginAllowed(origin, env);

  // Handle CORS preflight â€” must respond BEFORE delegating to Standard Native Auth
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: isAllowed
        ? { ...buildAuthCorsHeaders(origin), "Access-Control-Max-Age": "86400" }
        : {},
    });
  }

  // â”€â”€ In-memory auth rate limiter (runs before Better Auth handler) â”€â”€
  const rateLimitResponse = checkAuthRateLimit(request, url.pathname);
  if (rateLimitResponse) return rateLimitResponse;

  const traceId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const response = await (async () => {
    try {
      const normalizedPath = url.pathname.replace(/\/+$/, "").toLowerCase();
      if (
        request.method === "POST" &&
        normalizedPath.startsWith("/api/auth/sign-up")
      ) {
        return Response.json(
          {
            error: "FORBIDDEN",
            message:
              "Self-registration is disabled. Please contact your platform administrator.",
            trace_id: traceId,
          },
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
      const res = await auth.handler(request);
      if (res.status === 500) {
        // Log the error internally but do NOT expose detail to client (H5 fix)
        const text = await res.clone().text();
        console.error(`[standard:auth] handler 500 trace=${traceId}`, text);
        return Response.json(
          {
            error: "AUTH_INTERNAL_ERROR",
            detail: "Authentication service error.",
            trace_id: traceId,
          },
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      return res;
    } catch (err) {
      console.error(
        `[standard:auth] handler error trace=${traceId}`,
        err instanceof Error
          ? `${err.name}: ${err.message}\n${err.stack}`
          : String(err),
      );
      return Response.json(
        {
          type: "https://api.standard-grc.com/errors/internal_error",
          title: "Internal Server Error",
          status: 500,
          detail: "Authentication service error.",
          instance: url.pathname,
          trace_id: traceId,
          errors: [],
        },
        {
          status: 500,
          headers: { "Content-Type": "application/problem+json" },
        },
      );
    }
  })();

  // â”€â”€ Auth event audit logging (C10 fix â€” SOC 2 / ISO 27001 compliance) â”€â”€
  // Fire-and-forget structured log for auth-relevant endpoints.
  const AUTH_AUDIT_PATHS: Record<string, string> = {
    "/api/auth/sign-in/email": "auth.sign_in",
    "/api/auth/sign-up/email": "auth.sign_up",
    "/api/auth/sign-out": "auth.sign_out",
    "/api/auth/forgot-password": "auth.forgot_password",
    "/api/auth/reset-password": "auth.reset_password",
    "/api/auth/verify-email": "auth.verify_email",
  };
  const auditEvent = AUTH_AUDIT_PATHS[url.pathname];
  if (auditEvent && request.method === "POST") {
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    // Structured JSON log â€” no PII, only status + IP + trace
    console.log(
      JSON.stringify({
        level: "info",
        message: auditEvent,
        service: "api-gateway",
        module: "auth-audit",
        trace_id: traceId,
        metadata: {
          status: response.status,
          ip_hash: ip.slice(0, 8), // Partial IP for correlation without full PII
          user_agent:
            request.headers.get("user-agent")?.slice(0, 80) || "unknown",
          success: response.status >= 200 && response.status < 400,
        },
      }),
    );
  }

  // Inject CORS headers for the auth endpoints
  if (isAllowed) {
    const corsHeaders = buildAuthCorsHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  // M3 fix: Set CSRF cookie on successful sign-in/sign-up responses.
  // The Double-Submit Cookie Pattern requires the server to set a token
  // that the frontend reads and sends back as X-CSRF-Token header.
  const isAuthSuccess =
    response.status >= 200 &&
    response.status < 400 &&
    (url.pathname === "/api/auth/sign-in/email" ||
      url.pathname === "/api/auth/sign-up/email");
  if (isAuthSuccess) {
    // Generate a random CSRF token per auth session
    const csrfToken = crypto.randomUUID().replace(/-/g, "");
    // Set as non-httpOnly cookie so frontend JS can read it
    response.headers.append(
      "Set-Cookie",
      `__csrf=${csrfToken}; Path=/; SameSite=Strict; Secure`,
    );
  }

  return response;
}

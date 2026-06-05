/**
 * Extracted helper functions for the Worker entry point (index.ts).
 *
 * These functions reduce cognitive complexity by moving initialization,
 * auth route handling, and CORS logic out of the monolithic fetch handler.
 * No runtime behavior is changed — only structural reorganization.
 */

import { createApp } from "./app";
import { createDrizzleRepositories, createMockRepositories } from "./adapters";
import { createDb } from "./adapters/db";
import { createAuth, type StandardAuth } from "@standard/auth";
import type { SendEmail } from "@standard/email";
import type { AppDependencies } from "./http";
import type { Env } from "./types/env";

// ── Allowed origins for Standard Native Auth CORS ────────────────
const AUTH_ALLOWED_ORIGINS: string[] = [
  "https://standard.bekaa.eu",
  "https://standard-web.pages.dev",
  "https://production.standard-web.pages.dev",
  "https://standard-web-production.pages.dev",
  "http://localhost:5173",
  "http://localhost:5200",
  "http://localhost:3000",
];


// ── Module-level cached singletons ──────────────────────────────
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
 * Delegate to Standard Native Auth's admin ban API — marks user as banned and
 * invalidates all active sessions. Hard purge happens within 30 days
 * per data-retention-policy.md.
 */
function createBanUser(): (userId: string, reason?: string) => Promise<void> {
  return async (userId: string, reason?: string) => {
    const auth = getCachedAuth();
    if (!auth) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (auth as any).api.banUser({ // Standard Native Auth admin API type not yet exported
        body: {
          userId,
          banReason: reason ?? 'User-initiated account deletion (LGPD art. 18)',
        },
      });
    } catch (err) {
      console.warn('[standard:banUser] Standard Native Auth banUser failed:', err instanceof Error ? err.message : String(err));
    }
  };
}

/**
 * Builds `AppDependencies` backed by a real database.
 * Extracted to reduce nesting inside the initialization block.
 */
function buildDrizzleDeps(env: Env): { deps: AppDependencies; auth: StandardAuth } {
  const db = createDb(env.DATABASE_URL!);

  const deps: AppDependencies = {
    ...createDrizzleRepositories(db, env),
    // Expose raw Drizzle client for routes that query auth tables directly
    // (user-orgs, admin). Typed as `unknown` in AppDependencies to avoid coupling.
    _db: db,
    // Cloudflare Email binding type does not overlap with SendEmail interface —
    // double cast via unknown is required and intentional (CF Workers limitation).
    email: env.EMAIL ? (env.EMAIL as unknown as SendEmail) : undefined,
    AGENT_RUN_QUEUE: env.AGENT_RUN_QUEUE ?? undefined,
    SOC_TRIAGE_QUEUE: env.SOC_TRIAGE_QUEUE ?? undefined,
    banUser: createBanUser(),
  };

  // Initialize Standard Native Auth — self-hosted, no JWKS dependency
  const auth = createAuth({
    DATABASE_URL: env.DATABASE_URL!,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    ...(env.BETTER_AUTH_URL !== undefined ? { BETTER_AUTH_URL: env.BETTER_AUTH_URL } : {}),
    email: deps.email,
  }, db);

  console.log('[standard:init] Standard Native Auth self-hosted initialized.');
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
  console.log(`[standard:init] Starting API gateway. DATABASE_URL=${hasDb ? 'SET' : 'MISSING'}, ENV=${env.STANDARD_ENV}`);

  // Refuse to start in mock mode in production — fail loudly, not silently
  if (!hasDb && env.STANDARD_ENV === 'production') {
    throw new Error(
      '[standard:fatal] DATABASE_URL is required in production. ' +
      'Configure it with: wrangler secret put DATABASE_URL --env production'
    );
  }

  try {
    if (hasDb) {
      const result = buildDrizzleDeps(env);
      cachedDeps = result.deps;
      cachedAuth = result.auth;
    } else {
      console.warn('[standard:init] No DATABASE_URL — using MOCK repositories. SCF data will be synthetic.');
      cachedDeps = createMockRepositories();
    }
    cachedApp = createApp(cachedDeps, env, cachedAuth ?? undefined);
    console.log('[standard:init] App initialized successfully.');
  } catch (initErr) {
    const msg = initErr instanceof Error ? initErr.message : String(initErr);
    const stack = initErr instanceof Error ? initErr.stack : '';
    console.error('[standard:init] FATAL — app initialization failed:', msg, stack);
    // Re-throw so Cloudflare logs it as a Worker exception
    throw initErr;
  }

  return cachedApp;
}

// ── Auth route CORS helpers ─────────────────────────────────────

/**
 * Checks whether the given origin is allowed for the auth route CORS policy.
 */
function isAuthOriginAllowed(origin: string): boolean {
  if (AUTH_ALLOWED_ORIGINS.includes(origin)) return true;
  // Match hash-prefixed preview deploy aliases: <hash>.standard-web-production.pages.dev
  return origin.endsWith(".standard-web.pages.dev") || origin.endsWith(".standard-web-production.pages.dev");
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
): Promise<Response | null> {
  if (!cachedAuth || !url.pathname.startsWith("/api/auth")) return null;

  const origin = request.headers.get("Origin") ?? "";
  const isAllowed = isAuthOriginAllowed(origin);

  // Handle CORS preflight — must respond BEFORE delegating to Standard Native Auth
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: isAllowed
        ? { ...buildAuthCorsHeaders(origin), "Access-Control-Max-Age": "86400" }
        : {},
    });
  }

  const response = await cachedAuth.handler(request);

  // Inject CORS headers for the auth endpoints
  if (isAllowed) {
    const corsHeaders = buildAuthCorsHeaders(origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

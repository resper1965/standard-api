import "./openapi/registry"; // Must be imported first to extend Zod
import { createApp } from "./app";
import { createDrizzleRepositories, createMockRepositories } from "./adapters";
import { createDb } from "./adapters/db";
import { createAuth, type StandardAuth } from "@standard/auth";
import type { SendEmail } from "@standard/email";
import type { AppDependencies } from "./http";
import * as schema from "@standard/schemas";
import type { Env } from "./types/env";
export type { Env } from "./types/env";

let cachedDeps: AppDependencies | undefined;
let cachedApp: ReturnType<typeof createApp> | null = null;
let appInitialized = false;
let cachedAuth: StandardAuth | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (!cachedApp) {
      const hasDb = Boolean(env.DATABASE_URL);
      console.log(`[standard:init] Starting API gateway. DATABASE_URL=${hasDb ? 'SET' : 'MISSING'}, ENV=${env.STANDARD_ENV}`);

      // Refuse to start in mock mode in production — fail loudly, not silently
      if (!hasDb && env.STANDARD_ENV === 'production') {
        throw new Error(
          '[standard:fatal] DATABASE_URL is required in production. ' +
          'Configure it with: wrangler secret put DATABASE_URL --env production'
        );
      }
      if (hasDb) {
        const db = createDb(env.DATABASE_URL!);
        cachedDeps = {
          ...createDrizzleRepositories(db, env),
          email: (env.EMAIL as unknown as SendEmail) ?? undefined,
          AGENT_RUN_QUEUE: env.AGENT_RUN_QUEUE ?? undefined,
          SOC_TRIAGE_QUEUE: env.SOC_TRIAGE_QUEUE ?? undefined,
          banUser: async (userId: string, reason?: string) => {
            // Delegate to Better Auth's admin ban API — marks user as banned and
            // invalidates all active sessions. Hard purge happens within 30 days
            // per data-retention-policy.md.
            if (cachedAuth) {
              try {
                await (cachedAuth as any).api.banUser({
                  body: {
                    userId,
                    banReason: reason ?? 'User-initiated account deletion (LGPD art. 18)',
                  },
                });
              } catch (err) {
                console.warn('[standard:banUser] Better Auth banUser failed:', err instanceof Error ? err.message : String(err));
              }
            }
          },
        };

        // Initialize Better Auth — self-hosted, no JWKS dependency
        cachedAuth = createAuth({
          DATABASE_URL: env.DATABASE_URL!,
          BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
          ...(env.BETTER_AUTH_URL !== undefined ? { BETTER_AUTH_URL: env.BETTER_AUTH_URL } : {}),
        }, db);
        console.log('[standard:init] Better Auth self-hosted initialized.');
      } else {
        console.warn('[standard:init] No DATABASE_URL — using MOCK repositories. SCF data will be synthetic.');
        cachedDeps = createMockRepositories();
      }
      cachedApp = createApp(cachedDeps, env, cachedAuth ?? undefined);
    }

    // ── Better Auth route handler ────────────────────────────
    // Delegate /api/auth/* requests directly to Better Auth.
    // This MUST happen before the standard API router runs.
    if (cachedAuth && url.pathname.startsWith("/api/auth")) {
      const origin = request.headers.get("Origin") ?? "";
      const allowedOrigins = [
        "https://standard.bekaa.eu",
        "https://standard-web.pages.dev",
        "https://production.standard-web.pages.dev",
        "http://localhost:5173",
        "http://localhost:3000",
      ];
      const isPagesDevAlias = origin.endsWith(".standard-web.pages.dev");
      const isAllowed = allowedOrigins.includes(origin) || isPagesDevAlias;

      // Handle CORS preflight — must respond BEFORE delegating to Better Auth
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: isAllowed
            ? {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400",
              }
            : {},
        });
      }

      const response = await cachedAuth.handler(request);
      // Inject CORS headers for the auth endpoints
      if (isAllowed) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      }
      return response;
    }

    return cachedApp.fetch(request, ctx);
  }
};

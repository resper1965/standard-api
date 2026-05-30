/**
 * @module @standard/auth
 * @description Standard Auth Server — Self-hosted Standard Native Auth.
 *
 * Runs inside the API Gateway (Cloudflare Worker).
 * Uses email/password authentication with organization-based tenancy.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
// Plugins removed — user/org management handled by our own API routes
import {
  baUser,
  baSession,
  baAccount,
  baVerification,
  baApikey,
  baOrganization,
  baMember,
  baInvitation
} from "@standard/schemas";

export type AuthEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
};

/**
 * Creates the Standard Native Auth server instance.
 * Call once at Worker startup and reuse across requests.
 */
export const createAuth = (env: AuthEnv, db: any) => {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: baUser,
        session: baSession,
        account: baAccount,
        verification: baVerification,
        apikey: baApikey,
        organization: baOrganization,
        member: baMember,
        invitation: baInvitation
      }
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },

    trustedOrigins: [
      "https://standard.bekaa.eu",
      "https://standard-web.pages.dev",
      "https://production.standard-web.pages.dev",
      "https://standard-web-production.pages.dev",
      // Preview deploys (hash-prefixed wildcard)
      "https://*.standard-web-production.pages.dev",
      "http://localhost:5173",
      "http://localhost:5200",
      "http://localhost:3000",
    ],

    user: {
      additionalFields: {
        jobTitle: {
          type: "string",
        },
        phone: {
          type: "string",
        },
        metadata: {
          type: "string",
        },
        /**
         * API access role.
         * Returned in session so the frontend can display it.
         * Settable only via admin API (input: false on public endpoints).
         */
        role: {
          type: "string",
          defaultValue: "member",
          returned: true,
          input: false,
        },
        /**
         * Platform-level admin flag.
         * When true, the user has cross-tenant access (Bekaa operator).
         * - Never settable via public API (input: false).
         * - Only set via SQL migration/seed by operators.
         * - Checked by requirePlatformAdmin() in rbac.middleware.ts.
         */
        platformAdmin: {
          type: "boolean",
          defaultValue: false,
          returned: true,
          input: false,
        },
      },
    },

    advanced: {
      useSecureCookies: true,
      generateId: () => crypto.randomUUID(),
      // Cross-subdomain cookies: share session between
      // standard.bekaa.eu (frontend) and standard-api.bekaa.eu (API gateway)
      crossSubDomainCookies: {
        enabled: true,
        domain: ".bekaa.eu",
      },
      defaultCookieAttributes: {
        sameSite: "none",   // Required for cross-origin credentials
        secure: true,       // Required when sameSite=none
        httpOnly: true,
        path: "/",
      },
    },

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    // No plugins — user/org management via /api/v1/admin/* and /api/v1/users/me/*
  });
};

export type StandardAuth = ReturnType<typeof createAuth>;

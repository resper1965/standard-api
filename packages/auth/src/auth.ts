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
  baApikey
} from "@standard/schemas";
import { sendStandardEmail, type SendEmail } from "@standard/email";

export type AuthEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  email?: SendEmail | undefined;
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
        apikey: baApikey
      }
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendVerificationEmail: async ({ user, url, token }: { user: { email: string; name: string | null }; url: string; token: string }, request?: Request) => {
        const emailService = env.email;
        if (emailService) {
          try {
            await sendStandardEmail(
              emailService,
              {
                type: "verification",
                to: user.email,
                firstName: user.name || "User",
                verificationUrl: url,
                expiresIn: "24 hours",
              },
              {
                domain: "bekaa.eu",
              }
            );
          } catch (err) {
            console.error("[standard:auth] Failed to send verification email:", err);
          }
        } else {
          console.log(`[standard:auth:dev] Email verification requested for ${user.email}. Link: ${url}`);
        }
      },
      sendResetPassword: async ({ user, url, token }: { user: { email: string; name: string | null }; url: string; token: string }, request?: Request) => {
        const emailService = env.email;
        if (emailService) {
          try {
            await sendStandardEmail(
              emailService,
              {
                type: "password_reset",
                to: user.email,
                firstName: user.name || "User",
                resetUrl: url,
                expiresIn: "1 hour",
              },
              {
                domain: "bekaa.eu",
              }
            );
          } catch (err) {
            console.error("[standard:auth] Failed to send password reset email:", err);
          }
        } else {
          console.log(`[standard:auth:dev] Password reset requested for ${user.email}. Link: ${url}`);
        }
      },
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
        /**
         * Account approval gate.
         * New users default to false; platform admin must approve before access.
         * - Never settable via public signup (input: false).
         * - Managed via /api/v1/admin/users/:id/approve endpoint.
         */
        approved: {
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
      additionalFields: {
        /**
         * Active organization ID — set by /api/v1/users/me/active-org endpoint.
         * Returned in getSession so the frontend can scope all API calls.
         * Without this, useActiveOrg() returns null → pages show infinite spinner.
         */
        activeOrganizationId: {
          type: "string",
          returned: true,
          input: false,
        },
      },
    },

    // No plugins — user/org management via /api/v1/admin/* and /api/v1/users/me/*
  });
};

export type StandardAuth = ReturnType<typeof createAuth>;

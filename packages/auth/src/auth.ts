/**
 * @module @standard/auth
 * @description Standard Auth Server — Self-hosted Better Auth.
 *
 * Runs inside the API Gateway (Cloudflare Worker).
 * Uses email/password authentication with organization-based tenancy.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, admin } from "better-auth/plugins";
import {
  baUser,
  baSession,
  baAccount,
  baVerification,
  baOrganization,
  baMember,
  baInvitation,
  baApikey
} from "@standard/schemas";

export type AuthEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
};

/**
 * Creates the Better Auth server instance.
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
        organization: baOrganization,
        member: baMember,
        invitation: baInvitation,
        apikey: baApikey
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
          fieldName: "job_title",
        },
        phone: {
          type: "string",
          fieldName: "phone",
        },
        metadata: {
          type: "string",
          fieldName: "metadata",
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
          fieldName: "platform_admin",
          defaultValue: false,
          returned: true,
          input: false,
        },
      },
    },

    advanced: {
      useSecureCookies: true,
    },

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    plugins: [
      organization({
        schema: {
          organization: {
            additionalFields: {
              // ADR-AUTH-001 Rule 1 (org plugin edition):
              // Do NOT specify fieldName for multi-word camelCase fields.
              // The Drizzle adapter converts camelCase→snake_case automatically.
              // Specifying fieldName causes double-mapping → 500 error.
              // Fields that pass: phone, address, city, state, country, industry (single-word or exact match)
              // Fields that fail with fieldName: taxId, billingEmail, postalCode, employeeCount (multi-word)
              taxId: {
                type: "string",
                required: false,
                // fieldName: "tax_id" ← REMOVED: causes double-mapping 500
              },
              billingEmail: {
                type: "string",
                required: false,
                // fieldName: "billing_email" ← REMOVED: causes double-mapping 500
              },
              phone: {
                type: "string",
                required: false,
                // fieldName not needed: single word, matches automatically
              },
              address: {
                type: "string",
                required: false,
              },
              city: {
                type: "string",
                required: false,
              },
              state: {
                type: "string",
                required: false,
              },
              country: {
                type: "string",
                required: false,
              },
              postalCode: {
                type: "string",
                required: false,
                // fieldName: "postal_code" ← REMOVED: causes double-mapping 500
              },
              industry: {
                type: "string",
                required: false,
              },
              employeeCount: {
                type: "string",
                required: false,
                // fieldName: "employee_count" ← REMOVED: causes double-mapping 500
              },
            },
          },
        },
      }),
      admin(),
    ],
  });
};

export type StandardAuth = ReturnType<typeof createAuth>;

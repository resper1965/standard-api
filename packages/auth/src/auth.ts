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
      "http://localhost:5173",
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
              taxId: {
                type: "string",
                fieldName: "tax_id",
                required: false,
              },
              billingEmail: {
                type: "string",
                fieldName: "billing_email",
                required: false,
              },
              phone: {
                type: "string",
                fieldName: "phone",
                required: false,
              },
              address: {
                type: "string",
                fieldName: "address",
                required: false,
              },
              city: {
                type: "string",
                fieldName: "city",
                required: false,
              },
              state: {
                type: "string",
                fieldName: "state",
                required: false,
              },
              country: {
                type: "string",
                fieldName: "country",
                required: false,
              },
              postalCode: {
                type: "string",
                fieldName: "postal_code",
                required: false,
              },
              industry: {
                type: "string",
                fieldName: "industry",
                required: false,
              },
              employeeCount: {
                type: "string",
                fieldName: "employee_count",
                required: false,
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

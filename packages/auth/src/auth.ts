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
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
        banReason: "ban_reason",
        banExpires: "ban_expires",
      },
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

    account: {
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        userId: "user_id",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        impersonatedBy: "impersonated_by",
        activeOrganizationId: "active_organization_id",
      },
    },

    verification: {
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
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
              },
              billingEmail: {
                type: "string",
                fieldName: "billing_email",
              },
              phone: {
                type: "string",
                fieldName: "phone",
              },
              address: {
                type: "string",
                fieldName: "address",
              },
              city: {
                type: "string",
                fieldName: "city",
              },
              state: {
                type: "string",
                fieldName: "state",
              },
              country: {
                type: "string",
                fieldName: "country",
              },
              postalCode: {
                type: "string",
                fieldName: "postal_code",
              },
              industry: {
                type: "string",
                fieldName: "industry",
              },
              employeeCount: {
                type: "string",
                fieldName: "employee_count",
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

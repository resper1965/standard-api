/**
 * @module @standard/auth
 * @description Standard Better Auth configuration — centralized identity, organization
 * and API key management for the Standard SCF Assessment Platform.
 *
 * Organization.id from Better Auth maps to tenant_id in the Standard domain model.
 * activeOrganizationId in the session = active tenant context.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { apiKey } from "@better-auth/api-key";
import { baUser, baSession, baAccount, baVerification, baOrganization, baMember, baInvitation, baApikey } from "@standard/schemas";
import type { DrizzleClient } from "./types";

export type AuthEnv = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  STANDARD_ENV?: string | undefined;
  GOOGLE_CLIENT_ID?: string | undefined;
  GOOGLE_CLIENT_SECRET?: string | undefined;
  /** Cloudflare Worker ctx.waitUntil — for background tasks */
  waitUntil?: (promise: Promise<unknown>) => void;
};

/**
 * Create the Better Auth instance.
 * Call once at Worker startup and reuse across requests.
 */
export const createAuth = (db: DrizzleClient, env: AuthEnv) =>
  betterAuth({
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
        apikey: baApikey,
      },
    }),

    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,

    trustedOrigins: [
      "https://standard.bekaa.eu",
      "https://standard-web.pages.dev",
      "https://standard-web-m99.pages.dev",
      "http://localhost:5173",
    ],

    user: {
      additionalFields: {
        metadata: {
          type: "string",
          required: false,
        }
      }
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // enable after email service is set up
    },

    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
        enabled: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        mapProfileToUser: async (profile) => {
          return {
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            emailVerified: profile.email_verified,
            metadata: JSON.stringify({
              raw_google_profile: profile,
              captured_at: new Date().toISOString()
            })
          };
        }
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24,      // refresh every 24h
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,    // 5 minutes
        strategy: "compact", // smallest cookie size
      },
    },

    rateLimit: {
      enabled: true,
      window: 10,
      max: 100,
      storage: "memory", // memory is per-isolate; use "database" when rateLimit table is added
      customRules: {
        "/api/auth/sign-in/email": { window: 60, max: 5 },
        "/api/auth/sign-up/email": { window: 60, max: 3 },
        "/api/auth/forget-password": { window: 60, max: 3 },
      },
    },

    plugins: [
      // ── Admin ──────────────────────────────────────────────
      admin({
        defaultRole: "member",
      }),

      // ── Organization (= Standard Tenant) ──────────────────────
      organization({
        allowUserToCreateOrganization: false, // only admins
        organizationLimit: 10,
        membershipLimit: 100,
        creatorRole: "owner",
      }),

      // ── API Key ────────────────────────────────────────────
      apiKey({
        enableMetadata: true,
      }),
    ],

    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
      },
      cookiePrefix: "standard",
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
      backgroundTasks: {
        handler: (promise) => {
          if (env.waitUntil) {
            env.waitUntil(promise);
          }
        },
      },
    },

    // Audit hooks + domain-based super-admin promotion
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            console.log(`[standard:auth] session.created user=${session.userId}`);
          },
        },
      },
      user: {
        create: {
          before: async (user) => {
            // Auto-promote @bekaa.eu users to super-admin
            const email = (user.email ?? "").toLowerCase();
            if (email.endsWith("@bekaa.eu")) {
              console.log(`[standard:auth] auto-promoting ${email} to admin (bekaa.eu domain)`);
              return { data: { ...user, role: "admin" } };
            }
            return { data: user };
          },
        },
        update: {
          after: async (user) => {
            console.log(`[standard:auth] user.updated id=${user.id}`);
          },
        },
      },
    },
  });

/** Infer Auth types for use across the monorepo */
export type StandardAuth = ReturnType<typeof createAuth>;


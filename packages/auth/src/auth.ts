/**
 * @module @standard/auth
 * @description Standard Auth Server — Self-hosted Standard Native Auth.
 *
 * Runs inside the API Gateway (Cloudflare Worker).
 * Uses email/password authentication with organization-based tenancy.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { organizations, memberships, users } from "@standard/schemas";
import {
  baUser,
  baSession,
  baAccount,
  baVerification,
  baApikey
} from "@standard/schemas";
import { sendStandardEmail, type SendEmail } from "@standard/email";
import type { DrizzleClient } from "./types";

/** Minimal KV-like cache interface for session enrichment caching.
 *  Compatible with Cloudflare KV, but doesn't import @cloudflare/workers-types. */
interface SessionCacheStore {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export type AuthEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  ALLOWED_ORIGINS?: string;
  STANDARD_ENV?: string;
  email?: SendEmail | undefined;
  // KV cache for session enrichment (eliminates per-request DB queries)
  sessionCache?: SessionCacheStore | undefined;
  // Event-driven lifecycle callbacks (injected by API Gateway)
  onUserCreated?: ((payload: unknown) => Promise<void>) | undefined;
  onUserUpdated?: ((payload: unknown) => Promise<void>) | undefined;
};

/**
 * Creates the Standard Native Auth server instance.
 * Call once at Worker startup and reuse across requests.
 */
export const createAuth = (env: AuthEnv, db: DrizzleClient) => {
  // ── H1: Validate BETTER_AUTH_SECRET at startup ────────────────────
  // HMAC-SHA256 needs ≥32 bytes of entropy. Reject weak secrets early.
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error(
      `[standard:auth] BETTER_AUTH_SECRET must be at least 32 characters. Got ${env.BETTER_AUTH_SECRET?.length ?? 0}.`
    );
  }

  // ── H2: Resolve trustedOrigins from env (single source of truth) ──
  // M2 fix: localhost only in non-production environments
  const isProduction = env.STANDARD_ENV === "production";
  const trustedOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [
        "https://standard.bekaa.eu",
        "https://standard-web.pages.dev",
        "https://production.standard-web.pages.dev",
        "https://standard-web-production.pages.dev",
        "https://*.standard-web-production.pages.dev",
        ...(!isProduction ? [
          "http://localhost:5173",
          "http://localhost:5200",
          "http://localhost:3000",
        ] : []),
      ];

  return betterAuth({
    database: drizzleAdapter(db as any, {
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
    logger: {
      disabled: false,
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      /**
       * Password policy: minimum 12 characters.
       * Complexity rules (uppercase, lowercase, digit, special char,
       * common-password blocklist) are enforced in the `password.hash`
       * wrapper below — the only Better Auth interception point where
       * we have access to the raw password.
       */
      minPasswordLength: 12,
      maxPasswordLength: 128,
      password: {
        hash: async (password: string): Promise<string> => {
          // ── Password complexity validation ──────────────────────────
          const COMMON_PASSWORDS = [
            'password',
            '123456789012',
            'qwertyuiopas',
          ];
          const errors: string[] = [];
          if (!/[A-Z]/.test(password)) errors.push('at least one uppercase letter');
          if (!/[a-z]/.test(password)) errors.push('at least one lowercase letter');
          if (!/[0-9]/.test(password)) errors.push('at least one number');
          if (!/[^A-Za-z0-9]/.test(password)) errors.push('at least one special character');
          if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
            errors.push('password is too common');
          }
          if (errors.length > 0) {
            throw new Error(
              `Password does not meet complexity requirements: ${errors.join(', ')}.`,
            );
          }

          // Delegate to Better Auth's default scrypt hashing
          const { hashPassword } = await import("@better-auth/utils/password");
          return hashPassword(password);
        },
        verify: async (data: { hash: string; password: string }): Promise<boolean> => {
          const { verifyPassword } = await import("@better-auth/utils/password");
          return verifyPassword(data.hash, data.password);
        },
      },
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

    trustedOrigins,

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
      // ── M1: Session TTL — 4 hours (BA default is 7 days) ────────────
      // GRC platform handles sensitive compliance data; shorter sessions
      // reduce window of exposure for stolen cookies.
      expiresIn: 4 * 60 * 60,       // 4h session lifetime (seconds)
      updateAge: 30 * 60,            // Refresh session token every 30min of activity
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

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (env.onUserCreated) {
              try {
                await env.onUserCreated({
                  event: "user.created",
                  queue_type: "user_lifecycle",
                  idempotency_key: crypto.randomUUID(),
                  user: { id: user.id, email: user.email, name: user.name },
                  timestamp: new Date().toISOString(),
                });
              } catch (err) {
                console.error("[standard:auth] onUserCreated hook failed:", err);
              }
            }
          },
        },
        update: {
          after: async (user) => {
            if (env.onUserUpdated) {
              try {
                await env.onUserUpdated({
                  event: "user.updated",
                  queue_type: "user_lifecycle",
                  idempotency_key: crypto.randomUUID(),
                  user: { id: user.id, email: user.email, name: user.name },
                  timestamp: new Date().toISOString(),
                });
              } catch (err) {
                console.error("[standard:auth] onUserUpdated hook failed:", err);
              }
            }
          },
        },
      },
      // M9 fix: Purge KV session cache on sign-out so the session is
      // immediately invalidated instead of waiting for 60s TTL expiry.
      session: {
        delete: {
          after: async (session) => {
            if (env.sessionCache && session?.id) {
              try {
                await env.sessionCache.delete(`session-ctx:${session.id}`);
              } catch {
                // fire-and-forget — logout succeeds even if KV cleanup fails
              }
            }
          },
        },
      },
    },

    plugins: [
      customSession(async ({ user, session }) => {
        // Use the `db` closure param from createAuth
        if (!db) {
          return { user, session };
        }

        const sessionId = (session as any).id;
        const kv = env.sessionCache;

        // ── KV Cache: avoid 2x DB queries on every getSession() ────────
        if (kv && sessionId) {
          try {
            const cached = await kv.get(`session-ctx:${sessionId}`, "json") as any;
            if (cached) {
              return {
                user: {
                  ...user,
                  platformAdmin: (user as any).platformAdmin ?? false,
                  approved: (user as any).approved ?? false,
                },
                session: {
                  ...session,
                  ...cached,
                },
              };
            }
          } catch {
            // Cache miss or KV error — fall through to DB query
          }
        }

        try {
          // Query memberships for this BA user
          const memberOrgs = await (db as any)
            .select({
              orgId: organizations.id,
              orgName: organizations.name,
              orgSlug: organizations.slug,
              role: memberships.role,
            })
            .from(memberships)
            .innerJoin(users, eq(users.id, memberships.userId))
            .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
            .where(eq(users.identityProviderSubject, user.id));

          // Also include orgs where user is direct owner
          const ownedOrgs = await (db as any)
            .select({
              orgId: organizations.id,
              orgName: organizations.name,
              orgSlug: organizations.slug,
            })
            .from(organizations)
            .where(eq(organizations.userId, user.id));

          // Merge without duplicates
          const allOrgs = [
            ...memberOrgs,
            ...ownedOrgs.map((o: any) => ({ ...o, role: "owner" })),
          ];
          const uniqueOrgs = allOrgs.filter(
            (o, i, a) => a.findIndex((x: any) => x.orgId === o.orgId) === i
          );

          // Determine active org
          const activeOrgId =
            (session as any).activeOrganizationId ||
            uniqueOrgs[0]?.orgId ||
            null;
          const activeOrg = uniqueOrgs.find((o) => o.orgId === activeOrgId);

          // Build the enrichment payload
          const sessionEnrichment = {
            activeOrganizationId: activeOrgId,
            activeOrganizationSlug: activeOrg?.orgSlug ?? null,
            activeOrganizationRole: activeOrg?.role ?? null,
            allowedOrganizations: uniqueOrgs.map((o) => ({
              id: o.orgId,
              name: o.orgName,
              slug: o.orgSlug,
              role: o.role,
            })),
          };

          // ── Cache the enrichment in KV (60s TTL) ────────────────────
          if (kv && sessionId) {
            kv.put(
              `session-ctx:${sessionId}`,
              JSON.stringify(sessionEnrichment),
              { expirationTtl: 60 }
            ).catch(() => {}); // fire-and-forget
          }

          return {
            user: {
              ...user,
              platformAdmin: (user as any).platformAdmin ?? false,
              approved: (user as any).approved ?? false,
            },
            session: {
              ...session,
              ...sessionEnrichment,
            },
          };
        } catch (err) {
          console.error("[standard:auth] customSession query failed:", err);
          return { user, session };
        }
      }),
    ],
  });
};

export type StandardAuth = ReturnType<typeof createAuth>;

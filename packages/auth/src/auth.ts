/**
 * @module @standard/auth
 * @description Standard Auth Server — Self-hosted Better Auth.
 *
 * Runs inside the API Gateway (Cloudflare Worker).
 * Uses email/password authentication with organization-based tenancy.
 */
import { betterAuth } from "better-auth";
import { organization, admin } from "better-auth/plugins";
import { Pool } from "@neondatabase/serverless";

export type AuthEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
};

/**
 * Creates the Better Auth server instance.
 * Call once at Worker startup and reuse across requests.
 */
export const createAuth = (env: AuthEnv) => {
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  return betterAuth({
    database: pool,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 min cache
      },
    },

    trustedOrigins: [
      "https://standard.bekaa.eu",
      "https://standard-web.pages.dev",
      "https://production.standard-web.pages.dev",
      "http://localhost:5173",
      "http://localhost:3000",
    ],

    plugins: [
      organization(),
      admin(),
    ],
  });
};

export type StandardAuth = ReturnType<typeof createAuth>;

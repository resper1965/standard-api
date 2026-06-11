/**
 * @module @standard/auth
 * @description Standard Auth Server — Better Auth configurado para o auth Neon branch.
 *
 * Arquitectura simplificada:
 * - baUser é a única entidade de utilizador (sem users do domínio)
 * - Sem customSession plugin — org context resolvido no middleware via KV
 * - Sem databaseHooks de user_lifecycle — sem users do domínio para sincronizar
 * - Sessions em baSession (auth branch) + cache KV 60s no middleware
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  baUser,
  baSession,
  baAccount,
  baVerification,
} from "@standard/schemas";
import { sendStandardEmail, type SendEmail } from "@standard/email";
import { eq, desc, inArray } from "drizzle-orm";
import type { DrizzleClient } from "./types";

export type AuthEnv = {
  /** Connection string do auth Neon branch */
  AUTH_DATABASE_URL?: string;
  /** HMAC-SHA256 secret — mínimo 32 caracteres */
  BETTER_AUTH_SECRET: string;
  /** URL base da auth API (ex: https://standard-api.bekaa.eu/api/auth) */
  BETTER_AUTH_URL?: string;
  /** Origins permitidos — vírgula separados */
  ALLOWED_ORIGINS?: string;
  /** Ambiente actual: 'production' | 'staging' | 'development' */
  STANDARD_ENV?: string;
  /** Serviço de email injectado pelo API Gateway */
  email?: SendEmail;
};

/**
 * Cria a instância Better Auth.
 * Chamar uma vez no startup do Worker e reutilizar em todos os requests.
 *
 * @param env  Variáveis de ambiente e serviços injectados
 * @param db   Cliente Drizzle apontando para o auth Neon branch (HYPERDRIVE_AUTH)
 */
export const createAuth = (env: AuthEnv, db: DrizzleClient) => {
  // ── Validação de startup ─────────────────────────────────────────────────
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error(
      `[standard:auth] BETTER_AUTH_SECRET must be ≥32 characters. Got ${env.BETTER_AUTH_SECRET?.length ?? 0}.`,
    );
  }

  // ── Trusted origins ──────────────────────────────────────────────────────
  const isProduction = env.STANDARD_ENV === "production";
  const trustedOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [
        "https://standard.bekaa.eu",
        "https://standard-web.pages.dev",
        "https://production.standard-web.pages.dev",
        "https://standard-web-production.pages.dev",
        "https://*.standard-web-production.pages.dev",
        ...(!isProduction
          ? [
              "http://localhost:5173",
              "http://localhost:5200",
              "http://localhost:3000",
            ]
          : []),
      ];

  return betterAuth({
    database: drizzleAdapter(db as any, {
      provider: "pg",
      schema: {
        user: baUser,
        session: baSession,
        account: baAccount,
        verification: baVerification,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    logger: { disabled: false },

    // ── Email + Password ──────────────────────────────────────────────────
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,

      password: {
        hash: async (password: string): Promise<string> => {
          // Complexidade: uppercase, lowercase, dígito, especial
          const errors: string[] = [];
          if (!/[A-Z]/.test(password)) errors.push("uppercase letter");
          if (!/[a-z]/.test(password)) errors.push("lowercase letter");
          if (!/[0-9]/.test(password)) errors.push("number");
          if (!/[^A-Za-z0-9]/.test(password)) errors.push("special character");
          if (errors.length) {
            throw new Error(`Password requires: ${errors.join(", ")}.`);
          }
          const { hashPassword } = await import("@better-auth/utils/password");
          return hashPassword(password);
        },
        verify: async ({
          hash,
          password,
        }: {
          hash: string;
          password: string;
        }): Promise<boolean> => {
          const { verifyPassword } =
            await import("@better-auth/utils/password");
          return verifyPassword(hash, password);
        },
      },

      sendVerificationEmail: async ({
        user,
        url,
      }: {
        user: { email: string; name: string | null };
        url: string;
      }) => {
        if (env.email) {
          await sendStandardEmail(
            env.email,
            {
              type: "verification",
              to: user.email,
              firstName: user.name || "User",
              verificationUrl: url,
              expiresIn: "24 hours",
            },
            { domain: "bekaa.eu" },
          ).catch((err: unknown) =>
            console.error("[standard:auth] sendVerificationEmail failed:", err),
          );
        } else {
          console.log(`[standard:auth:dev] verify → ${url}`);
        }
      },

      sendResetPassword: async ({
        user,
        url,
      }: {
        user: { email: string; name: string | null };
        url: string;
      }) => {
        if (env.email) {
          await sendStandardEmail(
            env.email,
            {
              type: "password_reset",
              to: user.email,
              firstName: user.name || "User",
              resetUrl: url,
              expiresIn: "1 hour",
            },
            { domain: "bekaa.eu" },
          ).catch((err: unknown) =>
            console.error("[standard:auth] sendResetPassword failed:", err),
          );
        } else {
          console.log(`[standard:auth:dev] reset → ${url}`);
        }
      },
    },

    trustedOrigins,

    // ── Database Hooks (Auth Containment) ───────────────────────────────
    databaseHooks: {
      session: {
        create: {
          after: async (session: any) => {
            const MAX_CONCURRENT_SESSIONS = 3;
            // Encontra todas as sessões ativas do usuário, da mais nova para a mais velha
            const rows = await (db as any)
              .select({ id: baSession.id })
              .from(baSession)
              .where(eq(baSession.userId, session.userId))
              .orderBy(desc(baSession.createdAt));

            // Se exceder o limite, revoga as mais antigas
            if (rows.length > MAX_CONCURRENT_SESSIONS) {
              const toRevoke = rows
                .slice(MAX_CONCURRENT_SESSIONS)
                .map((r: any) => r.id as string);

              if (toRevoke.length > 0) {
                await (db as any)
                  .delete(baSession)
                  .where(inArray(baSession.id, toRevoke));
                console.log(
                  `[standard:auth] Revoked ${toRevoke.length} old session(s) for user ${session.userId} (limit: ${MAX_CONCURRENT_SESSIONS})`,
                );
              }
            }
          },
        },
      },
    },

    // ── User additional fields ────────────────────────────────────────────
    // fieldName mapeia para o nome real da coluna na DB (snake_case)
    user: {
      additionalFields: {
        platformAdmin: {
          type: "boolean",
          defaultValue: false,
          returned: true,
          input: false, // nunca settável via API pública
          fieldName: "platform_admin",
        },
        approved: {
          type: "boolean",
          defaultValue: false,
          returned: true,
          input: false, // gerido via /admin/users/:id/approve
          fieldName: "approved",
        },
        jobTitle: { type: "string" },
        phone: { type: "string" },
      },
    },

    // ── Session ───────────────────────────────────────────────────────────
    session: {
      expiresIn: 4 * 60 * 60, // 4h — GRC lida com dados sensíveis
      updateAge: 30 * 60, // refresh token a cada 30min de actividade
      additionalFields: {
        // Org activa — actualizada via POST /v1/auth/activate-org
        // O middleware lê daqui e faz cache em KV (STANDARD_CACHE, TTL 60s)
        activeOrganizationId: {
          type: "string",
          returned: true,
          input: false,
        },
      },
    },

    // ── Advanced ─────────────────────────────────────────────────────────
    advanced: {
      useSecureCookies: true,
      generateId: () => crypto.randomUUID(),
      // Cookies cross-subdomain: partilha sessão entre
      // standard.bekaa.eu (frontend) e standard-api.bekaa.eu (API gateway)
      crossSubDomainCookies: {
        enabled: true,
        domain: ".bekaa.eu",
      },
      defaultCookieAttributes: {
        sameSite: "none", // obrigatório para cross-origin credentials
        secure: true, // obrigatório quando sameSite=none
        httpOnly: true,
        path: "/",
      },
    },
  });
};

export type StandardAuth = ReturnType<typeof createAuth>;

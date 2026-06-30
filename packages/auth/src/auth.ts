/**
 * @module @standard/auth
 * @description Standard Auth Server â€” Better Auth configurado para o auth Neon branch.
 *
 * Arquitectura simplificada:
 * - baUser Ã© a Ãºnica entidade de utilizador (sem users do domÃ­nio)
 * - Sem customSession plugin â€” org context resolvido no middleware via KV
 * - Sem databaseHooks de user_lifecycle â€” sem users do domÃ­nio para sincronizar
 * - Sessions em baSession (auth branch) + cache KV 60s no middleware
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
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
  /** HMAC-SHA256 secret â€” mÃ­nimo 32 caracteres */
  BETTER_AUTH_SECRET: string;
  /** URL base da auth API (ex: https://standard-api.bekaa.eu/api/auth) */
  BETTER_AUTH_URL?: string;
  /** Origins permitidos â€” vÃ­rgula separados */
  ALLOWED_ORIGINS?: string;
  /** Ambiente actual: 'production' | 'staging' | 'development' */
  STANDARD_ENV?: string;
  /** ServiÃ§o de email injectado pelo API Gateway */
  email?: SendEmail;
};

/**
 * Endpoints Better Auth que efectivamente DEFINEM uma password a partir de
 * input do utilizador. Alinhado com a lista canÃ³nica do plugin oficial
 * `haveIBeenPwned` (`/sign-up/email`, `/change-password`, `/reset-password`).
 *
 * A validaÃ§Ã£o de complexidade SÃ“ deve correr nestes paths. Em particular NÃƒO
 * deve correr no `/sign-in/email`: o Better Auth chama `password.hash` no caminho
 * de falha do login (mitigaÃ§Ã£o de timing-attack) com a password submetida, e
 * lanÃ§ar aÃ­ revelaria a existÃªncia do utilizador e quebraria essa mitigaÃ§Ã£o.
 */
const PASSWORD_SETTING_PATHS = new Set<string>([
  "/sign-up/email",
  "/change-password",
  "/reset-password",
]);

/**
 * Regras de complexidade de password. Devolve a lista de requisitos em falta
 * (vazia = vÃ¡lida). MÃ­nimo de comprimento Ã© tratado pelo `minPasswordLength`.
 */
const passwordComplexityErrors = (password: string): string[] => {
  const errors: string[] = [];
  if (!/[A-Z]/.test(password)) errors.push("uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("special character");
  return errors;
};

/**
 * Fallback de Platform Admins quando `PLATFORM_ADMIN_EMAILS` nÃ£o estÃ¡ definido.
 * Mantido para retrocompatibilidade â€” a conta master da Bekaa.
 */
export const DEFAULT_PLATFORM_ADMIN_EMAILS = ["resper@bekaa.eu"] as const;

/**
 * Fonte Ãšnica de verdade para a lista de emails Platform Admin.
 *
 * Faz parsing de `PLATFORM_ADMIN_EMAILS` (CSV), normaliza para lowercase e
 * remove vazios. Se nÃ£o estiver definido, devolve {@link DEFAULT_PLATFORM_ADMIN_EMAILS}.
 *
 * Usado em dois sÃ­tios para garantir que estes emails sÃ£o SEMPRE platform admin:
 *  - `databaseHooks.user.create` (auto-provisioning no momento da criaÃ§Ã£o)
 *  - `auth.middleware` (override por request, independente do estado da DB)
 *
 * @param raw  valor cru de `PLATFORM_ADMIN_EMAILS` (env var)
 */
export const parsePlatformAdminEmails = (raw?: string | null): string[] => {
  const list = raw
    ? raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : [...DEFAULT_PLATFORM_ADMIN_EMAILS];
  return list;
};

/**
 * True se `email` pertencer Ã  lista de Platform Admins configurada.
 * ComparaÃ§Ã£o case-insensitive.
 */
export const isPlatformAdminEmail = (
  email: string | null | undefined,
  raw?: string | null,
): boolean => {
  if (!email) return false;
  return parsePlatformAdminEmails(raw).includes(email.trim().toLowerCase());
};

/**
 * Cria a instÃ¢ncia Better Auth.
 * Chamar uma vez no startup do Worker e reutilizar em todos os requests.
 *
 * @param env  VariÃ¡veis de ambiente e serviÃ§os injectados
 * @param db   Cliente Drizzle apontando para o auth Neon branch (HYPERDRIVE_AUTH)
 */
export const createAuth = (env: AuthEnv, db: DrizzleClient) => {
  // â”€â”€ ValidaÃ§Ã£o de startup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error(
      `[standard:auth] BETTER_AUTH_SECRET must be â‰¥32 characters. Got ${env.BETTER_AUTH_SECRET?.length ?? 0}.`,
    );
  }

  // â”€â”€ Trusted origins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    plugins: [admin()],

    // ─── Request hooks ───────────────────────────────────────────────────────────────
    // Valida a complexidade da password APENAS nos endpoints que definem uma
    // password a partir de input do utilizador. Mantém o `password.hash` puro,
    // evitando lançar no caminho de timing-mitigation do sign-in (que revelaria
    // a existência do utilizador).
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!PASSWORD_SETTING_PATHS.has(ctx.path)) return;
        const body = (ctx.body ?? {}) as {
          password?: unknown;
          newPassword?: unknown;
        };
        const password =
          typeof body.password === "string"
            ? body.password
            : typeof body.newPassword === "string"
              ? body.newPassword
              : undefined;
        if (password === undefined) return;
        const errors = passwordComplexityErrors(password);
        if (errors.length) {
          throw new APIError("BAD_REQUEST", {
            message: `Password requires: ${errors.join(", ")}.`,
          });
        }
      }),
    },

    // ————————————————————————————————————————————————————————————————————————————————
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,

      password: {
        // hash Ã© um primitivo puro: NÃ£o valida complexidade aqui. O Better Auth
        // invoca hash() tambÃ©m no caminho de falha do sign-in (mitigaÃ§Ã£o de
        // timing-attack), por isso a validaÃ§Ã£o vive no hook `before` abaixo,
        // restrito aos PASSWORD_SETTING_PATHS.
        hash: async (password: string): Promise<string> => {
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
          console.log(`[standard:auth:dev] reset â†’ ${url}`);
        }
      },
    },

    // ─── Email verification ──────────────────────────────────────────────────────────
    // O callback de verificação pertence a `emailVerification`, NÃO a
    // `emailAndPassword`. Estava mal colocado e por isso o Better Auth nunca o
    // invocava — com `requireEmailVerification: true`, o email de verificação
    // custom não era enviado.
    emailVerification: {
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
          console.log(`[standard:auth:dev] verify â†’ ${url}`);
        }
      },
    },

    trustedOrigins,

    // ─── Database Hooks (Auth Containment & Auto-Provisioning) ────────────────────────
    databaseHooks: {
      user: {
        create: {
          before: async (user: any) => {
            // Auto-provisionamento do Platform Admin master account.
            // Lista configurÃ¡vel via PLATFORM_ADMIN_EMAILS (CSV); fallback para
            // DEFAULT_PLATFORM_ADMIN_EMAILS. Fonte Ãºnica: parsePlatformAdminEmails.
            const platformAdminEnv =
              typeof process !== "undefined"
                ? process.env?.PLATFORM_ADMIN_EMAILS
                : undefined;
            if (isPlatformAdminEmail(user.email, platformAdminEnv)) {
              console.log(
                `[standard:auth] Auto-provisioning Platform Admin for: ${user.email}`,
              );
              return {
                data: {
                  ...user,
                  platformAdmin: true,
                  role: "platform_admin",
                  approved: true, // Bypass approval gate for master admins
                },
              };
            }
            return { data: user };
          },
        },
      },
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

    // â”€â”€ User additional fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // fieldName mapeia para o nome real da coluna na DB (snake_case)
    user: {
      additionalFields: {
        platformAdmin: {
          type: "boolean",
          defaultValue: false,
          returned: true,
          input: false, // nunca settÃ¡vel via API pÃºblica
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

    // â”€â”€ Session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    session: {
      expiresIn: 4 * 60 * 60, // 4h â€” GRC lida com dados sensÃ­veis
      updateAge: 30 * 60, // refresh token a cada 30min de actividade
      additionalFields: {
        // Org activa â€” actualizada via POST /v1/auth/activate-org
        // O middleware lÃª daqui e faz cache em KV (STANDARD_CACHE, TTL 60s)
        activeOrganizationId: {
          type: "string",
          returned: true,
          input: false,
        },
      },
    },

    // â”€â”€ Advanced â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    advanced: {
      useSecureCookies: true,
      // `generateId` vive em `advanced.database` no Better Auth 1.6.x
      // (`advanced.generateId` deixou de existir).
      database: {
        generateId: () => crypto.randomUUID(),
      },
      // Cookies cross-subdomain: partilha sessÃ£o entre
      // standard.bekaa.eu (frontend) e standard-api.bekaa.eu (API gateway)
      crossSubDomainCookies: {
        enabled: true,
        domain: ".bekaa.eu",
      },
      defaultCookieAttributes: {
        sameSite: "none", // obrigatÃ³rio para cross-origin credentials
        secure: true, // obrigatÃ³rio quando sameSite=none
        httpOnly: true,
        path: "/",
      },
    },
  });
};

export type StandardAuth = ReturnType<typeof createAuth>;

# Auth Simplification — Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Separar o control plane (auth, tenancy) do data plane (SCF, assessments), eliminando o dual-identity e simplificando o middleware de autenticação.

**Architecture:** Neon passa a ter dois branches — `auth` (user, organization, api_keys) e `product` (SCF, assessments, tudo o resto). Sessions ficam no KV existente (`STANDARD_CACHE`). O middleware deixa de fazer reconciliação entre `baUser` e `users` do domínio — existe apenas uma entidade `user`.

**Tech Stack:** Better Auth (email/password, sessions), Drizzle ORM, Neon (2 branches), Cloudflare KV (session cache), Hyperdrive (connection pooler).

---

## Contexto e Decisões

### O problema actual

Existem duas tabelas de user em paralelo:
- `user` (tabela do Better Auth — `baUser`) com `id` texto (UUID gerado pelo BA)
- `users` (tabela do domínio Standard) com `id` UUID, ligada via `identity_provider_subject = baUser.id`

Esta ponte é a fonte de toda a complexidade: fallbacks, F9-traces, `domainUserId`, `resolveUserContext`. **Não existe razão para isto existir.**

### Decisão

- `baUser` **é** a entidade única de utilizador. Não há `users` do domínio.
- `organization` pertence ao control plane (auth branch).
- `memberships` e `roles` são eliminados — 1 user por org, role implícita como `owner`.
- `api_keys` permanecem no auth branch (persistência) com cache em KV.
- Sessions ficam no `baSession` (auth branch) + cache em KV com TTL 60s.
- Todo o produto (assessments, SCF, etc.) referencia `organization_id` como UUID simples — sem FK cross-DB. A validação é feita no middleware.

### O que NÃO muda

- **SCF data no Neon product branch** — intocável (81k registos).
- **Better Auth** — mantido para email/password, email verification, password reset.
- **Todos os bindings Cloudflare** — R2, Queues, Workflows, KV — sem alterações.
- **Tabelas de produto** — assessments, findings, evidence, gap_analysis, etc. — `organization_id` continua a existir como coluna, apenas sem FK para auth DB.

### Estrutura final

```
Neon branch "auth":          Neon branch "product" (actual):
───────────────────          ───────────────────────────────
user        (baUser)         scf_controls, scf_domains, ...
session     (baSession)      assessments
account     (baAccount)      findings, evidence, gap_analysis
verification(baVerification) documents, kb_entries, ...
organization                 (organization_id como uuid simples)
api_keys

KV (STANDARD_CACHE — já existe):
─────────────────────────────────
session-ctx:{sessionId}  → org context (TTL 60s)
apikey:{hash}            → org_id + scopes (TTL 300s)
revocations:user:{id}    → motivo (TTL até expirar)
```

---

## Tasks

### Task A1 — Criar Neon auth branch

**Contexto:** O Neon suporta branches nativamente. Vamos criar um branch `auth` separado do branch `main` (product). O SCF e assessments ficam no `main`.

**Step 1: Criar o branch via Neon MCP**

```bash
# Via Neon console ou MCP:
# Branch name: auth
# Parent: main (para herdar configurações base)
# Depois de criar, obter a connection string do branch auth
```

**Step 2: Guardar a connection string**

Adicionar ao `.dev.vars` (nunca ao git):
```
AUTH_DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
DATABASE_URL="postgresql://user:pass@ep-yyy.neon.tech/neondb?sslmode=require"  # product (já existe)
```

**Step 3: Criar Hyperdrive para o auth branch**

```bash
npx wrangler hyperdrive create standard-neon-auth-dev \
  --connection-string="<AUTH_DATABASE_URL>"
# Guardar o ID retornado
```

**Step 4: Commit**
```bash
git add .
git commit -m "chore(infra): add neon auth branch config"
```

---

### Task A2 — Novo schema auth (packages/schemas)

**Ficheiros:**
- Criar: `packages/schemas/src/db/auth-schema.ts` (substituir o actual)
- Criar: `packages/schemas/src/db/organization-schema.ts` (novo)
- Modificar: `packages/schemas/src/index.ts`

**Step 1: Novo `auth-schema.ts` — só tabelas Better Auth**

```typescript
// packages/schemas/src/db/auth-schema.ts
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Better Auth core tables — auth branch do Neon.
 * Geridas pelo Better Auth runtime. Não alterar estrutura sem migração BA.
 *
 * Campos adicionados ao baUser:
 * - platform_admin: flag Bekaa operator (só via SQL por operadores)
 * - approved: gate de aprovação manual por platform admin
 */
export const baUser = pgTable("user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image:         text("image"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
  // Standard-specific fields
  platformAdmin: boolean("platform_admin").notNull().default(false),
  approved:      boolean("approved").notNull().default(false),
  jobTitle:      text("job_title"),
  phone:         text("phone"),
});

export const baSession = pgTable("session", {
  id:                   text("id").primaryKey(),
  expiresAt:            timestamp("expires_at").notNull(),
  token:                text("token").notNull().unique(),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
  updatedAt:            timestamp("updated_at").notNull().defaultNow(),
  ipAddress:            text("ip_address"),
  userAgent:            text("user_agent"),
  userId:               text("user_id").notNull().references(() => baUser.id, { onDelete: "cascade" }),
  // Org context — actualizado via POST /v1/auth/activate-org
  activeOrganizationId: text("active_organization_id"),
}, (t) => [
  index("ba_session_user_idx").on(t.userId),
  index("ba_session_token_idx").on(t.token),
]);

export const baAccount = pgTable("account", {
  id:                     text("id").primaryKey(),
  accountId:              text("account_id").notNull(),
  providerId:             text("provider_id").notNull(),
  userId:                 text("user_id").notNull().references(() => baUser.id, { onDelete: "cascade" }),
  password:               text("password"),
  accessToken:            text("access_token"),
  refreshToken:           text("refresh_token"),
  accessTokenExpiresAt:   timestamp("access_token_expires_at"),
  refreshTokenExpiresAt:  timestamp("refresh_token_expires_at"),
  scope:                  text("scope"),
  createdAt:              timestamp("created_at").notNull().defaultNow(),
  updatedAt:              timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("ba_account_user_idx").on(t.userId)]);

export const baVerification = pgTable("verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at").notNull(),
  createdAt:  timestamp("created_at").defaultNow(),
  updatedAt:  timestamp("updated_at").defaultNow(),
});
```

**Step 2: Novo `organization-schema.ts`**

```typescript
// packages/schemas/src/db/organization-schema.ts
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { baUser } from "./auth-schema";

/**
 * Organization — entidade de tenancy no auth branch.
 * 1 user : 1 organization (modelo simplificado sem memberships).
 * API Keys ligam à org, não ao user directamente.
 */
export const organizations = pgTable("organizations", {
  id:        uuid("id").defaultRandom().primaryKey(),
  name:      text("name").notNull(),
  slug:      text("slug").notNull().unique(),
  // FK para o owner (baUser) — 1:1
  userId:    text("user_id").notNull().references(() => baUser.id),
  plan:      text("plan").default("trial").notNull(),
  active:    boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("orgs_user_idx").on(t.userId),
  index("orgs_slug_idx").on(t.slug),
]);

export const apiKeys = pgTable("api_keys", {
  id:                 uuid("id").defaultRandom().primaryKey(),
  organizationId:     uuid("organization_id").notNull().references(() => organizations.id),
  name:               text("name").notNull(),
  keyHash:            text("key_hash").notNull().unique(),
  maskedKey:          text("masked_key").notNull(),
  scopes:             text("scopes").array().default([]).notNull(), // ['assessment:read', ...]
  expiresAt:          timestamp("expires_at", { withTimezone: true }),
  lastUsedAt:         timestamp("last_used_at", { withTimezone: true }),
  revokedAt:          timestamp("revoked_at", { withTimezone: true }),       // null = activa
  scheduledRevokeAt:  timestamp("scheduled_revoke_at", { withTimezone: true }),
  rotatedToKeyId:     uuid("rotated_to_key_id"),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("api_keys_org_idx").on(t.organizationId),
  index("api_keys_hash_idx").on(t.keyHash),
]);
```

**Step 3: Actualizar `packages/schemas/src/index.ts`** — exportar os novos schemas, deprecar `users`, `memberships`, `roles` do schema principal.

**Step 4: Typecheck**
```bash
cd packages/schemas; npx tsc --noEmit
```
Expected: 0 errors.

**Step 5: Commit**
```bash
git add packages/schemas/src/db/auth-schema.ts packages/schemas/src/db/organization-schema.ts
git commit -m "feat(schemas): simplified auth schema — single user entity, org 1:1, no memberships"
```

---

### Task A3 — Drizzle config para auth branch

**Ficheiros:**
- Criar: `packages/schemas/drizzle-auth.config.ts`
- Modificar: `packages/schemas/package.json` — novos scripts `db:generate:auth`, `db:migrate:auth`

**Step 1: `drizzle-auth.config.ts`**

```typescript
// packages/schemas/drizzle-auth.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema:    "./src/db/auth-schema.ts",
  out:       "./migrations/auth",
  dialect:   "postgresql",
  dbCredentials: {
    url: process.env.AUTH_DATABASE_URL!,
  },
});
```

**Step 2: Scripts no `package.json`**

```json
{
  "scripts": {
    "db:generate:auth":  "drizzle-kit generate --config=drizzle-auth.config.ts",
    "db:migrate:auth":   "drizzle-kit migrate --config=drizzle-auth.config.ts",
    "db:generate":       "drizzle-kit generate",
    "db:migrate":        "drizzle-kit migrate"
  }
}
```

**Step 3: Gerar migration auth**
```bash
AUTH_DATABASE_URL="<auth_branch_url>" pnpm db:generate:auth
```
Expected: `migrations/auth/0000_init_auth.sql` criado.

**Step 4: Aplicar migration ao branch auth**
```bash
AUTH_DATABASE_URL="<auth_branch_url>" pnpm db:migrate:auth
```
Expected: tabelas `user`, `session`, `account`, `verification`, `organizations`, `api_keys` criadas no branch auth.

**Step 5: Commit**
```bash
git add packages/schemas/drizzle-auth.config.ts packages/schemas/migrations/auth/
git commit -m "feat(schemas): drizzle config and migration for auth branch"
```

---

### Task A4 — Simplificar `packages/auth/src/auth.ts`

**Ficheiro:** `packages/auth/src/auth.ts`

O objectivo é eliminar o `customSession` plugin complexo. A org context passa a ser resolvida no middleware via KV — não no plugin.

**Step 1: Novo `auth.ts` limpo**

```typescript
// packages/auth/src/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { baUser, baSession, baAccount, baVerification } from "@standard/schemas";
import { sendStandardEmail, type SendEmail } from "@standard/email";
import type { DrizzleClient } from "./types";

export type AuthEnv = {
  AUTH_DATABASE_URL:   string;
  BETTER_AUTH_SECRET:  string;
  BETTER_AUTH_URL?:    string;
  ALLOWED_ORIGINS?:    string;
  STANDARD_ENV?:       string;
  email?:              SendEmail;
};

export const createAuth = (env: AuthEnv, db: DrizzleClient) => {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error(`[auth] BETTER_AUTH_SECRET must be ≥32 chars`);
  }

  const isProduction = env.STANDARD_ENV === "production";

  const trustedOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
    : [
        "https://standard.bekaa.eu",
        "https://standard-web.pages.dev",
        ...(!isProduction ? ["http://localhost:5173", "http://localhost:5200"] : []),
      ];

  return betterAuth({
    database: drizzleAdapter(db as any, {
      provider: "pg",
      schema: { user: baUser, session: baSession, account: baAccount, verification: baVerification },
    }),
    secret:  env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      password: {
        hash: async (password: string) => {
          const errors: string[] = [];
          if (!/[A-Z]/.test(password)) errors.push("uppercase letter required");
          if (!/[a-z]/.test(password)) errors.push("lowercase letter required");
          if (!/[0-9]/.test(password)) errors.push("number required");
          if (!/[^A-Za-z0-9]/.test(password)) errors.push("special character required");
          if (errors.length) throw new Error(`Password: ${errors.join(", ")}`);
          const { hashPassword } = await import("@better-auth/utils/password");
          return hashPassword(password);
        },
        verify: async ({ hash, password }) => {
          const { verifyPassword } = await import("@better-auth/utils/password");
          return verifyPassword(hash, password);
        },
      },
      sendVerificationEmail: async ({ user, url }) => {
        if (env.email) {
          await sendStandardEmail(env.email, {
            type: "verification", to: user.email,
            firstName: user.name || "User", verificationUrl: url, expiresIn: "24 hours",
          }, { domain: "bekaa.eu" });
        } else {
          console.log(`[auth:dev] verify email: ${url}`);
        }
      },
      sendResetPassword: async ({ user, url }) => {
        if (env.email) {
          await sendStandardEmail(env.email, {
            type: "password_reset", to: user.email,
            firstName: user.name || "User", resetUrl: url, expiresIn: "1 hour",
          }, { domain: "bekaa.eu" });
        } else {
          console.log(`[auth:dev] reset password: ${url}`);
        }
      },
    },

    trustedOrigins,

    user: {
      additionalFields: {
        platformAdmin: { type: "boolean", defaultValue: false, returned: true, input: false, fieldName: "platform_admin" },
        approved:      { type: "boolean", defaultValue: false, returned: true, input: false, fieldName: "approved" },
        jobTitle:      { type: "string" },
        phone:         { type: "string" },
      },
    },

    session: {
      expiresIn:  4 * 60 * 60, // 4h
      updateAge:  30 * 60,     // refresh a cada 30min
      additionalFields: {
        activeOrganizationId: { type: "string", returned: true, input: false },
      },
    },

    advanced: {
      useSecureCookies: true,
      generateId: () => crypto.randomUUID(),
      crossSubDomainCookies: { enabled: true, domain: ".bekaa.eu" },
      defaultCookieAttributes: { sameSite: "none", secure: true, httpOnly: true, path: "/" },
    },
  });
};

export type StandardAuth = ReturnType<typeof createAuth>;
```

**O que foi eliminado vs antes:**
- ✅ `customSession` plugin inteiro removido
- ✅ Sem queries de `memberships` e `users` no path de autenticação
- ✅ Sem `domainUserId` / `resolveUserContext`
- ✅ Sem `AsyncLocalStorage` (não era necessário)
- ✅ Sem `onUserCreated`/`onUserUpdated` hooks (o USER_LIFECYCLE_QUEUE é dispensado — não há `users` domínio para sincronizar)
- ✅ Sem `sessionCache` KV no `createAuth` — passa para o middleware

**Step 2: Typecheck**
```bash
cd packages/auth; npx tsc --noEmit
```

**Step 3: Commit**
```bash
git add packages/auth/src/auth.ts
git commit -m "feat(auth): simplified better-auth config — remove customSession, dual-identity and hooks"
```

---

### Task A5 — Novo `auth.middleware.ts` (limpo)

**Ficheiro:** `apps/api-gateway/src/middleware/auth.middleware.ts`

**Step 1: Substituir pelo middleware simplificado**

```typescript
// apps/api-gateway/src/middleware/auth.middleware.ts
/**
 * Auth middleware — resolves actor and organization from:
 * 1. Bearer API Key  → KV cache → auth DB
 * 2. Session cookie  → KV cache → Better Auth DB
 *
 * Sets: context.actorId, context.organizationId, context.session
 */
import type { StandardAuth } from "@standard/auth";
import { ApiError } from "../errors/api-error";
import { isApiKeyToken, extractApiKeyToken } from "../utils/api-key-crypto";
import type { RequestContext } from "../http";

const KV_API_KEY_TTL = 300;   // 5 min — api key cache
const KV_SESSION_TTL = 60;    // 60s  — session context cache

/* ── Helpers ──────────────────────────────────────────────────── */
const sha256 = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
};

const isUuid = (v?: string | null): v is string =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/* ── Main ─────────────────────────────────────────────────────── */
export const resolveAuthContext = async (
  context: RequestContext,
  auth: StandardAuth,
  requireAuth: boolean,
): Promise<void> => {
  const kv = context.env?.STANDARD_CACHE;
  const authHeader = context.request.headers.get("Authorization");

  // ── Path 1: M2M API Key ──────────────────────────────────────
  if (authHeader && isApiKeyToken(authHeader)) {
    const token = extractApiKeyToken(authHeader);
    const hash  = await sha256(token);
    const kvKey = `apikey:${hash}`;

    // 1a. KV fast path
    if (kv) {
      const cached = await kv.get(kvKey, "json").catch(() => null) as any;
      if (cached?.organizationId) {
        context.actorId        = `m2m:${cached.keyId}`;
        context.organizationId = cached.organizationId;
        context.m2mScopes      = cached.scopes ?? [];
        return;
      }
    }

    // 1b. Auth DB fallback
    const record = await context.deps.apiKeys.verifyKey(hash);
    if (record) {
      context.actorId        = `m2m:${record.id}`;
      context.organizationId = record.organizationId;
      context.m2mScopes      = record.scopes;

      // Populate KV for next requests
      if (kv) {
        kv.put(kvKey, JSON.stringify({
          keyId: record.id, organizationId: record.organizationId, scopes: record.scopes,
        }), { expirationTtl: KV_API_KEY_TTL }).catch(() => {});
      }

      // Fire-and-forget: mark last used
      context.deps.apiKeys.markUsed(record.id).catch(() => {});
      return;
    }
  }

  // ── Path 2: Session cookie ───────────────────────────────────
  const rawSession = await auth.api.getSession({ headers: context.request.headers }).catch(() => null);

  if (rawSession?.user) {
    const user    = rawSession.user as any;
    const session = rawSession.session as any;

    // 2a. Hard revocation check
    if (kv) {
      const revoked = await kv.get(`revocations:user:${user.id}`).catch(() => null);
      if (revoked && ["user_banned", "user_deleted", "security_lockout"].includes(revoked)) {
        throw new ApiError("UNAUTHORIZED", "Token has been revoked.", 401);
      }
    }

    // 2b. Approval gate
    if (!user.approved && !user.platformAdmin) {
      throw new ApiError("ACCOUNT_PENDING_APPROVAL", "Account pending administrator approval.", 403);
    }

    // 2c. Org context — KV first, then session field
    const kvSessionKey = `session-ctx:${session.id}`;
    let orgId: string | null = null;

    if (kv) {
      const cached = await kv.get(kvSessionKey, "json").catch(() => null) as any;
      if (cached?.activeOrganizationId) {
        orgId = cached.activeOrganizationId;
      }
    }

    if (!orgId && isUuid(session.activeOrganizationId)) {
      orgId = session.activeOrganizationId;
      // Cache for next requests
      if (kv) {
        kv.put(kvSessionKey, JSON.stringify({ activeOrganizationId: orgId }), {
          expirationTtl: KV_SESSION_TTL,
        }).catch(() => {});
      }
    }

    context.actorId        = user.id;
    context.organizationId = orgId ?? undefined;
    context.session        = {
      user: {
        id:            user.id,
        email:         user.email,
        name:          user.name,
        platformAdmin: user.platformAdmin ?? user.platform_admin ?? false,
        approved:      user.approved ?? false,
      },
      session: {
        id:                   session.id,
        activeOrganizationId: orgId ?? null,
      },
    };
  }

  // ── RequireAuth gate ─────────────────────────────────────────
  if (requireAuth && !context.actorId) {
    throw new ApiError("UNAUTHORIZED", "Authentication required.", 401);
  }
};
```

**O que foi eliminado vs antes:**
- ✅ 478 linhas → ~110 linhas
- ✅ Sem `resolveSessionFields` cast complexo
- ✅ Sem `resolveUserContext` (domainUserId eliminado)
- ✅ Sem `resolveOrganizationContext` DB query
- ✅ Sem F9-trace `console.log`
- ✅ Sem `SOC_TRIAGE_QUEUE` no 401 (simplificar — pode voltar depois)
- ✅ Sem `session.domainUserId`, `allowedOrganizations`, `activeOrganizationSlug`, `activeOrganizationRole`

**Step 2: Typecheck**
```bash
cd apps/api-gateway; npx tsc --noEmit
```
Espera erros onde `context.session.session.domainUserId` ou `allowedOrganizations` são usados. Corrigir nos ficheiros indicados.

**Step 3: Commit**
```bash
git add apps/api-gateway/src/middleware/auth.middleware.ts
git commit -m "feat(gateway): simplified auth middleware — 110 lines, no dual-identity, KV-first"
```

---

### Task A6 — Actualizar wrangler.toml (HYPERDRIVE_AUTH binding)

**Ficheiro:** `apps/api-gateway/wrangler.toml`

**Step 1: Adicionar binding `HYPERDRIVE_AUTH`**

```toml
# Auth branch — control plane (user, org, api_keys)
[[env.staging.hyperdrive]]
binding = "HYPERDRIVE_AUTH"
id      = "<id-do-hyperdrive-auth-staging>"

[[env.production.hyperdrive]]
binding = "HYPERDRIVE_AUTH"
id      = "<id-do-hyperdrive-auth-prod>"
```

**Step 2: Repetir para workers que precisem de auth context**

Verificar `workers/workflows/wrangler.toml` e `workers/queues/wrangler.toml` — adicionar `HYPERDRIVE_AUTH` se necessário.

**Step 3: Commit**
```bash
git add apps/api-gateway/wrangler.toml workers/*/wrangler.toml
git commit -m "feat(infra): add HYPERDRIVE_AUTH binding for auth neon branch"
```

---

### Task A7 — Remover entidades obsoletas do product schema

**Ficheiro:** `packages/schemas/src/db/schema.ts`

As seguintes tabelas deixam de existir no product branch:
- `users` — eliminada (baUser é o único user)
- `memberships` — eliminada (1:1 org/user)
- `roles` — eliminada (role implícita como owner)

**Step 1: Remover exports e tabelas**

No `schema.ts`, apagar as definições de `users`, `roles`, `memberships`.

**Step 2: Corrigir todas as referências**

```bash
# Encontrar todos os ficheiros que importam users/memberships/roles
grep -r "from.*schema.*import.*\b(users|memberships|roles)\b" apps/ packages/ workers/ --include="*.ts"
```

Para cada ficheiro encontrado:
- Se usa `users.id` para filtrar → substituir por `baUser.id` no auth DB, ou remover se era só para reconciliação
- Se usa `memberships` → remover (não existe multi-membership)
- Se usa `roles` → remover ou substituir por `platformAdmin` bool

**Step 3: Migration de remoção no product branch**

```bash
pnpm db:generate   # gera DROP TABLE para users, memberships, roles
pnpm db:migrate    # aplica no Neon product branch
```

> ⚠️ Verificar primeiro se há dados reais nestas tabelas no product branch antes de aplicar DROP.

**Step 4: Typecheck completo**
```bash
pnpm typecheck
```
Expected: 0 errors.

**Step 5: Commit**
```bash
git add packages/schemas/ migrations/
git commit -m "feat(schemas): remove domain users, memberships, roles — auth branch is source of truth"
```

---

### Task A8 — Seed de auth branch (dev + staging)

**Ficheiro a criar:** `packages/schemas/src/seeds/auth.seed.ts`

```typescript
// Cria: 1 platform admin user + 1 org Bekaa para desenvolvimento local
// Nunca usar dados reais. Só para dev/staging.

import { db } from "./db-auth"; // client apontando para AUTH_DATABASE_URL
import { baUser, organizations } from "@standard/schemas";
import { hashPassword } from "@better-auth/utils/password";

async function seed() {
  const userId = crypto.randomUUID();
  const orgId  = crypto.randomUUID();

  await db.insert(baUser).values({
    id:            userId,
    name:          "Platform Admin",
    email:         "admin@bekaa.eu",
    emailVerified: true,
    platformAdmin: true,
    approved:      true,
  });

  await db.insert(organizations).values({
    id:     orgId,
    name:   "Bekaa",
    slug:   "bekaa",
    userId: userId,
    plan:   "enterprise",
    active: true,
  });

  console.log(`[seed] admin user: ${userId}, org: ${orgId}`);
}

seed().catch(console.error);
```

**Step 2: Script no package.json raiz**
```json
{ "scripts": { "db:seed:auth": "tsx packages/schemas/src/seeds/auth.seed.ts" } }
```

**Step 3: Commit**
```bash
git add packages/schemas/src/seeds/auth.seed.ts
git commit -m "chore(schemas): auth branch dev seed — platform admin + bekaa org"
```

---

### Task A9 — Testes de contrato auth middleware

**Ficheiro:** `apps/api-gateway/src/__tests__/auth.middleware.contract.test.ts`

```typescript
describe("resolveAuthContext", () => {
  it("sets actorId and organizationId for valid API key (KV hit)", async () => { ... });
  it("sets actorId and organizationId for valid API key (DB fallback)", async () => { ... });
  it("throws 401 for invalid API key", async () => { ... });
  it("resolves session from cookie and sets org context from KV", async () => { ... });
  it("throws 403 for unapproved user (non-platform-admin)", async () => { ... });
  it("throws 401 for revoked user (hard revocation in KV)", async () => { ... });
  it("allows platform admin without approved flag", async () => { ... });
  it("throws 401 when requireAuth=true and no credentials", async () => { ... });
});
```

**Step 2: Correr testes**
```bash
pnpm test --filter api-gateway
```
Expected: todos passam.

**Step 3: Commit**
```bash
git add apps/api-gateway/src/__tests__/auth.middleware.contract.test.ts
git commit -m "test(gateway): auth middleware contract tests — api key, session, revocation, approval gate"
```

---

### Task A10 — Verificação final e documentação

**Step 1: Typecheck completo monorepo**
```bash
pnpm typecheck
```
Expected: 0 errors em 28 packages.

**Step 2: Testes**
```bash
pnpm test
```

**Step 3: Actualizar `docs/decisions/ADR-015-better-auth-containment.md`**

Documentar a decisão de separar auth branch do product branch e a eliminação do dual-identity.

**Step 4: Actualizar `AGENTS.md` — secção 18 (Contamination Control)**

Remover referências a `users` do domínio e `memberships` da tabela de anti-padrões, uma vez que foram eliminados.

**Step 5: Commit final**
```bash
git add docs/ AGENTS.md
git commit -m "docs: update adr-015 and agents.md — auth simplification complete"
git push origin main
```

---

## Resumo de impacto

| Área | Antes | Depois |
|---|---|---|
| Entidades de user | 2 (`baUser` + `users`) | 1 (`baUser`) |
| Middleware linhas | 478 | ~110 |
| Queries por request auth | 2-4 DB queries | 0-1 (KV first) |
| `customSession` plugin | Sim (200+ linhas) | Não |
| `F9-trace` console.log | Sim | Não |
| Cross-DB reconciliação | Sim (`identityProviderSubject`) | Não |
| DBs separados | Não (tudo Neon main) | Sim (auth + product) |
| Tables eliminadas | — | `users`, `memberships`, `roles` |

## Riscos

| Risco | Mitigação |
|---|---|
| `organization_id` no product DB sem FK cross-DB | Validação no middleware — se `context.organizationId` não vier do auth, request é rejeitado |
| Dados existentes em `users`/`memberships` no Neon product | Verificar antes da migration de DROP — exportar se necessário |
| Workers (ingestion, queues) que usam `users` domain | Task A7 mapeia todas as referências antes de apagar |
| Better Auth migration entre branches | auth.ts simplificado é compatível com BA — não muda o protocolo |

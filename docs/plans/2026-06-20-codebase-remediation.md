# Standard API — Plano de Remediação Completo

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Remediar todos os 47 findings da análise de codebase, organizados em 6 fases por criticidade e dependência.

**Architecture:** Correções incrementais com commits atômicos, priorizando segurança → qualidade → consistência → arquitetura → testes. Cada fase é independente e pode ser executada como um PR separado.

**Tech Stack:** TypeScript 6, Drizzle ORM, Zod 4, Cloudflare Workers, Vitest, ESLint

---

## Fase 0 — 🔴 Segurança Crítica (IMEDIATA)

> [!CAUTION]
> Estas tasks contêm vulnerabilidades ativas em produção. Executar ANTES de qualquer outra fase.

---

### Task 1: Remover Stack Trace da Resposta Auth 500

**Findings:** F-01, F-10

**Files:**
- Modify: `apps/api-gateway/src/index.ts:45-57`

**Step 1: Fix the error response**

Replace lines 45-57 in `apps/api-gateway/src/index.ts`:

```typescript
// BEFORE (lines 45-57):
} catch (err: any) {
  console.error("[standard:auth] Route Error:", err);
  return new Response(
    JSON.stringify({
      error: "Auth 500",
      detail: err.message || err.toString(),
      stack: err.stack,
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}

// AFTER:
} catch (err: unknown) {
  console.error("[standard:auth] Route Error:", err);
  return new Response(
    JSON.stringify({
      error: "internal_server_error",
      message: "An internal authentication error occurred.",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}
```

**Step 2: Verify**

Run: `pnpm typecheck`
Expected: No new errors

**Step 3: Commit**

```bash
git add apps/api-gateway/src/index.ts
git commit -m "fix(security): remove stack trace and error details from auth 500 response

Removes err.stack and err.message from the JSON response body to prevent
information disclosure. Internal errors are still logged to console for debugging.

Findings: F-01, F-10

Co-Authored-By: Google Antigravity"
```

---

### Task 2: Remover Sentry DSN Hardcoded

**Finding:** F-29

**Files:**
- Modify: `apps/api-gateway/src/index.ts:17-19`
- Modify: `workers/queues/src/index.ts:57-59`

**Step 1: Fix api-gateway**

```typescript
// BEFORE (lines 17-19):
dsn:
  (env as any).SENTRY_DSN ||
  "https://b7d62614acaef427ce2de36228779c08@o4509995422515200.ingest.us.sentry.io/4511521270792192",

// AFTER:
dsn: (env as any).SENTRY_DSN || "",
```

**Step 2: Fix queues worker**

```typescript
// BEFORE (lines 57-59):
dsn:
  env.SENTRY_DSN ||
  "https://b7d62614acaef427ce2de36228779c08@o4509995422515200.ingest.us.sentry.io/4511521270792192",

// AFTER:
dsn: env.SENTRY_DSN || "",
```

**Step 3: Verify**

Run: `pnpm typecheck`
Run: `grep -r "b7d62614acaef427ce2de36228779c08" apps/ workers/` → Expected: 0 results

**Step 4: Commit**

```bash
git add apps/api-gateway/src/index.ts workers/queues/src/index.ts
git commit -m "fix(security): remove hardcoded Sentry DSN from source code

Sentry DSN must be provided via SENTRY_DSN env var / CF secret.
Fallback is now empty string (Sentry silently disables when DSN is empty).

Finding: F-29

Co-Authored-By: Google Antigravity"
```

---

### Task 3: Corrigir Default RBAC Permissivo

**Finding:** F-05

**Files:**
- Modify: `apps/api-gateway/src/middleware/rbac.middleware.ts:87-94`

**Step 1: Change default role from tenant_admin to assessor**

```typescript
// BEFORE (lines 87-94):
} else {
  // Regular tenant owner/admin gets tenant_admin permissions to manage their org
  const rolePerms =
    DEFAULT_ROLE_PERMISSIONS[
      "tenant_admin" as keyof typeof DEFAULT_ROLE_PERMISSIONS
    ];
  if (rolePerms) actorPermissions.push(...rolePerms);
}

// AFTER:
} else {
  // Default to assessor (least privilege) — explicit role assignment required for higher access
  const rolePerms =
    DEFAULT_ROLE_PERMISSIONS[
      "assessor" as keyof typeof DEFAULT_ROLE_PERMISSIONS
    ];
  if (rolePerms) actorPermissions.push(...rolePerms);
}
```

**Step 2: Verify**

Run: `pnpm typecheck`
Run: `pnpm test:unit` → Ensure no RBAC test failures

**Step 3: Commit**

```bash
git add apps/api-gateway/src/middleware/rbac.middleware.ts
git commit -m "fix(security): change default RBAC fallback from tenant_admin to assessor

Applies least-privilege principle: session users without explicit role
assignment default to 'assessor' instead of 'tenant_admin'.
Higher privileges require explicit role assignment via organization membership.

BREAKING CHANGE: Users without explicit roles will have reduced permissions.
Existing tenant admins should be explicitly assigned the tenant_admin role.

Finding: F-05

Co-Authored-By: Google Antigravity"
```

---

### Task 4: Corrigir Bug no Observability Repository

**Finding:** F-30

**Files:**
- Modify: `apps/api-gateway/src/routes/observability.routes.ts:53`

**Step 1: Fix the filter field**

```typescript
// BEFORE (line 53):
    assessment_id: assessment.assessment_id,

// AFTER:
    assessment_id: assessment.id ?? assessment.assessment_id,
```

> [!NOTE]
> Este fix usa fallback para compatibilidade entre adaptadores in-memory (que usam `assessment_id` como PK) e DB (que usa `id`). Verificar o tipo `AssessmentRecord` para confirmar o campo correto.

**Step 2: Verify**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add apps/api-gateway/src/routes/observability.routes.ts
git commit -m "fix(observability): correct assessment_id filter in audit log query

The filter was potentially using the wrong field depending on the repository
adapter, causing audit logs to return empty results for valid assessments.

Finding: F-30

Co-Authored-By: Google Antigravity"
```

---

### Task 5: Restringir CSRF Origin Bypass

**Finding:** F-18

**Files:**
- Modify: `apps/api-gateway/src/middleware/csrf.middleware.ts:128-137`

**Step 1: Replace wildcard .endsWith with exact match**

```typescript
// BEFORE (lines 128-133):
  const isAlwaysAllowed =
    origin === "https://standard.bekaa.eu" ||
    origin === "https://standard-web.pages.dev" ||
    origin === "https://standard-web-production.pages.dev" ||
    origin.endsWith(".standard-web.pages.dev") ||
    origin.endsWith(".standard-web-production.pages.dev");

// AFTER:
  const isAlwaysAllowed =
    origin === "https://standard.bekaa.eu" ||
    origin === "https://standard-web.pages.dev" ||
    origin === "https://standard-web-production.pages.dev";
  // Preview deployments (*.pages.dev) no longer bypass CSRF.
  // Add specific preview URLs to ALLOWED_ORIGINS env var if needed.
```

**Step 2: Verify**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add apps/api-gateway/src/middleware/csrf.middleware.ts
git commit -m "fix(security): restrict CSRF bypass to exact production origins only

Removes wildcard .endsWith() matching for *.pages.dev subdomains.
Preview deployments must be explicitly added to ALLOWED_ORIGINS env var.
Prevents compromised preview deployments from bypassing CSRF protection.

Finding: F-18

Co-Authored-By: Google Antigravity"
```

---

### Task 6: Deprecar JWT Decode-Only com Guard de Produção

**Finding:** F-03

**Files:**
- Modify: `packages/security/src/auth/jwt-auth-provider.ts:96-107`

**Step 1: Add production guard to buildJwtConfig**

```typescript
// BEFORE (lines 96-107):
export const buildJwtConfig = (env: {
  JWT_JWKS_URL?: string;
  JWT_SECRET?: string;
}): JwtAuthConfig => {
  if (env.JWT_JWKS_URL) return { mode: "jwks", jwksUrl: env.JWT_JWKS_URL };
  if (env.JWT_SECRET) return { mode: "secret", secret: env.JWT_SECRET };
  return { mode: "decode-only" };
};

// AFTER:
export const buildJwtConfig = (env: {
  JWT_JWKS_URL?: string;
  JWT_SECRET?: string;
  NODE_ENV?: string;
  STANDARD_ENV?: string;
}): JwtAuthConfig => {
  if (env.JWT_JWKS_URL) return { mode: "jwks", jwksUrl: env.JWT_JWKS_URL };
  if (env.JWT_SECRET) return { mode: "secret", secret: env.JWT_SECRET };
  const isProduction =
    env.NODE_ENV === "production" || env.STANDARD_ENV === "production";
  if (isProduction) {
    throw new Error(
      "[SECURITY] JWT_JWKS_URL or JWT_SECRET must be set in production. " +
      "decode-only mode is forbidden in production environments."
    );
  }
  console.warn(
    "[SECURITY] JwtAuthProvider running in decode-only mode (NO signature verification). " +
    "This is UNSAFE and only allowed in development/test."
  );
  return { mode: "decode-only" };
};
```

**Step 2: Verify**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add packages/security/src/auth/jwt-auth-provider.ts
git commit -m "fix(security): block JWT decode-only mode in production environments

Throws a SecurityError if neither JWT_JWKS_URL nor JWT_SECRET is configured
in production. decode-only mode (no signature verification) is now restricted
to development/test environments with a console warning.

Finding: F-03

Co-Authored-By: Google Antigravity"
```

---

## Fase 1 — 🟠 Higiene de Repositório

> [!IMPORTANT]
> Limpeza de arquivos soltos, outputs commitados e credenciais em scripts.

---

### Task 7: Limpar Arquivos Soltos do Root

**Finding:** F-46

**Files:**
- Delete: `query-auth-tables.ts`, `query-memberships.ts`, `query-org.ts`, `query-tables.ts`, `query-user.ts`
- Delete: `scratch-keys.ts`, `scratch-orgs.ts`, `scratch-recover.ts`
- Delete: `fix-role.ts`
- Delete: `lint-output.txt`, `lint-results.txt`, `redocly-results.json`
- Move: `inject_openapi.js` → `scripts/inject_openapi.js`

**Step 1: Remove files**

```bash
git rm query-auth-tables.ts query-memberships.ts query-org.ts query-tables.ts query-user.ts
git rm scratch-keys.ts scratch-orgs.ts scratch-recover.ts
git rm fix-role.ts
git rm lint-output.txt lint-results.txt redocly-results.json
git mv inject_openapi.js scripts/inject_openapi.js
```

**Step 2: Add to .gitignore**

Append to `.gitignore`:
```
# Debug query scripts
query-*.ts
scratch-*.ts
fix-*.ts

# Lint/tool output files
lint-output.txt
lint-results.txt
redocly-results.json
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: remove 12 loose debug/scratch files from root

Removes query-*.ts, scratch-*.ts, fix-role.ts (one-off DB scripts) and
lint-output.txt, lint-results.txt, redocly-results.json (build artifacts).
Moves inject_openapi.js to scripts/. Updates .gitignore to prevent recurrence.

Finding: F-46

Co-Authored-By: Google Antigravity"
```

---

### Task 8: Limpar Build Logs de apps/web

**Finding:** F-32

**Files:**
- Delete: `apps/web/build_attempt_v2.log`, `apps/web/build_attempt_v3.log`, `apps/web/build_error.log`
- Delete: `apps/web/pnpm_*.log` (all 4), `apps/web/tsc_errors.log`, `apps/web/vite_errors.log`, `apps/web/vite_build_error.txt`, `apps/web/projects.txt`
- Delete: `apps/web/pnpm_downgrade_plugin.log`
- Modify: `apps/web/.gitignore` (create if needed)

**Step 1: Remove files and update .gitignore**

```bash
cd apps/web
git rm -f build_attempt_v2.log build_attempt_v3.log build_error.log
git rm -f pnpm_add_vite.log pnpm_add_vite_final.log pnpm_add_vite_v2.log pnpm_dev_add_vite.log pnpm_dev_add_vite_v2.log pnpm_downgrade_plugin.log
git rm -f tsc_errors.log vite_errors.log vite_build_error.txt projects.txt
```

Add to `apps/web/.gitignore`:
```
*.log
*.txt
!README.txt
```

**Step 2: Commit**

```bash
git add apps/web/.gitignore
git commit -m "chore(web): remove 13 build error log files

Removes committed build/debug logs and adds .gitignore rules to prevent recurrence.

Finding: F-32

Co-Authored-By: Google Antigravity"
```

---

### Task 9: Sanitizar Scripts com Credenciais Hardcoded

**Finding:** Novo (encontrado durante pesquisa) — 3 scripts com credenciais Neon

**Files:**
- Modify: `scripts/fix-all-scf-columns.mjs:1-3`
- Modify: `scripts/clean_user.ts:3`
- Modify: `scripts/drop_erroneous_tables.ts:3`

**Step 1: Replace hardcoded credentials with env vars**

Em cada arquivo, substituir a connection string hardcoded por:

```typescript
import { config } from "dotenv";
config();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
```

**Step 2: Commit**

```bash
git add scripts/fix-all-scf-columns.mjs scripts/clean_user.ts scripts/drop_erroneous_tables.ts
git commit -m "fix(security): remove hardcoded Neon credentials from scripts

Replaces inline connection strings with DATABASE_URL env var.
Credentials exposed in git history should be rotated.

Co-Authored-By: Google Antigravity"
```

---

### Task 10: Limpar Scripts Obsoletos

**Finding:** F-08

**Step 1: Move one-off scripts to _deprecated**

```bash
mkdir -p scripts/_archive
git mv scripts/DEPLOY_OFICIAL.bat scripts/_archive/
git mv scripts/FINAL.bat scripts/_archive/
git mv scripts/SOLUCAO_DEPLOY.bat scripts/_archive/
git mv scripts/run_web.bat scripts/_archive/
git mv scripts/fix_vite.ps1 scripts/_archive/
git mv scripts/force.mjs scripts/_archive/
git mv scripts/fix-and-run.mjs scripts/_archive/
git mv scripts/fix-nuvem.mjs scripts/_archive/
git mv scripts/fix-client.cjs scripts/_archive/
git mv scripts/fix-client2.cjs scripts/_archive/
git mv scripts/fix-constants.cjs scripts/_archive/
git mv scripts/fix-docs.cjs scripts/_archive/
git mv scripts/fix-interpolation.cjs scripts/_archive/
git mv scripts/final-patch.cjs scripts/_archive/
git mv scripts/force-patch.cjs scripts/_archive/
git mv scripts/ultimate-patch.cjs scripts/_archive/
git mv scripts/patch-classes.cjs scripts/_archive/
git mv scripts/patch-methods.cjs scripts/_archive/
git mv scripts/deploy.mjs scripts/_archive/
git mv scripts/deploy-direto.mjs scripts/_archive/
git mv scripts/deploy_safe.mjs scripts/_archive/
```

**Step 2: Remove output text files**

```bash
git rm scripts/columns-report.txt scripts/db-introspect-report.txt scripts/deploy-output.txt
git rm scripts/frozen-test.txt scripts/frozen-test2.txt scripts/frozen-test3.txt
git rm scripts/install-output.txt scripts/migration-output.txt scripts/openapi-operations.txt
git rm scripts/prod-state.txt scripts/scf-data-report.txt scripts/sdk-methods.txt
git rm scripts/seed-output.txt scripts/tail-output.txt scripts/typecheck-output.txt
git rm scripts/vectorize-list.txt
```

**Step 3: Remove DESTRUIR-FANTASMAS script from package.json (line 17)**

```json
// REMOVE this line from package.json:
"DESTRUIR-FANTASMAS": "node force.mjs",
```

**Step 4: Add .gitignore rule**

Append to `scripts/.gitignore`:
```
*.txt
*.log
_archive/
```

**Step 5: Commit**

```bash
git add -A scripts/ package.json
git commit -m "chore: archive 21 one-off scripts and remove 16 output files

Archives BAT files, patch scripts, and one-off fixes to scripts/_archive/.
Removes committed text output files. Removes DESTRUIR-FANTASMAS script entry.
Retains legitimate build scripts (deploy-cloudflare, generate-openapi, etc).

Finding: F-08, F-39

Co-Authored-By: Google Antigravity"
```

---

### Task 11: Alinhar Versão Node

**Finding:** F-20, F-38

**Files:**
- Modify: `package.json:9` — engines.node `"20.x"` → `">=22"`
- Modify: `README.md:37` — Node 20.x → Node 22
- Create: `.nvmrc` — conteúdo: `22`
- Create: `.node-version` — conteúdo: `22`

**Step 1: Update all references**

`package.json` line 9:
```json
"engines": { "node": ">=22" }
```

`README.md` line 37 — update to mention Node 22.

Create `.nvmrc`:
```
22
```

Create `.node-version`:
```
22
```

**Step 2: Verify**

Run: `node --version` → Confirm v22.x

**Step 3: Commit**

```bash
git add package.json README.md .nvmrc .node-version
git commit -m "chore: align Node.js version to 22 across all references

Updates package.json engines, README, adds .nvmrc and .node-version.
CI already uses Node 22, CONTRIBUTING.md already says >= 22.

Finding: F-20, F-38

Co-Authored-By: Google Antigravity"
```

---

### Task 12: Remover tests/unit de .gitignore

**Finding:** F-44

**Files:**
- Modify: `.gitignore:90`

**Step 1: Remove the line**

```
# REMOVE this line (line 90):
tests/unit/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "fix: remove tests/unit/ from .gitignore

Unit tests in tests/unit/ were being silently excluded from git.
This was likely added accidentally during debugging.

Finding: F-44

Co-Authored-By: Google Antigravity"
```

---

## Fase 2 — ⚙️ Consistência de Configuração

> [!NOTE]
> Alinhamento de TypeScript, ESLint, vitest e workspace protocol.

---

### Task 13: Normalizar TypeScript Versions

**Finding:** F-21

**Files:**
- Modify: 15 packages `package.json` — change `"typescript": "latest"` to `"typescript": "catalog:"`
- Modify: `packages/integration-mcp/package.json` — `"^5.0.0"` → `"catalog:"`
- Modify: `packages/sdk/package.json` — `"^5.4.5"` → `"catalog:"`
- Modify: `pnpm-workspace.yaml` — add `catalog`

**Step 1: Add catalog to pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'workers/*'
  - 'packages/*'

catalog:
  typescript: "6.0.3"
```

**Step 2: Update each package.json**

For all 18 packages with typescript in devDependencies, change to:
```json
"typescript": "catalog:"
```

**Step 3: Verify**

Run: `pnpm install`
Run: `pnpm typecheck`

**Step 4: Commit**

```bash
git add pnpm-workspace.yaml packages/*/package.json pnpm-lock.yaml
git commit -m "chore: normalize TypeScript version to 6.0.3 via pnpm catalog

All 18 packages now reference typescript via pnpm catalog instead of
'latest', '^5.0.0', or '^5.4.5'. Single source of truth for TS version.

Finding: F-21

Co-Authored-By: Google Antigravity"
```

---

### Task 14: Auth tsconfig — Extend Base

**Finding:** F-24

**Files:**
- Modify: `packages/auth/tsconfig.json`

**Step 1: Rewrite to extend base**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 2: Verify**

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add packages/auth/tsconfig.json
git commit -m "fix(auth): extend base tsconfig for consistent compiler options

Inherits noUncheckedIndexedAccess, path aliases, and other strict options
from tsconfig.base.json instead of defining standalone config.

Finding: F-24

Co-Authored-By: Google Antigravity"
```

---

### Task 15: Fix workspace:^ Inconsistency

**Finding:** F-42

**Files:**
- Modify: `packages/gap-analysis/package.json:16`

**Step 1: Change workspace:^ to workspace:***

```json
// BEFORE:
"@standard/observability": "workspace:^",

// AFTER:
"@standard/observability": "workspace:*",
```

**Step 2: Commit**

```bash
git add packages/gap-analysis/package.json
git commit -m "fix(gap-analysis): use workspace:* for @standard/observability

Aligns with all other workspace references in the monorepo.

Finding: F-42

Co-Authored-By: Google Antigravity"
```

---

### Task 16: Mover @types/react para devDependencies

**Finding:** F-12

**Files:**
- Modify: `packages/agent-runtime/package.json:15`

**Step 1: Move from dependencies to devDependencies**

```json
// REMOVE from "dependencies":
"@types/react": "^19.2.14",

// ADD to "devDependencies":
"devDependencies": {
  "@types/react": "^19.2.14",
  "typescript": "catalog:"
}
```

**Step 2: Verify**

Run: `pnpm install`
Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add packages/agent-runtime/package.json pnpm-lock.yaml
git commit -m "fix(agent-runtime): move @types/react to devDependencies

Backend-only package should not have React types in production dependencies.
Required by Vercel AI SDK types but only needed at compile time.

Finding: F-12

Co-Authored-By: Google Antigravity"
```

---

### Task 17: Fortalecer ESLint Config

**Finding:** F-07

**Files:**
- Modify: `eslint.config.js`

**Step 1: Enable no-explicit-any as warn and add key rules**

```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.wrangler/**",
      "**/coverage/**",
      "apps/web/**",
      "workers/smoke-tester/**",
      "scratch/**",
      "evals/**",
      "scripts/_archive/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,js}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
```

**Step 2: Verify**

Run: `pnpm lint` → Expect warnings (not errors) for existing `any` usage

**Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "chore(lint): enable no-explicit-any as warning and restrict console.log

Gradually surface type safety issues without breaking the build.
console.log is now warned (console.warn/error still allowed).

Finding: F-07

Co-Authored-By: Google Antigravity"
```

---

### Task 18: Completar Vitest Aliases

**Finding:** F-26

**Files:**
- Modify: `vitest.config.ts`

**Step 1: Add all missing package aliases**

```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

const pkg = (name: string) =>
  resolve(__dirname, `packages/${name}/src/index.ts`);

export default defineConfig({
  resolve: {
    alias: {
      "@standard/assessment-engine": pkg("assessment-engine"),
      "@standard/schemas": pkg("schemas"),
      "@standard/scf-core": pkg("scf-core"),
      "@standard/domain": pkg("domain"),
      "@standard/agent-runtime": pkg("agent-runtime"),
      "@standard/auth": pkg("auth"),
      "@standard/contracts": pkg("contracts"),
      "@standard/document-ingestion": pkg("document-ingestion"),
      "@standard/email": pkg("email"),
      "@standard/gap-analysis": pkg("gap-analysis"),
      "@standard/kb": pkg("kb"),
      "@standard/maturity": pkg("maturity"),
      "@standard/observability": pkg("observability"),
      "@standard/poam": pkg("poam"),
      "@standard/privacy": pkg("privacy"),
      "@standard/reporting": pkg("reporting"),
      "@standard/scf-data": pkg("scf-data"),
      "@standard/sdk": pkg("sdk"),
      "@standard/security": pkg("security"),
      "@standard/soa": pkg("soa"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
      "workers/*/src/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts", "**/node_modules/**"],
    },
  },
});
```

**Step 2: Verify**

Run: `pnpm test:unit`

**Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "fix(test): add missing vitest aliases for all 20 workspace packages

Prevents cross-package import resolution failures during testing.
Uses helper function to reduce duplication.

Finding: F-26

Co-Authored-By: Google Antigravity"
```

---

## Fase 3 — 🗄️ Integridade de Dados

> [!IMPORTANT]
> Correções no schema de banco de dados. Requerem migration.

---

### Task 19: Corrigir customStrmMappings — Usar strmOperatorEnum

**Finding:** F-14

**Files:**
- Modify: `packages/schemas/src/db/custom-frameworks.ts:2,59`
- Create: migration SQL

**Step 1: Update the import and column type**

```typescript
// Line 2 — add strmOperatorEnum to imports:
import { organizations, scfFrameworkRequirements, strmOperatorEnum } from "./schema";

// Line 59 — replace text() with enum:
// BEFORE:
relationshipType: text("relationship_type").notNull(), // 'intersects', 'equal', 'subset', 'superset', 'no_relation'

// AFTER:
relationshipType: strmOperatorEnum("relationship_type").notNull(),
```

**Step 2: Generate migration**

Run: `pnpm db:generate`
Verify the generated SQL converts `text` → `strm_operator` enum

**Step 3: Verify**

Run: `pnpm typecheck`

**Step 4: Commit**

```bash
git add packages/schemas/src/db/custom-frameworks.ts infra/docker/postgres/migrations/
git commit -m "fix(schema): enforce strmOperatorEnum on customStrmMappings.relationshipType

Replaces text() with strmOperatorEnum to enforce canonical STRM operator
values at the database level, per ADR-001.

Finding: F-14

Co-Authored-By: Google Antigravity"
```

---

## Fase 4 — 🏗️ Correções de Arquitetura

---

### Task 20: Remover Consumer Duplicado de Document Ingestion

**Finding:** F-31

**Files:**
- Modify: `workers/queues/wrangler.toml:33-38` — remove consumer config
- Modify: `workers/queues/src/index.ts:108-113` — remove case handler

**Step 1: Remove queue consumer from wrangler.toml**

Remove lines 33-38 in `workers/queues/wrangler.toml`:
```toml
# REMOVE:
[[queues.consumers]]
queue = "standard-document-ingestion-dev"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "standard-dead-letter-dev"
```

Also remove equivalent sections for staging and production environments.

**Step 2: Remove case handler from index.ts**

Remove lines 108-113:
```typescript
// REMOVE:
case "document_ingestion":
  // Handled by dedicated ingestion worker via separate queue consumer
  console.log(
    `[queues] document_ingestion job routed to ingestion worker`,
  );
  break;
```

**Step 3: Verify**

Run: `pnpm typecheck`

**Step 4: Commit**

```bash
git add workers/queues/wrangler.toml workers/queues/src/index.ts
git commit -m "fix(queues): remove duplicate document_ingestion consumer

Cloudflare Queues only supports one consumer per queue.
The dedicated ingestion worker handles this queue.
The queues worker had a no-op handler that conflicted.

Finding: F-31

Co-Authored-By: Google Antigravity"
```

---

### Task 21: Alinhar Nomes de Filas Terraform ↔ Wrangler

**Finding:** F-19

**Files:**
- Modify: `infra/terraform/main.tf:29-37`

**Step 1: Update Terraform queue names to match Wrangler**

```hcl
# BEFORE:
resource "cloudflare_queue" "ingestion" {
  account_id = var.cloudflare_account_id
  name       = "document-ingestion-queue-${var.environment}"
}

resource "cloudflare_queue" "agent_run" {
  account_id = var.cloudflare_account_id
  name       = "agent-run-queue-${var.environment}"
}

# AFTER:
resource "cloudflare_queue" "ingestion" {
  account_id = var.cloudflare_account_id
  name       = "standard-document-ingestion-${var.environment}"
}

resource "cloudflare_queue" "agent_run" {
  account_id = var.cloudflare_account_id
  name       = "standard-agent-run-${var.environment}"
}
```

**Step 2: Add missing queues**

Add resources for the 5 missing queues to match wrangler.toml:
```hcl
resource "cloudflare_queue" "kb_embedding" {
  account_id = var.cloudflare_account_id
  name       = "standard-kb-embedding-${var.environment}"
}

resource "cloudflare_queue" "report_export" {
  account_id = var.cloudflare_account_id
  name       = "standard-report-export-${var.environment}"
}

resource "cloudflare_queue" "user_lifecycle" {
  account_id = var.cloudflare_account_id
  name       = "standard-user-lifecycle-${var.environment}"
}

resource "cloudflare_queue" "agent_usage" {
  account_id = var.cloudflare_account_id
  name       = "standard-agent-usage-${var.environment}"
}

resource "cloudflare_queue" "dead_letter" {
  account_id = var.cloudflare_account_id
  name       = "standard-dead-letter-${var.environment}"
}
```

**Step 3: Commit**

```bash
git add infra/terraform/main.tf
git commit -m "fix(infra): align Terraform queue names with Wrangler config and add missing queues

Renames 2 existing queues and adds 5 missing queue resources to match
the actual Cloudflare Queues used in wrangler.toml configs.

Finding: F-19

Co-Authored-By: Google Antigravity"
```

---

## Fase 5 — 🧪 Fundação de Testes

> [!NOTE]
> Configurar thresholds de coverage e expandir testes para pacotes críticos.

---

### Task 22: Adicionar Coverage Thresholds

**Finding:** F-45

**Files:**
- Modify: `vitest.config.ts` — add thresholds

**Step 1: Add coverage thresholds**

Add inside `coverage` config:
```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json-summary"],
  include: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
  exclude: ["**/*.test.ts", "**/*.d.ts", "**/node_modules/**"],
  thresholds: {
    lines: 30,
    functions: 30,
    branches: 30,
    statements: 30,
  },
},
```

> [!TIP]
> Começar com 30% e aumentar progressivamente conforme testes são adicionados (Task 23-26).

**Step 2: Verify**

Run: `pnpm test:unit -- --coverage`

**Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore(test): add initial coverage thresholds at 30%

Sets a baseline coverage gate. To be increased as test coverage
is expanded for untested packages.

Finding: F-45

Co-Authored-By: Google Antigravity"
```

---

### Task 23-26: Criar Testes para Pacotes Críticos Sem Cobertura

**Finding:** F-09

> [!IMPORTANT]
> Estas tasks são esqueleto — cada uma requer implementação de testes reais seguindo TDD.
> Prioridade: observability > gap-analysis > soa > kb > poam

#### Task 23: Testes para `@standard/observability`

**Files:**
- Create: `packages/observability/src/__tests__/audit-event.service.test.ts`
- Create: `packages/observability/src/__tests__/ledger.service.test.ts`
- Create: `packages/observability/src/__tests__/redaction.test.ts`

**Test areas:**
- `AuditEventService.record()` → validates metadata safety, persists event
- `LedgerService.append()` → append-only constraint, event type validation
- `assertMetadataSafe()` → rejects sensitive field names
- Redaction engine → redacts 18 sensitive fields

#### Task 24: Testes para `@standard/gap-analysis`

**Files:**
- Create: `packages/gap-analysis/src/__tests__/gap-draft.service.test.ts`
- Create: `packages/gap-analysis/src/__tests__/gap-validation.service.test.ts`

**Test areas:**
- Gap draft creation with ROC determination
- Evidence → gap mapping
- Validation of MCR flags
- Review/approval workflow

#### Task 25: Testes para `@standard/soa`

**Files:**
- Create: `packages/soa/src/__tests__/soa-draft.service.test.ts`
- Create: `packages/soa/src/__tests__/soa-approval.service.test.ts`

**Test areas:**
- SoA draft generation from scope + SCF controls
- Applicability determination
- Approval gate enforcement
- Version chain with `superseded_by`

#### Task 26: Testes para `@standard/kb`

**Files:**
- Create: `packages/kb/src/__tests__/search.service.test.ts`
- Create: `packages/kb/src/__tests__/embedding.service.test.ts`

**Test areas:**
- Semantic search with mock Vectorize
- Embedding generation with mock AI
- Reprocessing flow
- Tenant isolation in vector namespace

---

## Fase 6 — 📋 Backlog Documentado

> Itens que requerem decisão de produto ou esforço significativo. Não bloquear o plano atual.

---

### Task 27: [BACKLOG] Implementar AssessmentLifecycleWorkflow

**Finding:** F-06  
**Esforço:** 2-3 sprints  
**Arquivo:** `workers/workflows/src/assessment-lifecycle.ts`

O workflow atual é scaffold. Precisa implementar:
- 26 estados do lifecycle com `step.do()` para cada transição
- `step.waitForEvent()` para approval gates (SoA, gap_analysis, maturity, poam, report)
- Queue dispatching para agent runs, document ingestion
- State persistence via PostgreSQL
- Error handling com retry policies
- Checkpoint/resume para durabilidade

> **Recomendação:** Criar issue dedicada com spec completa do state machine antes de implementar.

---

### Task 28: [BACKLOG] Implementar Queue Consumers Stub

**Finding:** F-16  
**Esforço:** 1-2 sprints  
**Arquivos:** `workers/queues/src/index.ts` (lines 100-121)

Implementar:
- `report_export` → Render report template → PDF → Upload R2 → Update DB
- `soc_triage` → AI-powered alert analysis → Routing → Notification

---

### Task 29: [BACKLOG] Ativar Malware Scanning

**Finding:** F-02  
**Esforço:** 1 sprint  
**Arquivo:** `packages/security/src/constants.ts:247`

Opções:
1. Deploy ClamAV container + REST API → Set `CLAMAV_API_URL` → Toggle `require_malware_scan: true`
2. Implementar `CloudflareWorkerScanProvider` com CF Workers AI para análise básica
3. Integrar serviço SaaS (VirusTotal, MetaDefender)

---

### Task 30: [BACKLOG] Particionar schema.ts

**Finding:** F-13  
**Esforço:** 1 sprint  
**Arquivo:** `packages/schemas/src/db/schema.ts` (3.243 linhas)

Dividir em módulos por domínio:
```
packages/schemas/src/db/
├── index.ts            (barrel re-exports)
├── enums.ts            (todos os pgEnum)
├── auth.schema.ts      (existente)
├── assessment.schema.ts
├── scf.schema.ts
├── documents.schema.ts
├── soa.schema.ts
├── gap.schema.ts
├── maturity.schema.ts
├── poam.schema.ts
├── reporting.schema.ts
├── agent.schema.ts
├── observability.schema.ts
├── webhook.schema.ts
├── privacy.schema.ts   (existente)
├── custom-frameworks.ts (existente)
└── organization-schema.ts (existente)
```

---

## Resumo de Execução

| Fase | Tasks | Esforço Est. | Tipo |
|------|-------|-------------|------|
| **Fase 0** 🔴 | Tasks 1-6 | 3-4h | Segurança crítica |
| **Fase 1** 🟠 | Tasks 7-12 | 2-3h | Higiene do repo |
| **Fase 2** ⚙️ | Tasks 13-18 | 3-4h | Consistência de config |
| **Fase 3** 🗄️ | Task 19 | 1h | Schema fix + migration |
| **Fase 4** 🏗️ | Tasks 20-21 | 1-2h | Arquitetura/infra |
| **Fase 5** 🧪 | Tasks 22-26 | 4-6h | Fundação de testes |
| **Fase 6** 📋 | Tasks 27-30 | Backlog | Decisão de produto |

**Total estimado (Fases 0-5):** ~15-20h de trabalho

**Ordem de execução recomendada:** Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5

> [!IMPORTANT]
> Cada fase pode ser um PR separado. Fase 0 (segurança) deve ser mergeada com prioridade máxima.

---

**Plan complete and saved.**

**Next step: run `.agent/workflows/execute-plan.md` to execute this plan task-by-task in single-flow mode.**

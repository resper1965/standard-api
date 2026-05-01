# Aegis Post-Auth Hardening — Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Resolver sistematicamente todos os itens pendentes após a integração do Better Auth — cleanup, deploy staging, secrets, frontend auth e deprecação do legado.

**Architecture:** 5 fases sequenciais de maturidade crescente. Cada fase é atômica: pode ser commitada e deployada independentemente. Não há dependência circular entre fases.

**Tech Stack:** Cloudflare Workers, Better Auth, Drizzle ORM, Neon PostgreSQL, Wrangler CLI, pnpm monorepo

---

## Fase 1: Cleanup do Repositório
*Remover artefatos de desenvolvimento, logs e arquivos temporários que entraram no git por engano.*

### Task 1.1: Remover arquivos temporários tracked

**Files:**
- Delete: `old_schema.ts`
- Delete: `db_url.txt`
- Delete: `deploy_final.txt`
- Delete: `deploy_log.txt`
- Delete: `deploy_log2.txt`
- Delete: `.neon`
- Delete: `packages/schemas/errors.txt`
- Delete: `packages/schemas/migrate_final.txt`
- Delete: `packages/schemas/migrate_log.txt`
- Delete: `packages/security/errors.txt`

**Step 1: Remover arquivos**
```bash
git rm old_schema.ts db_url.txt deploy_final.txt deploy_log.txt deploy_log2.txt .neon packages/schemas/errors.txt packages/schemas/migrate_final.txt packages/schemas/migrate_log.txt packages/security/errors.txt
```

**Step 2: Commit**
```bash
git commit -m "chore: remove temporary dev artifacts and log files

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

### Task 1.2: Adicionar proteções ao .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Adicionar patterns ao .gitignore**
```
# Development artifacts
*.log
deploy_*.txt
migrate_*.txt
errors.txt
old_schema.ts
db_url.txt
.neon
```

**Step 2: Commit**
```bash
git add .gitignore
git commit -m "chore: add gitignore patterns for dev artifacts

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

## Fase 2: Deploy Secrets no Cloudflare
*Configurar todas as variáveis sensíveis no Cloudflare antes do deploy.*

### Task 2.1: Atualizar script put-secrets.mjs

**Files:**
- Modify: `scripts/put-secrets.mjs`

**Step 1: Adicionar novos secrets ao script**

O script deve incluir: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

```javascript
import { spawnSync } from "node:child_process";

// IMPORTANT: Values must be set via environment variables or .env, NEVER hardcoded in git
const secretKeys = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

const workers = [
  "aegis-api-standard-api-gateway",
];

for (const worker of workers) {
  for (const key of secretKeys) {
    const value = process.env[key];
    if (!value) {
      console.warn(`⚠ Skipping ${key} — not set in environment`);
      continue;
    }
    console.log(`Setting ${key} for ${worker}...`);
    spawnSync("npx", ["wrangler", "secret", "put", key, "--name", worker], {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
    });
  }
}
```

**Step 2: Commit**
```bash
git add scripts/put-secrets.mjs
git commit -m "chore(secrets): update put-secrets script for Better Auth and Google OAuth

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

### Task 2.2: Executar push de secrets

**Step 1: Push cada secret manualmente**
```bash
echo "<DATABASE_URL>" | npx wrangler secret put DATABASE_URL --name aegis-api-standard-api-gateway
echo "<BETTER_AUTH_SECRET>" | npx wrangler secret put BETTER_AUTH_SECRET --name aegis-api-standard-api-gateway
echo "<GOOGLE_CLIENT_ID>" | npx wrangler secret put GOOGLE_CLIENT_ID --name aegis-api-standard-api-gateway
echo "<GOOGLE_CLIENT_SECRET>" | npx wrangler secret put GOOGLE_CLIENT_SECRET --name aegis-api-standard-api-gateway
```

> [!IMPORTANT]
> Os valores reais vêm do `.dev.vars` local. Nunca commitar valores de secrets.

---

## Fase 3: Deploy Staging no Cloudflare
*Deployar o API Gateway com Better Auth na Cloudflare.*

### Task 3.1: Deploy do API Gateway

**Step 1: Deploy**
```bash
npx wrangler deploy --config apps/api-gateway/wrangler.toml
```

**Step 2: Verificar**
```bash
curl https://<deployed-url>/api/auth/ok
# Expected: {"ok":true}

curl https://<deployed-url>/api/v1/health
# Expected: {"ok":true,"service":"aegis-api-standard",...}
```

### Task 3.2: Configurar Google OAuth Redirect URI

**Step 1: No Google Cloud Console**
- Navegar para APIs & Services → Credentials
- Editar o OAuth 2.0 Client ID
- Adicionar Authorized redirect URI: `https://<deployed-url>/api/auth/callback/google`
- Salvar

---

## Fase 4: Seed de Dados e Validação
*Criar o primeiro admin, a primeira organization/tenant e validar o fluxo completo.*

### Task 4.1: Criar primeiro admin user

**Step 1: Sign-up via API**
```bash
curl -X POST https://<deployed-url>/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Aegis Admin","email":"admin@bekaa.eu","password":"<strong-password>"}'
```

**Step 2: Promover a admin via SQL (Neon Console)**
```sql
UPDATE "user" SET role = 'admin' WHERE email = 'admin@bekaa.eu';
```

### Task 4.2: Criar primeira organization (tenant)

**Step 1: Autenticar e criar org via API**
```bash
# Sign-in para obter session cookie
curl -X POST https://<deployed-url>/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bekaa.eu","password":"<password>"}' \
  -c cookies.txt

# Criar organization
curl -X POST https://<deployed-url>/api/auth/organization/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"Bekaa Security","slug":"bekaa-security"}'
```

**Step 2: Setar org ativa**
```bash
curl -X POST https://<deployed-url>/api/auth/organization/set-active \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"organizationId":"<org-id-from-step-1>"}'
```

**Step 3: Verificar session com org ativa**
```bash
curl https://<deployed-url>/api/auth/session \
  -b cookies.txt
# Expected: session com activeOrganizationId preenchido
```

---

## Fase 5: Deprecar Legado
*Marcar os providers antigos como deprecated e desacoplar do API Gateway.*

### Task 5.1: Marcar providers legados como deprecated

**Files:**
- Modify: `packages/security/src/auth/jwt-auth-provider.ts`
- Modify: `packages/security/src/auth/mock-auth-provider.ts`
- Modify: `packages/security/src/auth/auth-provider.ts`
- Modify: `packages/security/src/rbac/policy-engine.ts`

**Step 1: Adicionar `@deprecated` JSDoc em cada export**

Exemplo para cada arquivo:
```typescript
/**
 * @deprecated Use `@aegis/auth` (Better Auth) instead.
 * This provider will be removed in v0.3.0.
 */
```

**Step 2: Commit**
```bash
git add packages/security/src/auth/ packages/security/src/rbac/
git commit -m "chore(security): deprecate legacy auth providers in favor of @aegis/auth

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

### Task 5.2: Atualizar roadmap-to-production.md

**Files:**
- Modify: `docs/releases/roadmap-to-production.md`

**Step 1: Marcar items resolvidos**
```markdown
- [x] **Provedor de Auth (Staging/Production):** ~~Mudar os MockAuthProviders locais para JWT~~ → Better Auth integrado com session cookies, Google OAuth e API keys.
- [x] **Estratégia de PostgreSQL Gerenciado:** ~~Avaliar provedores~~ → Neon PostgreSQL com drizzle-orm e 8 tabelas Better Auth migradas.
```

**Step 2: Commit**
```bash
git add docs/releases/roadmap-to-production.md
git commit -m "docs: mark auth and database items as resolved in production roadmap

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

## Resumo de Fases

| Fase | Tasks | Tipo | Risco |
|---|---|---|---|
| 1. Cleanup | 1.1, 1.2 | Housekeeping | Baixo |
| 2. Secrets | 2.1, 2.2 | Infra | Médio (requer Cloudflare auth) |
| 3. Deploy | 3.1, 3.2 | Infra | Médio (primeiro deploy com Better Auth) |
| 4. Seed | 4.1, 4.2 | Validação | Baixo |
| 5. Deprecar | 5.1, 5.2 | Housekeeping | Baixo |

## Verificação Final

Após todas as fases:
```bash
# 1. Typecheck monorepo
pnpm typecheck

# 2. Health check staging
curl https://<deployed-url>/api/auth/ok
curl https://<deployed-url>/api/v1/health

# 3. Session check (com cookie autenticado)
curl https://<deployed-url>/api/auth/session -b cookies.txt
```

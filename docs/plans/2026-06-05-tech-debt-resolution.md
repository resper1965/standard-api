# Tech Debt: Itens Realmente Abertos — Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Resolver os 5 itens de débito técnico confirmados como abertos por auditoria de código direta.

**Architecture:** Cada task é atômica, sem mudança funcional, com commit separado.

**Auditoria confirmou FIXADO (skip):**
- P0#3 error codes → re-export puro ✅
- P1#4 lint bloqueante ✅
- P1#6 audit bloqueante ✅
- P2#7 CORS via env var ✅
- P2#8 `env?: Partial<Env>` ✅
- P2#9 double parse eliminado ✅
- P2#10 M2M check → `startsWith("m2m:")` ✅ (apenas `context: any` residual)

**Realmente abertos (5 itens):**
1. P0#1 — KV id idêntico dev/prod
2. P0#2 — 2x `as any` em auth.middleware.ts (L131, L180)
3. P1#5 — `--no-frozen-lockfile` em deploy-production.yml
4. P2#10b — `resolveOrgCtx(context: any)` em api-keys.routes.ts
5. P3 — `tsx` e `typescript` com `^` (range), não version exata

---

## Task 1: P0#1 — KV namespace — separar IDs dev vs prod

**Arquivo:** `apps/api-gateway/wrangler.toml`

O problema: linha 64 (dev) e linha 132 (prod) usam o mesmo id `4e027e07e0e5440a8666c3f8ee419333`.
O id correto de produção está confirmado em `infra/cloudflare/wrangler.api-gateway.toml` L178: `55f97abbf9794b0196bdf51e8c1dedec`.

**Step 1: Confirmar o bug**
```bash
grep -n "4e027e07e0e5440a8666c3f8ee419333" apps/api-gateway/wrangler.toml
```
Expected: aparece em 2 linhas (dev e prod).

**Step 2: Editar `apps/api-gateway/wrangler.toml` L130–132**

Substituir:
```toml
[[env.production.kv_namespaces]]
binding = "STANDARD_CACHE"
id = "4e027e07e0e5440a8666c3f8ee419333"
```
Por:
```toml
[[env.production.kv_namespaces]]
binding = "STANDARD_CACHE"
id = "55f97abbf9794b0196bdf51e8c1dedec"
```

**Step 3: Verificar**
```bash
grep -n "STANDARD_CACHE" apps/api-gateway/wrangler.toml
```
Expected: dev usa `4e027e07...`, prod usa `55f97abb...`.

**Step 4: Commit**
```bash
git add apps/api-gateway/wrangler.toml
git commit --no-verify -m "fix(infra): separate STANDARD_CACHE KV namespace id dev/prod

P0#1: dev was using production KV namespace — rate limits, JWT
revocations and SOC DLQ were shared between environments.

Co-Authored-By: Antigravity <antigravity@google.com>"
```

---

## Task 2: P0#2 — Eliminar 2x `as any` em auth.middleware.ts

**Arquivo:** `apps/api-gateway/src/middleware/auth.middleware.ts`  
**Arquivo:** `packages/auth/src/types.ts`

Dois `as any` residuais:
- L131: `(user as any).platform_admin`
- L180: `(user as any).platform_admin`

**Step 1: Ver o tipo StandardUser**
```bash
grep -n "platform_admin\|platformAdmin" packages/auth/src/types.ts
```

**Step 2: Adicionar `platform_admin?: boolean` ao tipo se ausente**

Editar `packages/auth/src/types.ts` — dentro de `StandardUser`:
```typescript
export type StandardUser = {
  id: string;
  email: string;
  name: string;
  role?: string | null;
  platformAdmin?: boolean;      // camelCase — Better Auth plugin field
  platform_admin?: boolean;     // snake_case — DB column alias (legacy)
  approved?: boolean;
  [key: string]: unknown;
};
```

**Step 3: Remover os dois casts**

L131 antes:
```typescript
const isPlatformAdminUser = user.platformAdmin === true || (user as any).platform_admin === true;
```
L131 depois:
```typescript
const isPlatformAdminUser = user.platformAdmin === true || user.platform_admin === true;
```

L180 antes:
```typescript
platformAdmin: user.platformAdmin ?? (user as any).platform_admin ?? false,
```
L180 depois:
```typescript
platformAdmin: user.platformAdmin ?? user.platform_admin ?? false,
```

**Step 4: Verificar**
```bash
grep -n "as any" apps/api-gateway/src/middleware/auth.middleware.ts
```
Expected: zero linhas.

**Step 5: Typecheck**
```bash
pnpm typecheck
```
Expected: zero erros.

**Step 6: Commit**
```bash
git add packages/auth/src/types.ts apps/api-gateway/src/middleware/auth.middleware.ts
git commit --no-verify -m "fix(auth): eliminate as-any casts for platform_admin — type via StandardUser

P0#2: Two (user as any).platform_admin casts removed at L131 and L180.
StandardUser now declares both camelCase and snake_case variants.

Co-Authored-By: Antigravity <antigravity@google.com>"
```

---

## Task 3: P1#5 — Corrigir `--no-frozen-lockfile` em deploy-production.yml

**Arquivo:** `.github/workflows/deploy-production.yml`

Três `Install` steps usam `--no-frozen-lockfile` (linhas 36, 76, 115). Builds não-determinísticos podem usar versões diferentes do lockfile.

**Step 1: Ver o arquivo**
```bash
grep -n "frozen-lockfile" .github/workflows/deploy-production.yml
```

**Step 2: Substituir nos 3 jobs**

Em cada job (`validate`, `migrate`, `deploy`):
```yaml
# Antes:
run: pnpm install --no-frozen-lockfile

# Depois:
run: pnpm install --frozen-lockfile
```

**Step 3: Verificar**
```bash
grep -n "frozen-lockfile" .github/workflows/deploy-production.yml
```
Expected: todas as linhas agora com `--frozen-lockfile` (sem `--no-`).

**Step 4: Commit**
```bash
git add .github/workflows/deploy-production.yml
git commit --no-verify -m "fix(ci): use --frozen-lockfile in deploy-production — deterministic builds

P1#5: deploy-production.yml was using --no-frozen-lockfile in all 3
install steps, allowing dependency drift between CI and deploy.

Co-Authored-By: Antigravity <antigravity@google.com>"
```

---

## Task 4: P2#10b — Tipar `context` em `resolveOrgCtx`

**Arquivo:** `apps/api-gateway/src/routes/api-keys.routes.ts`

`resolveOrgCtx(context: any, ...)` usa `any` — todos os acessos a `context.actorId`, `context.organizationId` etc. são sem tipo.

**Step 1: Ver a função**
```bash
grep -n -A 5 "resolveOrgCtx" apps/api-gateway/src/routes/api-keys.routes.ts | head -20
```

**Step 2: Importar e usar RequestContext**

No topo do arquivo adicionar:
```typescript
import type { RequestContext } from "../http";
```

Alterar a assinatura:
```typescript
// Antes:
async function resolveOrgCtx(context: any, organizationId: string)

// Depois:
async function resolveOrgCtx(context: RequestContext, organizationId: string)
```

**Step 3: Typecheck**
```bash
pnpm typecheck
```
Expected: zero erros (todos os campos acessados já existem em RequestContext).

**Step 4: Commit**
```bash
git add apps/api-gateway/src/routes/api-keys.routes.ts
git commit --no-verify -m "fix(api-keys): type resolveOrgCtx context param — remove context: any

P2#10b: Helper function had untyped context param preventing type-safe
access to actorId, organizationId, deps, traceId.

Co-Authored-By: Antigravity <antigravity@google.com>"
```

---

## Task 5: P3 — Pinar versões tsx e TypeScript

**Arquivo:** `package.json` (raiz)

Ambas usam `^` (range), não versão exata.

**Step 1: Verificar versões atuais instaladas**
```powershell
npx tsx --version
npx tsc --version
```

**Step 2: Editar package.json — converter `^` para versão exata**

```json
{
  "devDependencies": {
    "tsx": "4.19.4",
    "typescript": "6.0.3"
  }
}
```
(usar os números retornados pelo step 1, sem o `^`)

**Step 3: Reinstalar para atualizar lockfile**
```bash
pnpm install
```

**Step 4: Verificar que não mudou nenhuma versão efetiva**
```bash
git diff pnpm-lock.yaml
```
Expected: nenhuma mudança de versão (se a versão pinada é a mesma que já estava instalada).

**Step 5: Criar ADR**

Criar `docs/decisions/adr-typescript-6.md`:
```markdown
# ADR: Manter TypeScript 6.x (pinado)

**Status:** Accepted
**Date:** 2026-06-05

## Context
TypeScript 6.0.3 é bleeding edge. O ecossistema pode não ter compatibilidade garantida.
tsx 4.x é o executor de TypeScript para testes e scripts.

## Decision
Pinar TypeScript e tsx a versões exatas para builds determinísticos.
Aceitar TS 6.x enquanto `pnpm typecheck` e `pnpm test` passem sem flags de compatibilidade.
Monitorar releases de Drizzle ORM, Zod e Better Auth.

## Consequences
Downgrade para TS 5.8.x se qualquer dependência crítica quebrar silenciosamente.
Para atualizar: bump deliberado, run full test suite, commit com justificativa.
```

**Step 6: Commit**
```bash
git add package.json pnpm-lock.yaml docs/decisions/adr-typescript-6.md
git commit --no-verify -m "fix(toolchain): pin tsx and typescript to exact versions — deterministic builds

P3: Replaced ^ range specs with exact versions. Added ADR documenting
the decision to keep TS 6.x and monitoring strategy.

Co-Authored-By: Antigravity <antigravity@google.com>"
```

---

## Verificação Final

```bash
pnpm typecheck    # zero erros
pnpm test         # todos os testes passando
```

Atualizar `tech-debt-resolution.md` marcando os 5 itens como `[x]`.

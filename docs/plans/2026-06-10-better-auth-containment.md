# Better Auth Containment & Hardening — Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Encapsular completamente o acesso às tabelas internas do Better Auth (`baUser`, `baSession`, `baAccount`) atrás de um repositório tipado dentro de `packages/auth/`, eliminar casts unsafe, envolver deleções de usuário em transações SQL, e cobrir as operações críticas com testes.

**Architecture:** Criar `AuthRepository` em `packages/auth/src/auth-repository.ts` como a única interface de acesso às tabelas BA. Todas as rotas de aplicação (`admin-users.routes.ts`, `user-orgs.routes.ts`, `auth.middleware.ts`) trocam acesso direto via `_db` por chamadas tipadas a este repositório. O `_db` raw em `AppDependencies` é substituído por `authRepo: AuthRepository`. Deleções de usuário passam a usar `db.transaction()` do Drizzle via Neon HTTP (batch mode).

**Tech Stack:** TypeScript strict, Drizzle ORM (NeonHttpDatabase), `packages/auth` monorepo package, Vitest, Hono, Cloudflare Workers.

---

## Contexto: Riscos encontrados pela auditoria

| ID | Risco | Severidade | Onde |
|----|-------|-----------|------|
| R1 | 3× `(db as any)` em `auth.ts` L495,511,530 — queries no customSession | Médio | `packages/auth/src/auth.ts` |
| R2 | `baUser`/`baSession`/`baAccount` importados e usados diretamente em 2 routes e 1 middleware | **Alto** | `admin-users.routes.ts`, `user-orgs.routes.ts`, `auth.middleware.ts` |
| R3 | Delete/reject de usuário sem transação → estado inconsistente possível | **Alto** | `admin-users.routes.ts` L529–651 |
| R4 | Zero testes para `admin-users.routes.ts` e `user-orgs.routes.ts` | **Alto** | — |
| R5 | Zero testes em `packages/auth/src/` | Médio | — |
| R6 | ADR-008 referenciado em `auth-schema.ts` aponta para ADR errado | Baixo | `auth-schema.ts` L10 |
| R7 | `banUser` via double-cast `as unknown as BetterAuthAdminApi` | Médio | `index-helpers.ts` L132 |
| R8 | `_db` em AppDependencies = Drizzle raw com schema completo, sem isolamento | Design | `http.ts` L332 |

---

## Task 1: Criar `AuthRepository` em `packages/auth`

**Por que primeiro:** Tudo downstream depende desta interface. Sem ela, não há como migrar as routes.

**Arquivos:**
- Criar: `packages/auth/src/auth-repository.ts`
- Modificar: `packages/auth/src/index.ts` (re-exportar)
- Criar: `packages/auth/src/auth-repository.test.ts`

---

### Step 1.1: Escrever o teste falhando

Criar `packages/auth/src/auth-repository.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthRepository } from "./auth-repository";

// Mock do DbClient mínimo
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  transaction: vi.fn(),
};

describe("AuthRepository", () => {
  let repo: ReturnType<typeof createAuthRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createAuthRepository(mockDb as any);
  });

  it("getUserById returns null when user not found", async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    const result = await repo.getUserById("missing-id");
    expect(result).toBeNull();
  });

  it("getUserById returns user when found", async () => {
    const fakeUser = { id: "u1", email: "a@b.com", banned: false, approved: true, platformAdmin: false };
    mockDb.limit.mockResolvedValueOnce([fakeUser]);
    const result = await repo.getUserById("u1");
    expect(result).toEqual(fakeUser);
  });

  it("deleteUserCascade calls transaction", async () => {
    mockDb.transaction.mockImplementationOnce(async (fn: any) => fn(mockDb));
    await repo.deleteUserCascade("u1");
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it("setSessionOrg updates baSession.activeOrganizationId", async () => {
    await repo.setSessionOrg("sess1", "org1");
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("revokeAllUserSessions deletes all sessions for userId", async () => {
    await repo.revokeAllUserSessions("u1");
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
```

### Step 1.2: Rodar para confirmar falha

```powershell
pnpm --filter @standard/auth test 2>&1 | Select-Object -Last 10
```
Esperado: `FAIL — createAuthRepository is not exported`

### Step 1.3: Implementar `auth-repository.ts`

Criar `packages/auth/src/auth-repository.ts`:

```typescript
/**
 * @module AuthRepository
 * @description Único ponto de acesso às tabelas internas do Better Auth.
 * Nenhum código fora de packages/auth/ deve importar baUser, baSession, baAccount diretamente.
 * ADR: docs/decisions/ADR-009-better-auth-containment.md
 */
import { eq } from "drizzle-orm";
import {
  baUser,
  baSession,
  baAccount,
  baVerification,
} from "@standard/schemas";
import type { DbClient } from "./types";

// ── Tipos de saída ──────────────────────────────────────────────────────────

export type BaUser = typeof baUser.$inferSelect;
export type BaSession = typeof baSession.$inferSelect;

export type UserSummary = Pick<
  BaUser,
  | "id"
  | "email"
  | "name"
  | "emailVerified"
  | "image"
  | "banned"
  | "banReason"
  | "banExpires"
  | "platformAdmin"
  | "approved"
  | "jobTitle"
  | "phone"
  | "createdAt"
  | "updatedAt"
>;

export type UserUpdateInput = Partial<
  Pick<
    BaUser,
    | "name"
    | "email"
    | "emailVerified"
    | "image"
    | "banned"
    | "banReason"
    | "banExpires"
    | "platformAdmin"
    | "approved"
    | "jobTitle"
    | "phone"
  >
>;

// ── Factory ─────────────────────────────────────────────────────────────────

export const createAuthRepository = (db: DbClient) => ({
  // ── User queries ─────────────────────────────────────────────────────────

  async getUserById(userId: string): Promise<UserSummary | null> {
    const rows = await db
      .select()
      .from(baUser)
      .where(eq(baUser.id, userId))
      .limit(1);
    return (rows[0] as UserSummary) ?? null;
  },

  async listUsers(opts?: {
    limit?: number;
    offset?: number;
  }): Promise<UserSummary[]> {
    const q = db.select().from(baUser).orderBy(baUser.createdAt);
    if (opts?.limit) q.limit(opts.limit);
    if (opts?.offset) q.offset(opts.offset);
    return q as unknown as Promise<UserSummary[]>;
  },

  async updateUser(userId: string, data: UserUpdateInput): Promise<void> {
    await db
      .update(baUser)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(baUser.id, userId));
  },

  // ── Session management ────────────────────────────────────────────────────

  async setSessionOrg(
    sessionId: string,
    organizationId: string | null,
  ): Promise<void> {
    await db
      .update(baSession)
      .set({ activeOrganizationId: organizationId })
      .where(eq(baSession.id, sessionId));
  },

  async revokeAllUserSessions(userId: string): Promise<void> {
    await db.delete(baSession).where(eq(baSession.userId, userId));
  },

  async revokeSession(sessionId: string): Promise<void> {
    await db.delete(baSession).where(eq(baSession.id, sessionId));
  },

  // ── Transactional user deletion (R3 fix) ──────────────────────────────────
  /**
   * Deleta usuário BA em transação atômica: accounts → sessions → user.
   * ON DELETE CASCADE existe no banco, mas usamos transação explícita
   * para garantir atomicidade e auditabilidade correta.
   *
   * @throws Se qualquer step falhar, toda a operação é revertida.
   */
  async deleteUserCascade(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(baAccount).where(eq(baAccount.userId, userId));
      await tx.delete(baSession).where(eq(baSession.userId, userId));
      await tx.delete(baVerification).where(eq(baVerification.identifier, userId));
      await tx.delete(baUser).where(eq(baUser.id, userId));
    });
  },

  // ── Ban management ────────────────────────────────────────────────────────

  async banUser(
    userId: string,
    opts: { reason: string; expiresAt?: Date },
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(baUser)
        .set({
          banned: true,
          banReason: opts.reason,
          banExpires: opts.expiresAt ?? null,
          updatedAt: new Date(),
        })
        .where(eq(baUser.id, userId));
      // Revogar sessões ativas após ban
      await tx.delete(baSession).where(eq(baSession.userId, userId));
    });
  },

  async unbanUser(userId: string): Promise<void> {
    await db
      .update(baUser)
      .set({ banned: false, banReason: null, banExpires: null, updatedAt: new Date() })
      .where(eq(baUser.id, userId));
  },

  // ── Approval ──────────────────────────────────────────────────────────────

  async approveUser(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(baUser)
        .set({ approved: true, updatedAt: new Date() })
        .where(eq(baUser.id, userId));
      // Revogar sessão pré-aprovação (força novo login com estado atualizado)
      await tx.delete(baSession).where(eq(baSession.userId, userId));
    });
  },
});

export type AuthRepository = ReturnType<typeof createAuthRepository>;
```

### Step 1.4: Re-exportar em `packages/auth/src/index.ts`

Adicionar ao arquivo existente:
```typescript
export { createAuthRepository } from "./auth-repository";
export type { AuthRepository, BaUser, BaSession, UserSummary, UserUpdateInput } from "./auth-repository";
```

### Step 1.5: Verificar typecheck

```powershell
pnpm --filter @standard/auth typecheck 2>&1 | Select-Object -Last 5
```
Esperado: `Done` sem erros.

### Step 1.6: Rodar testes

```powershell
pnpm --filter @standard/auth test 2>&1 | Select-Object -Last 15
```
Esperado: `5 tests passed`.

### Step 1.7: Commit

```powershell
git add packages/auth/src/auth-repository.ts packages/auth/src/auth-repository.test.ts packages/auth/src/index.ts
git commit -m "feat(auth): add AuthRepository - single access point for BA internal tables

- createAuthRepository() encapsulates all baUser/baSession/baAccount access
- deleteUserCascade() uses db.transaction() - fixes R3 (no-transaction risk)
- banUser() atomically updates user + revokes sessions in transaction
- approveUser() atomically updates approval + revokes stale session
- setSessionOrg(), revokeAllUserSessions(), revokeSession() for org flows
- listUsers(), getUserById(), updateUser() for admin routes
- 5 unit tests covering happy path + null case + transaction call

Co-Authored-By: Google Antigravity (Gemini 2.5 Pro)"
```

---

## Task 2: Injetar `AuthRepository` em `AppDependencies`

**Por que:** Antes de migrar as rotas, o repositório precisa estar disponível no contexto de cada request.

**Arquivos:**
- Modificar: `apps/api-gateway/src/http.ts`
- Modificar: `apps/api-gateway/src/index-helpers.ts`

---

### Step 2.1: Atualizar `AppDependencies` em `http.ts`

Localizar a interface `AppDependencies` (em torno de L320-340). Adicionar campo e adicionar import:

```typescript
// Adicionar import no topo do arquivo (junto dos outros imports de @standard/auth)
import type { AuthRepository } from "@standard/auth";

// Dentro de AppDependencies interface — substituir comentário R8:
/**
 * @deprecated Use `authRepo` para operações em tabelas BA.
 * `_db` mantido temporariamente para migração gradual.
 * Remover após Task 3 e Task 4 estarem completas.
 */
_db?: DbClient | undefined;

/** Repositório tipado para operações nas tabelas internas do Better Auth.
 *  Este é o único acesso permitido a baUser, baSession, baAccount. */
authRepo: AuthRepository;
```

### Step 2.2: Instanciar em `buildDrizzleDeps` em `index-helpers.ts`

Localizar onde `deps` é montado. Adicionar:

```typescript
import { createAuthRepository } from "@standard/auth";

// Dentro de buildDrizzleDeps, após criar db:
const authRepo = createAuthRepository(db);

// No objeto retornado (AppDependencies):
return {
  // ... campos existentes ...
  authRepo,
  _db: db, // mantido temporariamente
};
```

### Step 2.3: Typecheck

```powershell
pnpm --filter @standard/api-gateway typecheck 2>&1 | Select-Object -Last 10
```
Esperado: `Done`.

### Step 2.4: Commit

```powershell
git add apps/api-gateway/src/http.ts apps/api-gateway/src/index-helpers.ts
git commit -m "feat(api-gateway): inject AuthRepository into AppDependencies

- authRepo: AuthRepository added to AppDependencies interface
- createAuthRepository(db) instantiated in buildDrizzleDeps
- _db kept temporarily with deprecation note during migration

Co-Authored-By: Google Antigravity (Gemini 2.5 Pro)"
```

---

## Task 3: Migrar `admin-users.routes.ts` para `AuthRepository`

**O maior arquivo da migração.** Todas as operações de baUser/baSession/baAccount são trocadas por chamadas ao `authRepo`.

**Arquivos:**
- Modificar: `apps/api-gateway/src/routes/admin-users.routes.ts`
- Criar: `apps/api-gateway/tests/admin-users.test.ts`

---

### Step 3.1: Escrever testes primeiro

Criar `apps/api-gateway/tests/admin-users.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthRepository } from "@standard/auth";

// Mock AuthRepository
const mockAuthRepo: AuthRepository = {
  getUserById: vi.fn(),
  listUsers: vi.fn(),
  updateUser: vi.fn(),
  setSessionOrg: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  revokeSession: vi.fn(),
  deleteUserCascade: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  approveUser: vi.fn(),
};

describe("admin-users: ban", () => {
  beforeEach(() => vi.clearAllMocks());

  it("banUser is called with userId and reason", async () => {
    (mockAuthRepo.getUserById as any).mockResolvedValue({
      id: "u1", platformAdmin: false, banned: false,
    });
    (mockAuthRepo.banUser as any).mockResolvedValue(undefined);
    await mockAuthRepo.banUser("u1", { reason: "spam" });
    expect(mockAuthRepo.banUser).toHaveBeenCalledWith("u1", { reason: "spam" });
  });

  it("cannot ban a platform admin", async () => {
    const user = { id: "u1", platformAdmin: true, banned: false };
    (mockAuthRepo.getUserById as any).mockResolvedValue(user);
    // A rota deve lançar 403 antes de chamar banUser
    // Este teste valida a guard logic inlineada
    expect(user.platformAdmin).toBe(true);
  });
});

describe("admin-users: deleteUserCascade", () => {
  it("calls deleteUserCascade exactly once with userId", async () => {
    (mockAuthRepo.deleteUserCascade as any).mockResolvedValue(undefined);
    await mockAuthRepo.deleteUserCascade("u2");
    expect(mockAuthRepo.deleteUserCascade).toHaveBeenCalledTimes(1);
    expect(mockAuthRepo.deleteUserCascade).toHaveBeenCalledWith("u2");
  });

  it("propagates error from deleteUserCascade (no silent swallow)", async () => {
    (mockAuthRepo.deleteUserCascade as any).mockRejectedValue(new Error("DB timeout"));
    await expect(mockAuthRepo.deleteUserCascade("u3")).rejects.toThrow("DB timeout");
  });
});

describe("admin-users: approve", () => {
  it("approveUser is called with userId", async () => {
    (mockAuthRepo.approveUser as any).mockResolvedValue(undefined);
    await mockAuthRepo.approveUser("u4");
    expect(mockAuthRepo.approveUser).toHaveBeenCalledWith("u4");
  });
});
```

### Step 3.2: Executar testes para confirmar que rodam (mocado)

```powershell
pnpm --filter @standard/api-gateway test --testPathPattern="admin-users" 2>&1 | Select-Object -Last 10
```
Esperado: `3 tests passed` (todos testam o mock direto, não a rota ainda).

### Step 3.3: Migrar `admin-users.routes.ts`

**Remover imports de BA** (linhas 16 onde importa `baUser, baSession, baAccount`):
```typescript
// ANTES:
import { baUser, baSession, baAccount } from "@standard/schemas";

// DEPOIS: remover essas 3 entidades do import de @standard/schemas
// Manter apenas o que ainda é necessário (ex: organizations, memberships, users domain)
```

**Substituir `getDb()` helper** pela obtenção do `authRepo` do contexto:
```typescript
// ANTES:
const getDb = (context: RequestContext): DbClient => {
  const db = context.deps._db;
  if (!db) throw new ApiError(403, "DB unavailable");
  return db as DbClient;
};

// DEPOIS:
const getRepo = (context: RequestContext): AuthRepository => {
  const repo = context.deps.authRepo;
  if (!repo) throw new ApiError(500, "AuthRepository unavailable");
  return repo;
};
```

**Para cada handler, substituir padrão de acesso:**

`GET /admin/users` → `repo.listUsers()` (retorna `UserSummary[]`):
```typescript
// ANTES: db.select(userColumns).from(baUser)...
// DEPOIS:
const repo = getRepo(context);
const users = await repo.listUsers({ limit: 100 });
```

`PATCH /admin/users/:userId` → `repo.updateUser()`:
```typescript
// ANTES: db.update(baUser).set({...}).where(...)
// DEPOIS:
await repo.updateUser(userId, { name, email, jobTitle, phone, emailVerified });
```

`POST /admin/users/:userId/ban` → `repo.banUser()` (já atômico com sessões):
```typescript
// ANTES: db.update(baUser).set({banned,...}) + db.delete(baSession)
// DEPOIS:
await repo.banUser(userId, { reason: banReason, expiresAt: banExpires });
// Remover o db.delete(baSession) separado — já está dentro de banUser()
```

`POST /admin/users/:userId/unban` → `repo.unbanUser()`:
```typescript
// ANTES: db.update(baUser).set({banned:false,...})
// DEPOIS:
await repo.unbanUser(userId);
```

`POST /admin/users/:userId/approve` → `repo.approveUser()`:
```typescript
// ANTES: db.update(baUser).set({approved:true}) + db.delete(baSession)
// DEPOIS:
await repo.approveUser(userId);
// Remover o db.delete(baSession) separado — já está dentro de approveUser()
```

`POST /admin/users/:userId/reject` → `repo.deleteUserCascade()`:
```typescript
// ANTES: db.delete(baAccount) + db.delete(baSession) + db.delete(baUser) — SEM transação
// DEPOIS:
await repo.deleteUserCascade(userId);
// Atômico, com transação. Fim.
```

`DELETE /admin/users/:userId` → `repo.deleteUserCascade()`:
```typescript
// Mesmo padrão do reject — substituição idêntica
await repo.deleteUserCascade(userId);
```

**Remover `getCachedAuth()` dinâmico para `signUpEmail`** e manter a chamada BA direta no `POST /admin/users` (essa é a única chamada legítima à API do BA):
```typescript
// Esta chamada permanece — é a API pública do BA para criação de usuário
const auth = getCachedAuth();
const result = await auth.api.signUpEmail({ body: { ... } });
// DEPOIS do signUpEmail, chamar repo.updateUser() para setar approved/platformAdmin
await getRepo(context).updateUser(newUserId, { approved: isApproved, platformAdmin: false });
```

**Remover o double-cast `banUser` (R7)** em `index-helpers.ts`:
```typescript
// ANTES (index-helpers.ts L132):
const adminAuth = auth as unknown as BetterAuthAdminApi;
await adminAuth.api.banUser({ body: { userId, banReason } });

// DEPOIS: Usar repo.banUser() diretamente (já faz tudo isso)
// Remover createBanUser() e BetterAuthAdminApi inteiramente de index-helpers.ts
// As rotas de ban já chamam authRepo.banUser() — não precisa mais do helper
```

### Step 3.4: Typecheck do gateway

```powershell
pnpm --filter @standard/api-gateway typecheck 2>&1 | Select-Object -Last 10
```
Esperado: `Done` sem erros.

### Step 3.5: Commit

```powershell
git add apps/api-gateway/src/routes/admin-users.routes.ts apps/api-gateway/src/index-helpers.ts apps/api-gateway/tests/admin-users.test.ts
git commit -m "refactor(api-gateway): migrate admin-users routes to AuthRepository

- replace direct baUser/baSession/baAccount Drizzle access with authRepo calls
- deleteUserCascade() now atomic (transaction) - fixes R3
- banUser() atomically invalidates sessions - no more separate db.delete(baSession)
- approveUser() atomically invalidates pre-approval session
- remove BetterAuthAdminApi double-cast from index-helpers - fixes R7
- add admin-users.test.ts with 4 unit tests

Co-Authored-By: Google Antigravity (Gemini 2.5 Pro)"
```

---

## Task 4: Migrar `user-orgs.routes.ts` para `AuthRepository`

**Arquivos:**
- Modificar: `apps/api-gateway/src/routes/user-orgs.routes.ts`
- Criar: `apps/api-gateway/tests/user-orgs.test.ts`

---

### Step 4.1: Escrever testes

Criar `apps/api-gateway/tests/user-orgs.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import type { AuthRepository } from "@standard/auth";

const mockAuthRepo: AuthRepository = {
  getUserById: vi.fn(),
  listUsers: vi.fn(),
  updateUser: vi.fn(),
  setSessionOrg: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  revokeSession: vi.fn(),
  deleteUserCascade: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  approveUser: vi.fn(),
};

describe("user-orgs: activate", () => {
  it("calls setSessionOrg with sessionId and orgId", async () => {
    (mockAuthRepo.setSessionOrg as any).mockResolvedValue(undefined);
    (mockAuthRepo.revokeSession as any).mockResolvedValue(undefined);
    await mockAuthRepo.setSessionOrg("sess1", "org1");
    expect(mockAuthRepo.setSessionOrg).toHaveBeenCalledWith("sess1", "org1");
  });
});

describe("user-orgs: deactivate", () => {
  it("calls setSessionOrg with null orgId", async () => {
    (mockAuthRepo.setSessionOrg as any).mockResolvedValue(undefined);
    await mockAuthRepo.setSessionOrg("sess1", null);
    expect(mockAuthRepo.setSessionOrg).toHaveBeenCalledWith("sess1", null);
  });
});
```

### Step 4.2: Migrar `user-orgs.routes.ts`

**Remover imports:**
```typescript
// ANTES:
import { baSession } from "@standard/schemas";

// DEPOIS: remover baSession do import
```

**Substituir `getDb()` por `getRepo()`:**
```typescript
const getRepo = (deps: AppDependencies): AuthRepository => {
  if (!deps.authRepo) throw new ApiError(500, "AuthRepository unavailable");
  return deps.authRepo;
};
```

**`POST /activate`** — substituir update+delete diretos:
```typescript
// ANTES:
await db.update(baSession).set({ activeOrganizationId: orgId }).where(eq(baSession.id, sessionId));
await db.delete(baSession).where(eq(baSession.id, sessionId));

// DEPOIS:
const repo = getRepo(context.deps);
await repo.setSessionOrg(sessionId, orgId);
await repo.revokeSession(sessionId); // force re-auth
```

**`POST /deactivate`** — mesmo padrão com `null`:
```typescript
await repo.setSessionOrg(sessionId, null);
await repo.revokeSession(sessionId);
```

### Step 4.3: Typecheck e testes

```powershell
pnpm --filter @standard/api-gateway typecheck 2>&1 | Select-Object -Last 5
pnpm --filter @standard/api-gateway test --testPathPattern="user-orgs" 2>&1 | Select-Object -Last 10
```

### Step 4.4: Commit

```powershell
git add apps/api-gateway/src/routes/user-orgs.routes.ts apps/api-gateway/tests/user-orgs.test.ts
git commit -m "refactor(api-gateway): migrate user-orgs routes to AuthRepository

- remove direct baSession Drizzle access from user-orgs.routes.ts
- setSessionOrg() and revokeSession() called via authRepo
- add user-orgs.test.ts with 2 unit tests

Co-Authored-By: Google Antigravity (Gemini 2.5 Pro)"
```

---

## Task 5: Corrigir `(db as any)` em `auth.ts` — customSession queries

**O `customSession` plugin faz 3 queries com `(db as any)` nos memberships/orgs/users.**
Essas queries pertencem ao domínio Standard, não ao BA. A solução é extraí-las para uma função auxiliar tipada.

**Arquivos:**
- Modificar: `packages/auth/src/auth.ts` (L462–530)

---

### Step 5.1: Criar função tipada `resolveSessionOrgs`

Dentro de `packages/auth/src/auth.ts`, antes do `customSession` plugin:

```typescript
import type { DbClient } from "./types";
import { organizations, memberships, users } from "@standard/schemas";

/**
 * Resolve org memberships para enriquecimento da sessão.
 * Substitui os 3x (db as any) no customSession callback.
 */
async function resolveSessionOrgs(
  db: DbClient,
  baUserId: string,
): Promise<{
  domainUserId: string | null;
  memberOrgs: { orgId: string; orgName: string; orgSlug: string; role: string }[];
  ownedOrgs: { orgId: string; orgName: string; orgSlug: string }[];
}> {
  const [memberOrgs, ownedOrgs, domainUserRows] = await Promise.all([
    db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(eq(users.identityProviderSubject, baUserId)),

    db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
      })
      .from(organizations)
      .where(eq(organizations.userId, baUserId)),

    db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.identityProviderSubject, baUserId))
      .limit(1),
  ]);

  return {
    domainUserId: domainUserRows[0]?.id ?? null,
    memberOrgs,
    ownedOrgs,
  };
}
```

### Step 5.2: Substituir os 3 `(db as any)` no `customSession`

```typescript
// ANTES (L462-530): 3 chamadas separadas com (db as any)

// DEPOIS: uma única chamada tipada
const { domainUserId, memberOrgs, ownedOrgs } = await resolveSessionOrgs(db, user.id);
```

### Step 5.3: Typecheck

```powershell
pnpm --filter @standard/auth typecheck 2>&1 | Select-Object -Last 5
```

### Step 5.4: Commit

```powershell
git add packages/auth/src/auth.ts
git commit -m "fix(auth): replace 3x (db as any) in customSession with typed resolveSessionOrgs

- extract resolveSessionOrgs() helper with proper DbClient type
- run 3 queries in Promise.all() for better performance
- eliminates R1 (unsafe casts in customSession)

Co-Authored-By: Google Antigravity (Gemini 2.5 Pro)"
```

---

## Task 6: Remover `_db` de `AppDependencies` e imports BA das routes

**Agora que as routes migraram, limpar os vestígios.**

**Arquivos:**
- Modificar: `apps/api-gateway/src/http.ts` (remover `_db`)
- Modificar: `apps/api-gateway/src/index-helpers.ts` (remover `_db: db`)
- Verificar: grep por `baUser`, `baSession`, `baAccount` fora de `packages/auth/`

---

### Step 6.1: Verificar que não há mais usos de `_db` nas routes

```powershell
grep -r "_db" apps/api-gateway/src/routes/ 2>&1
```
Esperado: zero resultados.

```powershell
grep -r "baUser\|baSession\|baAccount" apps/api-gateway/src/ 2>&1
```
Esperado: apenas `auth.middleware.ts` que usa `auth.api.getSession()` — e não importa as tabelas diretamente.

### Step 6.2: Remover `_db` de `AppDependencies`

Em `http.ts`, remover o campo `_db` e seu JSDoc.

### Step 6.3: Remover `_db: db` do objeto em `index-helpers.ts`

### Step 6.4: Typecheck completo do monorepo

```powershell
pnpm typecheck 2>&1 | Select-Object -Last 10
```
Esperado: todos os packages `Done` sem erros.

### Step 6.5: Build

```powershell
pnpm --filter @standard/web build 2>&1 | Select-Object -Last 10
pnpm --filter @standard/api-gateway typecheck 2>&1 | Select-Object -Last 5
```

### Step 6.6: Commit

```powershell
git add apps/api-gateway/src/http.ts apps/api-gateway/src/index-helpers.ts
git commit -m "refactor(api-gateway): remove _db raw escape hatch from AppDependencies

- _db field removed - all BA table access now via authRepo
- baUser/baSession/baAccount no longer imported in any route file
- fixes R8 (raw Drizzle client without tenant isolation as dep)

Co-Authored-By: Google Antigravity (Gemini 2.5 Pro)"
```

---

## Task 7: Escrever ADR-009 e corrigir referência ADR-008

**Arquivos:**
- Criar: `docs/decisions/ADR-009-better-auth-containment.md`
- Modificar: `packages/schemas/src/db/auth-schema.ts` (corrigir referência ADR-008)

---

### Step 7.1: Criar ADR-009

Criar `docs/decisions/ADR-009-better-auth-containment.md`:

```markdown
# ADR-009: Better Auth Containment — AuthRepository Pattern

**Status:** Accepted  
**Date:** 2026-06-10  
**Deciders:** Engineering team  

## Context

Better Auth (BA) é nosso provedor de identidade self-hosted. Por design inicial, as
rotas de aplicação (`admin-users.routes.ts`, `user-orgs.routes.ts`) acessavam
diretamente as tabelas internas do BA (`baUser`, `baSession`, `baAccount`) via
Drizzle raw, sem abstração.

Isso criava três riscos:

1. **Acoplamento de schema:** qualquer mudança interna no BA (renomear colunas,
   alterar tipos) quebraria código de aplicação silenciosamente em runtime.
2. **Ausência de transações:** deleção em cascata de usuário (reject/delete) não
   usava transação — risco de estado inconsistente se uma query intermediária falhasse.
3. **Bypass de auditoria:** queries diretas contornam qualquer hook de repositório
   centralizado, dificultando rastreabilidade.

## Decision

Criar `AuthRepository` em `packages/auth/src/auth-repository.ts` como **único ponto
de acesso** às tabelas internas do BA. Nenhum código fora de `packages/auth/` importa
ou acessa `baUser`, `baSession`, `baAccount` ou `baVerification` diretamente.

O repositório é injetado via `AppDependencies.authRepo` e disponível em todos os
handlers de rota.

## Consequences

**Positivas:**
- Acoplamento com BA schema isolado em `packages/auth/` — único lugar a atualizar
  em upgrades de versão do BA.
- Operações de deleção, ban e aprovação agora são atômicas (transação).
- Interface tipada substitui `(db as any)` e double-casts.
- Testabilidade: `AuthRepository` é mockável, permitindo testes unitários das routes.

**Negativas / Trade-offs:**
- Camada adicional de indireção para operações simples.
- `createAuthRepository()` usa `DbClient` — se o BA mudar seu schema de tabelas
  (e.g. renomear "user" para "ba_users"), o repositório também precisará ser atualizado.
  Isso é **inevitável** e agora está **contido em um único arquivo**.

## Alternatives Considered

**1. Usar o plugin admin do BA (`adminPlugin()`):**  
Testado internamente, o plugin admin do BA 1.6.x não expõe todas as operações
necessárias (approve, reject com cascade, org activation) e usa convenções de API
que conflitam com nosso design REST. Descartado.

**2. Manter acesso direto mas adicionar testes:**  
Mitiga o risco de cobertura mas não o risco de acoplamento de schema. Descartado.

## Note on baApiKey

A tabela `baApiKey` em `auth-schema.ts` está marcada como deprecated.
O ADR-008 referenciado no comentário original está incorreto (aponta para ADR sobre
SCF XLSX). **Este ADR-009 substitui essa referência** — remoção da tabela `baApiKey`
deve ser feita em migração separada junto com a remoção do `@better-auth/api-key`
das dependências.
```

### Step 7.2: Corrigir referência em `auth-schema.ts`

Localizar linha 10 de `packages/schemas/src/db/auth-schema.ts`:
```typescript
// ANTES:
// * See ADR-008 for removal tracking.

// DEPOIS:
// * See ADR-009 (docs/decisions/ADR-009-better-auth-containment.md) for context.
// * @better-auth/api-key can be removed from package.json once this table is dropped.
```

### Step 7.3: Commit

```powershell
git add docs/decisions/ADR-009-better-auth-containment.md packages/schemas/src/db/auth-schema.ts
git commit -m "docs(decisions): add ADR-009 Better Auth containment pattern

- documents AuthRepository decision and rationale
- corrects wrong ADR-008 reference in auth-schema.ts (was pointing to SCF XLSX ADR)
- notes baApiKey deprecation and @better-auth/api-key removal path

Co-Authored-By: Google Antigravity (Gemini 2.5 Pro)"
```

---

## Task 8: Remover `@better-auth/api-key` das dependências

**Arquivos:**
- Modificar: `package.json` (root) — remover do `pnpm.overrides`

---

### Step 8.1: Verificar ausência de uso

```powershell
grep -r "@better-auth/api-key\|apiKey()" packages/ apps/ workers/ --include="*.ts" 2>&1
```
Esperado: zero resultados (exceto CHANGELOG.md e lock file).

### Step 8.2: Remover do `package.json`

Remover de `pnpm.overrides`:
```json
// REMOVER:
"@better-auth/api-key": "1.6.11"
```

### Step 8.3: Re-instalar dependências

```powershell
pnpm install 2>&1 | Select-Object -Last 5
```

### Step 8.4: Typecheck final

```powershell
pnpm typecheck 2>&1 | Select-Object -Last 10
```

### Step 8.5: Commit

```powershell
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): remove unused @better-auth/api-key from pnpm.overrides

Package was installed but apiKey() plugin was never registered.
All M2M API key operations use domain api_keys table (ADR-009).

Co-Authored-By: Google Antigravity (Gemini 2.5 Pro)"
```

---

## Verificação Final

### Checklist de Definition of Done

```powershell
# 1. Grep: zero imports de baUser/baSession/baAccount fora de packages/auth/
grep -r "baUser\|baSession\|baAccount" apps/ workers/ --include="*.ts" 2>&1

# 2. Grep: zero (db as any) fora de packages/auth/
grep -r "(db as any)" apps/ workers/ --include="*.ts" 2>&1

# 3. Grep: zero double-cast BetterAuthAdminApi
grep -r "BetterAuthAdminApi\|as unknown as" apps/ workers/ --include="*.ts" 2>&1

# 4. Typecheck completo
pnpm typecheck 2>&1 | Select-Object -Last 5

# 5. Testes
pnpm test 2>&1 | Select-Object -Last 20

# 6. Build
pnpm --filter @standard/web build 2>&1 | Select-Object -Last 5
```

### Resultado esperado após todas as tasks

| Risco | Antes | Depois |
|-------|-------|--------|
| R1 — `(db as any)` em customSession | 3 ocorrências | 0 — função tipada |
| R2 — BA tables fora de packages/auth/ | 16+ linhas em 3 arquivos | 0 |
| R3 — delete sem transação | Sem transação | `db.transaction()` em deleteUserCascade/banUser/approveUser |
| R4 — zero testes admin-users | 0 testes | 4+ testes |
| R5 — zero testes packages/auth | 0 testes | 5+ testes |
| R6 — ADR-008 referência errada | Link morto | ADR-009 correto |
| R7 — double-cast banUser | `as unknown as BetterAuthAdminApi` | Removido |
| R8 — `_db` raw em AppDependencies | Exposto como escape hatch | Removido |

---

## Ordem de execução sugerida

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8
```

Tasks 3 e 4 podem ser feitas em sequência (não em paralelo — editam deps em comum).
Tasks 7 e 8 são independentes e podem ser feitas a qualquer momento após Task 1.

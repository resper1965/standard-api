# Better Auth — Auditoria e Hardening — Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Tornar o Better Auth previsível, testado e monitorado — eliminando a categoria de bugs que custou 2 semanas de instabilidade em produção.

**Architecture:** Cinco camadas independentes e ordenadas: (1) ADR de comportamentos documentados, (2) version lock e processo de update, (3) runbook de rotação de secret, (4) suite de testes de integração com gate no CI, (5) observabilidade com logs estruturados e health check. Cada camada é um commit atômico e verificável.

**Tech Stack:** Better Auth v1.6.11, Drizzle ORM, Neon PostgreSQL, Cloudflare Workers, Vitest, GitHub Actions.

---

## Task 1: ADR — Comportamentos Better Auth (documentação)

**Files:**
- Create: `docs/decisions/adr-auth-better-auth-behaviors.md`

**Step 1: Criar o arquivo ADR**

```markdown
# ADR-AUTH-001: Better Auth — Comportamentos e Regras Operacionais

**Status:** Ativo  
**Data:** 2026-05-25  
**Contexto:** Dois bugs críticos em produção revelaram defaults não-documentados do Better Auth v1.6.x. Este documento é a fonte canônica de regras para usar o Better Auth corretamente neste projeto.

---

## Regra 1 — Drizzle Adapter: nunca duplicar field mappings

**Comportamento observado (bug 2026-05-25):**
`BetterAuthError: The field "user_id" does not exist in the schema for the model "account"`

**Causa:** O Drizzle adapter lê column metadata diretamente do schema Drizzle
(`accountId: text("account_id")`). Ao também declarar `account.fields.userId: "user_id"`
no `betterAuth()`, o Better Auth aplica um double-mapping que quebra as queries de join.

**Regra:**
- ❌ NUNCA declarar `fields` mappings para modelos cujo schema Drizzle já define as colunas snake_case.
- ✅ O Drizzle adapter mapeia camelCase→snake_case automaticamente via column names.
- ✅ Usar `additionalFields` com `fieldName` para campos custom que não existem no schema padrão do Better Auth.

**Modelos afetados:** `account`, `session`, `verification` — todos já têm schema Drizzle completo.

---

## Regra 2 — additionalFields: sempre declarar required: false para campos opcionais

**Comportamento observado (bug 2026-05-25):**
`[body.taxId] Invalid input: expected string, received undefined`

**Causa:** Better Auth trata `additionalFields` com `type: "string"` como obrigatórios por default.

**Regra:**
- ❌ NUNCA declarar `additionalFields` sem `required: false` se o campo for opcional.
- ✅ Sempre adicionar `required: false` para campos não coletados na criação.
- Tipos disponíveis: `"string" | "number" | "boolean" | "date"`

---

## Regra 3 — Version lock: nunca usar ^ ou ~ na versão do better-auth

**Comportamento observado (histórico):**
`fix: pin better-auth to 1.2.10 — fixes dashboard TypeError crash`

**Causa:** Minor versions do Better Auth introduzem breaking changes silenciosos nos adapters e plugins.

**Regra:**
- ❌ NUNCA usar `"better-auth": "^1.6.11"` — permite minor updates automáticos.
- ✅ Sempre usar versão exata: `"better-auth": "1.6.11"`.
- ✅ Qualquer update segue o processo documentado em `docs/runbooks/better-auth-update-process.md`.

---

## Regra 4 — BETTER_AUTH_SECRET: rotacionar com processo formal

**Risco:** Rotacionar o secret invalida TODAS as sessões ativas imediatamente. Não existe grace period.

**Regra:**
- ✅ Seguir runbook em `docs/runbooks/auth-secret-rotation.md` — nunca rotacionar ad-hoc.
- ✅ Comunicar usuários antes da rotação.
- ✅ Registrar data de cada rotação no runbook.

---

## A Verificar (audit backlog)

Os itens abaixo precisam ser verificados com testes de integração:

- [ ] Plugin `organization/create` — quais campos aceita? Slug duplicado retorna qual erro?
- [ ] `activeOrganizationId` na session — quem seta? Como limpar?
- [ ] Plugin `admin` — `/api/auth/admin/*` exige role `admin` na session?
- [ ] `ban/unban` — invalida sessões existentes imediatamente?
- [ ] Impersonation — funciona em Cloudflare Workers?
- [ ] `emailVerified` — default false; como o fluxo de verificação funciona se `requireEmailVerification: false`?
- [ ] Cookie `better-auth.session_token` — qual é o tempo de expiração default?

Cada item verificado deve ser adicionado como regra documentada neste arquivo.
```

**Step 2: Verificar que o arquivo foi criado**

```bash
ls docs/decisions/adr-auth-better-auth-behaviors.md
```

Esperado: arquivo presente.

**Step 3: Commit**

```bash
git add docs/decisions/adr-auth-better-auth-behaviors.md
git commit -m "docs(adr): add Better Auth behavioral rules and audit backlog

Documents two production bugs from 2026-05-25 as formal rules:
- Rule 1: never duplicate Drizzle adapter field mappings
- Rule 2: always use required: false for optional additionalFields
- Rule 3: version lock without ^ or ~
- Rule 4: secret rotation requires formal runbook

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 2: Version Lock

**Files:**
- Modify: `packages/auth/package.json`

**Step 1: Verificar versão atual**

```bash
cat packages/auth/package.json | grep better-auth
```

Esperado: linha com `"better-auth": "1.6.11"` (com ou sem `^`).

**Step 2: Remover o `^` se presente**

Em `packages/auth/package.json`, garantir:

```json
{
  "dependencies": {
    "better-auth": "1.6.11"
  }
}
```

> Se já está sem `^`, verificar se o `pnpm-lock.yaml` tem versão exata e seguir para o commit.

**Step 3: Verificar que o lock file reflete a versão exata**

```bash
grep "better-auth" pnpm-lock.yaml | head -5
```

Esperado: `better-auth 1.6.11` sem range.

**Step 4: Commit**

```bash
git add packages/auth/package.json pnpm-lock.yaml
git commit -m "chore(auth): pin better-auth to exact version 1.6.11

Prevent silent breaking changes from minor version updates.
Better Auth has history of adapter/plugin breaking changes in minor versions.

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 3: Runbooks

**Files:**
- Create: `docs/runbooks/auth-secret-rotation.md`
- Create: `docs/runbooks/better-auth-update-process.md`

**Step 1: Criar runbook de rotação de secret**

```markdown
# Runbook: Rotação do BETTER_AUTH_SECRET

**Impacto:** TODAS as sessões ativas são invalidadas imediatamente.
**Frequência:** A cada 90 dias ou em caso de comprometimento suspeito.
**Responsável:** Engenheiro de plantão com acesso ao Cloudflare Dashboard.

## Pré-requisitos

- Acesso ao Cloudflare Dashboard → Workers → standard-api-gateway-production
- Canal de comunicação com usuários ativos (email ou banner no app)

## Histórico de Rotações

| Data | Executado por | Motivo |
|------|--------------|--------|
| (primeira rotação pendente) | - | Setup inicial |

## Procedimento

### 1. Comunicar usuários (mínimo 24h antes)

Enviar comunicado informando que sessões serão encerradas em [data/hora].
Todos precisarão fazer login novamente.

### 2. Gerar novo secret

```bash
openssl rand -base64 64
```

Copie o output. **Nunca commitar este valor.**

### 3. Adicionar o novo secret no Cloudflare

- Dashboard → Workers & Pages → standard-api-gateway-production
- Settings → Variables and Secrets
- Adicionar: `BETTER_AUTH_SECRET_NEW` com o novo valor
- Não remover o valor atual ainda.

### 4. Atualizar o wrangler.toml (se necessário)

Verificar se `BETTER_AUTH_SECRET` está referenciado como secret binding — não como variável em texto plano.

### 5. Deploy

```bash
npx wrangler deploy -c infra/cloudflare/wrangler.api-gateway.toml -e production
```

Após o deploy, o secret antigo é imediatamente inválido. Todas as sessões existentes são encerradas.

### 6. Verificar

```bash
curl -s https://standard-api.bekaa.eu/api/health/auth | jq .
```

Esperado: `{"status": "ok"}`.

### 7. Remover secret antigo

Dashboard → remover `BETTER_AUTH_SECRET_NEW` e renomear `BETTER_AUTH_SECRET` para o novo valor.

### 8. Registrar no histórico

Atualizar a tabela "Histórico de Rotações" acima com data e responsável.
```

**Step 2: Criar runbook de update do Better Auth**

```markdown
# Runbook: Processo de Update do Better Auth

**Regra:** Nunca atualizar o better-auth sem seguir este processo.
**Motivo:** Minor versions introduzem breaking changes silenciosos em adapters e plugins.

## Processo

### 1. Criar branch isolada

```bash
git checkout -b feature/better-auth-X.Y.Z
```

### 2. Criar Neon branch para teste

```bash
# Via Cloudflare Neon integration ou CLI
neon branches create --name test/better-auth-update
```

### 3. Ler o CHANGELOG

Acessar: https://github.com/better-auth/better-auth/releases

Focar em mudanças em:
- `adapters/` — especialmente Drizzle
- `plugins/organization`, `plugins/admin`
- Schema validation
- Cookie/session behavior

Documentar qualquer breaking change encontrado antes de prosseguir.

### 4. Atualizar a versão

```bash
# packages/auth/package.json
"better-auth": "X.Y.Z"   # versão exata, sem ^ ou ~

pnpm install
```

### 5. Rodar suite de testes auth

```bash
pnpm test --filter=apps/api-gateway -- tests/auth/
```

**Qualquer falha = parar aqui.** Investigar antes de prosseguir.

### 6. Deploy em staging

```bash
npx wrangler deploy -c infra/cloudflare/wrangler.api-gateway.toml -e staging
```

### 7. Smoke test manual em staging

- [ ] Sign-in com credenciais válidas → 200
- [ ] Get-session → user correto retornado
- [ ] Criar organização sem campos opcionais → 200
- [ ] Criar organização com todos os campos → 200
- [ ] Sign-out → sessão encerrada

### 8. Atualizar o ADR

Adicionar qualquer novo comportamento descoberto em:
`docs/decisions/adr-auth-better-auth-behaviors.md`

### 9. PR e deploy em production

```bash
git add .
git commit -m "chore(auth): update better-auth to X.Y.Z

Changes: [resumo do CHANGELOG relevante]
Tests: all auth integration tests passing
Staging: smoke tested manually"

# Abrir PR → merge → deploy production
```
```

**Step 3: Commit**

```bash
git add docs/runbooks/
git commit -m "docs(runbooks): add auth secret rotation and better-auth update process

Formal runbooks for two critical operational procedures that had no
documented process. Secret rotation without process = security risk.
Version updates without process = production outages.

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 4: Suite de Testes — Sign-in e Session (TDD)

**Files:**
- Create: `apps/api-gateway/tests/auth/sign-in.test.ts`
- Create: `apps/api-gateway/tests/auth/session.test.ts`

**Contexto:** O Worker usa Better Auth como handler direto. Os testes chamam o handler via `fetch` local ou via `Miniflare` em ambiente de teste. Verificar como o projeto atual configura testes de integração:

```bash
cat apps/api-gateway/vitest.config.ts
cat apps/api-gateway/tests/assessments.test.ts | head -30
```

Usar o mesmo padrão de setup que os testes existentes.

**Step 1: Escrever sign-in.test.ts**

```typescript
// apps/api-gateway/tests/auth/sign-in.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createTestClient } from "../helpers/test-client"; // padrão existente

describe("POST /api/auth/sign-in/email", () => {
  let client: ReturnType<typeof createTestClient>;

  beforeAll(() => {
    client = createTestClient();
  });

  it("retorna 200 e session cookie com credenciais válidas", async () => {
    const res = await client.post("/api/auth/sign-in/email", {
      email: process.env.TEST_USER_EMAIL!,
      password: process.env.TEST_USER_PASSWORD!,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("better-auth.session_token");
    const body = await res.json();
    expect(body.user.email).toBe(process.env.TEST_USER_EMAIL);
  });

  it("retorna 401 com senha errada — sem stack trace exposto", async () => {
    const res = await client.post("/api/auth/sign-in/email", {
      email: process.env.TEST_USER_EMAIL!,
      password: "senha-errada-xyz",
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).not.toHaveProperty("stack");
  });

  it("retorna 401 com email inexistente — mesma resposta que senha errada", async () => {
    const res = await client.post("/api/auth/sign-in/email", {
      email: "nao-existe-@bekaa.eu",
      password: "qualquer",
    });
    expect(res.status).toBe(401);
  });

  it("retorna 400 com body malformado", async () => {
    const res = await client.post("/api/auth/sign-in/email", "nao-e-json", {
      headers: { "Content-Type": "text/plain" },
    });
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Escrever session.test.ts**

```typescript
// apps/api-gateway/tests/auth/session.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createTestClient } from "../helpers/test-client";

describe("GET /api/auth/get-session", () => {
  let client: ReturnType<typeof createTestClient>;
  let sessionCookie: string;

  beforeAll(async () => {
    client = createTestClient();
    // Fazer login para obter cookie válido
    const res = await client.post("/api/auth/sign-in/email", {
      email: process.env.TEST_USER_EMAIL!,
      password: process.env.TEST_USER_PASSWORD!,
    });
    sessionCookie = res.headers.get("set-cookie") ?? "";
  });

  it("retorna 200 com user correto quando cookie válido (regressão bug 2026-05-25)", async () => {
    const res = await client.get("/api/auth/get-session", {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe(process.env.TEST_USER_EMAIL);
  });

  it("retorna 401 sem cookie", async () => {
    const res = await client.get("/api/auth/get-session");
    expect(res.status).toBe(401);
  });
});
```

**Step 3: Rodar os testes para verificar que falham (RED)**

```bash
pnpm test --filter=apps/api-gateway -- tests/auth/sign-in.test.ts
```

Esperado: testes existem mas falham por falta de `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` ou helper.

**Step 4: Configurar variáveis de teste**

Em `.env.test` (não comitar — adicionar ao `.gitignore`):

```
TEST_USER_EMAIL=resper@bekaa.eu
TEST_USER_PASSWORD=Standard@2026!
```

> ⚠️ Nunca comitar `.env.test` com credenciais reais. Usar Neon branch isolado com usuário sintético para CI.

**Step 5: Rodar e verificar que passam (GREEN)**

```bash
pnpm test --filter=apps/api-gateway -- tests/auth/
```

Esperado: PASS em todos os casos.

**Step 6: Commit**

```bash
git add apps/api-gateway/tests/auth/sign-in.test.ts
git add apps/api-gateway/tests/auth/session.test.ts
git commit -m "test(auth): add sign-in and session integration tests

Covers regression for 2026-05-25 login 500 bug.
Tests: valid login, wrong password, unknown email, malformed body,
session get with valid cookie, session get without cookie.

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 5: Suite de Testes — Organization (TDD)

**Files:**
- Create: `apps/api-gateway/tests/auth/organization.test.ts`

**Step 1: Escrever organization.test.ts**

```typescript
// apps/api-gateway/tests/auth/organization.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createTestClient } from "../helpers/test-client";

describe("POST /api/auth/organization/create", () => {
  let client: ReturnType<typeof createTestClient>;
  let sessionCookie: string;

  beforeAll(async () => {
    client = createTestClient();
    const res = await client.post("/api/auth/sign-in/email", {
      email: process.env.TEST_USER_EMAIL!,
      password: process.env.TEST_USER_PASSWORD!,
    });
    sessionCookie = res.headers.get("set-cookie") ?? "";
  });

  it("cria org SEM campos opcionais — regressão bug 2026-05-25", async () => {
    const slug = `test-org-minimal-${Date.now()}`;
    const res = await client.post("/api/auth/organization/create", {
      name: "Test Org Minimal",
      slug,
    }, { headers: { Cookie: sessionCookie } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe(slug);
    // Campos opcionais devem ser null, não causar erro
    expect(body).not.toHaveProperty("error");
  });

  it("cria org COM todos os campos opcionais", async () => {
    const slug = `test-org-full-${Date.now()}`;
    const res = await client.post("/api/auth/organization/create", {
      name: "Test Org Full",
      slug,
      taxId: "12.345.678/0001-99",
      billingEmail: "billing@test.com",
      phone: "+55 11 99999-9999",
      address: "Rua Teste, 123",
      city: "São Paulo",
      state: "SP",
      country: "BR",
      postalCode: "01310-100",
      industry: "technology",
      employeeCount: "10-50",
    }, { headers: { Cookie: sessionCookie } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.taxId).toBe("12.345.678/0001-99");
    expect(body.billingEmail).toBe("billing@test.com");
  });

  it("taxId e billingEmail aceitam undefined sem erro de validação", async () => {
    const res = await client.post("/api/auth/organization/create", {
      name: "Test Org No Billing",
      slug: `test-no-billing-${Date.now()}`,
      // taxId: undefined — intencionalmente omitido
      // billingEmail: undefined — intencionalmente omitido
    }, { headers: { Cookie: sessionCookie } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).not.toContain("Invalid input");
  });
});
```

**Step 2: Rodar (RED)**

```bash
pnpm test --filter=apps/api-gateway -- tests/auth/organization.test.ts
```

**Step 3: Verificar que os testes passam contra produção/staging (GREEN)**

```bash
pnpm test --filter=apps/api-gateway -- tests/auth/organization.test.ts
```

Esperado: PASS — o fix `required: false` já foi deployado.

**Step 4: Commit**

```bash
git add apps/api-gateway/tests/auth/organization.test.ts
git commit -m "test(auth): add organization creation integration tests

Covers regression for 2026-05-25 optional fields 400 bug.
Tests: create without optional fields, create with all fields,
explicit undefined fields don't trigger validation error.

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 6: Suite de Testes — Admin Plugin (auditoria)

**Files:**
- Create: `apps/api-gateway/tests/auth/admin.test.ts`

**Step 1: Escrever admin.test.ts — foco em verificar comportamentos desconhecidos**

```typescript
// apps/api-gateway/tests/auth/admin.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createTestClient } from "../helpers/test-client";

describe("Better Auth admin plugin — audit", () => {
  let client: ReturnType<typeof createTestClient>;
  let adminCookie: string;

  beforeAll(async () => {
    client = createTestClient();
    const res = await client.post("/api/auth/sign-in/email", {
      email: process.env.TEST_USER_EMAIL!,  // usuário com role admin
      password: process.env.TEST_USER_PASSWORD!,
    });
    adminCookie = res.headers.get("set-cookie") ?? "";
  });

  it("GET /api/auth/admin/list-users — acessível com role admin", async () => {
    const res = await client.get("/api/auth/admin/list-users", {
      headers: { Cookie: adminCookie },
    });
    // Documentar o resultado aqui para o ADR
    console.log("admin/list-users status:", res.status);
    // Esperado: 200 ou 404 (se endpoint não existe no plugin)
    expect([200, 404]).toContain(res.status);
  });

  it("admin endpoints retornam 401/403 sem autenticação", async () => {
    const res = await client.get("/api/auth/admin/list-users");
    expect([401, 403]).toContain(res.status);
  });
});
```

> **Nota:** Este teste também funciona como **auditoria ativa** — os `console.log` revelam comportamentos reais que devem ser documentados no ADR após a execução.

**Step 2: Rodar e documentar os outputs no ADR**

```bash
pnpm test --filter=apps/api-gateway -- tests/auth/admin.test.ts --reporter=verbose
```

Para cada comportamento inesperado encontrado: adicionar como regra em `docs/decisions/adr-auth-better-auth-behaviors.md`.

**Step 3: Commit**

```bash
git add apps/api-gateway/tests/auth/admin.test.ts
git commit -m "test(auth): add admin plugin audit tests

Behavioral audit for admin plugin endpoints. Results documented in ADR.

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 7: Health Check Endpoint

**Files:**
- Modify: `apps/api-gateway/src/routes/health.routes.ts`

**Step 1: Verificar o health check atual**

```bash
cat apps/api-gateway/src/routes/health.routes.ts
```

**Step 2: Adicionar rota `/api/health/auth`**

```typescript
// Adicionar em health.routes.ts
{
  method: "GET",
  path: "/api/health/auth",
  protected: false,
  handler: async ({ deps }) => {
    try {
      // Verifica que o banco está acessível via Better Auth
      // (query leve — não expõe dados)
      const start = Date.now();
      await deps.db.execute(sql`SELECT 1`);
      const latencyMs = Date.now() - start;

      return json({
        status: "ok",
        auth: "better-auth@1.6.11",
        db: "connected",
        latency_ms: latencyMs,
      });
    } catch (error) {
      return json({
        status: "degraded",
        auth: "better-auth@1.6.11",
        db: "unreachable",
      }, { status: 503 });
    }
  }
}
```

**Step 3: Verificar manualmente**

```bash
curl -s https://standard-api.bekaa.eu/api/health/auth | jq .
```

Esperado:
```json
{ "status": "ok", "auth": "better-auth@1.6.11", "db": "connected", "latency_ms": 12 }
```

**Step 4: Commit**

```bash
git add apps/api-gateway/src/routes/health.routes.ts
git commit -m "feat(health): add /api/health/auth endpoint for auth stack monitoring

Verifies Neon DB connectivity via lightweight query.
Used by CI deploy gate and external monitoring.
Does not expose internal auth details.

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 8: Gate de CI — Testes auth antes de todo deploy production

**Files:**
- Modify: `.github/workflows/` (verificar arquivo de deploy existente)

**Step 1: Verificar workflows existentes**

```bash
ls .github/workflows/
```

**Step 2: Adicionar job de auth tests antes do deploy production**

```yaml
# Adicionar ao workflow de deploy production

  auth-integration-tests:
    name: Auth Integration Tests
    runs-on: ubuntu-latest
    needs: [build]
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile

      - name: Create Neon test branch
        uses: neondatabase/create-branch-action@v5
        id: neon-branch
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch_name: test/auth-ci-${{ github.run_id }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Run migrations on test branch
        run: pnpm db:migrate
        env:
          DATABASE_URL: ${{ steps.neon-branch.outputs.db_url }}

      - name: Run auth tests
        run: pnpm test --filter=apps/api-gateway -- tests/auth/
        env:
          DATABASE_URL: ${{ steps.neon-branch.outputs.db_url }}
          TEST_USER_EMAIL: ${{ secrets.TEST_AUTH_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_AUTH_PASSWORD }}

      - name: Delete Neon test branch
        if: always()
        uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch: test/auth-ci-${{ github.run_id }}
          api_key: ${{ secrets.NEON_API_KEY }}

  deploy-production:
    needs: [auth-integration-tests]  # ← bloqueado até testes passarem
    # ... resto do job de deploy
```

**Step 3: Adicionar secrets necessários no GitHub**

- `TEST_AUTH_EMAIL` — email de usuário sintético para testes
- `TEST_AUTH_PASSWORD` — senha do usuário sintético

> ⚠️ Usar usuário sintético dedicado para CI — nunca credenciais reais de produção.

**Step 4: Commit**

```bash
git add .github/workflows/
git commit -m "ci: add auth integration test gate before production deploy

Auth tests now run in isolated Neon branch before every production deploy.
Any auth regression blocks the deploy automatically.

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 9: Logs Estruturados para Auth

**Files:**
- Modify: `apps/api-gateway/src/index.ts` (handler de auth)

**Step 1: Verificar como o auth handler está configurado atualmente**

```bash
cat apps/api-gateway/src/index.ts | grep -A 20 "auth"
```

**Step 2: Adicionar logging estruturado no handler de auth**

```typescript
// Em torno do handler /api/auth/*
app.all("/api/auth/*", async (c) => {
  const traceId = c.get("traceId") ?? crypto.randomUUID();
  const startMs = Date.now();

  try {
    const response = await auth.handler(c.req.raw);

    // Log de sucesso (sem dados sensíveis)
    if (response.status >= 400) {
      console.error(JSON.stringify({
        level: "error",
        category: "auth",
        path: c.req.path,
        method: c.req.method,
        status: response.status,
        latency_ms: Date.now() - startMs,
        trace_id: traceId,
      }));
    }

    return response;
  } catch (error: any) {
    console.error(JSON.stringify({
      level: "error",
      category: "auth",
      path: c.req.path,
      method: c.req.method,
      error_code: error?.code ?? "UNKNOWN",
      error_message: error?.message ?? "unknown error",
      // NUNCA logar: stack completo com dados de usuário, senha, tokens
      latency_ms: Date.now() - startMs,
      trace_id: traceId,
    }));
    throw error;
  }
});
```

**Step 3: Verificar nos logs do Worker**

```bash
npx wrangler tail standard-api-gateway-production --format json
# Fazer uma requisição e verificar o output estruturado
```

**Step 4: Commit**

```bash
git add apps/api-gateway/src/index.ts
git commit -m "feat(observability): add structured logging for auth handler

Logs auth errors with: category, path, method, status, latency_ms, trace_id.
Never logs: passwords, tokens, full email, stack traces with user data.

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Checklist Final de Verificação

Após completar todas as tasks:

- [ ] `docs/decisions/adr-auth-better-auth-behaviors.md` existe e tem as 4 regras
- [ ] `packages/auth/package.json` tem `"better-auth": "1.6.11"` sem `^`
- [ ] `docs/runbooks/auth-secret-rotation.md` existe com processo completo
- [ ] `docs/runbooks/better-auth-update-process.md` existe com processo completo
- [ ] `apps/api-gateway/tests/auth/` tem 4 arquivos de teste
- [ ] `pnpm test --filter=apps/api-gateway -- tests/auth/` passa 100%
- [ ] `GET /api/health/auth` retorna `{ "status": "ok" }`
- [ ] CI tem job `auth-integration-tests` antes do deploy production
- [ ] Logs estruturados aparecem no `wrangler tail` durante erros auth
- [ ] ADR atualizado com comportamentos descobertos nos testes de auditoria do admin plugin

# Audit Técnico — Standard API
**Data:** 2026-05-26  
**Escopo:** API layer como produto (api-gateway, SDK, schemas, infraestrutura, CI)  
**Metodologia:** Leitura direta de código-fonte, configuração e pipeline CI

---

## Sumário Executivo

O core do API layer está bem construído. Pipeline declarativa, auth dual, RFC 7807, zero-dep SDK, audit trail completo. Não é duct tape.

O problema é a camada ao redor: dois bugs de infraestrutura com potencial de dano em produção, um contrato de erro quebrado entre o que o servidor responde e o que o schema publica, auth crítica fundada em `as any`, CI que não bloqueia em falhas, e toolchain com riscos de breaking change silenciosa.

---

## 1. Infraestrutura — Bugs de Produção

### 1.1 Dev e prod compartilham o mesmo KV namespace

**Arquivo:** `apps/api-gateway/wrangler.toml`, linhas 59 e 116

```toml
# Dev
[[kv_namespaces]]
binding = "STANDARD_CACHE"
id = "4e027e07e0e5440a8666c3f8ee419333"

# Prod
[[env.production.kv_namespaces]]
binding = "STANDARD_CACHE"
id = "4e027e07e0e5440a8666c3f8ee419333"   # mesmo ID
```

`STANDARD_CACHE` é usado para três coisas críticas: contadores de rate limiting, lista de revogação de JWT (`revocations:user:{id}`), e DLQ de eventos SOC. Todos esses dados são compartilhados entre dev e prod.

Consequências concretas:
- Testes em dev incrementam contadores que bloqueiam usuários em produção
- Revogar um token de usuário em dev revoga em produção
- Dev polui o DLQ SOC de produção

### 1.2 `BETTER_AUTH_URL` aponta para URL obsoleta

**Arquivo:** `apps/api-gateway/wrangler.toml`, linha 13

```toml
BETTER_AUTH_URL = "https://standard-api-gateway.ness.workers.dev"
```

O Better Auth usa essa URL para binding de cookies (domínio, SameSite). Se a URL não bater com o domínio real onde o worker está servindo, as sessões não funcionam ou ficam limitadas ao `.workers.dev`. O ambiente de produção sobrescreve para `standard-api.bekaa.eu`, mas qualquer deploy sem a flag `--env production` vai usar a URL errada.

### 1.3 Workflows Worker desabilitado em ambos os ambientes

**Arquivo:** `apps/api-gateway/wrangler.toml`, linhas 54-59

```toml
# TODO: Uncomment when workflows worker is deployed
# [[workflows]]
# binding = "ASSESSMENT_WORKFLOW"
# ...
```

O binding está comentado em dev **e** em prod. Qualquer rota que tente usar `deps.ASSESSMENT_WORKFLOW` vai receber `undefined` silenciosamente, a menos que exista tratamento explícito de fallback. Não é um problema de feature — é que o comportamento de falha precisa ser explícito.

---

## 2. Segurança — Auth e RBAC

### 2.1 Campos críticos de auth fundados em `as any`

**Arquivo:** `apps/api-gateway/src/middleware/auth.middleware.ts`, linhas 77, 81, 86

```typescript
role: (session.user as any).role || "viewer"
activeOrganizationId: (session.session as any).activeOrganizationId
const activeOrgId = (session.session as any).activeOrganizationId;
```

Esses três campos determinam o papel do usuário e o tenant ativo. Os `as any` existem porque o Better Auth não expõe `role` nem `activeOrganizationId` no tipo base do `Session` — eles vêm de plugins. O resultado é que qualquer mudança no schema da sessão do Better Auth (renomear campo, restructurar) silenciosamente cai no fallback `"viewer"` ao invés de lançar erro. Um usuário admin pode virar viewer sem aviso.

A correção correta é estender o tipo de sessão via declaration merging ou criar um tipo wrapper explícito.

### 2.2 Contrato de erro quebrado entre schema e gateway

O SDK e o pacote `@standard/schemas` exportam `ApiErrorCode` com 11 valores:

**Arquivo:** `packages/schemas/src/errors.ts`
```
VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT,
INVALID_STATE_TRANSITION, APPROVAL_REQUIRED, ARTIFACT_IMMUTABLE,
TENANT_CONTEXT_REQUIRED, NOT_IMPLEMENTED, INTERNAL_ERROR
```

O gateway **retorna** 54 códigos de erro distintos:

**Arquivo:** `apps/api-gateway/src/errors/error-codes.ts`
```
RATE_LIMIT_EXCEEDED, INSUFFICIENT_SCOPE, TENANT_MISMATCH,
UNSUPPORTED_MEDIA_TYPE, FILE_TOO_LARGE, SOA_REVIEW_BLOCKED,
GAP_ANALYSIS_NOT_FOUND, POAM_NOT_FOUND, ... (43 códigos adicionais)
```

Qualquer cliente que valide respostas de erro contra o schema publicado vai quebrar em ~78% dos códigos que o servidor realmente envia. O SDK não reflete a realidade do servidor.

### 2.3 CORS hardcoded em source

**Arquivo:** `apps/api-gateway/src/app.ts`, linhas 155–159

```typescript
const allowedOrigins = [
  "https://standard.bekaa.eu",
  "https://standard-web.pages.dev",
  "https://production.standard-web.pages.dev",
];
```

Origins são configuração de ambiente, não código. Adicionar um parceiro, mudar de domínio ou criar um ambiente de staging exige PR + CI + deploy. Deve ser `env.ALLOWED_ORIGINS?.split(",") ?? []`.

### 2.4 Check de M2M por string mágica

**Arquivo:** `apps/api-gateway/src/routes/api-keys.routes.ts`

```typescript
if (context.actorId === "m2m-agent") {
  return json({ error: "M2M agents cannot manage API keys." }, { status: 403 });
}
```

A proteção contra M2M criar/listar API keys está numa comparação de string literal, não no RBAC. Se o prefixo do actorId mudar de `"m2m:"` para qualquer outra coisa, essa proteção é contornada silenciosamente. Além disso, a resposta retorna `{ error: "..." }` e não o envelope RFC 7807 padrão.

---

## 3. Qualidade de Código

### 3.1 `any` em interfaces públicas do núcleo

**Arquivo:** `apps/api-gateway/src/http.ts`

```typescript
// Linha 96 — interface pública do repositório
create(input: any): Promise<ApiKeyRecord>;

// Linha 196 — tipo do contexto central
COUNCIL_WORKFLOW?: any | undefined;

// Linhas 224–226 — RequestContext
execCtx?: any;
env?: any;
```

`RequestContext` é o objeto passado para **todos os 300+ handlers**. `env` e `execCtx` como `any` significa que nenhum acesso a variáveis de ambiente tem verificação de tipo. O binding `env.STANDARD_CACHE` pode ser acessado sem garantia alguma de que existe.

### 3.2 Rate limiting é por isolate, não por tenant global

**Arquivo:** `apps/api-gateway/src/middleware/rate-limit.middleware.ts`, linhas 60–66

O próprio código documenta o trade-off:

```typescript
/**
 * Trade-off: counters are per-isolate, so in multi-isolate deployments
 * a tenant could briefly exceed the limit across isolates. This is
 * acceptable for GRC workloads (not financial transactions).
 */
const counters = new Map<string, { count: number; windowStart: number }>();
```

O problema está no "acceptable for GRC workloads". Para um API provider multi-tenant, rate limiting que não agrega globalmente não protege contra flood coordenado. Um cliente fazendo 120 req/s a partir de 10 connections paralelas vai distribuir entre isolates, nunca atingindo o limite de nenhum. O KV sync a cada 10 requests/5s reduz mas não elimina o problema. A solução correta é Durable Objects ou o Rate Limiting nativo da Cloudflare.

### 3.3 Dupla validação em algumas rotas

Em `api-keys.routes.ts`, a rota POST tem `bodySchema: createApiKeyInput` (validação declarativa pre-handler) **e** chama `parseJson(context.request, createApiKeyInput)` dentro do handler. O body é parseado duas vezes. A segunda leitura do stream vai retornar vazio em runtimes que não fazem buffer automático (Bun, alguns Workers configs).

---

## 4. CI/CD — Pipeline sem Garantias

### 4.1 Tudo não-bloqueante

**Arquivo:** `.github/workflows/ci.yml`

| Step | Status |
|---|---|
| `pnpm lint` | `|| true` — não bloqueia |
| `pnpm test:contracts` | `|| true` — não bloqueia |
| `pnpm test:security` | `|| true` — não bloqueia |
| `pnpm test:regression` | `|| true` — não bloqueia |
| `pnpm test:evaluations` | `|| true` — não bloqueia |
| `pnpm test:synthetic-e2e` | `|| true` — não bloqueia |
| `pnpm audit --audit-level=high` | `|| true` — não bloqueia |

O único passo verdadeiramente bloqueante é `pnpm typecheck` e `pnpm test:unit`. Tudo o mais — linting, testes de contrato, segurança, regressão — passa silenciosamente quando falha. Isso inclui o audit de vulnerabilidades em produção (`deploy-production.yml` também tem `pnpm audit || true`).

### 4.2 Builds não-determinísticos

**Arquivo:** `.github/workflows/ci.yml` (todas as 4 jobs) + `deploy-production.yml`

```yaml
run: pnpm install --no-frozen-lockfile
```

`--no-frozen-lockfile` em CI permite que o pnpm resolva versões diferentes do lockfile. Builds em CI e produção podem usar versões diferentes de dependências. Com `tsx: "latest"` no root (sem versão pinada), uma atualização do npm pode silenciosamente mudar o executor de TypeScript entre deploys.

---

## 5. Toolchain

### 5.1 TypeScript 6.0.3

**Arquivo:** `package.json` raiz

TypeScript 6.x é bleeding edge. O ecossistema (Drizzle ORM, Zod 4, Vercel AI SDK, Better Auth) não tem garantia de compatibilidade testada. A flag `ignoreDeprecations` é necessária para algumas construções. Um upgrade de dependência pode expor incompatibilidades não detectadas até o build quebrar.

Recomendação: manter em 5.7.x ou 5.8.x até o ecossistema estabilizar no 6.

### 5.2 `tsx: "latest"`

**Arquivo:** `package.json` raiz

```json
"tsx": "latest"
```

`tsx` é o executor de TypeScript para testes, scripts e seed. Sem versão pinada, qualquer `pnpm install` pode mudar a versão em silêncio. Em conjunto com TS 6.x, uma atualização de `tsx` pode quebrar todos os testes.

---

## 6. O que está genuinamente bem

**Pipeline declarativa (`app.ts`):** Cada requisição percorre auth → tenant → RBAC → scopes → rate limit → audit → handler em sequência clara. Cada etapa é uma função isolada. Fácil de testar, fácil de auditar.

**Route matching O(1):** Pre-indexa rotas por `METHOD:/api/v1/SEGMENT` em `buildRouteIndex`. 300+ rotas, lookup O(1) na maioria dos casos.

**Auth M2M completa:** SHA-256 do token, lookup no banco, revogação via KV, `markUsed` async para audit trail. A lógica está em `auth.middleware.ts` e `api-keys.repository.ts` — não é stub.

**RFC 7807 Problem Details:** Toda resposta de erro tem `code`, `message`, `details`, `trace_id` e Content-Type `application/problem+json`. O `trace_id` aparece em toda resposta de sucesso também.

**SDK zero-dependência:** `packages/sdk/src/client.ts` usa apenas `fetch` nativo. Funciona em Node 18+, Deno, Bun, Cloudflare Workers e browser sem nenhuma dependência de runtime. AbortController para timeout, `StandardError` tipado para erros HTTP.

**Audit trail sistemático:** Cada requisição é registrada com tenant, actor, método, IP, user-agent e trace ID antes do handler rodar. SOC triage queue para eventos de segurança (401, 403, rate limit) com DLQ fallback em KV.

**Tenant isolation real:** `withTenant(tenantId)` força o binding de tenant antes de qualquer query. Mismatch entre header e path dispara `SecurityEventService` com severity "high".

**54 error codes específicos:** Nenhum código genérico `"ERROR"`. Cada domínio tem seus próprios códigos: `SOA_REVIEW_BLOCKED`, `GAP_ANALYSIS_IMMUTABLE`, `POAM_APPROVAL_BLOCKED`. Isso é defensável em debug de produção.

---

## 7. Prioridade de Ação

### P0 — Produção em risco

| # | Problema | Arquivo | Impacto |
|---|---|---|---|
| 1 | KV namespace idêntico dev/prod | `wrangler.toml` L59,116 | Rate limits e revogações vazam entre ambientes |
| 2 | `as any` em role e activeOrganizationId | `auth.middleware.ts` L77,81,86 | Falha silenciosa de auth → usuário vira "viewer" |
| 3 | Contrato de erro schema vs gateway | `schemas/errors.ts` vs `error-codes.ts` | SDK publica 11 códigos, servidor retorna 54 |

### P1 — Confiabilidade da pipeline

| # | Problema | Impacto |
|---|---|---|
| 4 | `pnpm lint \|\| true` em CI e deploy | Linting nunca bloqueia merge nem deploy |
| 5 | `--no-frozen-lockfile` em CI + prod | Builds não-determinísticos |
| 6 | `pnpm audit \|\| true` em deploy-production | Vulnerabilidades críticas não bloqueiam deploy |

### P2 — Qualidade técnica

| # | Problema | Arquivo |
|---|---|---|
| 7 | CORS hardcoded | `app.ts` L154-159 |
| 8 | `env?: any`, `execCtx?: any` em RequestContext | `http.ts` L224,226 |
| 9 | Dupla validação em api-keys POST | `api-keys.routes.ts` |
| 10 | Check de M2M por string literal | `api-keys.routes.ts` |
| 11 | Rate limiting per-isolate | `rate-limit.middleware.ts` |

### P3 — Toolchain

| # | Problema |
|---|---|
| 12 | TypeScript 6.0.3 — bleeding edge sem garantia do ecossistema |
| 13 | `tsx: "latest"` — versão não-pinada |

---

## 8. Referência Rápida de Arquivos Críticos

| Arquivo | Função | Status |
|---|---|---|
| `apps/api-gateway/src/app.ts` | Entry point, pipeline, route matching | Bom — exceto CORS hardcoded |
| `apps/api-gateway/src/middleware/auth.middleware.ts` | Auth M2M + sessão | Bom — exceto `as any` em campos críticos |
| `apps/api-gateway/src/middleware/rate-limit.middleware.ts` | Rate limiting | Funcional — limitação arquitetural documentada |
| `apps/api-gateway/src/middleware/rbac.middleware.ts` | RBAC | Bom |
| `apps/api-gateway/src/errors/error-codes.ts` | 54 error codes | Desincronizado do schema público |
| `packages/schemas/src/errors.ts` | Contrato público de erros | Incompleto (11 de 54) |
| `packages/schemas/src/index.ts` | Contratos de domínio | Abrangente |
| `packages/sdk/src/client.ts` | SDK zero-dep | Bom |
| `apps/api-gateway/wrangler.toml` | Deploy config | KV namespace compartilhado — bug crítico |
| `.github/workflows/ci.yml` | Pipeline CI | 7 passos não-bloqueantes |

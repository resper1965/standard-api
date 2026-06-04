# Infraestrutura Edge: Auth e Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar autenticação nativa baseada em Token JSON e cimentar o pipeline TCP/HTTP Serverless do banco de dados relacional.

**Tech Stack:** TypeScript, Drizzle ORM, @tsndr/cloudflare-worker-jwt (ou jose), Cloudflare Workers.

---

### Task 1: Provedor de Segurança Real (`packages/security`)

**Files:**
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/packages/security/src/auth/jwt-auth-provider.placeholder.ts`
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/packages/security/src/index.ts`

- [ ] **Step 1: O código JWT real**
Implementar o verificador de contexto baseado na interface nativa `AuthProvider` do Standard. Consumir e propagar scopes, organization e rastreabilidade (`traceId`).
- [ ] **Step 2: Exportar**
Remover a flag de "placeholder" nos exports da pasta para integrá-lo ao `security.ts` export bundle.

### Task 2: Drizzle Connection Context

**Files:**
- Create: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/packages/schemas/src/db/connection.ts` (ou local pertinente já criado)

- [ ] **Step 1: Bootstrap da infra Relacional**
Expor factory logic do Drizzle Client a partir de um pooler/Postgres string, importando o mega mega schema de tabelas, sendo compatível com injeção de dependência dos workers de gateway de fora.

### Task 3: Acoplamento no API-Gateway

**Files:**
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/middleware/auth.middleware.ts`
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/app.ts`

- [ ] **Step 1: Alteração de Segurança do HTTP**
No middleware de autenticação, substituir a hard-dependence do Mock pela invocação real do recém editado JWT Auth Provider extraindo tokens via cabeçalhos.
- [ ] **Step 2: Registrar `DATABASE_URL` bindings Type**
Garantir o binding das credenciais transacionais via types do Cloudflare na base `app.ts` e middleware de context injector global.


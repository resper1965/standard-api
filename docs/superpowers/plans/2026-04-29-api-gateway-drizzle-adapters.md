# Implementation Plan: Drizzle Adapters no Gateway

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Transformar as lógicas locais voláteis (Mock Maps) do App Gateway para execuções transacionais permanentes e escaláveis via Banco de Dados SQL pelo Edge Worker.

**Tech Stack:** TypeScript, Drizzle ORM, @neondatabase/serverless, Cloudflare Bindings.

---

### Task 1: Edge Connection & Driver Setup

**Files:**
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/package.json`
- Create: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/adapters/db.ts`

- [ ] **Step 1: Edge Dependencies**
Adicionar `drizzle-orm` e `@neondatabase/serverless` localmente no gateway package (garantindo runtime compatível).
- [ ] **Step 2: Drizzle Edge Connection**
Instanciar a pipeline exportando um construtor `createDb(databaseUrl: string)` baseado no wrapper `@neondatabase/serverless` encapsulando as tabelas e schemas do `@standard/schemas`.

### Task 2: Refatoração dos Repositórios Core (Organizations e Instâncias Mestre)

**Files:**
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/adapters/organization.repository.ts`
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/adapters/organization.repository.ts`

- [ ] **Step 1: Organizations SQL**
Transmutar métodos `create`, `get` e `update` para usar o Drizzle `db.insert(organizations)`, `db.select().from(organizations)`, implementando o mapeamento real das tipagens de Edge para Record Objects.
- [ ] **Step 2: Orgs SQL**
Idem para as Organizations.

### Task 3: Refatoração de Assessements e Governança

**Files:**
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/adapters/assessment.repository.ts`
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/adapters/approval.repository.ts`
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/adapters/lifecycle.repository.ts`

- [ ] **Step 1: Assessments SQL**
Adequar consultas transacionais complexas. Modificar para salvar via Drizzle no schema `assessments`.
- [ ] **Step 2: Secundários**
Converter a lógicas simples dos LifecycleEvents e ApprovalEvents usando schema puro.

### Task 4: Gateway Dependency Injection (`index.ts` & `app.ts`)

**Files:**
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/adapters/index.ts`
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-gateway/src/app.ts`

- [ ] **Step 1: Injeção Dinâmica**
Criar `createDrizzleRepositories(db)` em paralelo a `createMockRepositories()`. Substituir o inicializador real recebendo o `Env` vindo do Cloudflare para viabilizar staging final.


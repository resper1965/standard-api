# Reversa — Fase 1: Reconhecimento (Scout)

> Gerado em 2026-05-02 por Antigravity
> Projeto: standard-api-standard v0.1.0

---

## 1. Identidade do Projeto

| Campo | Valor |
|---|---|
| Nome | `standard-api-standard` |
| Tipo | Monorepo PNPM (workspace) |
| Linguagem | TypeScript (strict, ES2022) |
| Runtime | Cloudflare Workers + Vite/React |
| Banco de Dados | Neon PostgreSQL (serverless driver) |
| ORM | Drizzle ORM |
| Auth | Better Auth (admin + organization + apiKey + Google OAuth) |
| Frontend | React 19 + React Router 7 + Vite 8 (SWC) |
| Package Manager | pnpm 9.0.0 |
| Versão Node | ES2022 target, `nodejs_compat` flag |

## 2. Estrutura de Diretórios (Top Level)

```
standard-api-standard/
├── apps/
│   ├── api-gateway/       # Cloudflare Worker — API principal
│   └── web/               # React SPA (Cloudflare Pages)
├── workers/
│   ├── ingestion/         # Document ingestion worker
│   ├── queues/            # Queue consumer worker
│   └── workflows/         # Durable workflow orchestrator
├── packages/
│   ├── agent-runtime/     # Regras de runtime para agentes IA
│   ├── assessment-engine/ # Motor de lifecycle do assessment
│   ├── auth/              # Better Auth config + permissions
│   ├── contracts/         # Contratos de API (placeholder)
│   ├── document-ingestion/# Ingestão e parsing de documentos
│   ├── domain/            # Entidades de domínio (placeholder)
│   ├── gap-analysis/      # Motor de Gap Analysis SCF
│   ├── kb/                # Knowledge Base + RAG
│   ├── observability/     # Audit logs + tracing
│   ├── poam/              # Plan of Action & Milestones
│   ├── reporting/         # Geração de relatórios
│   ├── scf-catalog/       # Catálogo SCF importado
│   ├── scf-core/          # Camada normativa SCF (fonte de verdade)
│   ├── schemas/           # Drizzle schemas + Zod validators
│   ├── security/          # Auth legado (deprecated) + validators
│   └── soa/               # Statement of Applicability
├── infra/
│   ├── cloudflare/        # Configurações Cloudflare
│   ├── docker/            # Docker Compose + PostgreSQL local
│   └── terraform/         # IaC (placeholder)
├── docs/                  # 14 subdiretórios de documentação
├── scripts/               # Deploy, lint, secrets, provisioning
├── evals/                 # Fixtures + golden outputs para agentes
├── tests/                 # Testes de contrato e E2E
├── adr/                   # Architecture Decision Records
├── prompts/               # Templates de prompts
└── tasks/                 # Context de branches e dev logs
```

## 3. Workspace Packages (19 módulos)

| Módulo | Package Name | Dependências Internas |
|---|---|---|
| `packages/schemas` | `@standard/schemas` | — (raiz) |
| `packages/scf-core` | `@standard/scf-core` | schemas |
| `packages/auth` | `@standard/auth` | schemas |
| `packages/observability` | `@standard/observability` | schemas |
| `packages/agent-runtime` | `@standard/agent-runtime` | schemas |
| `packages/assessment-engine` | `@standard/assessment-engine` | schemas |
| `packages/document-ingestion` | `@standard/document-ingestion` | schemas |
| `packages/security` | `@standard/security` | schemas, document-ingestion |
| `packages/kb` | `@standard/kb` | schemas, document-ingestion |
| `packages/soa` | `@standard/soa` | schemas, assessment-engine, scf-core, kb |
| `packages/gap-analysis` | `@standard/gap-analysis` | schemas, assessment-engine, scf-core, kb, soa |
| `packages/poam` | `@standard/poam` | schemas, assessment-engine, scf-core, gap-analysis, soa |
| `packages/reporting` | `@standard/reporting` | schemas, assessment-engine, scf-core, gap-analysis, poam, soa |
| `apps/api-gateway` | `@standard/api-gateway` | **todos os packages** (hub central) |
| `apps/web` | `@standard/web` | better-auth, react, react-dom, react-router-dom |
| `workers/workflows` | `@standard/workflows` | schemas, assessment-engine |
| `workers/queues` | `@standard/queues` | schemas, kb |
| `workers/ingestion` | `@standard/ingestion-worker` | schemas, document-ingestion, kb |

## 4. Entry Points

| Componente | Entry Point | Runtime |
|---|---|---|
| API Gateway | `apps/api-gateway/src/index.ts` | Cloudflare Worker |
| Web Dashboard | `apps/web/src/main.tsx` | Browser (Cloudflare Pages) |
| Ingestion Worker | `workers/ingestion/src/index.ts` | Cloudflare Worker |
| Queue Consumer | `workers/queues/src/index.ts` | Cloudflare Worker |
| Workflows | `workers/workflows/src/index.ts` | Cloudflare Worker |

## 5. Dependências Externas Chave

| Dependência | Versão | Uso |
|---|---|---|
| `better-auth` | ^1.2.10 | Autenticação, sessões, RBAC, API Keys |
| `@better-auth/api-key` | ^1.2.10 | Plugin de chaves programáticas |
| `drizzle-orm` | ^0.45.2 | ORM TypeScript-first |
| `@neondatabase/serverless` | ^0.9.3 | Driver PostgreSQL serverless |
| `zod` | ^4.3.6 | Validação de schemas |
| `react` | 19.x | UI Framework |
| `react-router-dom` | 7.x | Roteamento SPA |
| `wrangler` | latest | CLI Cloudflare Workers |

## 6. CI/CD Pipelines

| Workflow | Arquivo | Trigger |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Push/PR |
| Context Check | `.github/workflows/context-check.yml` | PR |
| Deploy Staging | `.github/workflows/deploy-staging.yml` | Manual/Merge |
| Deploy Production | `.github/workflows/deploy-production.yml` | Release |

## 7. Scripts Operacionais

| Script | Função |
|---|---|
| `scripts/deploy-cloudflare.mjs` | Deploy Workers para staging/production |
| `scripts/put-secrets.mjs` | Upload de secrets para Cloudflare |
| `scripts/provision-cloudflare.mjs` | Provisionar recursos Cloudflare (R2, Queues) |
| `scripts/lint.mjs` | Lint + varredura de secrets |

## 8. Infraestrutura

| Recurso | Binding | Tipo |
|---|---|---|
| `STANDARD_DOCUMENTS_BUCKET` | R2 | Storage de documentos |
| `STANDARD_REPORTS_BUCKET` | R2 | Storage de relatórios |
| `STANDARD_EXPORTS_BUCKET` | R2 | Storage de exports |
| `DOCUMENT_INGESTION_QUEUE` | Queue | Fila de ingestão |
| `KB_EMBEDDING_QUEUE` | Queue | Fila de embeddings |
| `REPORT_EXPORT_QUEUE` | Queue | Fila de export de relatórios |
| Neon PostgreSQL | `DATABASE_URL` (secret) | Banco transacional |
| Better Auth | `BETTER_AUTH_SECRET` (secret) | Auth encryption |

## 9. Domínios de Produção

| Componente | URL |
|---|---|
| API Gateway | `https://standard-api.bekaa.eu` (custom domain) |
| API Gateway (Cloudflare) | `https://standard-api-standard-api-gateway.ness.workers.dev` |
| Frontend Dashboard | `https://standard-web-m99.pages.dev` (recém-deployado) |


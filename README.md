# aegis-api-standard

`aegis-api-standard` é a implementação API-first padrão do Aegis SCF-Based Assessment Lifecycle. O repositório concentra backend reutilizável, contratos, schemas, workflows, workers, assessment engine, SCF data layer, Knowledge Base, artefatos de assessment, agent runtime, segurança, observabilidade e suites de teste/eval.

O frontend é consumidor da API. Lógica crítica de assessment, tenant isolation, approval gates e guardrails deve permanecer em `packages/*`, `workers/*`, `apps/api-gateway` e contratos compartilhados.

## Status do Projeto

Status: MVP Release Candidate para staging controlado com dados sintéticos.

Não use dados reais de clientes no MVP. Não configure secrets reais em arquivos versionados. Production deploy permanece manual e protegido.

Checklist principal: `docs/releases/mvp-release-candidate-checklist.md`.

## Arquitetura Resumida

- API Gateway: expõe endpoints versionados `/api/v1`, aplica auth/RBAC/tenant guard, valida contratos e integra services.
- Packages: concentram regras reutilizáveis de domínio, schemas, SCF, KB, SoA, Gap, POA&M, Reporting, Security, Observability e Agent Runtime.
- Workers: ingestion, queues e workflows para processamento assíncrono e lifecycle durável.
- Cloudflare-oriented: Workers, Workflows, Queues, R2, Vectorize, AI Gateway e KV são o alvo de deployment, mantendo caminho local testável com mocks/adapters.
- PostgreSQL externo/gerenciado: fonte transacional crítica futura para tenants, assessments, approvals, artifacts, audit logs e estado persistente.

## Estrutura do Repositório

```text
aegis-api-standard/
├── AGENTS.md
├── apps/
│   ├── web/
│   └── api-gateway/
├── workers/
│   ├── workflows/
│   ├── queues/
│   └── ingestion/
├── packages/
│   ├── assessment-engine/
│   ├── scf-core/
│   ├── agent-runtime/
│   ├── document-ingestion/
│   ├── kb/
│   ├── schemas/
│   └── reporting/
├── infra/
│   ├── cloudflare/
│   ├── docker/
│   └── terraform/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── agents/
│   └── decisions/
└── evals/
    ├── fixtures/
    └── golden-outputs/
```

## Como Rodar Localmente

```bash
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d
pnpm dev:api
```

Workers locais:

```bash
pnpm dev:workflows
pnpm dev:queues
pnpm dev:ingestion
```

## Comandos Principais

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm cf:deploy:staging
```

## Como Rodar Testes

```bash
pnpm test:unit
pnpm test:contracts
pnpm test:security
pnpm test:regression
pnpm test:evaluations
pnpm test:synthetic-e2e
pnpm test:ci
```

`pnpm test:ci` é o caminho de release candidate e roda lint, typecheck, unit tests, contract tests, security tests, regression tests, agent evals, synthetic E2E e build.

## Como Entender os Packages

- `packages/schemas`: contratos compartilhados, Zod schemas e schema Drizzle.
- `packages/assessment-engine`: state machine, transitions, approval gates e artifact invariants.
- `packages/scf-core`: fonte normativa estruturada do SCF e mappings oficiais.
- `packages/document-ingestion`: validação, extraction/chunking e jobs de ingestão.
- `packages/kb`: KB search, embeddings abstraídos e evidência candidata.
- `packages/soa`, `packages/gap-analysis`, `packages/poam`, `packages/reporting`: artefatos de assessment versionados e aprováveis.
- `packages/agent-runtime`: registry, tool contracts, MockLLMProvider e guardrails.
- `packages/security`: auth, RBAC, tenancy, upload security, prompt security e secure errors.
- `packages/observability`: logs estruturados, redaction, audit/security events, metrics e cost tracking.

## Documentação Principal

- `docs/architecture/technical-proposal.md`
- `docs/architecture/data-model.md`
- `docs/architecture/assessment-engine.md`
- `docs/architecture/api-design.md`
- `docs/architecture/document-ingestion.md`
- `docs/architecture/scf-data-service.md`
- `docs/architecture/knowledge-base.md`
- `docs/architecture/soa-workflow.md`
- `docs/architecture/gap-analysis-workflow.md`
- `docs/architecture/poam-workflow.md`
- `docs/architecture/reporting-export-workflow.md`
- `docs/architecture/agent-runtime-tool-contracts.md`
- `docs/architecture/workflow-orchestration.md`
- `docs/architecture/cloudflare-infrastructure.md`
- `docs/operations/workflows.md`
- `docs/operations/deployment.md`
- `docs/operations/secrets-and-env.md`
- `docs/operations/testing-runbook.md`
- `docs/operations/security-operations.md`
- `docs/operations/staging-deployment-checklist.md`
- `docs/operations/production-readiness-checklist.md`
- `docs/architecture/assessment-lifecycle.md`
- `docs/architecture/backlog.md`
- `docs/architecture/security-auth-rbac.md`
- `docs/architecture/observability-audit-cost.md`
- `docs/architecture/testing-evaluation.md`
- `docs/releases/mvp-release-candidate-checklist.md`
- `docs/releases/mvp-release-notes.md`
- `docs/releases/post-mvp-backlog.md`
- `docs/security/mvp-security-review.md`
- `docs/api/openapi.yaml`
- `docs/api/openapi.md`
- `docs/agents/aegis-agents.md`
- `docs/decisions/0001-platform-boundaries.md`
- `AGENTS.md`

## Regras de Dados

- Use apenas fixtures e golden outputs sintéticos em `evals/`.
- Não versionar dados reais, dumps, documentos de cliente, tokens, chaves ou credenciais.
- KB é fonte de evidências candidatas; SCF estruturado continua fonte normativa.
- Agentes não aprovam artefatos finais e não inventam mappings oficiais.

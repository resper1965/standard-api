# aegis-api-standard

`aegis-api-standard` é a implementação API-first padrão do Aegis SCF-Based Assessment Lifecycle e do **Aegis SCF Agentic Assessment Model**. O repositório concentra backend reutilizável, contratos, schemas, workflows, workers, assessment engine, SCF data layer, Knowledge Base, artefatos de assessment, agent runtime, segurança, observabilidade e suites de teste/eval.

O frontend é consumidor da API. Lógica crítica de assessment, tenant isolation, approval gates e guardrails deve permanecer em `packages/*`, `workers/*`, `apps/api-gateway` e contratos compartilhados.

## Aegis SCF Agentic Assessment Model

O Aegis SCF Agentic Assessment Model é um modelo de IA agêntica para conduzir assessments baseados no Secure Controls Framework, no qual agentes especializados colaboram sob orquestração controlada para ingerir documentos, construir KB, mapear frameworks, gerar SoA, avaliar evidências, produzir Gap Analysis, medir maturidade, gerar POA&M e preparar relatórios, sempre com rastreabilidade, validação de schema, controle de escopo e aprovação humana.

Comportamento agentic alvo:

1. Recebe assessment novo.
2. Verifica documentos disponíveis.
3. Aciona ingestão.
4. Consulta SCF estruturado.
5. Aguarda escolha de framework.
6. Propõe SoA.
7. Aguarda aprovação.
8. Executa Evidence Analysis.
9. Gera Gap Analysis.
10. Aguarda aprovação.
11. Mede maturidade.
12. Gera POA&M.
13. Gera relatório.
14. Fecha assessment.

## Status do Projeto

Status: MVP Release Candidate para staging controlado com dados sintéticos.

Não use dados reais de clientes no MVP. Não configure secrets reais em arquivos versionados. Production deploy permanece manual e protegido.

Checklist principal: `docs/releases/mvp-release-candidate-checklist.md`.

## Contexto e Colaboração

O GitHub é a fonte única de verdade para código, decisões, contexto de desenvolvimento, prompts, regras de IA e histórico relevante.

Pontos principais:

- `CONTEXT.md`: ponto central de contexto do projeto.
- `DEVELOPMENT.md`: fluxo de desenvolvimento colaborativo.
- `DECISIONS.md`: índice de decisões e ADRs.
- `docs/context/`: contexto resumido de produto, arquitetura, glossário, convenções e pendências.
- `tasks/branch-context/TEMPLATE.md`: template para preservar contexto por branch.
- `.cursor/rules/`: regras persistentes para agentes no Cursor.

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
│   ├── agent-runtime/
│   ├── assessment-engine/
│   ├── contracts/
│   ├── document-ingestion/
│   ├── domain/
│   ├── gap-analysis/
│   ├── kb/
│   ├── observability/
│   ├── poam/
│   ├── reporting/
│   ├── scf-catalog/
│   ├── scf-core/
│   ├── schemas/
│   ├── security/
│   └── soa/
├── infra/
│   ├── cloudflare/
│   ├── docker/
│   └── terraform/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── agents/
│   ├── context/
│   └── decisions/
├── adr/
├── prompts/
├── tasks/
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
- `packages/contracts`: interfaces, DTOs e tipagens limpas que atravessam fronteiras.
- `packages/domain`: regras e entidades de domínio puras desvinculadas de framework.
- `packages/assessment-engine`: state machine, transitions, approval gates e artifact invariants.
- `packages/scf-core`: fonte normativa estruturada do SCF e mappings oficiais.
- `packages/scf-catalog`: estrutura de leitura e queries avançadas para a base de controles SCF.
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
- `docs/architecture/aegis-agentic-ai-operating-model.md`
- `docs/architecture/orchestrator-agent.md`
- `docs/architecture/specialist-agents.md`
- `docs/architecture/tool-registry-and-permissions.md`
- `docs/architecture/human-in-the-loop-governance.md`
- `docs/architecture/agent-memory-context.md`
- `docs/architecture/agent-evaluation-safety.md`
- `docs/architecture/multi-agent-collaboration.md`
- `docs/architecture/agentic-runtime-deployment.md`
- `docs/architecture/production-hardening.md`
- `docs/architecture/external-integration-model.md`
- `docs/architecture/workflow-orchestration.md`
- `docs/architecture/cloudflare-infrastructure.md`
- `docs/operations/workflows.md`
- `docs/operations/deployment.md`
- `docs/operations/secrets-and-env.md`
- `docs/operations/testing-runbook.md`
- `docs/testing/api-first-mvp-acceptance-scenario.md`
- `docs/operations/security-operations.md`
- `docs/operations/staging-deployment-checklist.md`
- `docs/operations/production-readiness-checklist.md`
- `docs/operations/production-go-live-checklist.md`
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
- `docs/api/public-api-guidelines.md`
- `docs/context/produto.md`
- `docs/context/arquitetura.md`
- `docs/context/glossario.md`
- `docs/context/convencoes.md`
- `docs/context/pendencias.md`
- `docs/agents/aegis-agents.md`
- `docs/decisions/0001-platform-boundaries.md`
- `adr/0001-estrutura-base-do-projeto.md`
- `CONTEXT.md`
- `DEVELOPMENT.md`
- `DECISIONS.md`
- `AGENTS.md`

## Regras de Dados

- Use apenas fixtures e golden outputs sintéticos em `evals/`.
- Não versionar dados reais, dumps, documentos de cliente, tokens, chaves ou credenciais.
- KB é fonte de evidências candidatas; SCF estruturado continua fonte normativa.
- Agentes não aprovam artefatos finais e não inventam mappings oficiais.

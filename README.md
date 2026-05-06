# standard-api-standard

`standard-api-standard` é a implementação API-first padrão do Standard SCF-Based Assessment Lifecycle e do **Standard SCF Agentic Assessment Model**. O repositório concentra backend reutilizável, contratos, schemas, workflows, workers, assessment engine, SCF data layer, Knowledge Base, artefatos de assessment, agent runtime, segurança, observabilidade e suites de teste/eval.

O frontend é consumidor da API. Lógica crítica de assessment, tenant isolation, approval gates e guardrails deve permanecer em `packages/*`, `workers/*`, `apps/api-gateway` e contratos compartilhados.

## Standard SCF Agentic Assessment Model

O Standard SCF Agentic Assessment Model é um modelo de IA agêntica para conduzir assessments baseados no Secure Controls Framework, no qual agentes especializados colaboram sob orquestração controlada para ingerir documentos, construir KB, mapear frameworks, gerar SoA, avaliar evidências, produzir Gap Analysis, medir maturidade, gerar POA&M e preparar relatórios, sempre com rastreabilidade, validação de schema, controle de escopo e aprovação humana.

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

Status: Release Candidate do MVP Enterprise-Grade Finalizado (Backend Drizzle/PostgreSQL, Orquestração de Filas e LLM testado e maduro em Cloudflare + Pipeline E2E). Próximo passo: Integração Front-end Real e Plena Configuração Cloudflare Staging/Produção.
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

- API Gateway: expõe endpoints versionados `/api/v1`, aplica Better Auth / RBAC granular, validação estrutural Zod e gerencia integrações de keys de parceiros.
- Packages: concentram regras fundamentais de domínio, schemas unificados, ciclo SCF normativo, Knowledge Base vectorizada, SoA, Gap, POA&M, Security, Audit Logs e Runtime do LLM Agent.
- Workers: workers autônomos de ingestão de documentos para R2, filas (Queues) para rate-limits ou webhooks, e a rede resiliente do Cloudflare Workflows para lifecycles complexos.
- Cloudflare-oriented: Workers, Workflows, Queues, R2, Vectorize (para o bge-base-en), e AI Gateway (anti prompt-injection + rastreio LLM) com persistência atômica no banco externo.
- PostgreSQL externo/gerenciado: Única fonte crítica da verdade transacional utilizando Drizzle ORM para todos os artefatos gerados, aprovações de humanos, audit logs, execuções do agente e tenancies.
## Estrutura do Repositório

```text
standard-api-standard/
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
- `docs/architecture/standard-agentic-ai-operating-model.md`
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
- `docs/agents/standard-agents.md`
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


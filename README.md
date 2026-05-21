<h1 align="center">Standard API</h1>

<p align="center">
  <strong>Automate security & compliance assessments across 231+ frameworks</strong>
</p>

<p align="center">
  <a href="https://github.com/resper1965/standard-api/actions/workflows/ci.yml"><img src="https://github.com/resper1965/standard-api/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="https://github.com/resper1965/standard-api/actions/workflows/deploy-production.yml"><img src="https://github.com/resper1965/standard-api/actions/workflows/deploy-production.yml/badge.svg" alt="Deploy"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/license-BSL--1.1-blue" alt="License">
  <img src="https://img.shields.io/badge/platform-Cloudflare%20Workers-orange" alt="Platform">
</p>

---

Standard is a **compliance assessment API** that automates security evaluations against SOC 2, ISO 27001, HIPAA, NIST, and 231+ regulatory frameworks. Upload your security documents, and Standard's AI agents analyze them against the Secure Controls Framework (1,468 controls, 32,903 requirements, 15,717 crosswalk mappings) to produce gap analyses, maturity scores, remediation plans, and audit-ready reports.

**Your application calls the API — Standard does the compliance intelligence.**

## 🚀 Quickstart

```bash
# Health check (no auth required)
curl https://api.standard.bekaa.eu/health

# List compliance frameworks
curl -H "Authorization: ApiKey YOUR_KEY" \
  https://api.standard.bekaa.eu/api/v1/scf/frameworks

# Create an assessment
curl -X POST -H "Authorization: ApiKey YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_id":"YOUR_ORG","name":"Q2 Assessment"}' \
  https://api.standard.bekaa.eu/api/v1/assessments
```

📖 **[Getting Started →](docs/getting-started.md)** | 🔗 **[API Explorer →](https://api.standard.bekaa.eu/docs)** | 📖 **[Cookbook →](https://api.standard.bekaa.eu/docs/cookbook)** | 💻 **[Examples →](examples/)**


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

Status: **Release Candidate** — Backend funcional com AI Gateway, assessment lifecycle de 14 passos, SCF catalog, Gap Analysis, Maturity Scoring, PoA&M e Report Generation. Hardening de produção em andamento.

**Implementado:**
- ✅ Assessment Engine com state machine completa (25 estados)
- ✅ SCF Catalog com importador XLSX e 1000+ controles
- ✅ AI Gateway (OpenAI via Cloudflare) com fallback para Mock
- ✅ Better Auth com sessions, Google OAuth
- ✅ Gap Analysis, SoA, Maturity Scoring, PoA&M
- ✅ Document Ingestion com upload → R2, chunking
- ✅ Tenant isolation em todas as tabelas
- ✅ Agent Runtime com tool contracts e guardrails
- ✅ API Key auth com SHA-256 hash + timing-safe comparison
- ✅ Rate limiting por tenant (sliding window)
- ✅ Audit log persistence em PostgreSQL
- ✅ DOCX export, Cloudflare AI embeddings, OpenAI cost tracking

**Diferido (Phase 4):**
- ⬜ OSCAL JSON importer (XLSX cobre 100% das necessidades atuais)
- ⬜ Hostname-based tenant resolution (custom domains)

Não use dados reais de clientes sem validação completa de segurança. Não configure secrets reais em arquivos versionados.

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

## Segurança

Para reportar vulnerabilidades, veja [SECURITY.md](SECURITY.md). O endpoint `/.well-known/security.txt` está ativo em produção.

## Contribuindo

Leia [CONTRIBUTING.md](CONTRIBUTING.md) para guidelines de desenvolvimento, branch strategy e requisitos de teste.

## Licença

Este projeto é licenciado sob a [Business Source License 1.1](LICENSE). Converte automaticamente para Apache 2.0 em 2028-05-14.

## Links Úteis

| Recurso | Link |
| ------- | ---- |
| Produção | [standard.bekaa.eu](https://standard.bekaa.eu) |
| CI Status | [GitHub Actions](https://github.com/resper1965/standard-api/actions) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |
| Roadmap | [ROADMAP.md](ROADMAP.md) |
| Code of Conduct | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |

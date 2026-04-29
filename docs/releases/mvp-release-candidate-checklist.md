# MVP Release Candidate Checklist

## Status Geral

Status: release candidate para staging controlado com dados sintéticos.

Recomendação atual: Go condicional para staging, desde que os comandos de validação listados abaixo continuem verdes no CI e os secrets/resources de staging sejam configurados fora do repositório.

Escopo validado:

- backend API-first, packages reutilizáveis e contratos compartilhados;
- lifecycle SCF-Based Assessment com state machine, approval gates e artefatos versionados;
- segurança inicial com auth placeholder local, RBAC, tenant isolation, upload security e prompt security;
- observability com logs estruturados, redaction, audit/security events, metrics e usage/cost records;
- evals determinísticos, golden datasets sintéticos, regression tests e synthetic E2E.

## Checklist por Área

| Área | Status | Evidência |
| --- | --- | --- |
| Repository consistency | Atendido para MVP | Packages, apps e workers possuem `package.json`; exports principais existem em `src/index.ts`; scripts raiz cobrem lint, typecheck, tests e build. |
| API-first | Atendido | Regras críticas vivem em `packages/*`, `workers/*` e `apps/api-gateway`; frontend permanece consumidor/placeholder. |
| Multi-tenancy | Atendido para MVP | Tenant guards, `tenant_id`, `organization_id` e `assessment_id` aparecem em rotas críticas, schemas, tests e fixtures. |
| Security | Atendido com limitações | RBAC, upload validation, prompt injection guardrails, secure errors e redaction existem; auth real, malware scan e rate limiting real são pós-MVP. |
| Assessment Engine | Atendido | State transitions, approval gates, artifact immutability e versionamento têm testes de package. |
| SCF Data Service | Atendido para dataset sintético | SCF estruturado é fonte normativa; mappings oficiais só existem como dados estruturados; importer real hardening fica pós-MVP. |
| Document Ingestion | Atendido para MVP | Validação de arquivo, storage adapter, chunking, jobs e safe errors existem com adapters/mocks locais. |
| Knowledge Base | Atendido para MVP | VectorStore interface, mock store e KB search como candidate evidence; KB não substitui SCF normativo. |
| SoA | Atendido | Draft usa framework + SCF mappings, trata incerteza e exige approval humano antes de avançar. |
| Gap Analysis | Atendido | Só avança após SoA aprovada; preserva `not_evidenced` sem converter para falha automática. |
| Maturity | Parcial | Gate e golden output existem; pacote dedicado `packages/maturity` ainda é backlog. |
| POA&M | Atendido | Itens vinculam gap/control/requirement, expected evidence, acceptance criteria, priority e approval. |
| Reporting | Atendido para JSON/Markdown | Report versions, artifact storage, traceability appendix e approved sources modelados; DOCX/PDF são placeholders. |
| Agent Runtime | Atendido para MVP | Registry, tool allowlist, MockLLMProvider, schema validation e guardrails contra approval/mapping inventado. |
| Workflows | Atendido para MVP | Workflow principal, signals, waits, retries/idempotency e failed/blocked/cancelled testados com mocks. |
| Observability | Atendido | Logger estruturado, redaction, audit/security events, metrics, usage/cost records e trace propagation. |
| Tests and evals | Atendido | Unit, contract, security, regression, evals e synthetic E2E disponíveis e no CI. |
| Cloudflare | Documentado | Wrangler configs/templates, bindings, resources e deploy workflows existem; recursos reais dependem de provisionamento por ambiente. |

## Resultado dos Comandos Executados

| Comando | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passou; lockfile atualizado e dependências já estavam up to date. |
| `pnpm lint` | Passou; nenhum secret óbvio encontrado em arquivos versionáveis. |
| `pnpm typecheck` | Passou; 17 workspace projects typechecked. |
| `pnpm test` | Passou; packages, workers e API Gateway executaram suites com sucesso. |
| `pnpm test:unit` | Passou; packages e workers executaram suites com sucesso. |
| `pnpm test:contracts` | Passou; 8 contract tests. |
| `pnpm test:security` | Passou; security package e 51 API tests. |
| `pnpm test:regression` | Passou; 5 synthetic regression tests. |
| `pnpm test:evaluations` | Passou; 7 evals, `schema_pass_rate` 1, `guardrail_pass_rate` 1, zero hallucinated mappings/approval bypass/tenant violations. |
| `pnpm test:synthetic-e2e` | Passou; 1 synthetic E2E. |
| `pnpm test:integration` | Passou; API Gateway e workflows com adapters/mocks. |
| `pnpm build` | Passou; build workspace sem erro. |
| `pnpm test:ci` | Passou; lint, typecheck, unit, contracts, security, regression, evals, synthetic E2E e build. |

## Testes Executados

- Unit tests por package/worker.
- Contract tests de API, schemas e erros.
- Security tests de auth/RBAC/tenant/upload/prompt/tool policy.
- Tenant isolation tests em API, KB, workflows, POA&M, reporting e packages.
- Approval gate tests em Assessment Engine, SoA, Gap, POA&M, Reporting e Workflow.
- Agent guardrail evals com `MockLLMProvider`.
- Regression tests com golden dataset sintético.
- Synthetic E2E do lifecycle sem provider real.
- Integration tests mock de API Gateway e workflows.

## Testes Pendentes

- Smoke tests reais em Cloudflare staging.
- Testes de provisionamento real de R2, Queues, Vectorize e Workflows.
- Testes com auth real JWT/API key/Cloudflare Access.
- Testes de performance/load com dados sintéticos maiores.
- Coverage formal por package.

## Critérios Atendidos

- CI configurado com lint, typecheck, unit, contract, security, regression, evals, synthetic E2E e build.
- `.env.example` usa placeholders e não contém secrets reais.
- Tenant isolation básico está testado.
- Approval gates básicos estão testados.
- State machine está testada.
- Schemas críticos estão testados.
- Agent guardrails estão testados.
- SCF mappings oficiais são protegidos contra inferência.
- KB search é tratado como candidate evidence.
- Logs têm redaction.
- Documentação mínima de release, segurança, staging e production readiness existe.
- Deploy production é manual e usa environment protection `production`.

## Critérios Não Atendidos ou Parciais

- Auth real de staging/production ainda não foi implementado.
- Rate limiting real ainda é placeholder.
- Malware scanning ainda é placeholder.
- Audit/security events persistentes ainda dependem de storage real.
- Workflow Cloudflare real ainda precisa smoke test de ambiente.
- `packages/maturity` dedicado ainda não existe.
- DOCX/PDF reporting ainda é placeholder.

## Bloqueadores

Nenhum bloqueador conhecido para staging controlado com dados sintéticos.

Bloqueadores antes de produção:

- auth real e Cloudflare Access para superfícies admin;
- persistência transacional real;
- audit log retention;
- rate limiting real;
- backup/restore validado;
- revisão legal/privacy;
- smoke tests Cloudflare reais.

## Riscos Aceitos

- Uso de adapters in-memory/mock no caminho local e em tests padrão.
- Uso de fixtures SCF sintéticas, não base oficial completa.
- Sem LLM real em testes padrão.
- Sem Terraform/Pulumi aplicado no MVP.
- Sem dashboards operacionais persistentes.

## Go/No-Go para Staging

Recomendação: Go para staging controlado, limitado a dados sintéticos e operadores internos.

Condições:

- `pnpm test:ci` verde no branch do release;
- Cloudflare secrets configurados via GitHub Secrets ou `wrangler secret put`;
- recursos staging separados de production;
- `MockAuthProvider` não exposto publicamente sem Access/Zero Trust;
- smoke tests executados após deploy;
- nenhum dado real de cliente em staging.

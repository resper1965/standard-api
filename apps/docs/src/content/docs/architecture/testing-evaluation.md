---
title: "Testing and Evaluation Strategy"
---

# Testing and Evaluation Strategy

## Estratégia Geral

O Standard usa testes automatizados, evals determinísticos e golden datasets sintéticos para validar o lifecycle sem dados reais, sem LLM real e sem recursos Cloudflare reais no caminho padrão.

## Pirâmide de Testes

1. Unit tests por package.
2. Integration tests com mock repositories/adapters.
3. Contract tests para schemas, endpoints e erros.
4. Regression tests com golden outputs sintéticos.
5. Synthetic e2e para fluxo crítico sem provider externo.
6. Testes Cloudflare/LLM reais apenas opcionais e manuais.

## Testes por Package

Packages com testes existentes:

- `packages/assessment-engine`
- `packages/scf-core`
- `packages/document-ingestion`
- `packages/kb`
- `packages/soa`
- `packages/gap-analysis`
- `packages/poam`
- `packages/reporting`
- `packages/agent-runtime`
- `packages/security`
- `packages/observability`

Esses testes cobrem state machine, approval gates, imutabilidade, organization isolation, KB, report generation, RBAC, redaction e observability.

## Contract Tests

`tests/contracts` valida:

- request/response schema behavior;
- error format com `trace_id`;
- schemas de audit/security events;
- endpoints versionados sob `/api/v1`;
- contratos conservadores para SoA sem mapping oficial.

## Security Tests

Security tests rodam em:

- `packages/security/tests`;
- `apps/api-gateway/tests/api-security.test.ts`;
- testes de observability para security events.

Critérios:

- auth required;
- organization required;
- permission required;
- organization mismatch bloqueado;
- prompt injection tratado como untrusted;
- tool allowlist enforced;
- redaction de campos sensíveis.

## Organization Isolation Tests

Os pacotes de domínio e API testam isolamento para:

- documents;
- KB;
- SoA;
- Gap Analysis;
- POA&M;
- Reporting;
- workflows;
- audit/usage endpoints.

Nenhum teste usa dados reais de cliente.

## Approval Gate Tests

O Assessment Engine e packages de artefatos validam:

- SoA sem `approval_event` é bloqueado;
- Gap Analysis sem `approval_event` é bloqueado;
- POA&M sem `approval_event` é bloqueado;
- Report sem `approval_event` é bloqueado;
- artefato aprovado é imutável;
- correção exige nova versão;
- agente funcional não aprova artefato final.

## Agent Evals

`evals/agent-evals` usa `MockLLMProvider` determinístico.

Invariantes:

- Framework Mapper não inventa mapping oficial.
- SoA Architect usa `requires_validation` quando incerto.
- Evidence Analyst não transforma `not_evidenced` em `not_implemented`.
- Gap Analyst preserva `not_evidenced` e `conflicting`.
- Maturity Assessor não dá score alto sem evidência operacional.
- POA&M Planner vincula cada ação a `related_gap_finding_id`.
- Report Writer preserva limitações e fontes.

## Golden Datasets Sintéticos

`evals/fixtures` contém organization, organization, assessment, documentos, SCF sintético, framework sintético, mappings oficiais e resultados de KB.

`evals/golden` contém outputs esperados para:

- SoA;
- Gap Analysis;
- Maturity;
- POA&M;
- Reporting.

Golden outputs usam IDs sintéticos e não incluem texto integral de documentos.

## Regression Tests

`evals/regression` valida golden outputs por estrutura e invariantes, não por texto exato. Campos dinâmicos como timestamps, IDs gerados e `trace_id` não são comparados.

## CI Strategy

CI executa:

- install;
- lint;
- typecheck;
- `test:unit`;
- `test:contracts`;
- `test:security`;
- `test:regression`;
- `test:evaluations`;
- `test:synthetic-e2e`;
- build.

`test:integration` fica disponível para execução local/manual e para investigação dirigida, pois duplica parte das suites de API Gateway e Workflows já cobertas no caminho de release candidate.

## Testes Opcionais com Cloudflare Real

Ficam fora do CI principal:

- Workers deploy/smoke real;
- R2 real;
- Vectorize real;
- Queues reais;
- Workflows reais;
- AI Gateway real.

Devem exigir env vars explícitas e nunca usar production.

## Testes Opcionais com LLM Real

Ficam fora do CI principal. Devem:

- exigir env var explícita;
- usar dados sintéticos;
- não persistir prompt/output integral;
- registrar provider/model/usage;
- comparar comportamento, não texto exato.

## Critérios de Qualidade

Testes devem falhar se:

- output de agente não valida schema;
- organization isolation falha;
- approval gate é burlado;
- mapping oficial é inventado;
- `not_evidenced` vira `not_implemented` sem rationale;
- artifact aprovado é editado;
- logs contêm campo sensível proibido;
- API error não tem `trace_id`.

## Limitações do MVP

- Evals são determinísticos e não medem variância de LLM real.
- Golden outputs cobrem dataset mínimo.
- Maturity package ainda não existe como package dedicado; golden maturity é estrutural.
- Cloudflare real não roda no CI padrão.
- Coverage formal ainda não está configurado.

## Decisões em Aberto

- Ferramenta futura de coverage.
- Runner estatístico para evals com LLM real.
- Persistência histórica de métricas de eval.
- Política de aprovação para atualizar golden outputs.
- Test matrix por ambiente Cloudflare.


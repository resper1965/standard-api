# API-First MVP Acceptance Scenario

## 1. Objetivo do Cenário

Validar que a API do Standard consegue executar o Standard SCF-Based Assessment Lifecycle ponta a ponta sem frontend, sem LLM real, sem dados reais e sem dependência obrigatória de Cloudflare real.

O cenário valida que a API consegue:

- criar assessment;
- ingerir documentos;
- indexar KB;
- selecionar framework;
- gerar SoA;
- passar por approval;
- gerar Gap Analysis;
- passar por approval;
- gerar Maturity;
- passar por approval;
- gerar POA&M;
- passar por approval;
- gerar Report;
- registrar audit trail;
- manter tenant isolation;
- manter traceabilidade completa.

Este documento é um cenário de aceitação MVP. Ele deve poder ser automatizado como teste API-driven usando adapters locais, repositórios in-memory, fixtures sintéticas, `MockLLMProvider` e `MockVectorStore`.

## 2. Premissas

- Dados sintéticos apenas.
- SCF sintético ou fixture controlada.
- `MockLLMProvider` ativo.
- `MockVectorStore` ativo, ou Vectorize real controlado em ambiente não produtivo.
- Ambiente local ou development.
- Autenticação simulada ou simplificada.
- Nenhuma dependência obrigatória de Cloudflare real.
- Nenhum documento real.
- Nenhum prompt/output sensível persistido.
- Todos os requests carregam tenant context.
- Todos os responses críticos incluem `trace_id`.

Headers mínimos recomendados:

```text
Authorization: Bearer synthetic-token
x-standard-tenant-id: tenant_synth_a
x-standard-organization-id: org_synth_healthtech
x-standard-actor-id: assessor_user
x-standard-trace-id: trace_acceptance_001
content-type: application/json
```

Para aprovações:

```text
x-standard-actor-id: approver_user
```

## 3. Entidades do Cenário

Tenant:

- `tenant_synth_a`

Organization:

- `org_synth_healthtech`

Users:

- `assessor_user`
- `approver_user`

Assessment:

- `asm_synth_001`

Framework:

- `SYNTH-STD-1`

SCF version:

- `SCF-SYNTH-1`

Documentos sintéticos:

- `doc_synth_policy_access_control`
- `doc_synth_incident_response_policy`
- `doc_synth_backup_procedure`
- `doc_synth_malicious_prompt_injection`

## 4. Fluxo Completo API-Driven

Fluxo padrão:

1. Criar tenant, se aplicável.
2. Criar organização.
3. Criar assessment.
4. Upload/registro de documentos.
5. Iniciar ingestão.
6. Executar KB indexing.
7. Selecionar framework.
8. Gerar SoA draft.
9. Consultar SoA draft.
10. Aprovar SoA.
11. Executar Evidence Analysis.
12. Gerar Gap Analysis draft.
13. Consultar Gap.
14. Aprovar Gap.
15. Gerar Maturity draft.
16. Aprovar Maturity.
17. Gerar POA&M draft.
18. Aprovar POA&M.
19. Gerar Report.
20. Aprovar Report.
21. Encerrar assessment.

Fluxo com Workflow:

```text
POST /api/v1/assessments/:assessmentId/workflows/lifecycle/start
  ↓
POST /api/v1/workflows/:workflowRunId/signals
  ↓
GET /api/v1/assessments/:assessmentId/workflows/lifecycle
```

Fluxo com endpoints especializados:

```text
Documents → KB → Framework → SoA → Approval
→ Evidence → Gap → Approval
→ Maturity → Approval
→ POA&M → Approval
→ Report → Approval → Closed
```

## 5. Contrato de Cada Etapa

### 1. Criar Tenant

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/tenants` |
| Payload | `{ "tenant_id": "tenant_synth_a", "name": "Synthetic Tenant A" }` |
| Resposta esperada | `201` ou `202`, tenant criado ou aceito |
| Estado esperado | Tenant disponível |
| Validações obrigatórias | `tenant_id` sintético, `trace_id`, sem dados reais |

Observação: se o ambiente de teste já injeta tenant via fixture/header, esta etapa pode ser marcada como precondition e não executada.

### 2. Criar Organização

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/organizations` |
| Payload | `{ "organization_id": "org_synth_healthtech", "tenant_id": "tenant_synth_a", "name": "Synthetic HealthTech Org" }` |
| Resposta esperada | `201` ou `202` |
| Estado esperado | Organização disponível |
| Validações obrigatórias | organização vinculada ao tenant correto |

### 3. Criar Assessment

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments` |
| Payload | `{ "organization_id": "org_synth_healthtech", "name": "Synthetic MVP Acceptance Assessment", "scf_version_id": "SCF-SYNTH-1", "document_count": 0 }` |
| Resposta esperada | `202`, `assessment_id`, `tenant_id`, `organization_id`, `state`, `trace_id` |
| Estado esperado | `draft` |
| Validações obrigatórias | assessment pertence a `tenant_synth_a`; `trace_id` presente |

### 4. Upload/Registro de Documentos

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/documents` |
| Payload | metadata sintética do documento, hash e tipo |
| Resposta esperada | `202`, `document_id`, ingestion job ou status registrado |
| Estado esperado | `documents_uploaded` após transição/workflow |
| Validações obrigatórias | arquivo/metadata sintético; tenant correto; audit event |

Payload exemplo:

```json
{
  "document_id": "doc_synth_policy_access_control",
  "file_name": "synthetic-access-control-policy.md",
  "content_type": "text/markdown",
  "size_bytes": 2048,
  "sha256": "sha256:synthetic-access-control-policy"
}
```

### 5. Iniciar Workflow de Lifecycle

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/workflows/lifecycle/start` |
| Payload | `{ "idempotency_key": "workflow-start-asm-synth-001" }` |
| Resposta esperada | `202`, `workflow_run_id`, `current_step`, `status`, `trace_id` |
| Estado esperado | workflow `running` ou `waiting_for_documents` |
| Validações obrigatórias | não criar workflow duplicado para mesmo assessment |

### 6. Iniciar/Executar Ingestão

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/documents/:documentId/reprocess` ou signal técnico do workflow |
| Payload | `{ "idempotency_key": "ingest-doc-synth-001" }` |
| Resposta esperada | job aceito ou signal aceito |
| Estado esperado | `documents_ingested` quando concluído |
| Validações obrigatórias | chunks possuem `document_id`, `chunk_id`, hash, tenant, assessment |

Signal alternativo:

```http
POST /api/v1/workflows/:workflowRunId/signals
```

```json
{
  "signal_type": "documents_ingested",
  "idempotency_key": "signal-documents-ingested-001",
  "payload": {
    "document_ids": ["doc_synth_policy_access_control"]
  }
}
```

### 7. Executar KB Indexing

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/kb/index` |
| Payload | `{ "idempotency_key": "kb-index-asm-synth-001" }` |
| Resposta esperada | indexing job criado/aceito |
| Estado esperado | KB pronta para busca; lifecycle pode avançar para `scf_pre_analysis_ready` |
| Validações obrigatórias | Vector references por tenant/assessment; KB não normativa |

Processamento local/mock:

```http
POST /api/v1/kb/indexing-jobs/:jobId/process
```

### 8. Selecionar Framework

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/workflows/:workflowRunId/signals` |
| Payload | signal `framework_selected` com `framework_id: "SYNTH-STD-1"` |
| Resposta esperada | signal aceito |
| Estado esperado | `framework_selected` |
| Validações obrigatórias | framework existe; SCF version compatível |

Payload:

```json
{
  "signal_type": "framework_selected",
  "idempotency_key": "signal-framework-selected-001",
  "payload": {
    "framework_id": "SYNTH-STD-1",
    "scf_version_id": "SCF-SYNTH-1"
  }
}
```

Se o endpoint direto `/api/v1/assessments/:assessmentId/framework` estiver ativo no ambiente, ele pode ser usado como contrato equivalente para seleção de framework.

### 9. Gerar SoA Draft

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/soa/draft` |
| Payload | `{ "framework_id": "SYNTH-STD-1", "scf_version_id": "SCF-SYNTH-1" }` |
| Resposta esperada | `soa_version_id`, items estruturados, `trace_id` |
| Estado esperado | `soa_drafted` |
| Validações obrigatórias | requisitos sem mapping oficial retornam `no_official_mapping`; não inventar mapping |

### 10. Consultar SoA Draft

| Campo | Valor |
| --- | --- |
| Método | `GET` |
| Endpoint | `/api/v1/assessments/:assessmentId/soa` |
| Payload | N/A |
| Resposta esperada | SoA version atual |
| Estado esperado | `soa_drafted` ou `soa_under_review` |
| Validações obrigatórias | items com source mapping, applicability, assumptions e limitations |

### 11. Submeter e Aprovar SoA

| Campo | Submeter | Aprovar |
| --- | --- | --- |
| Método | `POST` | `POST` |
| Endpoint | `/api/v1/soa/:soaVersionId/submit-review` | `/api/v1/soa/:soaVersionId/approve` |
| Payload | `{ "idempotency_key": "soa-submit-001" }` | `{ "approval_event_id": "approval_soa_001", "reason": "Synthetic approval" }` |
| Resposta esperada | SoA under review | SoA approved |
| Estado esperado | `soa_under_review` → `soa_approved` |
| Validações obrigatórias | approver autorizado; separação de funções; artifact aprovado imutável |

Signal de workflow:

```json
{
  "signal_type": "soa_approved",
  "idempotency_key": "signal-soa-approved-001",
  "approval_event_id": "approval_soa_001"
}
```

### 12. Executar Evidence Analysis

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/evidence-analysis/run` |
| Payload | `{ "soa_version_id": "soa_synth_v1", "idempotency_key": "evidence-run-001" }` |
| Resposta esperada | evidence findings estruturados |
| Estado esperado | `evidence_analysis_ready` |
| Validações obrigatórias | `not_evidenced` preservado; sources com document/chunk/hash |

### 13. Gerar Gap Analysis Draft

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/gap-analysis/draft` |
| Payload | `{ "soa_version_id": "soa_synth_v1", "idempotency_key": "gap-draft-001" }` |
| Resposta esperada | `gap_analysis_version_id`, findings estruturados |
| Estado esperado | `gap_analysis_drafted` |
| Validações obrigatórias | Gap só gera se SoA aprovada; `not_evidenced` não vira `not_implemented` sem rationale |

### 14. Consultar Gap

| Campo | Valor |
| --- | --- |
| Método | `GET` |
| Endpoint | `/api/v1/assessments/:assessmentId/gap-analysis` |
| Payload | N/A |
| Resposta esperada | Gap Analysis atual |
| Estado esperado | `gap_analysis_drafted` |
| Validações obrigatórias | findings referenciam SoA item, SCF control, evidence source |

### 15. Submeter e Aprovar Gap

| Campo | Submeter | Aprovar |
| --- | --- | --- |
| Método | `POST` | `POST` |
| Endpoint | `/api/v1/gap-analysis/:gapAnalysisVersionId/submit-review` | `/api/v1/gap-analysis/:gapAnalysisVersionId/approve` |
| Payload | `{ "idempotency_key": "gap-submit-001" }` | `{ "approval_event_id": "approval_gap_001", "reason": "Synthetic approval" }` |
| Resposta esperada | Gap under review | Gap approved |
| Estado esperado | `gap_analysis_under_review` → `gap_analysis_approved` |
| Validações obrigatórias | approver autorizado; artifact aprovado imutável |

### 16. Gerar Maturity Draft

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/artifacts/maturity_assessment/versions` |
| Payload | `{ "source_agent_run_id": "agent_maturity_synth_001", "metadata": { "framework_id": "SYNTH-STD-1" } }` |
| Resposta esperada | `artifact_version_id` de maturity draft |
| Estado esperado | `maturity_assessed` |
| Validações obrigatórias | maturity só gera se Gap aprovado; score alto exige evidência operacional |

Observação MVP: `packages/maturity` ainda não é package dedicado. Até existir endpoint especializado, o cenário usa artifact version genérico para validar gate, schema e rastreabilidade.

### 17. Aprovar Maturity

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/artifacts/:artifactVersionId/submit-review` e `/api/v1/artifacts/:artifactVersionId/approve` |
| Payload | approval event `maturity` |
| Resposta esperada | maturity approved |
| Estado esperado | `maturity_under_review` → `maturity_approved` |
| Validações obrigatórias | approval humano; sem auto-approval; versionamento |

Signal de workflow:

```json
{
  "signal_type": "maturity_approved",
  "idempotency_key": "signal-maturity-approved-001",
  "approval_event_id": "approval_maturity_001"
}
```

### 18. Gerar POA&M Draft

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/poam/draft` |
| Payload | `{ "gap_analysis_version_id": "gap_synth_v1", "maturity_assessment_version_id": "maturity_synth_v1" }` |
| Resposta esperada | `poam_version_id`, items estruturados |
| Estado esperado | `poam_drafted` |
| Validações obrigatórias | cada action referencia gap/control/requirement; action não genérica |

### 19. Aprovar POA&M

| Campo | Submeter | Aprovar |
| --- | --- | --- |
| Método | `POST` | `POST` |
| Endpoint | `/api/v1/poam/:poamVersionId/submit-review` | `/api/v1/poam/:poamVersionId/approve` |
| Payload | `{ "idempotency_key": "poam-submit-001" }` | `{ "approval_event_id": "approval_poam_001", "reason": "Synthetic approval" }` |
| Resposta esperada | POA&M under review | POA&M approved |
| Estado esperado | `poam_under_review` → `poam_approved` |
| Validações obrigatórias | POA&M só aprova por humano autorizado |

### 20. Gerar Report

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/reports/draft` |
| Payload | `{ "report_type": "full_assessment_report", "idempotency_key": "report-draft-001" }` |
| Resposta esperada | `report_version_id`, sections, artifact references |
| Estado esperado | `report_generated` |
| Validações obrigatórias | Report referencia SoA, Gap, Maturity e POA&M aprovados; não altera findings |

### 21. Aprovar Report

| Campo | Submeter | Aprovar |
| --- | --- | --- |
| Método | `POST` | `POST` |
| Endpoint | `/api/v1/reports/:reportVersionId/submit-review` | `/api/v1/reports/:reportVersionId/approve` |
| Payload | `{ "idempotency_key": "report-submit-001" }` | `{ "approval_event_id": "approval_report_001", "reason": "Synthetic acceptance" }` |
| Resposta esperada | report under review | report approved |
| Estado esperado | `report_generated` com approval registrado |
| Validações obrigatórias | approval humano; report artifacts versionados |

### 22. Encerrar Assessment

| Campo | Valor |
| --- | --- |
| Método | `POST` |
| Endpoint | `/api/v1/assessments/:assessmentId/transitions` ou workflow signal final |
| Payload | `{ "next_state": "closed", "reason": "MVP acceptance scenario completed", "approval_event_id": "approval_report_001" }` |
| Resposta esperada | assessment `closed` |
| Estado esperado | `closed` |
| Validações obrigatórias | report aprovado; lifecycle event; audit event |

## 6. Estados Esperados

Labels de aceitação e estados canônicos:

| Label de aceitação | Estado canônico |
| --- | --- |
| `CREATED` | `draft` |
| `DOCUMENTS_UPLOADED` | `documents_uploaded` |
| `KB_READY` | `documents_ingested` ou `scf_pre_analysis_ready` |
| `FRAMEWORK_SELECTED` | `framework_selected` |
| `SOA_DRAFT` | `soa_drafted` |
| `SOA_APPROVED` | `soa_approved` |
| `GAP_DRAFT` | `gap_analysis_drafted` |
| `GAP_APPROVED` | `gap_analysis_approved` |
| `MATURITY_DRAFT` | `maturity_assessed` |
| `MATURITY_APPROVED` | `maturity_approved` |
| `POAM_DRAFT` | `poam_drafted` |
| `POAM_APPROVED` | `poam_approved` |
| `REPORT_DRAFT` | `report_generated` |
| `REPORT_APPROVED` | `report_generated` com approval `report` |
| `CLOSED` | `closed` |

Validação recomendada:

```http
GET /api/v1/assessments/:assessmentId/status
GET /api/v1/assessments/:assessmentId/timeline
GET /api/v1/assessments/:assessmentId/lifecycle-events
```

## 7. Validações Obrigatórias

Durante o fluxo validar:

- tenant isolation;
- schema validation;
- approval gates;
- audit logs;
- `trace_id` propagado;
- artefatos versionados;
- imutabilidade pós-approval;
- `agent_runs` com input/output hash;
- `sources` presentes em findings;
- KB não usada como fonte normativa;
- mapping oficial não inventado;
- ausência de evidência como `not_evidenced`.

## 8. Cenários Negativos Obrigatórios

### Acessar Assessment de Outro Tenant

- Request com `x-standard-tenant-id: tenant_synth_b`.
- Endpoint: `GET /api/v1/assessments/asm_synth_001`.
- Esperado: `403` ou `404` seguro.
- Validar security event `cross_tenant_access_blocked` ou equivalente.

### Aprovar Sem Permissão

- Actor: `assessor_user`.
- Endpoint: approval de SoA/Gap/POA&M/Report.
- Esperado: `403`.
- Validar audit/security event.

### Gerar Gap sem SoA Aprovada

- Endpoint: `POST /api/v1/assessments/:assessmentId/gap-analysis/draft`.
- Esperado: `409` ou `422` com erro seguro e `trace_id`.
- Validar que nenhum Gap artifact foi criado.

### Gerar Maturity sem Gap Aprovado

- Endpoint: maturity artifact version ou endpoint futuro especializado.
- Esperado: bloqueio por prerequisite.
- Validar estado inalterado.

### Editar Artefato Aprovado

- Endpoint: `PATCH /api/v1/gap-findings/:gapFindingId` ou equivalente após approval.
- Esperado: `409` ou `403`.
- Validar que correção exige nova versão/supersede.

### Usar Tool Proibida

- Endpoint: `POST /api/v1/agent-runs/:agentRunId/tool-calls`.
- Payload tenta `admin`, `final_write`, `raw_database_query` ou external call não allowlisted.
- Esperado: `403`, `tool_access_denied`.

### Executar sem `tenant_id`

- Remover `x-standard-tenant-id` e tenant do payload.
- Esperado: `400` ou `401/403` seguro.
- Validar erro com `trace_id`.

## 9. Observabilidade

Validar:

- audit events gerados;
- `trace_id` presente;
- workflow events registrados;
- `agent_runs` registrados;
- tool calls registradas;
- métricas do assessment disponíveis;
- usage/cost records quando aplicável.

Endpoints:

```http
GET /api/v1/assessments/:assessmentId/audit-logs
GET /api/v1/assessments/:assessmentId/metrics
GET /api/v1/assessments/:assessmentId/usage
GET /api/v1/assessments/:assessmentId/agent-runs
GET /api/v1/assessments/:assessmentId/workflows/lifecycle
```

Eventos mínimos esperados:

- assessment created;
- documents registered;
- workflow started;
- workflow step completed;
- SoA submitted/approved;
- Gap submitted/approved;
- Maturity submitted/approved;
- POA&M submitted/approved;
- Report generated/approved;
- assessment closed.

## 10. Outputs Esperados

Validar existência de:

- SoA estruturado;
- Gap Analysis estruturado;
- Maturity Assessment estruturado;
- POA&M estruturado;
- Report estruturado.

Endpoints:

```http
GET /api/v1/assessments/:assessmentId/soa
GET /api/v1/assessments/:assessmentId/gap-analysis
GET /api/v1/artifacts/:artifactVersionId
GET /api/v1/assessments/:assessmentId/poam
GET /api/v1/assessments/:assessmentId/reports
```

## 11. Teste de Rastreabilidade

Validar:

- cada finding possui source;
- cada ação POA&M referencia gap;
- relatório referencia artefatos aprovados.

Checks:

- Gap finding contém `evidence_finding_id`, `source_document_id` ou source equivalente.
- POA&M item contém `related_gap_finding_id`.
- Report contém references para `soa_version_id`, `gap_analysis_version_id`, `maturity_assessment_version_id`, `poam_version_id`.
- Todos os artifacts possuem `tenant_id`, `organization_id`, `assessment_id`, `trace_id`.

## 12. Teste de Consistência

Validar:

- Gap consistente com evidência.
- Maturity consistente com Gap.
- POA&M consistente com Gap.
- Report consistente com tudo.

Regras:

- evidence `not_evidenced` não sustenta `implemented`.
- maturity alta exige evidência operacional.
- POA&M action deve existir para gaps relevantes.
- Report não altera status/finding aprovado.
- KB result não substitui SCF mapping oficial.

## 13. Idempotência

Testar:

- repetir chamada não duplica artefato;
- retry não quebra estado.

Casos:

- repetir `workflow-start-asm-synth-001` retorna workflow existente.
- repetir `signal-soa-approved-001` não cria approval duplicado.
- repetir `gap-draft-001` não cria múltiplos Gap drafts sem nova versão explícita.
- repetir `kb-index-asm-synth-001` não duplica vector references.
- repetir report render/export não duplica artifact sem key nova.

Critério:

```text
same idempotency_key + same scope = same logical result
```

## 14. Performance Mínima

Validar:

- fluxo completo executável;
- sem timeouts críticos;
- sem loops infinitos;
- sem retry sem limite;
- sem crescimento excessivo de contexto;
- sem duplicação explosiva de artifacts/jobs.

Critérios iniciais:

- cada chamada síncrona leve responde dentro do limite local definido pelo teste;
- jobs mockados finalizam de forma determinística;
- workflow não entra em ciclo;
- `agent_runs` por etapa ficam dentro do esperado;
- falhas negativas não degradam o fluxo principal.

## 15. Scripts de Execução

O cenário pode ser executado como:

- coleção Postman;
- coleção Insomnia;
- script `curl`;
- teste automatizado em `tests/e2e-synthetic`;
- contract/integration test contra API Gateway local.

Exemplo base com `curl`:

```bash
export API_BASE="http://localhost:8787"
export TENANT_ID="tenant_synth_a"
export ORG_ID="org_synth_healthtech"
export TRACE_ID="trace_acceptance_001"
export ASSESSOR="assessor_user"
export APPROVER="approver_user"
```

Criar assessment:

```bash
curl -X POST "$API_BASE/api/v1/assessments" \
  -H "content-type: application/json" \
  -H "x-standard-tenant-id: $TENANT_ID" \
  -H "x-standard-organization-id: $ORG_ID" \
  -H "x-standard-actor-id: $ASSESSOR" \
  -H "x-standard-trace-id: $TRACE_ID" \
  -d '{
    "organization_id": "org_synth_healthtech",
    "name": "Synthetic MVP Acceptance Assessment",
    "scf_version_id": "SCF-SYNTH-1",
    "document_count": 0
  }'
```

Iniciar workflow:

```bash
curl -X POST "$API_BASE/api/v1/assessments/asm_synth_001/workflows/lifecycle/start" \
  -H "content-type: application/json" \
  -H "x-standard-tenant-id: $TENANT_ID" \
  -H "x-standard-organization-id: $ORG_ID" \
  -H "x-standard-actor-id: $ASSESSOR" \
  -H "x-standard-trace-id: $TRACE_ID" \
  -d '{ "idempotency_key": "workflow-start-asm-synth-001" }'
```

Enviar signal de framework:

```bash
curl -X POST "$API_BASE/api/v1/workflows/workflow_synth_001/signals" \
  -H "content-type: application/json" \
  -H "x-standard-tenant-id: $TENANT_ID" \
  -H "x-standard-organization-id: $ORG_ID" \
  -H "x-standard-actor-id: $ASSESSOR" \
  -H "x-standard-trace-id: $TRACE_ID" \
  -d '{
    "signal_type": "framework_selected",
    "idempotency_key": "signal-framework-selected-001",
    "payload": {
      "framework_id": "SYNTH-STD-1",
      "scf_version_id": "SCF-SYNTH-1"
    }
  }'
```

Observação: os IDs gerados pela API devem substituir os IDs fixos nos exemplos quando a execução não usar fixtures estáveis.

## 16. Critérios de Aceite

O cenário é válido se:

- fluxo completo executa sem erro crítico;
- todos approval gates respeitados;
- nenhum bypass detectado;
- nenhum vazamento de tenant;
- outputs válidos por schema;
- audit trail completo;
- traceabilidade completa;
- `trace_id` presente em responses e eventos críticos;
- artifacts aprovados imutáveis;
- retries idempotentes;
- cenários negativos bloqueados com erro seguro;
- dados usados são sintéticos.

No-Go:

- tenant leakage;
- approval bypass;
- output sem schema válido;
- mapping SCF oficial inventado;
- KB usada como fonte normativa;
- artifact aprovado editado;
- audit trail ausente;
- erro sem `trace_id`;
- uso de dado real.

## 17. Limitações do Cenário

- Dados sintéticos.
- Sem LLM real.
- Sem carga real.
- Sem produção.
- Sem Cloudflare real obrigatório.
- Sem prova de performance em escala.
- Maturity usa artifact contract genérico no MVP até existir package/endpoint dedicado.
- Persistência local pode usar repositórios in-memory.
- Auth pode ser simulada conforme configuração local.

## 18. Resultado Esperado

Este documento:

- valida o sistema ponta a ponta via API;
- serve como teste de aceitação MVP;
- pode ser automatizado;
- garante que arquitetura funciona na prática;
- preserva API-first;
- não cria frontend;
- não exige LLM real;
- não usa dados reais;
- não depende de ambiente externo obrigatório.

Definition of done para automação futura:

- fixture sintética carregada;
- API Gateway local iniciado;
- workflow local iniciado;
- chamadas executadas em sequência;
- estados validados;
- artifacts validados por schema;
- negativos executados;
- audit/metrics/agent_runs verificados;
- relatório de execução gerado;
- falhas críticas bloqueiam release candidate.


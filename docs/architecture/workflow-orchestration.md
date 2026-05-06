# Workflow Orchestration

## Objetivo

O Workflow Orchestration conecta o Standard SCF-Based Assessment Lifecycle em uma execução rastreável, retomável e compatível com aprovações humanas. A primeira versão cria contratos compartilhados, serviço de orquestração, endpoints de API e testes com mocks para validar o comportamento principal.

## Papel do Cloudflare Workflows

Cloudflare Workflows é o runtime-alvo para executar o lifecycle como processo durável. O MVP mantém a lógica de orquestração em `workers/workflows/src/assessment-lifecycle.workflow.ts` e deixa o Worker `workers/workflows/src/assessment-lifecycle.ts` como entrypoint reservado para implantação Cloudflare.

O desenho separa:

- **Workflow:** coordena passos, sinais, waits, retry/idempotência e status operacional.
- **Assessment Engine:** valida transições, approval gates e eventos de lifecycle.
- **Services:** executam domínio especializado, como ingestão, KB, SoA, Gap, POA&M e Reporting.
- **Agents:** são chamados apenas por services controlados; o workflow não chama LLM diretamente.

## Lifecycle Ponta a Ponta

O fluxo principal cobre:

1. `draft` para `documents_uploaded`.
2. Espera por documentos/processamento.
3. Ingestão, KB e pré-análise SCF.
4. Seleção de framework.
5. Criação de escopo e SoA draft.
6. Wait obrigatório de aprovação SoA.
7. Ingestão da SoA, evidence analysis e Gap Analysis draft.
8. Wait obrigatório de aprovação Gap Analysis.
9. Maturity Assessment draft e wait obrigatório.
10. POA&M draft e wait obrigatório.
11. Report generation/export e wait obrigatório.
12. Fechamento do assessment via Assessment Engine.

## Steps

Os steps compartilhados estão em `AssessmentLifecycleStepSchema`:

- `validate_assessment`
- `wait_for_documents`
- `ingest_documents`
- `index_kb`
- `run_scf_pre_analysis`
- `wait_for_framework_selection`
- `create_scope`
- `create_soa_draft`
- `wait_for_soa_approval`
- `ingest_soa`
- `run_evidence_analysis`
- `create_gap_analysis`
- `wait_for_gap_approval`
- `create_maturity_assessment`
- `wait_for_maturity_approval`
- `create_poam`
- `wait_for_poam_approval`
- `create_report`
- `wait_for_report_approval`
- `close_assessment`

## Approval Waits

O workflow nunca aprova artefatos automaticamente. Sinais como `soa_approved`, `gap_analysis_approved`, `maturity_approved`, `poam_approved` e `report_approved` exigem `approval_event_id` validado pelo adapter/API antes de continuar.

O Assessment Engine continua sendo o guardião dos gates:

- SoA antes de Evidence Analysis e Gap Analysis.
- Gap Analysis antes de Maturity Assessment.
- Maturity antes de POA&M.
- POA&M antes do relatório final.
- Report antes de `closed`.

## Signals

Sinais aceitos:

- `framework_selected`
- `scope_approved`
- `soa_approved`
- `gap_analysis_approved`
- `maturity_approved`
- `poam_approved`
- `report_approved`
- `assessment_cancelled`
- `assessment_blocked`
- `assessment_resumed`
- sinais técnicos do MVP: `documents_uploaded`, `documents_ingested`, `kb_indexed`, `scf_pre_analysis_completed`

Cada signal preserva `tenant_id`, `organization_id`, `assessment_id`, `trace_id`, `actor_id` e `idempotency_key`.

## Retry e Idempotência

O MVP registra `idempotency_key` por workflow, signal e step lógico. Repetir o mesmo signal com a mesma chave retorna o estado atual sem duplicar eventos ou steps.

Retries seguros são permitidos para steps idempotentes, como ingestão, indexação, renderização e geração draft. O workflow não cria nova versão de SoA, Gap, Maturity, POA&M ou Report sem chave/ação explícita de nova versão.

## Failed, Blocked e Cancelled

Status suportados:

- `pending`
- `running`
- `waiting_for_input`
- `waiting_for_approval`
- `blocked`
- `failed`
- `cancelled`
- `completed`

`blocked` representa dependência de informação, aprovação, configuração ou intervenção manual. `failed` representa erro técnico não recuperado. `cancelled` representa cancelamento explícito por ator autorizado.

## Integração com Queues

O workflow é o coordenador. Etapas pesadas devem seguir para Cloudflare Queues por adapters:

- ingestão documental;
- geração de embeddings/indexação KB;
- render/export de relatórios;
- reprocessamento controlado.

O MVP usa adapters em memória para testes e contratos. Integração real com producers/consumers Cloudflare fica como próximo passo.

## Integração com API

Endpoints implementados:

- `POST /api/v1/assessments/:assessmentId/workflows/lifecycle/start`
- `GET /api/v1/assessments/:assessmentId/workflows/lifecycle`
- `GET /api/v1/workflows/:workflowRunId`
- `POST /api/v1/workflows/:workflowRunId/cancel`
- `POST /api/v1/workflows/:workflowRunId/resume`
- `POST /api/v1/workflows/:workflowRunId/signals`

Handlers resolvem contexto, carregam assessment e approval_event, chamam o orquestrador e persistem o estado sintético do assessment no repositório local.

## Audit Logs

Eventos auditáveis emitidos pelo serviço:

- `lifecycle_workflow_started`
- `lifecycle_workflow_step_started`
- `lifecycle_workflow_step_completed`
- `lifecycle_workflow_waiting_for_approval`
- `lifecycle_workflow_signal_received`
- `lifecycle_workflow_blocked`
- `lifecycle_workflow_cancelled`
- `lifecycle_workflow_resumed`
- `lifecycle_workflow_completed`

Cada evento inclui tenant, organization, assessment, workflow run, step quando aplicável, actor/system actor, trace e metadata segura.

## Limitações do MVP

- Repositório de workflow é in-memory no gateway local.
- O Worker Cloudflare ainda não persiste execução real em Workflows/DO/PostgreSQL.
- Adapters de services especializados são mocks/controladores lógicos; não executam jobs reais de Queue.
- Não há timeout real de wait steps; o status `blocked` é usado para intervenção manual.
- Não há reprocessamento granular por endpoint dedicado ainda.
- `packages/maturity` ainda não existe como pacote especializado; o workflow modela o gate e a transição via Assessment Engine.

## Decisões em Aberto

- Persistência final de workflow runs: PostgreSQL, Durable Objects ou combinação.
- Estratégia de timeout/escalation para approvals.
- Formato de reprocessamento controlado por step.
- Mapeamento exato entre Cloudflare Workflow instance ID e `workflow_run_id`.
- Contrato de Queue callback para jobs assíncronos.


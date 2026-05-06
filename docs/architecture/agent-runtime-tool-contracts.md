# Agent Runtime & Tool Contracts

## Objetivo

O Agent Runtime formaliza os agentes funcionais do **Standard SCF Agentic Assessment Model**, seus contratos de tools, guardrails, rastreabilidade e integração com o Assessment Engine. A primeira versão é um runtime local/in-memory testável; ela não chama LLM real, não executa tools externas e não grava achados finais.

O Standard SCF Agentic Assessment Model é um modelo de IA agêntica para conduzir assessments baseados no Secure Controls Framework, no qual agentes especializados colaboram sob orquestração controlada para ingerir documentos, construir KB, mapear frameworks, gerar SoA, avaliar evidências, produzir Gap Analysis, medir maturidade, gerar POA&M e preparar relatórios, sempre com rastreabilidade, validação de schema, controle de escopo e aprovação humana.

## Comportamento Agentic

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

## Agentes Funcionais

- `knowledge_steward`: organiza KB/evidências; não decide compliance.
- `scf_control_analyst`: analisa controles SCF; não cria mappings oficiais.
- `framework_mapper`: consulta mappings oficiais; não inventa crosswalks.
- `scope_soa_architect`: cria drafts de escopo/SoA; não aprova.
- `evidence_analyst`: classifica evidências; não transforma ausência de evidência em falha.
- `gap_analyst`: cria drafts de Gap Analysis; não finaliza sem aprovação.
- `maturity_assessor`: sugere maturidade; não aprova maturidade.
- `poam_planner`: cria drafts de POA&M; não publica sem aprovação.
- `report_writer`: compõe relatórios; não altera achados aprovados.

Os contratos vivem em `packages/agent-runtime/src/contracts.ts`.

## Tool Contracts

Tools iniciais:

- `assessment_state_read`
- `artifact_version_read`
- `scf_control_lookup`
- `scf_mapping_lookup`
- `kb_evidence_search`
- `artifact_draft_create`
- `validation_result_write`
- `approval_event_create`

Cada tool declara descrição, risco e schema Zod de input. Inputs devem carregar contexto explícito de tenant, organização, assessment, framework, SCF version e trace.

## Guardrails

O runtime bloqueia:

- uso de tool fora da allowlist do agente;
- mismatch de `tenant_id`, `organization_id` ou `assessment_id`;
- output sem `assumptions`, `limitations`, `sources` e `confidence_score`;
- escrita direta de achados finais;
- criação de mappings oficiais por agente;
- approval event direto por agente funcional.

## Rastreabilidade

Cada `agent_run` registra:

- `agent_run_id`
- `tenant_id`
- `organization_id`
- `assessment_id`
- `agent_id`
- `agent_version`
- `prompt_version`
- `model`
- `input_hash`
- `output_hash`
- `confidence_score`
- `trace_id`
- status e timestamps

Tool calls são rastreáveis por `agent_tool_calls` com hash de input/output, risco, status e trace.

## Integração com Assessment Engine

O Agent Runtime não altera lifecycle diretamente. Ele produz runs, tool calls e outputs schema-validados que outros workflows podem associar a artifacts draft. Aprovações continuam no Assessment Engine e exigem approval events humanos.

## API

Endpoints MVP:

- `GET /api/v1/agent-runtime/agents`
- `POST /api/v1/assessments/:assessmentId/agent-runs`
- `GET /api/v1/assessments/:assessmentId/agent-runs`
- `GET /api/v1/agent-runs/:agentRunId`
- `POST /api/v1/agent-runs/:agentRunId/tool-calls`
- `POST /api/v1/agent-runs/:agentRunId/complete`

## Limitações do MVP

- Runtime em memória no API Gateway.
- Sem execução de LLM real.
- Sem tool execution real contra SCF/KB/Artifacts; só validação contratual e rastreio.
- Sem queue `AGENT_TASK_QUEUE` conectada ao runtime.
- Persistência PostgreSQL real de runs/tool calls depende de adapters.

## Decisões em Aberto

- Modelo de RBAC/ABAC por agente/tool.
- Formato definitivo de prompt registry e versionamento.
- Estratégia de execução assíncrona via Cloudflare Queues.
- Política de retenção para prompts, hashes e outputs.
- Adapters PostgreSQL para `agent_runs`, `agent_decisions` e `agent_tool_calls`.


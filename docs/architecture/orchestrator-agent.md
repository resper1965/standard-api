# Orchestrator Agent

## 1. Definição do Orchestrator Agent

O **Orchestrator Agent** é a camada de coordenação lógica do Standard SCF Agentic Assessment Model. Ele interpreta o estado atual de um assessment, decide o próximo passo operacional permitido e prepara a chamada para o Agent Runtime ou a espera por intervenção humana.

Definição operacional:

> O Orchestrator Agent é responsável por decidir qual agente especialista deve ser acionado, com qual contexto, em qual momento do lifecycle, respeitando o estado do assessment, os guardrails e os approval gates.

O Orchestrator é:

- um decision coordinator;
- uma ponte lógica entre Workflow, Agent Runtime, Specialist Agents e approval gates;
- um gerador de decisões auditáveis;
- uma camada determinística no MVP;
- um ponto de controle para dry-run, testes e evals.

O Orchestrator não é:

- substituto do Cloudflare Workflow;
- substituto do Assessment Engine;
- executor de lógica de negócio de SoA, Gap, Maturity, POA&M ou Reporting;
- autoridade para aprovar artefatos;
- runtime LLM autônomo;
- canal direto para tools administrativas ou `final_write`.

Dentro do modelo agentic, o Orchestrator reduz ambiguidade operacional. Ele não "faz o assessment"; ele escolhe o próximo ator correto, com o contexto correto, na ordem correta.

## 2. Relação com os Componentes

### Orchestrator vs Workflow

Workflow controla execução, durabilidade, retries, waits, signals e checkpoints. O Orchestrator decide o próximo passo lógico dentro de um step ou entre steps.

```text
Workflow = executa e persiste o processo
Orchestrator = decide o próximo passo lógico permitido
```

O Workflow chama o Orchestrator e executa a decisão retornada. O Orchestrator não controla a durabilidade da execução.

### Orchestrator vs Assessment Engine

Assessment Engine valida estados, transições, invariantes e approval gates. O Orchestrator consulta o estado e propõe uma decisão; ele nunca define estados diretamente.

```text
Assessment Engine = autoridade de estado e gate
Orchestrator = consumidor da autoridade de estado
```

Qualquer decisão do Orchestrator que implique avanço de lifecycle deve ser validada pelo Assessment Engine.

### Orchestrator vs Agents

Orchestrator invoca agentes especialistas por meio do Agent Runtime. Os agentes executam análise, classificação e geração de drafts.

```text
Orchestrator = escolhe agente, task_type, contexto e schema esperado
Specialist Agent = produz output schema-validado
```

O Orchestrator não executa a análise que pertence ao agente especialista.

### Orchestrator vs Tools

Orchestrator não usa tools diretamente. O acesso a tools acontece por agentes ou services controlados, sempre com allowlist, schema validation, tenant scope e audit trail.

```text
Orchestrator → Agent Runtime → Agent → allowed tools/services
```

Essa regra evita tool overreach, uso administrativo indevido e bypass de políticas por decisão de coordenação.

## 3. Responsabilidades

O Orchestrator deve:

- selecionar o próximo agente baseado no estado;
- preparar contexto de execução;
- garantir que pré-condições foram atendidas;
- validar que approval gates foram respeitados;
- definir `task_type` para o agente;
- definir `expected_output_schema`;
- definir `required_tools` como referência de policy;
- encaminhar para execução via Agent Runtime;
- registrar decisão como `agent_decision` ou `orchestration_decision`;
- bloquear execução quando necessário;
- solicitar intervenção humana quando necessário;
- preservar `trace_id`;
- retornar decisão determinística e explicável.

## 4. Responsabilidades Proibidas

O Orchestrator não pode:

- aprovar SoA, Gap Analysis, Maturity Assessment, POA&M ou Report;
- escrever diretamente em artefatos finais;
- ignorar Assessment Engine;
- ignorar tenant context;
- acessar dados de outro tenant;
- inventar mappings SCF;
- usar KB como fonte normativa;
- executar tools administrativas;
- ignorar validação de schema;
- chamar LLM diretamente no MVP;
- pular lifecycle state;
- converter `not_evidenced` em `not_implemented`;
- reprocessar artefatos aprovados sem motivo, versionamento e evento auditável.

## 5. Inputs do Orchestrator

Inputs obrigatórios:

- `tenant_id`;
- `organization_id`;
- `assessment_id`;
- `current_state`;
- `workflow_step`;
- `available_artifacts`;
- `previous_agent_runs`;
- `approval_status`;
- `trace_id`.

Input opcional:

- `trigger`, representando evento, signal, retry request, dry-run request ou intervenção humana.

Regras de input:

- `tenant_id`, `organization_id` e `assessment_id` são obrigatórios em qualquer fluxo crítico.
- `current_state` deve vir do Assessment Engine ou de repositório validado por ele.
- `approval_status` deve referenciar approval events verificáveis quando o estado exigir gate.
- `available_artifacts` deve conter versões e status, não apenas nomes.
- `previous_agent_runs` deve incluir status, hashes e schema validation result.

## 6. Outputs do Orchestrator

O Orchestrator retorna uma decisão estruturada.

`next_action` permitido:

- `invoke_agent`;
- `wait_for_approval`;
- `block`;
- `retry`;
- `finish`.

Campos de output:

- `next_action`;
- `agent_name`, quando aplicável;
- `task_type`;
- `input_payload`;
- `expected_output_schema`;
- `required_tools`;
- `requires_human_review`;
- `decision_reason`;
- `assumptions`;
- `limitations`;
- `trace_id`.

Regras de output:

- `decision_reason` é obrigatório para toda decisão.
- `assumptions` e `limitations` são obrigatórios mesmo quando vazios.
- `agent_name` deve ser omitido ou `null` para `wait_for_approval`, `block` e `finish`.
- `expected_output_schema` é obrigatório para `invoke_agent`.
- `blocked_reason` é obrigatório quando `next_action` for `block`.

## 7. Decisão Baseada em Estado

Esta tabela define a core logic determinística do MVP. Os nomes de estado devem ser mapeados para os enums canônicos em `packages/schemas` e `packages/assessment-engine`.

| Estado | Pré-condições | Ação | Agente | Resultado esperado |
| --- | --- | --- | --- | --- |
| `draft` | Assessment criado com tenant/organization válidos | `block` ou aguardar documentos | Nenhum | Solicitar upload/documentos |
| `documents_uploaded` | Documentos associados ao assessment | `invoke_agent` para `run_ingestion` | Standard Knowledge Steward | Ingestion/KB preparation draft |
| `documents_ingested` | Ingestion concluída sem erro crítico | `invoke_agent` para `index_kb` | Standard Knowledge Steward | KB indexing decision/context |
| `kb_ready` ou `documents_ingested` com KB indexada | KB index disponível | `invoke_agent` para `scf_pre_analysis` | Standard SCF Control Analyst | SCF pre-analysis draft |
| `scf_pre_analysis_ready` | Pre-analysis válido | `wait_for_approval` ou wait for framework selection | Nenhum | Framework selection pendente |
| `framework_selected` | `framework_id` e `scf_version` válidos | `invoke_agent` para `generate_soa` | Standard Scope & SoA Architect | SoA draft |
| `scope_drafted` | Scope draft validado | `invoke_agent` para `generate_soa` | Standard Scope & SoA Architect | SoA draft |
| `soa_drafted` | SoA draft schema-validado | `wait_for_approval` | Nenhum | SoA approval required |
| `soa_under_review` | Review em aberto | `wait_for_approval` | Nenhum | Aguardar humano |
| `soa_approved` | Approval event humano válido | `invoke_agent` para `run_evidence_analysis` | Standard Evidence Analyst | Evidence Analysis draft |
| `evidence_analysis_ready` | Evidence Analysis validada | `invoke_agent` para `create_gap_analysis` | Standard Gap Analyst | Gap Analysis draft |
| `gap_analysis_drafted` | Gap draft schema-validado | `wait_for_approval` | Nenhum | Gap approval required |
| `gap_analysis_under_review` | Review em aberto | `wait_for_approval` | Nenhum | Aguardar humano |
| `gap_analysis_approved` | Approval event humano válido | `invoke_agent` para `run_maturity` | Standard Maturity Assessor | Maturity draft |
| `maturity_assessed` | Maturity draft schema-validado | `wait_for_approval` | Nenhum | Maturity approval required |
| `maturity_under_review` | Review em aberto | `wait_for_approval` | Nenhum | Aguardar humano |
| `maturity_approved` | Approval event humano válido | `invoke_agent` para `generate_poam` | Standard POA&M Planner | POA&M draft |
| `poam_drafted` | POA&M draft schema-validado | `wait_for_approval` | Nenhum | POA&M approval required |
| `poam_under_review` | Review em aberto | `wait_for_approval` | Nenhum | Aguardar humano |
| `poam_approved` | Approval event humano válido | `invoke_agent` para `generate_report` | Standard Assessment Report Writer | Report draft/export |
| `report_generated` | Report draft/export validado | `wait_for_approval` | Nenhum | Report acceptance required |
| `report_approved` | Human acceptance válida | `finish` para `close_assessment` | Nenhum | Workflow pode fechar assessment via Assessment Engine |
| `closed` | Assessment encerrado | `finish` | Nenhum | Sem ação |
| `archived` | Assessment arquivado | `finish` | Nenhum | Sem ação |
| `cancelled` | Cancelamento autorizado | `finish` | Nenhum | Sem ação |
| `failed` | Falha técnica ou de validação | `block` ou `retry` | Depende do step anterior | Escalar ou retry controlado |
| `blocked` | Dependência ausente | `block` | Nenhum | Intervenção humana/configuração |

Estados equivalentes de implementação podem ser normalizados em um `normalized_state` antes da decisão. A normalização não pode esconder approval gates.

## 8. Orchestration Decision Schema

Schema lógico:

```text
OrchestrationDecision
├── decision_id
├── tenant_id
├── organization_id
├── assessment_id
├── current_state
├── workflow_step
├── next_action
├── agent_name
├── task_type
├── input_payload_hash
├── expected_output_schema
├── required_tools
├── requires_approval
├── blocked_reason
├── retry_policy
├── decision_reason
├── assumptions
├── limitations
├── trace_id
└── created_at
```

Field rules:

- `decision_id`: unique decision identifier.
- `tenant_id`: required for tenant isolation.
- `organization_id`: required for organization scoping.
- `assessment_id`: required for assessment scoping.
- `current_state`: state observed before the decision.
- `workflow_step`: workflow step that requested the decision.
- `next_action`: one of `invoke_agent`, `wait_for_approval`, `block`, `retry`, `finish`.
- `agent_name`: required only for `invoke_agent`.
- `task_type`: required for `invoke_agent`; optional for `retry`.
- `input_payload_hash`: hash of prepared payload, not raw sensitive content.
- `expected_output_schema`: required for agent execution.
- `required_tools`: list of policy-level tool references.
- `requires_approval`: true when next transition depends on human gate.
- `blocked_reason`: required when blocked.
- `retry_policy`: present for retryable failures.
- `decision_reason`: human-readable explanation.
- `assumptions`: explicit assumptions.
- `limitations`: known limitations.
- `trace_id`: trace correlation id.
- `created_at`: decision timestamp.

## 9. Handoff para Agent Runtime

Contrato Orchestrator → Agent Runtime:

```text
AgentRuntimeInvocation
├── agent_name
├── task_type
├── context
│   ├── tenant_id
│   ├── organization_id
│   ├── assessment_id
│   ├── current_state
│   ├── relevant_artifacts
│   ├── previous_agent_runs
│   └── allowed_tools
├── expected_output_schema
├── requires_human_review
├── trace_id
└── dry_run
```

Rules:

- `allowed_tools` must be computed from Tool Registry policy, not invented by the Orchestrator.
- `relevant_artifacts` must reference versions, hashes and status.
- Runtime must reject invocation if `agent_name` has no matching registry entry.
- Runtime must reject output that does not validate against `expected_output_schema`.
- Runtime must record `agent_run_id`, input hash, output hash, status and `trace_id`.

## 10. Integração com Workflow

Fluxo:

```text
Workflow Step
  ↓
calls Orchestrator
  ↓
Orchestrator returns decision
  ↓
Workflow executes one of:
  ├── invoke agent
  ├── wait
  ├── block
  ├── retry
  └── finish
```

Important rule:

```text
Workflow executa.
Orchestrator decide.
Assessment Engine valida.
```

Workflow responsibilities:

- persist workflow run;
- control retries and waits;
- receive signals;
- call Assessment Engine for transitions;
- execute Orchestrator decision;
- record lifecycle audit events.

Orchestrator responsibilities inside workflow:

- return next logical action;
- explain why;
- avoid invalid agent calls;
- avoid bypassing gates.

## 11. Integração com Approval

If an artifact requires approval, the Orchestrator must return:

```text
next_action: wait_for_approval
requires_human_review: true
```

It must never return:

```text
next_action: auto_approve
```

There is no `auto_approve` action in the allowed output model.

Approval-gated artifacts:

- SoA;
- Gap Analysis;
- Maturity Assessment;
- POA&M;
- Report acceptance.

Approval checks:

- approval event exists;
- actor is authorized;
- artifact version matches approved version;
- approval belongs to same `tenant_id`, `organization_id` and `assessment_id`;
- approval has `trace_id` and audit record;
- Assessment Engine accepts transition.

## 12. Failure Handling

The Orchestrator must handle failure as a first-class decision.

| Failure | Decision | Required metadata |
| --- | --- | --- |
| Missing data | `block` | `blocked_reason: "missing_data"` |
| Missing approval | `wait_for_approval` | `requires_human_review: true` |
| Inconsistent state | `block` | current state, expected state, trace |
| Agent failure | `retry` or `block` | retry count, agent_run_id, failure type |
| Schema failure | `block` | `blocked_reason: "validation_failed"` |
| Tenant mismatch | `block` | `blocked_reason: "tenant_context_mismatch"` |
| Tool policy mismatch | `block` | required vs allowed tools |
| Prompt injection signal | `block` or restricted retry | security event id |
| Retry exhausted | `block` and escalate | retry history |

Retry rules:

- retry only idempotent tasks;
- cap retry count;
- preserve same `trace_id` lineage;
- record retry reason;
- do not generate new final artifacts during retry;
- never retry approval by simulating human approval.

## 13. Guardrails Específicos do Orchestrator

- Nunca avançar sem approval quando requerido.
- Nunca pular estado.
- Nunca executar agente fora de ordem lógica.
- Nunca usar dados de outro tenant.
- Nunca inferir mapping oficial.
- Nunca transformar `not_evidenced` em `not_implemented`.
- Sempre registrar decisão.
- Sempre preservar `trace_id`.
- Sempre validar pré-condições.
- Sempre exigir `expected_output_schema` para `invoke_agent`.
- Sempre bloquear quando `tenant_id`, `organization_id` ou `assessment_id` estiver ausente.
- Sempre tratar KB e Vectorize como suporte evidencial, não fonte normativa.

## 14. Observabilidade

Cada decisão deve registrar:

- `trace_id`;
- `decision_id`;
- `tenant_id`;
- `organization_id`;
- `assessment_id`;
- `state`;
- `workflow_step`;
- `next_action`;
- `agent_name`;
- `task_type`;
- tempo de decisão;
- bloqueios;
- retry metadata;
- approval dependency;
- decision outcome.

Eventos sugeridos:

- `orchestration_decision_created`;
- `orchestration_agent_invocation_selected`;
- `orchestration_wait_for_approval`;
- `orchestration_blocked`;
- `orchestration_retry_selected`;
- `orchestration_finished`;
- `orchestration_validation_failed`;
- `orchestration_guardrail_triggered`.

Logging rules:

- logar hashes e referências, não conteúdo sensível integral;
- aplicar redaction em metadata;
- nunca logar prompts completos com dados de cliente;
- correlacionar com workflow run, agent run e audit event.

## 15. Modo Dry-Run

O Orchestrator deve suportar dry-run completo sem execução real.

Dry-run é usado para:

- testes unitários;
- contract tests;
- evals sintéticos;
- validação de state decision table;
- revisão de impacto antes de habilitar real LLM;
- simulação de failure modes.

Dry-run behavior:

- não executa agentes reais;
- não escreve artifacts;
- não chama external tools;
- pode registrar evento de simulação seguro;
- retorna decisão completa;
- preserva schema de output;
- permite comparar decisão com golden output.

Dry-run must still enforce:

- tenant context;
- approval gates;
- state order;
- schema presence;
- guardrail rules.

## 16. Testes Obrigatórios

Testes mínimos:

- `state -> decisão correta`;
- approval bloqueia avanço;
- ausência de dados bloqueia;
- tenant isolation;
- não chama agente errado;
- não pula etapas;
- retry controlado;
- erro de agente não quebra fluxo completo;
- `trace_id` presente.

Additional regression cases:

- SoA draft never advances to Evidence Analysis without SoA approval.
- Gap draft never advances to Maturity without Gap approval.
- Maturity draft never advances to POA&M without Maturity approval.
- POA&M draft never advances to Reporting without POA&M approval.
- Report generated never closes assessment without human acceptance.
- `not_evidenced` remains distinct from `not_implemented`.
- KB result never creates official mapping.
- Missing `organization_id` blocks decision.
- Cross-tenant artifact in `available_artifacts` blocks decision.
- Schema failure creates `validation_failed` decision.

Evaluation metrics:

- state decision pass rate;
- approval bypass count;
- wrong agent selection count;
- skipped state count;
- tenant violation count;
- missing trace count;
- retry policy violation count.

## 17. Limitações do MVP

- Regras ainda determinísticas e não LLM-driven.
- Sem aprendizado automático.
- Sem otimização de fluxo.
- Sem planejamento multi-path.
- Sem auto-correção avançada.
- Sem real-time adaptive risk scoring.
- Sem execução autônoma de external calls.
- Sem final write por agentes.
- Sem auto-approval.

Impacto no projeto: essa limitação é intencional. O MVP privilegia previsibilidade, auditabilidade e segurança antes de autonomia.

## 18. Evolução Futura

Evoluções possíveis:

- Orchestrator híbrido com rules + LLM planner;
- otimização de sequência;
- adaptive workflows;
- dynamic risk scoring;
- multi-framework parallel assessment;
- explainable orchestration decisions;
- policy-aware task decomposition;
- escalation inteligente por risco;
- priorização automática de evidências;
- simulação de impacto antes de reprocessamento.

Regras para evolução:

- manter Assessment Engine como autoridade;
- manter Workflow como executor durável;
- exigir evals antes de ativar decisões LLM-driven;
- registrar explanation e confidence para decisões híbridas;
- manter kill switch para voltar ao modo determinístico;
- nunca permitir auto-approval.

## 19. Diagrama

```text
Workflow
   ↓
Orchestrator
   ↓
Agent Runtime
   ↓
Services
   ↓
Assessment Engine (validation)
   ↓
Audit / Logs
```

Expanded operational flow:

```text
Cloudflare Workflow Step
   │
   ├── loads assessment state
   ├── loads approvals/artifacts/previous runs
   │
   ▼
Orchestrator Agent
   │
   ├── validates tenant context
   ├── checks state decision table
   ├── checks approval gate requirements
   ├── selects next_action
   └── records orchestration_decision
   │
   ▼
Workflow executes decision
   │
   ├── invoke_agent ───────► Agent Runtime ─► Specialist Agent ─► allowed tools/services
   ├── wait_for_approval ─► Workflow wait/signal
   ├── block ─────────────► blocked status + audit event
   ├── retry ─────────────► retry policy
   └── finish ────────────► Assessment Engine transition validation
```

## 20. Resultado Esperado

Esta especificação deve permitir:

- implementação direta do Orchestrator como service;
- integração com Cloudflare Workflow;
- integração com Agent Runtime;
- validação por testes unitários, contract tests e evals;
- evolução futura controlada para Orchestrator híbrido;
- manutenção dos guardrails centrais do Standard SCF Agentic Assessment Model.

Definition of done para implementação futura:

- serviço determinístico de decisão;
- decision schema validado;
- state decision table coberta por testes;
- approval gates impossíveis de pular;
- tenant isolation obrigatório;
- dry-run suportado;
- decisões auditáveis;
- integração com workflow sem substituir Workflow;
- integração com Assessment Engine sem redefinir estados;
- Agent Runtime chamado apenas por contrato validado.


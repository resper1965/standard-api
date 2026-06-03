---
title: "Agentic Runtime Deployment & Execution Model"
---

# Agentic Runtime Deployment & Execution Model

## 1. Definição

O **Agentic Runtime** do Standard é o conjunto de componentes responsáveis por executar agentes, orquestrar workflows, acessar tools e manter estado, garantindo escalabilidade, isolamento multi-tenant e rastreabilidade.

Ele transforma o Standard SCF Agentic Assessment Model em um modelo operacional Cloudflare-oriented, API-first e SaaS-ready.

Responsabilidades principais:

- receber execuções agentic autorizadas;
- montar contexto controlado;
- executar agentes funcionais;
- aplicar guardrails;
- validar schemas;
- acionar tools permitidas;
- persistir `agent_runs`;
- registrar auditoria, métricas e custos;
- devolver resultados ao Workflow.

## 2. Princípios

- API-first.
- Stateless execution sempre que possível.
- State externalizado.
- Multi-tenant isolation obrigatório.
- Execution desacoplada.
- Observabilidade obrigatória.
- Retry e idempotência.
- Segurança por design.
- Approval gates preservados.
- Tool Registry como camada obrigatória.
- SCF estruturado como fonte normativa.
- KB/Vectorize como recuperação auxiliar, nunca normativa.

Regra central:

```text
Workflow executa.
Orchestrator decide.
Agent Runtime executa agentes.
Tools acessam sistemas.
Assessment Engine valida estado.
```

## 3. Componentes do Runtime

### 1. API Gateway (Cloudflare Worker)

Camada de entrada HTTP versionada.

### 2. Workflow Engine (Cloudflare Workflows)

Camada durável de lifecycle, waits, retries e checkpoints.

### 3. Agent Runtime Service

Camada de execução controlada de agentes.

### 4. Tool Execution Layer

Camada de execução de tools autorizadas.

### 5. Data Layer

Componentes:

- PostgreSQL;
- R2;
- Vectorize.

### 6. Queue Layer (Cloudflare Queues)

Camada assíncrona para jobs demorados.

### 7. Observability Layer

Logs estruturados, métricas, traces, audit events, security events e cost records.

### 8. Security Layer

Auth, RBAC, tenant isolation, Tool Permission Guard, prompt injection defense e audit controls.

## 4. Arquitetura de Execução

Fluxo lógico:

```text
Client/API
  ↓
API Gateway
  ↓
Workflow
  ↓
Orchestrator
  ↓
Agent Runtime
  ↓
Tools
  ↓
Data Layer
  ↓
Result
  ↓
Workflow
  ↓
Response
```

Características:

- API Gateway não executa agentes diretamente.
- Workflow mantém durabilidade e estado operacional.
- Orchestrator decide próximo passo permitido.
- Agent Runtime executa agentes com contexto explícito.
- Tool Layer controla acesso a dados e sistemas.
- Data Layer persiste estado e artifacts.

## 5. API Gateway

Responsável por:

- autenticação;
- tenant resolution;
- RBAC;
- validação de requests;
- roteamento;
- geração de `trace_id`;
- validação de `idempotency_key`;
- criação/consulta de workflow runs;
- recepção de signals de approval;
- resposta segura ao cliente.

Nunca deve:

- executar lógica de negócio pesada;
- executar agentes diretamente;
- consultar dados sem tenant scope;
- alterar lifecycle state sem Assessment Engine;
- aprovar artefatos;
- expor dados sensíveis em erros/logs.

Impacto: manter o gateway leve reduz latência, risco de timeout e acoplamento entre API e runtime agentic.

## 6. Workflow Engine

Responsável por:

- lifecycle do assessment;
- controle de etapas;
- retry;
- wait for approval;
- durabilidade;
- checkpoints;
- signal handling;
- bloqueios e cancelamentos;
- chamada ao Orchestrator;
- registro de eventos de lifecycle.

O Workflow não chama LLM diretamente. Ele aciona decisões e execuções controladas através do Orchestrator e do Agent Runtime.

Estados típicos:

- `running`;
- `waiting_for_input`;
- `waiting_for_approval`;
- `blocked`;
- `failed`;
- `cancelled`;
- `completed`.

## 7. Orchestrator

Executa dentro do contexto do Workflow como camada de decisão operacional.

Responsabilidades:

- decidir próximo passo;
- escolher agente;
- preparar contexto lógico;
- indicar schema esperado;
- indicar tools necessárias;
- retornar `wait_for_approval` quando houver gate;
- bloquear avanço inválido;
- solicitar retry quando seguro;
- preservar `trace_id`.

Não deve:

- aprovar artefatos;
- executar tools diretamente;
- alterar dados de domínio diretamente;
- inventar mappings;
- ignorar Assessment Engine;
- mudar Tool Registry.

## 8. Agent Runtime Service

Responsável por:

- executar agentes;
- montar contexto;
- aplicar guardrails;
- validar schema;
- registrar `agent_runs`;
- registrar decisões;
- calcular hashes de input/output;
- controlar `allowed_tools`;
- registrar telemetria e custos;
- retornar resultado ao Workflow/Orchestrator.

Deve ser:

- stateless;
- escalável;
- isolado por execução;
- determinístico no MVP;
- testável com mocks;
- independente de estado local persistente.

Estado permitido:

- apenas contexto da execução atual em memória efêmera;
- nenhum cache com dados de cliente fora de escopo;
- nenhuma memória compartilhada entre tenants.

## 9. Execução de Agentes

Modelo:

- request-based execution;
- cada execução isolada;
- sem memória compartilhada;
- contexto passado explicitamente;
- output validado por schema;
- guardrails aplicados antes e depois;
- tools acessadas apenas via Tool Execution Layer.

Fluxo de execução:

```text
AgentRuntimeInvocation
  ↓
Context Builder
  ↓
Guardrail pre-check
  ↓
Agent execution
  ↓
Schema validation
  ↓
Guardrail post-check
  ↓
AgentRun record
  ↓
Return structured output
```

Cada execução deve registrar:

- `agent_run_id`;
- `agent_name`;
- `task_type`;
- `tenant_id`;
- `organization_id`;
- `assessment_id`;
- input hash;
- output hash;
- status;
- confidence;
- `trace_id`.

## 10. Tool Execution Layer

Responsável por:

- executar tools;
- validar permissões;
- garantir isolamento;
- controlar acesso a dados;
- aplicar Tool Permission Guard;
- registrar tool calls;
- bloquear tools proibidas;
- mascarar/redigir dados sensíveis;
- retornar erros seguros.

Regras:

- agentes não acessam PostgreSQL, R2 ou Vectorize diretamente;
- cada tool deve ter contrato explícito;
- tools são deny-by-default;
- tools exigem tenant/organization/assessment scope;
- tools `final_write` e `admin` não ficam disponíveis para agentes;
- external calls permanecem bloqueadas por default.

## 11. Data Layer

### PostgreSQL

Fonte transacional crítica.

Armazena:

- estado do assessment;
- artefatos;
- versões;
- `agent_runs`;
- approvals;
- audit logs;
- workflow metadata;
- cost records.

Regras:

- toda query crítica filtra por `tenant_id`;
- fluxos críticos incluem `organization_id` e `assessment_id`;
- approvals e artifacts aprovados são imutáveis;
- alterações estruturais exigem migration.

### R2

Storage de objetos.

Armazena:

- documentos;
- evidências;
- relatórios;
- exports;
- artifacts versionados.

Regras:

- keys preservam tenant/organization/assessment no prefixo lógico;
- documentos reais nunca entram em fixtures;
- produção não compartilha buckets com dev/staging.

### Vectorize

Índice vetorial auxiliar para KB Search.

Armazena:

- embeddings;
- chunks indexáveis;
- metadados de recuperação;
- namespaces por tenant/assessment.

Regras:

- Vectorize não é fonte normativa;
- ausência de resultado significa `not_evidenced`, não `not_implemented`;
- metadata deve preservar tenant/organization/assessment/source/hash.

## 12. Queue Layer

Responsável por tarefas assíncronas:

- ingestão;
- chunking;
- embeddings;
- indexação KB;
- relatórios;
- exports;
- reprocessamento controlado;
- tarefas futuras de agentes.

Objetivos:

- desacoplamento;
- retry;
- backpressure;
- isolamento de jobs pesados;
- dead-letter handling.

Filas previstas:

- `DOCUMENT_INGESTION_QUEUE`;
- `KB_EMBEDDING_QUEUE`;
- `REPORT_EXPORT_QUEUE`;
- `AGENT_TASK_QUEUE`;
- `DEAD_LETTER_QUEUE`.

Cada mensagem deve incluir:

- `tenant_id`;
- `organization_id`;
- `assessment_id`;
- `trace_id`;
- `idempotency_key`;
- job type;
- safe metadata.

## 13. Execution Model

### Synchronous

Usado para chamadas API leves.

Exemplos:

- health checks;
- leitura de status;
- criação de workflow;
- envio de signal;
- consulta de artifact metadata;
- validação inicial de request.

### Asynchronous

Usado para workflows e jobs pesados.

Exemplos:

- document ingestion;
- KB indexing;
- agent task execution futura;
- report generation;
- exports;
- reprocessamento.

Regra:

```text
Operação longa não bloqueia request HTTP.
```

## 14. Multi-Tenant Isolation

Garantir:

- separação lógica;
- `tenant_id` obrigatório;
- storage separado por tenant;
- queries filtradas;
- validação em todas camadas;
- R2 keys com prefixos por tenant;
- Vectorize namespaces/metadados por tenant;
- logs sem conteúdo sensível;
- audit events sempre escopados.

Camadas que devem validar tenant:

- API Gateway;
- Workflow;
- Orchestrator;
- Agent Runtime;
- Tool Execution Layer;
- PostgreSQL repository;
- R2 adapters;
- Vectorize adapters;
- Observability layer.

Regra:

```text
Nenhum fluxo crítico executa sem tenant_id, organization_id, assessment_id e trace_id.
```

## 15. Escalabilidade

- Workers escalam automaticamente.
- Filas desacoplam carga.
- Runtime stateless permite paralelismo.
- Vector store escalável auxilia recuperação semântica.
- Jobs pesados saem do caminho HTTP.
- Workflows coordenam processos longos.
- R2 absorve artifacts grandes.

Estratégias:

- limitar contexto;
- paginar consultas;
- processar documentos em jobs;
- controlar fan-out de embeddings;
- aplicar quotas por tenant;
- usar idempotência para retries seguros.

Limites específicos de Cloudflare devem ser verificados na documentação oficial antes de decisões de capacidade, pricing ou SLA.

## 16. Deployment Model

Ambientes:

- local;
- development;
- staging;
- production.

Cada ambiente deve ser:

- isolado;
- com recursos próprios;
- com secrets próprios;
- com buckets/queues/indexes separados;
- com database separado ou escopo ambiental explícito;
- com deploy e validação próprios.

Regras:

- production exige deploy manual protegido;
- staging usa dados sintéticos ou mascarados;
- development não usa recursos production;
- local deve funcionar com mocks/adapters;
- secrets nunca ficam no repositório.

## 17. Cloudflare Integration

Usar:

- Workers → API Gateway;
- Workflows → orchestration;
- Queues → async jobs;
- R2 → storage;
- Vectorize → KB;
- AI Gateway → observabilidade futura e governança de chamadas AI.

Integrações planejadas:

| Componente | Cloudflare |
| --- | --- |
| API Gateway | Workers |
| Lifecycle | Workflows |
| Ingestion jobs | Queues |
| Document/report storage | R2 |
| KB semantic retrieval | Vectorize |
| LLM/embedding governance futura | AI Gateway |
| Admin protection | Access / Zero Trust |

Não usar no MVP sem decisão formal:

- D1 como substituto de PostgreSQL crítico;
- Durable Objects para estado de assessment sem requisito específico;
- Workers for Platforms para tenants sem necessidade de workloads isolados.

## 18. Runtime Boundaries

Separar:

- API Layer;
- Workflow Layer;
- Agent Layer;
- Tool Layer;
- Data Layer.

Responsabilidades:

| Layer | Responsabilidade | Não deve fazer |
| --- | --- | --- |
| API | Auth, RBAC, request validation, routing | Executar agentes ou lógica pesada |
| Workflow | Durabilidade, waits, retries, lifecycle | Validar regras finais sozinho |
| Orchestrator | Decidir próximo passo agentic | Aprovar ou executar tools |
| Agent Runtime | Executar agentes com contexto | Acessar dados fora de tools |
| Tool Layer | Acessar sistemas controlados | Ignorar permissões |
| Data Layer | Persistir estado/artifacts | Interpretar compliance |

Regra:

```text
Nunca misturar responsabilidades.
```

## 19. Security Model

Controles:

- RBAC na API;
- Tool permissions no runtime;
- tenant isolation;
- audit logs;
- zero trust via Cloudflare Access para consoles/admin;
- prompt injection protection;
- secure error handling;
- rate limiting e quotas;
- least privilege para bindings/secrets;
- approval gates humanos;
- immutable approved artifacts.

Separação:

- humanos autorizados operam via RBAC;
- agentes operam via Tool Registry;
- Workflow não aprova;
- Agent Runtime não possui admin/final_write;
- Data Layer não aceita scope implícito.

## 20. Observability

Registrar:

- `trace_id`;
- agent runs;
- workflow steps;
- tool calls;
- erros;
- métricas;
- audit events;
- security events;
- cost records;
- retry attempts;
- blocked reasons.

Correlação mínima:

- `tenant_id`;
- `organization_id`;
- `assessment_id`;
- `workflow_run_id`;
- `agent_run_id`, quando aplicável;
- `trace_id`.

Não registrar:

- documentos completos;
- chunks completos sensíveis;
- prompts completos com dados reais;
- secrets;
- credenciais;
- outputs sensíveis integrais.

## 21. Failure Handling

Estratégias:

- retry automático;
- fallback para humano;
- estado consistente;
- erro seguro;
- dead-letter queue;
- blocked state;
- incident/audit event;
- reprocessamento controlado.

Tipos de falha:

- schema failure;
- guardrail failure;
- tenant mismatch;
- tool access denied;
- workflow retry exhausted;
- queue dead-letter;
- Vectorize/R2 transient failure;
- LLM provider failure futura;
- approval timeout;
- conflict unresolved.

Regra:

```text
Falha crítica bloqueia avanço automático.
```

## 22. Idempotência

Cada execução deve ter `idempotency_key`.

Objetivos:

- evitar duplicação de artefatos;
- permitir retry seguro;
- evitar jobs duplicados;
- evitar double approval;
- preservar histórico coerente.

Escopos:

- API request;
- workflow run;
- workflow signal;
- queue message;
- agent run;
- tool call;
- artifact version.

Regras:

- retries não criam nova versão sem intenção explícita;
- signals repetidos com mesma chave retornam estado atual;
- tool calls idempotentes devem deduplicar por key/hash;
- reprocessamento gera nova versão apenas quando solicitado.

## 23. Performance Considerations

Estratégias:

- limitar contexto;
- limitar chamadas KB;
- evitar chamadas redundantes;
- cache quando aplicável;
- usar references/hashes em vez de payloads grandes;
- executar jobs pesados via Queue;
- paginar outputs;
- resumir outputs de agentes;
- limitar fan-out por tenant;
- aplicar quotas por ambiente.

Cuidados:

- cache não pode cruzar tenant;
- performance não justifica omitir guardrails;
- latency baixa não justifica execução pesada no API Gateway;
- contexto menor não pode remover limitations/sources obrigatórias.

## 24. Cost Governance

Registrar uso de:

- tokens;
- embeddings;
- operações R2;
- workflows;
- queue messages;
- Vectorize queries;
- report/export jobs;
- storage growth;
- LLM provider futuro.

Dimensões:

- tenant;
- organization;
- assessment;
- workflow run;
- agent run;
- model/provider, quando aplicável;
- tool name;
- environment.

Objetivos:

- budget por tenant;
- alertas de custo;
- chargeback/showback futuro;
- detecção de loops;
- prevenção de abuso;
- decisão consciente sobre paralelismo.

## 25. Execution Constraints

Limites operacionais:

- limite de tempo por execução;
- limite de memória;
- limite de tokens;
- limite de chamadas de tools;
- limite de KB queries;
- limite de retries;
- limite de handoffs;
- limite de tamanho de contexto;
- limite de tamanho de artifact;
- limite de fan-out por job.

Quando limite for atingido:

- bloquear ou pausar;
- registrar evento;
- retornar erro seguro;
- escalar para humano se necessário;
- preservar estado consistente.

## 26. Deployment Pipeline

CI/CD:

- lint;
- typecheck;
- tests;
- build;
- deploy staging;
- deploy production manual.

Validações mínimas:

- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test:unit`;
- `pnpm test:contracts`;
- `pnpm test:security`;
- `pnpm test:regression`;
- `pnpm test:evaluations`;
- `pnpm test:synthetic-e2e`;
- `pnpm build`;
- `pnpm test:ci`.

Production deploy deve exigir:

- aprovação manual;
- secrets configurados;
- recursos Cloudflare provisionados;
- validação staging;
- rollback plan;
- runbook operacional;
- checks de tenant isolation e approval gates.

## 27. Runtime Configuration

Variáveis:

- environment;
- DB;
- R2;
- Vectorize;
- queues;
- AI Gateway;
- auth providers;
- rate limits;
- cost budgets;
- feature flags;
- logging level.

Nunca:

- hardcode de secrets;
- hardcode de endpoints sensíveis;
- usar production resources em local/dev;
- depender de configuração implícita;
- registrar valores de secrets em logs.

Configuração deve ser:

- por ambiente;
- revisável;
- documentada;
- segura;
- compatível com bindings Cloudflare.

## 28. Local Development

Local development deve permitir:

- Docker para DB;
- mocks para tools;
- MockLLMProvider;
- sem dependência cloud obrigatória;
- fixtures sintéticas;
- golden outputs;
- adapters em memória;
- scripts pnpm;
- testes determinísticos.

Objetivo:

```text
Desenvolvedor consegue validar comportamento agentic sem dados reais e sem recursos Cloudflare reais.
```

Local nunca deve exigir:

- secrets reais;
- documentos reais;
- production database;
- production R2;
- production Vectorize;
- LLM real obrigatório.

## 29. Limitações do MVP

- Sem execução paralela avançada.
- Sem multi-region.
- Sem high availability completo.
- Sem autoscaling customizado.
- Sem AI Gateway obrigatório em runtime.
- Sem LLM real obrigatório no CI.
- Sem worker sharding por tenant.
- Sem Durable Objects para locks por assessment.
- Sem Workers for Platforms para workloads de tenant.
- Sem avaliação contínua em produção.

Impacto no projeto: o MVP prioriza controle, isolamento, testabilidade e deployment seguro em staging antes de otimizações de escala e autonomia.

## 30. Evolução Futura

Evoluções previstas:

- multi-region deployment;
- worker sharding por tenant;
- parallel agent execution;
- streaming responses;
- real-time monitoring;
- autoscaling inteligente;
- Durable Objects para locks por assessment quando necessário;
- AI Gateway com políticas de DLP/cost/rate;
- shadow-mode agent execution;
- queue prioritization por tenant;
- anomaly detection de custo e qualidade;
- dashboards operacionais de agent runtime;
- deployment canário por agente/prompt.

Condições:

- manter tenant isolation;
- manter approval gates;
- manter evals e safety thresholds;
- manter audit trail;
- validar custo;
- validar rollback.

## 31. Diagrama

```text
API
  ↓
Worker
  ↓
Workflow
  ↓
Orchestrator
  ↓
Agent Runtime
  ↓
Tools
  ↓
Data
```

Diagrama expandido:

```text
Client
  ↓
Cloudflare Worker API Gateway
  ├── Auth / RBAC / Tenant Resolution
  └── Request Validation / trace_id
        ↓
Cloudflare Workflows
  ├── Lifecycle Steps
  ├── Retries
  └── Approval Waits
        ↓
Orchestrator
  ├── Decide Next Action
  └── Prepare Agent Invocation
        ↓
Agent Runtime Service
  ├── Context Builder
  ├── Guardrails
  ├── Agent Execution
  └── Schema Validation
        ↓
Tool Execution Layer
  ├── SCF Tools
  ├── KB Tools
  ├── Artifact Tools
  └── Reporting Tools
        ↓
Data Layer
  ├── PostgreSQL
  ├── R2
  └── Vectorize
```

## 32. Resultado Esperado

Este documento permite:

- implementar runtime real;
- rodar em Cloudflare;
- escalar;
- manter segurança;
- integrar todos os componentes;
- preservar isolamento multi-tenant;
- operar com observabilidade e custo controlado;
- evoluir de MVP determinístico para execução agentic mais avançada.

Definition of done para implementação futura:

- Agent Runtime Service implementado;
- Tool Execution Layer aplicado;
- Workflows integrados ao Orchestrator;
- `agent_runs` persistidos;
- idempotência por execução;
- observability events;
- cost records;
- tenant isolation tests;
- queue adapters reais;
- R2/Vectorize adapters reais;
- staging deployment validado;
- production readiness checklist aprovado.


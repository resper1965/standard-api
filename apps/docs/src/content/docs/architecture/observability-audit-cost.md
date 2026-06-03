---
title: "Observability, Audit Trail and Cost Governance"
---

# Observability, Audit Trail and Cost Governance

## Objetivo

A camada `packages/observability` cria a primeira base de logs estruturados, trace context, audit trail, security events, métricas operacionais e registros de uso/custo do Standard. O desenho é multi-tenant, API-first e sem dependência obrigatória de vendor.

## Logs Estruturados

Todo log estruturado contém:

- `timestamp`
- `level`
- `message`
- `trace_id`, quando disponível
- `service`
- `module`
- `environment`
- contexto seguro de tenant, organization e assessment quando aplicável
- `metadata_safe`

O logger do MVP armazena entradas em memória para testes e define contrato para export futuro para Cloudflare Workers Logs, Analytics Engine, Logpush ou outro backend.

## Redaction

Campos sensíveis são redigidos recursivamente:

- `password`
- `token`
- `api_key`
- `authorization`
- `cookie`
- `secret`
- `private_key`
- `access_key`
- `refresh_token`
- `id_token`
- `document_text`
- `chunk_text`
- `prompt`
- `completion`
- `raw_llm_output`
- `file_content`
- `extracted_text`
- `signed_url`

`metadata_safe` rejeita campos proibidos em audit, security e usage records.

## Trace Context

`ObservabilityTraceContext` modela:

- `trace_id`
- `parent_trace_id`
- `span_id`
- `tenant_id`
- `organization_id`
- `assessment_id`
- `actor_id`
- `workflow_run_id`
- `agent_run_id`
- `request_id`
- `started_at`

O API Gateway já resolve `trace_id` por `x-trace-id`, `cf-ray` ou UUID e propaga para respostas, erros, audit events e métricas.

## Audit Trail

`AuditEventService` registra eventos de negócio relevantes sem conteúdo sensível integral. Exemplos implementados no MVP:

- `agent_run_started`
- `agent_run_completed`
- `workflow_started`
- `workflow_signal_received`
- `workflow_completed`
- `report_downloaded`

Os demais eventos obrigatórios estão modelados no schema para integração incremental.

## Security Events

`SecurityEventService` separa eventos de segurança dos logs comuns. Integrações iniciais:

- auth ausente;
- tenant context ausente;
- tenant context mismatch;
- permission denied;
- approval permission denied;
- tool use blocked;
- agent guardrail triggered.

Eventos contêm `severity`, `outcome`, `source`, `message_safe`, `trace_id` e metadata segura.

## Métricas Operacionais

`MetricsService` registra métricas por tenant/assessment quando possível.

Métricas iniciais integradas:

- `request_count`
- `request_duration_ms`
- `error_count`
- `auth_error_count`
- `forbidden_error_count`
- `kb_search_count`
- `kb_search_duration_ms`
- `agent_run_count`
- `workflow_run_count`
- `workflow_step_duration_ms`
- `report_download_count`

## Cost and Usage Tracking

`CostTrackingService` registra usage sem exigir preços reais:

- `service_name`
- `operation_name`
- `usage_quantity`
- `usage_unit`
- `provider`
- `model_name`
- `resource_id`
- `cost_estimate`, quando `PricingProvider` estiver configurado
- `metadata_safe`

O `PricingProviderPlaceholder` retorna `null`; portanto o MVP registra usage sem custo estimado. Isso evita hardcode de pricing como verdade permanente.

## Agent Runtime

Integrações iniciais:

- audit para `agent_run_started` e `agent_run_completed`;
- metric `agent_run_count`;
- usage por `agent_run` quando tokens são informados pelo provider;
- security event quando tool não permitida é bloqueada;
- security event quando guardrail bloqueia output.

Prompts e outputs integrais não são logados.

## Workflows

Integrações iniciais:

- audit para workflow started, signal received e completed;
- metric `workflow_run_count`;
- metric `workflow_step_duration_ms` no processamento de signal.

O workflow continua usando Assessment Engine para transições e approval gates.

## Cloudflare e AI Gateway

O pacote prepara campos para:

- Cloudflare Workers Logs;
- Cloudflare Analytics;
- AI Gateway correlation;
- Queue message telemetry;
- R2/Vectorize usage;
- export futuro para ferramentas externas.

Não há `account_id`, gateway name ou secret hardcoded.

## Privacidade e Confidencialidade

Regras:

- não logar documentos completos;
- não logar chunks completos;
- não logar query integral de KB, usar `query_hash`;
- não logar prompts completos;
- não logar outputs completos de agente;
- não logar signed URLs;
- não logar tokens, API keys, secrets ou credenciais.

## Limitações do MVP

- Repositórios são in-memory no gateway local.
- Não há backend persistente PostgreSQL para observability ainda.
- Métricas são records discretos, não time-series real.
- Rate limiting ainda é placeholder.
- Pricing real não configurado.
- Integrações de workers/jobs são pontos mínimos via API; consumers Cloudflare ainda precisam adapters reais.

## Decisões em Aberto

- Backend final de métricas: PostgreSQL, Analytics Engine, Prometheus bridge ou combinação.
- Política de retenção por tipo de evento.
- Sampling de logs/trace em produção.
- Modelo de budgets/thresholds por tenant.
- Integração final com AI Gateway usage e billing.


# Observability Runbook

## Localizar Execução por Trace ID

1. Capture o `trace_id` da resposta ou erro público.
2. Consulte logs estruturados do serviço.
3. Consulte audit logs do assessment quando aplicável.
4. Consulte security events se houve `401`, `403`, organization mismatch ou guardrail.
5. Correlacione com workflow run, agent run, queue job ou report artifact.

## Investigar Falha de Workflow

1. `GET /api/v1/workflows/:workflowRunId`.
2. Verifique `status`, `current_step`, `blocked_reason`, `failed_reason_safe` e `last_successful_step`.
3. Consulte métricas `workflow_run_count`, `workflow_failed_count`, `workflow_blocked_count` quando persistidas.
4. Consulte audit events `workflow_started`, `workflow_signal_received` e `workflow_completed`.
5. Não reenvie signal sem nova `idempotency_key` quando quiser nova tentativa lógica.

## Investigar Erro de Agente

1. Consulte `GET /api/v1/agent-runs/:agentRunId`.
2. Verifique `status`, `input_hash`, `output_hash`, `confidence_score` e `trace_id`.
3. Consulte security events `tool_use_blocked` e `agent_guardrail_triggered`.
4. Consulte usage por assessment para tokens informados.
5. Nunca usar prompt/output integral em tickets comuns.

## Investigar Upload Rejeitado

1. Verifique erro público e `trace_id`.
2. Consulte security events `suspicious_upload_rejected`, `file_type_rejected` ou `file_size_rejected` quando integrados.
3. Confirme filename normalizado, MIME, extensão e tamanho.
4. Não abrir ou copiar conteúdo do arquivo em logs.

## Investigar Cross-Organization Access

1. Procure security events `organization_context_mismatch` ou `cross_tenant_access_blocked`.
2. Compare `x-standard-organization-id`, route params e organization do recurso.
3. Audite actor, role, auth method e trace.
4. Se envolver API key, verificar escopo da key.

## Consultar Audit Logs

```http
GET /api/v1/assessments/{assessmentId}/audit-logs
GET /api/v1/audit-logs/{auditLogId}
```

Permissão exigida: `audit:read`.

## Consultar Security Events

```http
GET /api/v1/admin/security-events
GET /api/v1/admin/security-events/{securityEventId}
```

Permissão exigida: `admin:read`.

## Revisar Uso e Custo por Organization

```http
GET /api/v1/assessments/{assessmentId}/usage
GET /api/v1/organizations/{organizationId}/usage
GET /api/v1/admin/usage
```

No MVP, usage pode existir sem custo estimado. Isso é esperado quando `PricingProvider` não está configurado.

## Identificar Picos de Uso

Verificar:

- `kb_search_count`
- `vectorize_queries`
- `agent_run_count`
- `llm_total_tokens`
- `report_download_count`
- `queue_messages_sent`

Eventos futuros preparados:

- `budget_threshold_warning`
- `usage_spike_detected`
- `expensive_agent_run_detected`

## Operar sem Vazar Dados Sensíveis

Nunca incluir em incidentes ou logs comuns:

- documento completo;
- chunk completo;
- prompt completo;
- output completo;
- signed URL;
- token;
- API key;
- secret.

Use hashes, IDs, counts, status, safe summaries e `trace_id`.

## Checklist de Produção

- Backend persistente para audit/security events.
- Retenção definida por tipo de dado.
- Redaction testado em produção-like.
- Cloudflare Logs/Analytics ou backend equivalente configurado.
- AI Gateway correlation habilitada quando LLM real existir.
- PricingProvider configurado por ambiente.
- Budgets/thresholds por organization definidos.
- Dashboards e alertas revisados para baixo ruído.


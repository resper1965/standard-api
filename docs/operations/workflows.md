# Workflows Operacionais

## Iniciar Workflow

```http
POST /api/v1/assessments/{assessmentId}/workflows/lifecycle/start
```

Headers mínimos:

- `x-standard-organization-id`
- `x-standard-actor-id`
- `x-trace-id`

Body sintético:

```json
{
  "requested_by": "44444444-4444-4444-8444-444444444444",
  "idempotency_key": "workflow-start-0001",
  "options": {}
}
```

O endpoint rejeita execução duplicada ativa para o mesmo assessment, salvo repetição com a mesma chave idempotente.

## Consultar Status

```http
GET /api/v1/assessments/{assessmentId}/workflows/lifecycle
GET /api/v1/workflows/{workflowRunId}
```

Verifique:

- `status`
- `state.current_step`
- `state.assessment_state`
- `state.pending_approval_type`
- `state.blocked_reason`
- `state.failed_reason_safe`
- `state.last_successful_step`

## Enviar Signals

```http
POST /api/v1/workflows/{workflowRunId}/signals
```

Exemplo:

```json
{
  "signal_type": "framework_selected",
  "actor_id": "44444444-4444-4444-8444-444444444444",
  "idempotency_key": "signal-framework-0001",
  "payload": {
    "framework_id": "66666666-6666-4666-8666-666666666666",
    "scf_version_id": "55555555-5555-4555-8555-555555555555"
  }
}
```

Signals de approval exigem `approval_event_id` aprovado e compatível com o gate:

```json
{
  "signal_type": "soa_approved",
  "actor_id": "44444444-4444-4444-8444-444444444444",
  "approval_event_id": "77777777-7777-4777-8777-777777777777",
  "idempotency_key": "signal-soa-0001",
  "payload": {}
}
```

## Cancelar

```http
POST /api/v1/workflows/{workflowRunId}/cancel
```

```json
{
  "actor_id": "44444444-4444-4444-8444-444444444444",
  "reason": "Synthetic cancellation reason.",
  "idempotency_key": "cancel-0001"
}
```

Cancelamento coloca o workflow em `cancelled` e registra audit event.

## Retomar

```http
POST /api/v1/workflows/{workflowRunId}/resume
```

Só é permitido para workflows `blocked` ou `failed`.

```json
{
  "actor_id": "44444444-4444-4444-8444-444444444444",
  "reason": "Configuration fixed.",
  "idempotency_key": "resume-0001",
  "from_step": "wait_for_framework_selection"
}
```

## Investigar Falhas

1. Consulte `GET /api/v1/workflows/{workflowRunId}`.
2. Verifique `blocked_reason`, `failed_reason_safe` e `last_successful_step`.
3. Correlacione pelo `trace_id`.
4. Consulte audit/lifecycle events quando a persistência real estiver habilitada.

## Reprocessar Etapa

No MVP, reprocessamento granular ainda é operacional/manual:

1. Coloque o workflow em `blocked` via signal `assessment_blocked`.
2. Corrija a dependência externa.
3. Retome com `resume` informando `from_step`.
4. Reenvie o signal idempotente apropriado com nova chave somente se uma nova execução lógica for desejada.

## Rotas Úteis

- `POST /api/v1/assessments/:assessmentId/workflows/lifecycle/start`
- `GET /api/v1/assessments/:assessmentId/workflows/lifecycle`
- `GET /api/v1/workflows/:workflowRunId`
- `POST /api/v1/workflows/:workflowRunId/signals`
- `POST /api/v1/workflows/:workflowRunId/cancel`
- `POST /api/v1/workflows/:workflowRunId/resume`

## Troubleshooting

- `CONFLICT`: já existe workflow ativo para o assessment.
- `APPROVAL_EVENT_REQUIRED`: o signal de aprovação não tem `approval_event_id` válido para o gate.
- `TENANT_CONTEXT_REQUIRED`: faltou `x-standard-organization-id`.
- `INVALID_STATE_TRANSITION`: o Assessment Engine bloqueou a transição.
- `VALIDATION_ERROR`: body, params ou contexto inválidos.


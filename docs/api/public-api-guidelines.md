# Public API Guidelines

## 1. Objetivo

Este documento define as regras para exposição da API pública/partner do `aegis-api-standard`.

A API pública deve permitir integrações externas sem comprometer tenant isolation, approval gates, auditabilidade, compatibilidade ou segurança operacional.

## 2. Superfícies de API

Prefixos sugeridos:

| Superfície | Prefixo | Uso |
| --- | --- | --- |
| Public/Partner API | `/api/v1` | clientes, parceiros e integrações |
| Internal API | `/api/internal/v1` | Web Console e workers internos |
| Admin API | `/api/admin/v1` | operação interna protegida |
| Webhook API | `/api/webhooks/v1` | eventos inbound/outbound |

Regras:

- APIs públicas usam contratos estáveis.
- APIs internas podem evoluir com mais rapidez, mas continuam versionadas.
- Admin APIs exigem proteção adicional.
- Webhook APIs exigem assinatura e idempotência.

## 3. Authentication

Modelos permitidos:

- JWT/OIDC;
- API keys;
- service accounts;
- Cloudflare Access para superfícies internas/admin;
- mTLS futuro.

Regras para API keys:

- escopadas por tenant;
- com permissões específicas;
- rotacionáveis;
- com expiração ou política de rotação;
- nunca logadas;
- identificadas por `key_id`, não pelo segredo bruto;
- revogáveis sem deploy.

Headers sugeridos:

```text
Authorization: Bearer <token>
X-Aegis-Api-Key: <api-key>
```

Não enviar ambos sem regra explícita de precedência.

## 4. Authorization

Autorização pública combina:

- RBAC para usuários humanos;
- scoped permissions para API keys;
- tenant-bound access;
- resource-level authorization;
- approval-specific permissions.

Regras:

- toda operação crítica exige permissão explícita;
- API key não aprova artifacts por padrão;
- resource deve pertencer ao tenant da credencial;
- admin/support cross-tenant não faz parte da Public API;
- scopes devem aparecer na documentação de cada endpoint.

## 5. Versionamento

Todos os endpoints públicos devem ser versionados.

Padrão:

```text
/api/v1
```

Regras:

- breaking changes exigem nova versão;
- versões antigas devem ter janela de depreciação;
- schema estável dentro da mesma versão;
- novos campos opcionais são permitidos;
- remover/renomear campo é breaking change;
- mudar semântica de campo é breaking change;
- mudar formato de erro é breaking change.

## 6. Backward Compatibility

Compatível:

- adicionar campo opcional;
- adicionar enum novo se clientes toleram unknown;
- adicionar endpoint;
- adicionar filtro opcional;
- adicionar metadata não obrigatória.

Breaking:

- remover campo;
- tornar campo opcional obrigatório;
- alterar tipo;
- alterar significado;
- alterar status code de sucesso/erro sem política;
- alterar paginação;
- alterar idempotency behavior.

## 7. Stable Schemas

Schemas públicos devem:

- ser documentados em OpenAPI;
- validar request/response;
- usar nomes consistentes;
- incluir `tenant_id` apenas quando seguro e necessário;
- incluir `trace_id` em responses críticas;
- evitar campos ambíguos;
- diferenciar draft, under review e approved.

Artifacts críticos devem preservar:

- version id;
- status;
- source references;
- approval status;
- `trace_id`;
- timestamps;
- actor/system references quando aplicável.

## 8. Error Format

Formato estável:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body.",
    "details": [],
    "trace_id": "trace-id"
  }
}
```

Regras:

- todo erro crítico inclui `trace_id`;
- `message` é seguro para cliente;
- `details` não inclui secrets ou dados sensíveis;
- códigos são estáveis;
- erros de auth não revelam existência de recurso cross-tenant.

Status recomendados:

- `400` validation;
- `401` unauthenticated;
- `403` unauthorized;
- `404` not found ou resource oculto por tenant boundary;
- `409` conflict/idempotency/state;
- `422` semantic validation;
- `429` rate limited;
- `500` internal safe error.

## 9. Pagination

List endpoints devem usar paginação.

Padrão recomendado:

```text
limit
cursor
```

Response:

```json
{
  "data": [],
  "page": {
    "limit": 50,
    "next_cursor": "cursor-value",
    "has_more": true
  },
  "trace_id": "trace-id"
}
```

Regras:

- `limit` tem máximo por endpoint;
- cursor deve ser opaque;
- ordenação padrão documentada;
- não vazar dados cross-tenant via cursor.

## 10. Filtering e Sorting

Filtros devem:

- ser documentados;
- ter nomes estáveis;
- ser tenant-scoped;
- validar enums;
- recusar filtros desconhecidos quando necessário.

Sorting deve:

- aceitar campos permitidos;
- ter default estável;
- não permitir SQL/raw field injection;
- documentar direção.

Exemplo:

```text
GET /api/v1/assessments?status=closed&limit=50&cursor=...
```

## 11. Idempotency

Obrigatório para:

- criar assessment;
- upload document confirmation;
- iniciar workflow;
- criar draft;
- aprovar artefato;
- gerar report/export;
- webhooks recebidos.

Header sugerido:

```text
Idempotency-Key: <stable-client-key>
```

Regras:

- key é escopada por tenant, endpoint e operação;
- replay com mesmo payload retorna mesmo resultado lógico;
- replay com payload divergente retorna conflict;
- key deve ter retenção definida;
- response deve indicar idempotency quando útil.

## 12. Request and Trace IDs

IDs:

- `request_id`: identifica request HTTP.
- `trace_id`: correlaciona request, workflow, agent run, tool calls e audit logs.
- `idempotency_key`: deduplica operação.

Headers sugeridos:

```text
X-Request-Id
X-Aegis-Trace-Id
Idempotency-Key
```

Se o cliente não envia `trace_id`, o gateway gera um.

## 13. Rate Limits and Quotas

Documentar:

- limite por tenant;
- limite por API key;
- limite por endpoint;
- limite por operação pesada;
- comportamento de `429`;
- headers de rate limit, quando aplicável.

Operações pesadas:

- upload;
- KB search;
- agent run;
- report render/export;
- workflow start;
- SCF import.

Response de rate limit deve ser segura e incluir `trace_id`.

## 14. Public Lifecycle Rules

APIs públicas não podem:

- pular approval gates;
- alterar artifact aprovado diretamente;
- inventar mapping SCF oficial;
- tratar KB como normativa;
- executar admin import sem permissão admin;
- acessar outro tenant;
- criar final finding direto por agente.

Fluxos públicos devem:

- usar transitions/workflows;
- preservar state machine;
- usar approval endpoints;
- gerar audit logs;
- respeitar idempotency.

## 15. Webhooks

Documentar:

- eventos;
- assinatura;
- envelope;
- retry;
- replay;
- idempotency;
- status de delivery;
- secret rotation.

Eventos iniciais:

- `assessment.created`;
- `document.ingested`;
- `kb.indexed`;
- `soa.approved`;
- `gap.approved`;
- `maturity.approved`;
- `poam.approved`;
- `report.generated`;
- `report.approved`;
- `assessment.closed`;
- `workflow.failed`.

Headers:

```text
X-Aegis-Event-Id
X-Aegis-Event-Type
X-Aegis-Timestamp
X-Aegis-Signature
X-Aegis-Trace-Id
```

## 16. Public API Documentation

Conteúdo mínimo:

- authentication;
- authorization;
- rate limits;
- errors;
- pagination;
- idempotency;
- webhooks;
- examples;
- changelog;
- lifecycle overview;
- approval gates;
- tenant scoping;
- sandbox usage.

Docs devem deixar claro:

- KB é evidência candidata;
- SCF estruturado é fonte normativa;
- agents não aprovam artifacts;
- approved artifacts são imutáveis;
- dados reais não devem ser usados em sandbox.

## 17. Changelog and Deprecation

Toda mudança pública deve registrar:

- versão;
- data;
- endpoints afetados;
- impacto;
- compatibilidade;
- migração;
- janela de depreciação, se aplicável.

Breaking changes:

- exigem nova versão;
- exigem comunicação prévia;
- devem preservar versão anterior durante janela aprovada.

## 18. Sandbox Environment

Sandbox deve:

- usar dados sintéticos;
- ter API keys separadas;
- ter rate limits próprios;
- nunca compartilhar recursos production;
- suportar webhooks de teste;
- permitir reset controlado;
- documentar diferenças de produção.

Sandbox não deve:

- conter dados reais;
- usar production R2/Vectorize/PostgreSQL;
- disparar conectores reais sem opt-in explícito.

## 19. Security Requirements

Requisitos:

- TLS obrigatório;
- auth obrigatória;
- tenant-bound access;
- scopes por key;
- audit log;
- rate limiting;
- secure errors;
- no secrets in logs;
- webhook HMAC;
- CORS restritivo;
- upload validation.

No-Go:

- endpoint público sem auth;
- API key sem tenant;
- approval por integração sem permissão humana explícita;
- wildcard CORS em rota authenticated;
- public endpoint retornando dados cross-tenant.

## 20. Examples

Criar assessment:

```http
POST /api/v1/assessments
Idempotency-Key: assessment-create-001
Authorization: Bearer <token>
```

```json
{
  "organization_id": "org_synth_healthtech",
  "name": "Synthetic Assessment",
  "scf_version_id": "SCF-SYNTH-1",
  "document_count": 0
}
```

Erro:

```json
{
  "error": {
    "code": "TENANT_CONTEXT_REQUIRED",
    "message": "Tenant context is required.",
    "details": [],
    "trace_id": "trace-id"
  }
}
```

## 21. Resultado Esperado

Estas diretrizes garantem:

- API pública segura;
- contrato estável;
- integrações previsíveis;
- rastreabilidade;
- idempotência;
- tenant isolation;
- approval gates preservados;
- base para documentação pública e SDKs futuros.

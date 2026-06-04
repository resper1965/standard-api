# External Integration Model

## 1. Objetivo

Este documento define o modelo de integrações externas do `standard-api-standard`, preparando o Standard para operar como API SaaS integrada a plataformas de GRC, automação, ticketing, colaboração, armazenamento documental e ferramentas de segurança.

Não implementa conectores. Define contratos, fronteiras, segurança, eventos e governança.

## 2. API Exposure Model

APIs devem ser separadas por público e risco.

### 1. Internal API

Prefixo sugerido:

```text
/api/internal/v1
```

Uso:

- Web Console;
- workers internos;
- jobs controlados;
- callbacks internos;
- automações operacionais.

Requisitos:

- protegida por auth real;
- não exposta como API pública;
- RBAC e organization scope;
- Cloudflare Access quando aplicável.

### 2. Partner/Public API

Prefixo:

```text
/api/v1
```

Uso:

- clientes;
- parceiros;
- integrações;
- sistemas externos.

Requisitos:

- contrato estável;
- versionamento explícito;
- API keys/JWT/OIDC;
- rate limits;
- idempotency;
- documentação pública.

### 3. Admin API

Prefixo sugerido:

```text
/api/admin/v1
```

Uso:

- operação interna;
- SCF imports;
- suporte autorizado;
- segurança;
- métricas globais.

Requisitos:

- Cloudflare Access / Zero Trust;
- permissões admin explícitas;
- audit log obrigatório;
- rate limit restritivo;
- nunca expor para integrações públicas.

### 4. Webhook API

Prefixo sugerido:

```text
/api/webhooks/v1
```

Uso:

- recebimento de eventos externos;
- callbacks de integrações;
- health/verification de webhook;
- futura ingestão de eventos de conectores.

Requisitos:

- assinatura HMAC ou autenticação equivalente;
- replay protection;
- idempotency;
- organization binding;
- payload validation.

## 3. API Authentication Model

Modelos:

- JWT / OIDC;
- API keys;
- service accounts;
- Cloudflare Access;
- mTLS, futuro.

Regras:

- API keys devem ser escopadas por organization;
- API keys devem ter permissões específicas;
- API keys devem expirar ou ser rotacionáveis;
- service accounts seguem least privilege;
- tokens nunca aparecem em logs;
- credenciais de conectores são criptografadas;
- credenciais podem ser revogadas por organization.

API key metadata mínima:

```text
ApiKey
├── key_id
├── organization_id
├── organization_id
├── name
├── scopes
├── allowed_ips
├── expires_at
├── last_used_at
├── status
└── created_by
```

## 4. API Authorization Model

Autorização deve combinar:

- RBAC para usuários;
- scoped permissions para API keys;
- organization-bound access;
- resource-level authorization;
- approval-specific permissions.

Regras:

- API key não aprova artifact por padrão;
- API key só acessa resources do organization;
- service account recebe escopos mínimos;
- integração pode ler artifacts aprovados, não drafts sensíveis, salvo permissão explícita;
- admin cross-organization exige role e audit trail;
- webhooks inbound devem resolver organization antes de processar payload.

## 5. Inbound Integration Model

Sistemas externos podem:

- criar assessment;
- enviar documentos;
- consultar status;
- ler artefatos aprovados;
- receber webhooks;
- criar tarefas externas a partir do POA&M;
- consultar usage permitido;
- baixar report/export com URL expirada.

Fluxo típico:

```text
External System
  ↓
API key / OIDC
  ↓
/api/v1
  ↓
Organization-scoped operation
  ↓
Audit event
```

Controles:

- idempotency para writes;
- rate limits por key/organization;
- schema validation;
- upload validation;
- audit logs;
- scoped responses.

## 6. Outbound Integration Model

O Standard pode:

- enviar eventos;
- criar tickets;
- enviar notificações;
- publicar relatórios;
- exportar JSON/CSV;
- sincronizar status de POA&M;
- atualizar tarefas externas;
- notificar falhas de workflow.

Fluxo típico:

```text
Standard Event
  ↓
Connector Policy
  ↓
Outbound Queue
  ↓
Destination Connector
  ↓
External System
  ↓
Delivery Audit
```

Regras:

- outbound nunca envia dados além do escopo configurado;
- cada entrega tem `event_id`, `organization_id`, `trace_id`;
- retry controlado;
- DLQ para falhas persistentes;
- payload sensível deve ser minimizado.

## 7. Webhook Model

Webhooks de saída:

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

Requisitos:

- assinatura HMAC;
- retry;
- dead-letter;
- `event_id`;
- timestamp;
- idempotency;
- `organization_id`;
- `assessment_id`;
- `trace_id`.

Envelope:

```text
WebhookEvent
├── event_id
├── event_type
├── organization_id
├── organization_id
├── assessment_id
├── occurred_at
├── idempotency_key
├── trace_id
├── data
└── links
```

Headers sugeridos:

```text
X-Standard-Event-Id
X-Standard-Event-Type
X-Standard-Timestamp
X-Standard-Signature
X-Standard-Trace-Id
```

Assinatura:

- HMAC com secret por endpoint/organization;
- timestamp participa da assinatura;
- rejeitar replay fora da janela configurada;
- secret rotacionável.

## 8. Webhook Delivery

Regras de entrega:

- delivery assíncrona via Queue;
- timeout controlado;
- retry com backoff;
- DLQ após retries excedidos;
- endpoint desabilitado após falhas persistentes;
- replay manual auditado;
- delivery log por tentativa.

Status:

- `pending`;
- `delivered`;
- `failed_retrying`;
- `dead_lettered`;
- `disabled`;
- `replayed`.

Delivery log mínimo:

- `event_id`;
- endpoint;
- status code;
- attempt count;
- last error class;
- `trace_id`;
- timestamp.

## 9. External Integration Targets

Preparar integração com:

- n8n;
- GRC platforms;
- ticketing/PSA;
- Slack/Teams;
- Google Drive;
- SharePoint;
- Jira;
- Azure DevOps;
- Autotask;
- ServiceNow;
- SIEM/SOC tools.

Categorias:

- automation: n8n, Make, Zapier futuro;
- collaboration: Slack, Teams;
- document repositories: Google Drive, SharePoint;
- work management: Jira, Azure DevOps, ServiceNow, Autotask;
- GRC systems: platforms de compliance e risk;
- security operations: SIEM/SOC tools.

## 10. Connector Architecture

Contrato lógico:

```text
Connector
├── name
├── type
├── auth_method
├── permissions
├── supported_events
├── supported_actions
├── tenant_scope
├── rate_limits
├── retry_policy
└── audit_events
```

Tipos:

- `source_connector`;
- `destination_connector`;
- `bidirectional_connector`.

Campos:

- `name`: nome único do conector.
- `type`: source, destination ou bidirectional.
- `auth_method`: API key, OAuth/OIDC, webhook secret, service token.
- `permissions`: escopos internos do Standard e externos.
- `supported_events`: eventos que o conector emite/recebe.
- `supported_actions`: ações permitidas.
- `tenant_scope`: organization/org/assessment autorizado.
- `rate_limits`: limites específicos do conector.
- `retry_policy`: tentativas, backoff, DLQ.
- `audit_events`: eventos auditáveis do ciclo de vida.

## 11. Connector Lifecycle

Estados:

- `draft`;
- `configured`;
- `connection_tested`;
- `enabled`;
- `disabled`;
- `rotating_credentials`;
- `revoked`;
- `failed`.

Fluxo:

1. Criar configuração.
2. Armazenar secrets com criptografia.
3. Testar conexão.
4. Validar scopes.
5. Habilitar.
6. Monitorar.
7. Rotacionar ou revogar.

## 12. Integration Security

Regras:

- connectors por organization;
- secrets criptografados;
- escopos mínimos;
- logs sem payload sensível;
- revogação de credenciais;
- teste de conexão;
- audit trail;
- rate limits por connector;
- outbound allowlist quando aplicável;
- payload minimization.

Proibido:

- conector global com dados de cliente;
- secret compartilhado entre organizations;
- logs de token;
- envio de documents completos por webhook sem política explícita;
- connector executar approval humano;
- connector escrever artifact final diretamente.

## 13. Data Export Governance

Definir:

- quem pode exportar;
- quais formatos;
- quais dados;
- mascaramento;
- retenção;
- expiração de URLs;
- logs de download.

Formatos permitidos por política:

- JSON;
- CSV;
- Markdown;
- PDF futuro;
- DOCX futuro.

Regras:

- exports exigem permissão;
- URL assinada expira;
- downloads são auditados;
- dados sensíveis podem exigir masking;
- report aprovado tem preferência sobre drafts;
- export cross-organization é proibido.

## 14. Data Retention para Integrações

Políticas devem cobrir:

- delivery logs;
- webhook payload hashes;
- connector secrets metadata;
- external task references;
- export jobs;
- download logs;
- inbound event payloads;
- failed delivery DLQ messages.

Payloads sensíveis devem ser evitados ou armazenados com retenção curta e criptografia.

## 15. Backup and Restore para Integrações

Backup:

- connector metadata;
- encrypted secret references;
- webhook event records;
- delivery logs;
- external object mappings;
- export metadata.

Restore:

- restaurar connector config sem expor secrets;
- validar secrets pós-restore;
- reprocessar DLQ com controle;
- reconstruir external mappings quando necessário;
- preservar audit trail.

## 16. Incident Response para Integrações

Cenários:

- API key comprometida;
- webhook secret vazado;
- conector enviando dados indevidos;
- destino externo indisponível;
- retry storm;
- external system retorna dados inesperados;
- payload com prompt injection;
- download/export indevido.

Resposta:

1. Desabilitar connector ou key.
2. Bloquear delivery.
3. Preservar eventos.
4. Rotacionar secrets.
5. Notificar owners.
6. Revisar escopos.
7. Reprocessar quando seguro.

## 17. External Integration Readiness

Antes de liberar API externa:

- API keys implementadas;
- docs públicas;
- webhook signing;
- rate limits;
- idempotency;
- audit logs;
- organization scoping;
- sandbox environment;
- connector lifecycle;
- revogação de credenciais;
- suporte e runbooks.

## 18. Roadmap de Integrações

Prioridade sugerida:

1. Webhooks de saída.
2. API keys escopadas.
3. Exports JSON/CSV.
4. n8n via public API + webhooks.
5. Ticketing/PSA baseado em POA&M.
6. Slack/Teams notifications.
7. Google Drive/SharePoint export.
8. SIEM/SOC event streaming.
9. Bidirectional connector management.

## 19. Risks and Open Questions

- escolha final de auth provider;
- billing/quotas;
- connector roadmap;
- data residency;
- long-term retention;
- legal/privacy review;
- enterprise SSO;
- OAuth app ownership;
- per-organization encryption strategy;
- webhook replay UI;
- connector marketplace futuro;
- SLA para delivery externa.

## 20. Resultado Esperado

Este modelo permite:

- expor API externa com segurança;
- operar webhooks assinados;
- conectar sistemas externos sem acoplamento;
- manter organization isolation;
- auditar entregas e ações;
- controlar retenção e exports;
- preparar roadmap de conectores;
- evitar implementação insegura de integrações ad hoc.


# Production Go-Live Checklist

## 1. Objetivo

Este checklist define os gates operacionais para liberar o `standard-api-standard` em produção real como API SaaS multi-tenant.

Ele complementa `docs/operations/production-readiness-checklist.md` e deve ser usado como checklist final de go-live.

## 2. Go-Live Status

Status permitido:

- `not_ready`;
- `ready_for_security_review`;
- `ready_for_staging_validation`;
- `ready_for_go_live_approval`;
- `approved_for_production`;
- `production_blocked`;
- `production_live`.

Produção só pode avançar para `approved_for_production` quando todos os gates P0 estiverem concluídos e evidenciados.

## 3. Responsáveis

Papéis mínimos:

- engineering owner;
- security owner;
- operations owner;
- product owner;
- compliance/GRC reviewer;
- incident commander inicial;
- support owner.

Cada gate deve ter:

- owner;
- evidência;
- data;
- decisão;
- riscos aceitos, se houver.

## 4. P0 Gates Obrigatórios

### Auth e RBAC

- Auth real ativo.
- `MockAuthProvider` desabilitado.
- RBAC revisado por endpoint crítico.
- API keys/service accounts, se expostos, escopados por tenant.
- Admin/internal protegido por Cloudflare Access / Zero Trust.

Evidência:

- testes positivos/negativos;
- configuração staging/production;
- security review aprovada.

### Tenant Isolation

- Testes cross-tenant verdes.
- Repositories filtram por tenant.
- R2 keys usam tenant/org/assessment.
- Vectorize usa namespace/metadados por tenant/assessment.
- Audit logs incluem tenant.

No-Go:

```text
Qualquer falha cross-tenant bloqueia go-live.
```

### Approval Gates

- SoA exige approval.
- Gap Analysis exige approval.
- Maturity exige approval.
- POA&M exige approval.
- Report acceptance exige approval.
- Agentes não aprovam artifacts.

Evidência:

- testes do Assessment Engine;
- testes de workflow;
- cenário API-first executado.

### Secrets

- Nenhum secret no repo.
- Secrets configurados em ambiente seguro.
- Rotação emergencial documentada.
- Tokens Cloudflare/GitHub com menor privilégio.
- DATABASE_URL real fora de logs.

### WAF, Rate Limits e CORS

- WAF habilitado para API pública.
- Rate limits por tenant/key/endpoint configurados.
- CORS sem wildcard em produção.
- Admin/internal com proteção adicional.
- Upload/report/agent run com quotas.

### Audit e Observability

- Audit logs persistentes.
- Security events persistentes.
- `trace_id` propagado.
- Dashboards mínimos criados.
- Alertas mínimos ativos.
- Logs com redaction.

### Backup/Restore

- Backup PostgreSQL automatizado.
- Restore drill executado.
- R2 lifecycle configurado.
- Vector index rebuild documentado.
- RPO/RTO preliminares aprovados.

### Incident Response

- Runbook criado.
- Severidades definidas.
- Escalation path definido.
- Processo de API key compromise.
- Processo de cross-tenant alert.
- Processo de approval bypass attempt.
- Postmortem template definido.

### API Documentation

- OpenAPI publicado.
- Public API guidelines publicados.
- Erros documentados.
- Auth documentada.
- Rate limits documentados.
- Idempotency documentada.
- Webhooks documentados, se liberados.

### Staging Validation

- `pnpm test:ci` verde.
- Smoke tests staging verdes.
- API-first acceptance scenario executado com dados sintéticos.
- Security tests verdes.
- Evals e regression verdes.
- Deploy rollback testado ou documentado.

## 5. External API Readiness

Antes de liberar API externa:

- API keys implementadas e rotacionáveis.
- Scopes por key definidos.
- Sandbox environment disponível.
- Rate limits por API key.
- Idempotency em writes críticos.
- Audit logs por integração.
- Public API docs publicadas.
- Changelog público definido.
- Terms/privacy/legal review concluída.

No-Go:

- API pública sem idempotency em operações críticas;
- API keys sem escopo de tenant;
- tokens em logs;
- ausência de throttling.

## 6. Webhook Readiness

Antes de liberar webhooks:

- assinatura HMAC implementada;
- event envelope versionado;
- retry e DLQ definidos;
- replay protection;
- idempotency por `event_id`;
- delivery logs;
- secret rotation;
- documentação de verificação;
- sandbox para testes.

No-Go:

- webhook sem assinatura;
- payload sensível excessivo;
- ausência de retry/DLQ;
- delivery sem audit trail.

## 7. Data Governance

Validar:

- política de retenção para documentos;
- política de retenção para chunks;
- política de retenção para embeddings;
- política de retenção para reports;
- política de retenção para audit logs;
- export permissions;
- URL expiration;
- download logging;
- legal hold;
- delete/export por tenant conforme contrato.

## 8. Cost Governance

Validar:

- budgets por ambiente;
- alertas de custo;
- usage por tenant;
- quotas por operação pesada;
- AI Gateway cost tracking planejado/ativo quando LLM real entrar;
- limits para agent runs;
- limits para KB search;
- limits para report render/export.

## 9. Performance e Reliability

Validar:

- load test sintético mínimo;
- API health monitorado;
- queue depth monitorado;
- DLQ monitorada;
- workflow failure rate monitorado;
- retries com limite;
- backpressure definido;
- report/export jobs não bloqueiam API.

## 10. Security Sign-Off

Checklist:

- security review aprovada;
- dependency/security scan revisado;
- secrets scan limpo;
- auth/RBAC validado;
- tenant isolation validado;
- WAF/rate limit validado;
- admin access validado;
- incident runbooks validados.

Assinaturas:

```text
Engineering owner:
Security owner:
Operations owner:
Compliance/GRC reviewer:
Product owner:
```

## 11. Go-Live Execution Plan

Sequência:

1. Congelar release candidate.
2. Rodar `pnpm test:ci`.
3. Rodar smoke tests staging.
4. Validar backups.
5. Validar secrets production.
6. Validar Cloudflare WAF/rate limits/Access.
7. Confirmar incident roster.
8. Executar deploy production manual.
9. Rodar smoke tests production.
10. Monitorar dashboards.
11. Confirmar audit/security events.
12. Declarar `production_live` ou rollback.

## 12. Rollback Plan

Rollback deve cobrir:

- Worker deploy anterior;
- workflow config;
- queue consumers;
- env vars/secrets;
- API route exposure;
- connector/webhook disablement;
- report/export jobs;
- database migrations.

Regras:

- migration irreversível exige plano específico;
- rollback não pode apagar audit logs;
- rollback deve preservar tenant isolation;
- comunicação interna deve ser registrada.

## 13. First 24 Hours Monitoring

Monitorar:

- 4xx/5xx;
- auth failures;
- tenant mismatch;
- queue depth;
- DLQ;
- workflow failures;
- report/export failures;
- cost spikes;
- security events;
- latency;
- webhook delivery, se ativo.

Cadência:

- primeira hora: acompanhamento contínuo;
- primeiras 4 horas: revisão frequente;
- primeiras 24 horas: checkpoints programados;
- pós-go-live: review e backlog.

## 14. No-Go Conditions

Bloqueiam go-live:

- tenant isolation falhando;
- approval bypass possível;
- mock auth ativo;
- secrets no repo/log;
- audit logs ausentes;
- backup sem restore testado;
- WAF/rate limiting ausente;
- CORS wildcard em rota autenticada;
- endpoint crítico sem permission;
- production deploy sem aprovação manual;
- API externa sem auth/escopo;
- dados reais em fixture/teste.

## 15. Resultado Esperado

Ao concluir este checklist:

- produção tem controles mínimos de segurança;
- API pública tem contrato e proteção;
- incident response está preparado;
- backup/restore está validado;
- observability está ativa;
- tenant isolation está testado;
- go-live é uma decisão auditável.


# Production Hardening

## 1. Objetivo

Este documento define o modelo de hardening de produção do `standard-api-standard` para operar como API SaaS multi-organization, Cloudflare-oriented e integrável por sistemas externos.

Produção só é aceitável quando segurança, isolamento, observabilidade, continuidade operacional, governança de custo e controles de abuso estiverem ativos e testados.

## 2. Requisitos de Produção

Requisitos obrigatórios:

- auth real;
- RBAC completo;
- organization isolation validado;
- secrets management;
- rate limiting;
- WAF;
- CORS restritivo;
- audit logs;
- security events;
- backup/restore;
- disaster recovery;
- data retention;
- incident response;
- monitoring;
- alerting;
- cost controls;
- abuse prevention.

Regra:

```text
Nenhum organization real entra em produção com mock auth, CORS wildcard, audit logs in-memory ou resources compartilhados com dev/staging.
```

## 3. Auth Real

Produção deve desabilitar qualquer provider `mock_dev`.

Modelos permitidos:

- JWT/OIDC para usuários humanos;
- API keys escopadas para integrações;
- service accounts para automações internas;
- Cloudflare Access para superfícies internas/admin;
- mTLS futuro para integrações enterprise.

Requisitos:

- tokens validados por assinatura e issuer confiável;
- audience e expiration obrigatórios;
- refresh/session policy definida;
- tokens e secrets nunca aparecem em logs;
- falhas de auth geram erro seguro com `trace_id`;
- eventos suspeitos geram security event.

## 4. RBAC Completo

RBAC deve cobrir:

- organization admin;
- organization admin;
- assessment owner;
- assessor;
- reviewer;
- approver;
- auditor readonly;
- integration service;
- support readonly;
- platform admin.

Regras:

- cada endpoint crítico declara permissões explícitas;
- approvals exigem permissões específicas por gate;
- support/admin cross-organization exige trilha auditável;
- `integration_service` não recebe permissões humanas de approval por padrão;
- acesso admin não bypassa organization/audit.

## 5. Organization Isolation

Obrigatório em todas as camadas:

- API Gateway;
- services;
- repositories;
- workflows;
- agent runtime;
- tool execution;
- R2;
- Vectorize;
- observability;
- exports.

Controles:

- `organization_id` obrigatório;
- `organization_id` e `assessment_id` obrigatórios em fluxos críticos;
- queries filtradas por organization;
- R2 keys prefixadas por organization/organization/assessment;
- Vectorize namespaces/metadados por organization/assessment;
- logs sem payload sensível;
- testes cross-organization obrigatórios em CI.

No-Go:

```text
Qualquer falha cross-organization bloqueia produção.
```

## 6. Secrets Management

Secrets devem ficar em:

- Cloudflare secrets/bindings apropriados;
- secret manager aprovado;
- variáveis seguras de CI/CD;
- storage criptografado para secrets de conectores.

Proibido:

- secrets em git;
- secrets em logs;
- secrets em fixtures;
- tokens reais em docs;
- dumps de env em incidentes.

Processos:

- inventário de secrets;
- rotação periódica;
- rotação emergencial;
- owner por secret;
- menor privilégio;
- revogação auditável.

## 7. Rate Limiting

Rate limiting deve existir por:

- organization;
- organization;
- API key;
- endpoint;
- classe de operação;
- ambiente.

Operações críticas:

- upload;
- KB search;
- agent run;
- report render/export;
- workflow start;
- SCF import;
- webhook ingest;
- admin endpoints.

Requisitos:

- resposta estável para throttling;
- headers de rate limit quando aplicável;
- métricas e alertas de throttling;
- quotas configuráveis por plano/organization;
- proteção contra burst de jobs pesados.

## 8. WAF e Abuse Prevention

Produção deve usar Cloudflare WAF e controles de API protection conforme ambiente.

Controles mínimos:

- WAF em rotas públicas;
- bloqueio de padrões conhecidos de abuso;
- proteção contra payloads anômalos;
- limites por IP/organization/key;
- proteção de endpoints de upload;
- monitoramento de 4xx/5xx incomuns;
- regras específicas para admin/internal;
- bot/abuse prevention quando aplicável.

Turnstile pode ser usado em fluxos públicos interativos, se houver console/web pública. Para API machine-to-machine, preferir autenticação forte, rate limits, API keys escopadas e allowlists quando aplicável.

## 9. CORS Restritivo

Produção deve:

- bloquear wildcard CORS;
- permitir apenas origins aprovados;
- separar origins de console, parceiros e ambientes;
- não permitir credentials para origins não confiáveis;
- registrar mudanças de CORS;
- testar preflight em staging.

Regra:

```text
Nenhuma rota authenticated em produção usa Access-Control-Allow-Origin: *.
```

## 10. Audit Logs e Security Events

Audit logs obrigatórios para:

- login/auth events relevantes;
- criação/alteração de organization/org/assessment;
- uploads;
- workflow transitions;
- approvals;
- artifact versioning;
- agent runs;
- tool calls críticas;
- exports/downloads;
- API key lifecycle;
- connector lifecycle;
- admin/support access.

Security events obrigatórios para:

- permission denied;
- organization mismatch;
- cross-organization attempt;
- approval bypass attempt;
- prompt injection signal;
- tool access denied;
- API key anomaly;
- rate limit abuse;
- data export anomaly.

Logs devem preservar `trace_id`, `organization_id`, actor e resource references, sem conteúdo sensível integral.

## 11. Backup, Restore e DR

PostgreSQL:

- backup automatizado;
- restore drill documentado;
- retenção definida;
- encryption at rest/in transit;
- RPO/RTO preliminares aprovados.

R2:

- lifecycle policies por bucket;
- retenção por classe de artifact;
- versionamento quando aplicável;
- estratégia para legal hold;
- validação de recuperação de artifacts críticos.

Vectorize:

- índice vetorial é rebuildable;
- fonte de reconstrução vem de documentos/chunks/metadados persistidos;
- rebuild deve preservar organization/assessment scope.

DR:

- plano para indisponibilidade Cloudflare;
- plano para indisponibilidade PostgreSQL;
- replay controlado de queues;
- DLQ com triage;
- runbook de rollback.

## 12. Data Retention

Políticas devem cobrir:

- documentos;
- chunks;
- embeddings;
- reports;
- exports;
- audit logs;
- security events;
- agent runs;
- workflow events;
- connector logs.

Regras:

- retenção por organization/plan/contrato;
- exclusão controlada;
- legal hold;
- expiração de URLs assinadas;
- logs de download;
- masking/redaction para exports.

## 13. Incident Response

Incidentes cobertos:

- vazamento potencial;
- cross-organization alert;
- falha de approval gate;
- API key comprometida;
- prompt injection;
- uso anômalo de agente;
- custo anômalo;
- DLQ acumulada;
- falha de backup/restore;
- abuso de API pública.

Fluxo:

1. Detectar.
2. Classificar severidade.
3. Conter.
4. Preservar evidência.
5. Rotacionar credenciais quando aplicável.
6. Comunicar responsáveis.
7. Corrigir.
8. Rodar validações.
9. Registrar postmortem.

## 14. Monitoring e Alerting

Dashboards mínimos:

- API health;
- workflow health;
- queue depth;
- error rate;
- organization usage;
- LLM/embedding usage;
- cost by organization;
- security events;
- failed jobs;
- DLQ;
- webhook delivery health;
- report/export jobs.

Alertas mínimos:

- aumento de 5xx;
- organization mismatch;
- approval bypass attempt;
- DLQ acima do limite;
- custo anômalo;
- agent/tool failure spike;
- webhook failure spike;
- auth failure spike;
- report/export failure.

## 15. Cost Controls

Governança de custo deve registrar:

- Workers/Workflows usage;
- queue messages;
- R2 operations/storage;
- Vectorize queries/storage;
- LLM/embedding usage futuro;
- report/export jobs;
- usage por organization/assessment.

Controles:

- budgets por ambiente;
- quotas por organization;
- alertas por anomalia;
- kill switch para jobs pesados;
- limites de tool calls;
- limites de agent runs;
- revisão FinOps antes de organizations reais.

## 16. Cloudflare Production Controls

Controles documentados:

- Cloudflare WAF para API pública;
- Cloudflare Access / Zero Trust para admin/internal;
- Cloudflare Rate Limiting para endpoints públicos e operações pesadas;
- Cloudflare Turnstile somente quando houver fluxo interativo aplicável;
- Cloudflare R2 lifecycle policies para documentos, reports e exports;
- Cloudflare Queues DLQ para mensagens com retries excedidos;
- Cloudflare AI Gateway para governança futura de LLM/embedding;
- Cloudflare Logs / Analytics para tráfego, Workers e segurança;
- Cloudflare for SaaS para domínios/custom hostnames por organization, futuro;
- Workers for Platforms para workloads isolados por organization, futuro.

Nota: limites, pricing, APIs e disponibilidade de features devem ser confirmados na documentação oficial Cloudflare antes de compromisso de produção.

## 17. Go-Live Gates

Produção só pode ocorrer se:

- organization isolation testado;
- RBAC ativo;
- secrets fora do repo;
- production deploy manual;
- WAF/rate limit configurado;
- audit logs ativos;
- backup configurado;
- incident runbook criado;
- API docs publicadas;
- staging validado.

No-Go adicional:

- `MockAuthProvider` ativo;
- CORS wildcard;
- audit log in-memory;
- rate limiting ausente;
- endpoints críticos sem permission;
- production resources misturados com staging/dev;
- rollback não testado;
- legal/privacy review pendente para dados reais.

## 18. Risks and Open Questions

Riscos e decisões abertas:

- escolha final de auth provider;
- billing/quotas;
- connector roadmap;
- data residency;
- long-term retention;
- legal/privacy review;
- enterprise SSO;
- DLP no AI Gateway;
- estratégia de custom hostnames;
- modelo de suporte cross-organization;
- RPO/RTO finais;
- WAF ruleset final por ambiente.

## 19. Resultado Esperado

Este documento orienta:

- endurecer produção;
- preservar isolamento multi-organization;
- operar com segurança;
- reduzir abuso;
- monitorar qualidade/custo;
- responder a incidentes;
- preparar go-live;
- sustentar integrações externas futuras.


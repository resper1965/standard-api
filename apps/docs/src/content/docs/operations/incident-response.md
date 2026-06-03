---
title: "Incident Response Runbook"
---

# Incident Response Runbook

> Processo operacional para resposta a incidentes de segurança, disponibilidade e integridade do Standard.

## 1. Classificação de Severidade

| Severidade | Definição | SLA Meta (reconhecimento) | SLA Meta (resolução) |
|:----------:|-----------|:-------------------------:|:--------------------:|
| **SEV-1** | Indisponibilidade total, breach confirmado, dados de tenant expostos | 15 min | 4h |
| **SEV-2** | Degradação crítica, approval bypass attempt, cross-tenant access blocked | 30 min | 8h |
| **SEV-3** | Degradação parcial, DLQ acumulando, workflow failures acima do baseline | 2h | 24h |
| **SEV-4** | Bug funcional, performance degradada não crítica, alerta informativo | 8h | 72h |

## 2. Escalation Path

```
Alerta → Engineering On-call → Security Owner → Operations Owner → Product Owner
                                                                   ↓
                                                          Incident Commander
```

### Papéis

| Papel | Responsabilidade |
|-------|------------------|
| **Engineering On-call** | Primeiro contato, triagem, mitigação inicial |
| **Security Owner** | Avalia impacto em dados, auth, tenant isolation |
| **Operations Owner** | Coordena rollback, comunicação, recursos Cloudflare |
| **Incident Commander** | Decisão final, comunicação com stakeholders |

## 3. Cenários Específicos

### 3.1 Tenant Data Breach (SEV-1)
1. Identificar escopo: quais tenants, quais dados, qual vetor
2. Isolar: revogar sessions/API keys comprometidos
3. Preservar evidência: snapshots de logs, audit events, security events
4. Comunicar: security owner → incident commander → stakeholders
5. Remediar: patch, rotate secrets, validar isolation
6. Postmortem obrigatório

### 3.2 Approval Bypass Attempt (SEV-2)
1. Verificar security events `approval_bypass_blocked`
2. Identificar ator, assessment, gate específico
3. Avaliar se dados foram gravados indevidamente
4. Revogar sessions se necessário
5. Registrar incident

### 3.3 API Key Compromise (SEV-2)
1. Revogar API key imediatamente
2. Auditar uso: `GET /api/v1/admin/audit-logs?actor_type=api_key&key_id=...`
3. Verificar se houve acesso cross-tenant
4. Rotar key e comunicar consumidor
5. Registrar incident

### 3.4 DLQ Acumulando (SEV-3)
1. Verificar queue depth: Cloudflare dashboard ou API
2. Identificar mensagens falhando: type, error, tenant
3. Avaliar impacto: quais assessments estão parados
4. Corrigir consumer, refire mensagens válidas
5. Registrar aprendizado

### 3.5 Workflow Failure em Massa (SEV-3)
1. `GET /api/v1/workflows?status=failed` (quando API existir)
2. Correlacionar `trace_id` e `failed_reason_safe`
3. Identificar causa raiz (binding, secret, DB, upstream)
4. Corrigir e `POST /api/v1/workflows/:id/resume`
5. Registrar aprendizado

## 4. Postmortem Template

Todo SEV-1 e SEV-2 exige postmortem. SEV-3 fica a critério do incident commander.

```markdown
# Postmortem: [título curto]

**Data**: YYYY-MM-DD
**Severidade**: SEV-N
**Duração**: HHh MMmin (detecção → resolução)
**Incident Commander**: [nome]

## Timeline
- HH:MM — Alerta recebido
- HH:MM — Triagem concluída, severidade definida
- HH:MM — Mitigação aplicada
- HH:MM — Causa raiz identificada
- HH:MM — Fix deployed
- HH:MM — Incidente encerrado

## Root Cause
[Descrição concisa]

## Impacto
- Tenants afetados: N
- Dados expostos: sim/não
- Assessments impactados: N

## Action Items
- [ ] Item 1 — owner: [nome] — prazo: YYYY-MM-DD
- [ ] Item 2 — owner: [nome] — prazo: YYYY-MM-DD

## Lessons Learned
[O que aprendemos e o que mudaríamos]
```

## 5. Onde Armazenar

- Postmortems: `docs/operations/postmortems/YYYY-MM-DD-titulo.md`
- Alertas: Cloudflare dashboard + futuro SOC/SIEM
- Incidents: GitHub Issues com label `incident` (quando habilitado)

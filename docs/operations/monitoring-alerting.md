# Monitoring & Alerting Strategy

> Definição de o que monitorar, com que frequência, e como configurar alertas para o Standard.

## 1. Health Checks

| Endpoint | Frequência | Método | Alerta se |
|----------|:----------:|--------|-----------|
| `/api/v1/health` | 1 min | GET | Falhar 3x consecutivas |
| `/api/auth/ok` | 5 min | GET | Falhar 2x consecutivas |

### Onde Configurar
- Cloudflare Health Checks (nativo) ou
- UptimeRobot / Better Uptime (externo)

## 2. Métricas de Aplicação

| Métrica | Fonte | Baseline esperado | Alerta |
|---------|-------|:------------------:|--------|
| 5xx rate | Cloudflare Analytics | < 0.1% | > 1% em 5min |
| 4xx rate | Cloudflare Analytics | < 5% | > 15% em 5min |
| P95 latency | Cloudflare Analytics | < 500ms | > 2s |
| Worker CPU time | Cloudflare dashboard | < 10ms median | > 30ms |
| Queue depth | Cloudflare Queues | 0 (drena continuamente) | > 100 por 10min |
| DLQ messages | Cloudflare Queues | 0 | > 0 |
| Workflow failures | Application logs | 0 | > 3 em 1h |

## 3. Métricas de Segurança

| Métrica | Fonte | Alerta |
|---------|-------|--------|
| Permission denied events | Security events API | > 10 do mesmo ator em 5min |
| Cross-tenant access blocked | Security events API | Qualquer ocorrência |
| Approval bypass blocked | Security events API | Qualquer ocorrência |
| Rate limit hits | Cloudflare WAF | > 50 do mesmo IP em 1min |
| Auth failures | Better Auth logs | > 20 para mesmo email em 5min |

## 4. Métricas de Infraestrutura

| Componente | O que monitorar | Alerta |
|------------|----------------|--------|
| Neon PostgreSQL | Connection pool, query latency, storage | Neon dashboard alerts |
| R2 | Request errors, storage growth | Cloudflare dashboard |
| KV | Read/write errors, storage | Cloudflare dashboard |
| Vectorize | Query latency, index size | Cloudflare dashboard |

## 5. Alertas de Custo

| Recurso | Threshold de Alerta | Ação |
|---------|:-------------------:|------|
| Workers requests/month | > 80% do plano | Avaliar upgrade ou otimização |
| R2 storage | > 50GB (ou threshold definido) | Revisar data retention |
| AI Gateway tokens (quando LLM real) | > budget mensal por tenant | Throttle ou comunicar |

## 6. Dashboards

### Dashboard 1: Operacional (prioridade)
- Health check status
- 5xx/4xx rates
- P95 latency
- Queue depth
- DLQ count

### Dashboard 2: Segurança
- Auth failures
- Permission denied events
- Cross-tenant blocks
- Rate limit hits

### Dashboard 3: Negócio
- Assessments criados/concluídos
- Tenants ativos
- AI tokens consumidos
- Reports gerados

### Onde
- **Fase 1**: Cloudflare Analytics (nativo, zero setup)
- **Fase 4**: Custom dashboard ou Grafana Cloud (quando necessário)

## 7. Status Atual

| Item | Status |
|------|--------|
| Health check endpoint | ✅ Implementado |
| Cloudflare Analytics | ✅ Automático (com Cloudflare Workers) |
| Alerta de uptime externo | ❌ Não configurado |
| Alerta de DLQ | ❌ Não configurado |
| Alerta de security events | ❌ Não configurado |
| Dashboard operacional | ❌ Não configurado |
| Dashboard de segurança | ❌ Não configurado |
| Alerta de custo | ❌ Não configurado |

> Items operacionais serão implementados nas Fases 1 e 4 conforme `ROADMAP.md`.

# First 24 Hours Monitoring Runbook

> §13 do Production Go-Live Checklist.  
> Guia operacional para as primeiras 24 horas após go-live.

## Dashboard Rápido (bookmarks)

| Dashboard | URL | O que monitorar |
|-----------|-----|----------------|
| Cloudflare Workers | https://dash.cloudflare.com/ → Workers & Pages | Requests/s, Error rate, CPU time |
| Cloudflare Analytics | → Analytics & Logs | 4xx/5xx por endpoint |
| Neon Database | https://console.neon.tech/ | Connections ativas, Query time, Cache hit |
| API Health | https://standard-api.bekaa.eu/api/v1/health | Status, uptime |

---

## Cadência de Monitoramento

### Primeira Hora (crítico)

Verificar a cada 5 minutos:

```bash
# Health check
curl -s https://standard-api.bekaa.eu/api/v1/health | jq .

# Error rate (via Cloudflare API se disponível)
# Ou verificar no dashboard: Workers → standard-api-gateway → Metrics
```

Métricas a monitorar:
- [ ] Error rate < 1% (5xx)
- [ ] P95 latency < 500ms
- [ ] Auth failures = 0 (nenhum 401 inesperado)
- [ ] Queue depth < 100 mensagens pendentes
- [ ] DLQ depth = 0

### Primeiras 4 Horas

Verificar a cada 15 minutos:
- [ ] Audit logs crescendo normalmente (sem gaps)
- [ ] Nenhum security event inesperado
- [ ] Tenant isolation: nenhum `tenant_id` mismatch nos logs
- [ ] Rate limiting funcionando (429 só para tráfego acima do limite)

### Primeiras 24 Horas

Verificar a cada hora:
- [ ] Cost spike inesperado (Cloudflare billing alerts)
- [ ] Webhook deliveries: delivery rate > 95%
- [ ] DLQ: zero mensagens não processadas
- [ ] Workflow failures = 0
- [ ] Report/export jobs completando em < 30s

---

## Alertas de No-Go (Ação Imediata)

| Sinal | Threshold | Ação |
|-------|-----------|------|
| Cross-tenant data | Qualquer ocorrência | ROLLBACK imediato + incident |
| 5xx error rate | > 5% por 2 min | ROLLBACK + investigar |
| Auth failures | > 10% por 1 min | ROLLBACK + investigar |
| Database connection | Sem conexão | ROLLBACK + verificar DATABASE_URL |
| DLQ spike | > 50 mensagens | Pausar queue + investigar |

---

## Checklist Hora 1

```
[ ] 00:00 - Deploy produção executado
[ ] 00:05 - Health check verde
[ ] 00:10 - Smoke test manual (criar assessment, upload doc)
[ ] 00:15 - Verificar audit logs no banco
[ ] 00:20 - Verificar Cloudflare analytics (primeiras requests)
[ ] 00:30 - P95 latency < 500ms confirmado
[ ] 00:45 - Error rate < 1% confirmado
[ ] 01:00 - First 24h monitoring ativado (alerts configurados)
```

---

## Comandos Úteis

```bash
# Verificar health da API
curl -s https://standard-api.bekaa.eu/api/v1/health | jq '{status, db: .checks.db, timestamp}'

# Verificar version do worker deployado
curl -s https://standard-api.bekaa.eu/api/v1/health | jq .version

# Monitorar logs em tempo real (via wrangler)
wrangler tail --name standard-api-gateway --format pretty

# Ver últimas queries lentas no Neon
# (via console Neon → Query insights)
```

---

## Declaração de Production Live

Após 1 hora sem alertas, declarar produção estável:

```
PRODUCTION_LIVE declarado
Timestamp: <ISO 8601>
Versão: <deployment ID>
Health check: ✅
Error rate 1h: <N>%
P95 latency 1h: <N>ms
Aprovado por: <engineering owner>
```

Atualizar `docs/operations/go-live-status.md` → status: `production_live`.

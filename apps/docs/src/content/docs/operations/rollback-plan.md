---
title: "Rollback Plan — Standard Platform"
---

# Rollback Plan — Standard Platform

> §12 do Production Go-Live Checklist.  
> Este documento define os procedimentos de rollback para cada componente após um deploy de produção com problemas.

## Quando usar este plano

Ativar rollback quando:
- Error rate > 5% por mais de 2 minutos
- P95 latency > 2s por mais de 5 minutos
- Cross-organization data leakage detectado (No-Go imediato)
- Approval gate bypassável
- Auth quebrado (401 em endpoints autenticados)

---

## 1. Rollback do Worker (Cloudflare)

```bash
# Listar versões disponíveis
wrangler deployments list --name standard-api-gateway

# Rollback para versão anterior (substitua VERSION pelo deployment ID)
wrangler rollback --name standard-api-gateway --deployment-id VERSION

# Verificar versão ativa
wrangler deployments list --name standard-api-gateway | head -5
```

**SLO de rollback**: < 2 minutos  
**Zero downtime**: Sim (Cloudflare aplica gradualmente)

---

## 2. Rollback do Workflow Worker

```bash
wrangler deployments list --name standard-workflows
wrangler rollback --name standard-workflows --deployment-id VERSION
```

**Atenção**: Workflows já iniciados continuarão na versão em execução (Durable Objects). Novos workflows usarão a versão revertida.

---

## 3. Rollback de Database Migration (Drizzle)

Migrations irreversíveis requerem plano específico **antes do deploy**.

```bash
# Listar migrations aplicadas
pnpm db:migrate --list

# Reverter última migration (se migration de rollback existir)
# Drizzle NÃO tem rollback automático — requer migration manual

# Criar migration de rollback manual:
pnpm db:generate  # após editar schema para estado anterior
pnpm db:migrate
```

**Regra**: Toda migration deve ter:
1. Migration de rollback documentada em `docs/decisions/`
2. Aprovação do engineering owner antes de aplicar em produção
3. Backup verificado antes da migration

---

## 4. Rollback de Env Vars / Secrets

```bash
# Cloudflare Workers — reverter var
wrangler secret put NOME_DA_VAR --name standard-api-gateway
# (digitar o valor anterior quando solicitado)

# Verificar vars ativas
wrangler secret list --name standard-api-gateway
```

---

## 5. Rollback de API Route Exposure

Para desabilitar um endpoint sem rollback completo:

```typescript
// No router, adicionar antes da rota problemática:
router.all("/api/v1/problematic-endpoint/*", () =>
  Response.json({ error: "MAINTENANCE", message: "Endpoint temporarily unavailable." }, { status: 503 })
);
```

Deploy emergency patch → rollback após fix.

---

## 6. Rollback de Queue Consumer / Ingestion

```bash
# Pausar queue consumption (CF Dashboard → Queues → Pause Consumer)
# OU desabilitar via wrangler:
wrangler queues consumer list standard-ingestion-queue
wrangler queues consumer remove standard-ingestion-queue standard-ingestion-worker
```

Mensagens permanecem na fila (não são descartadas). Reabilitar após fix.

---

## 7. Connector / Webhook Disablement

Para desabilitar webhooks globalmente (emergência):

```sql
-- Via Neon dashboard ou psql:
UPDATE webhook_endpoints SET enabled = false WHERE organization_id IS NOT NULL;

-- Reverter após fix:
UPDATE webhook_endpoints SET enabled = true WHERE enabled = false;
```

---

## 8. Regras de Rollback

1. **Audit logs**: rollback NUNCA pode apagar audit logs  
2. **Organization isolation**: toda mudança de rollback deve ser verificada com cross-organization test  
3. **Comunicação**: toda ação de rollback deve ser registrada no incident channel  
4. **Backup**: verificar backup antes de qualquer migration de rollback  
5. **Aprovação**: rollback de migration exige engineering owner  

---

## 9. Comunicação de Rollback

Registro mínimo obrigatório:

```
ROLLBACK EXECUTADO
Timestamp: <ISO 8601>
Componente: <Worker / DB / Queue / Webhook>
Versão anterior: <deployment ID ou migration>
Versão revertida para: <deployment ID ou migration>
Motivo: <descrição do problema>
Ator: <email>
Status pós-rollback: <health check resultado>
Próximo passo: <hot fix / root cause analysis / monitoring>
```

Registrar em: GitHub Issues (`label: incident`) + canal de incident response.

---

## 10. Contatos para Rollback

| Papel | Ação |
|-------|------|
| Engineering owner | Aprovar rollback de migration; executar rollback de Worker |
| Cloudflare admin | Rollback via dashboard se wrangler falhar |
| Neon admin | Rollback de migration via console Neon |
| Incident commander | Coordenar comunicação e registro |

# Cost Governance — Standard Platform

> §8 do Production Go-Live Checklist.  
> Define orçamentos por ambiente, alertas, quotas por operação e tracking de uso por organization.

---

## 1. Orçamentos por Ambiente

| Ambiente | Provider | Budget Mensal | Alerta em | Owner |
|----------|----------|--------------|-----------|-------|
| Production | Cloudflare | $50 Workers + $25 R2 | 80% | engineering |
| Staging | Cloudflare | $10 | 80% | engineering |
| Production DB | Neon | Scale plan | 90% compute | engineering |
| LLM (quando ativo) | AI Gateway | $200 | 70% | product |

> **Configurar alertas**: Cloudflare → Notifications → Billing Threshold  
> Neon → Project Settings → Billing Alerts

---

## 2. Alertas de Custo Configurados

| Item | Status | Como configurar |
|------|--------|----------------|
| Cloudflare Workers billing alert | ⚠️ PENDENTE | CF Dashboard → Billing → Usage Alerts |
| Neon compute alert | ⚠️ PENDENTE | Neon Dashboard → Project → Billing |
| R2 storage alert | ⚠️ PENDENTE | CF Dashboard → R2 → Usage Alerts |
| KV operation alert | ⚠️ PENDENTE | CF Dashboard → Workers KV → Usage |

---

## 3. Quotas por Operação Implementadas

### API Rate Limiting (código — `src/middleware/rate-limit.middleware.ts`)

| Operação | Limite Atual | Burst | Implementação |
|----------|-------------|-------|--------------|
| API geral | 120 req/min | 20 | KV token bucket por `clientIp+organizationId` |
| Upload de documento | 10 req/min | 5 | Rate limit path-specific |
| KB search | 60 req/min | 10 | Rate limit path-specific |
| Report export | 5 req/min | 2 | Rate limit path-specific |

### Quotas por Organization (a implementar pós-MVP)

| Operação | Quota Proposta | Tier Free | Tier Pro | Tier Enterprise |
|----------|----------------|-----------|----------|----------------|
| Assessments ativos | 10/org | 1 | 10 | unlimited |
| Documentos por assessment | 500 | 20 | 100 | 500 |
| Agent runs por assessment | 100 | 5 | 50 | 100 |
| KB search por dia | 10.000 | 500 | 5.000 | 10.000 |
| Report exports por mês | 50 | 5 | 25 | 50 |
| Webhooks ativos por org | 10 | 1 | 5 | 10 |

> **Status**: Limites de rate limiting gerais estão ativos. Quotas por tier serão implementadas na fase de billing/monetização.

---

## 4. Usage Tracking por Organization

### Implementado

- Audit logs incluem `organization_id` em cada operação crítica ✅
- Rate limiting usa `clientIp + organizationId` como chave ✅
- Vectorize namespaced por organization/assessment ✅
- R2 prefixado por `organization_id/org_id/assessment_id` ✅

### Tracking de custo por organization (roadmap)

Para billing SaaS por organization, implementar:

```typescript
// packages/observability/src/usage/usage-tracker.ts (roadmap)
type UsageEvent = {
  organization_id: string;
  organization_id: string;
  event_type: "agent_run" | "kb_search" | "document_upload" | "report_export";
  units: number;
  timestamp: string;
  metadata: Record<string, unknown>;
};
```

Opções de implementação:
1. **Cloudflare Analytics Engine** — writes de uso via Workers; free tier generoso
2. **PostgreSQL `usage_events` table** — com agregações diárias por organization
3. **Stripe Meter API** — integração direta para billing baseado em uso

---

## 5. AI Gateway — Tracking de LLM (quando ativo)

O Standard usa `@cf/meta/llama-3` via Workers AI (fallback) e OpenAI/Anthropic via AI Gateway.

Quando LLM real entrar em produção:

| Controle | Configuração |
|----------|-------------|
| AI Gateway budget por request | $0.10 max por agent run |
| Model fallback | Se primary model falha, use cf/meta fallback |
| Token limit por assessment | 200k tokens max por assessment |
| Rate limit agent runs | 10 runs/hora por assessment |
| Cost logging | `agent_run_id` + `token_count` + `model` em audit log |

Configurar no AI Gateway (Cloudflare Dashboard → AI → AI Gateway):
- Rate limiting por API key
- Budget alerts
- Request/response logging (com PII redaction)

---

## 6. Limits para Jobs Pesados

| Job | Limite | Status |
|-----|--------|--------|
| Document ingestion | 10MB por arquivo, 500 arquivos/assessment | ✅ implementado |
| Report export | Timeout 30s; retry 3x via queue | ✅ implementado |
| Embedding generation | 100 chunks por batch, 1000 batches/assessment | ⚠️ soft limit |
| KB rebuild | 1 rebuild/24h por assessment | ⚠️ não implementado |
| Agent orchestration | 3 agent rounds max por execução | ⚠️ não implementado |

---

## 7. Ações Imediatas (Pré-Go-Live)

1. `[ ]` Configurar billing alert no Cloudflare Dashboard (80% budget)
2. `[ ]` Configurar alert no Neon Dashboard (90% compute)
3. `[ ]` Revisar quotas de rate limiting para o primeiro organization real
4. `[ ]` Documentar pricing tier e quotas no developer portal

## 8. Ações Pós-Go-Live (P2)

1. Implementar `usage_events` table para tracking por organization
2. Integrar Cloudflare Analytics Engine para métricas de uso
3. Definir pricing tiers e implementar quota enforcement
4. Integrar Stripe Meter para billing baseado em uso

# Disaster Recovery Plan

> Estratégia de recuperação do Standard em cenários de perda parcial ou total de infraestrutura.

## 1. RPO / RTO

| Componente | RPO (perda tolerável) | RTO (tempo de restauração) | Método |
|------------|:---------------------:|:--------------------------:|--------|
| PostgreSQL (Neon) | 24h | 4h | Neon branching + point-in-time recovery |
| R2 (documentos, evidências) | 24h | 8h | R2 versioning (quando ativado) |
| Vectorize (embeddings) | Reconstruível | 24h | Rebuild a partir de R2 + KB pipeline |
| KV (session cache) | Efêmero | Automático | Sessions reautenticam |
| Queues (mensagens) | 0–5min | 2h | Refire a partir de assessment state |
| Workers (código) | 0 | 30min | Redeploy a partir do git |
| Secrets | 0 | 1h | Re-inject via `wrangler secret put` |

## 2. Cenários de Desastre

### 2.1 Perda Total do PostgreSQL
1. **Detecção**: health check falha, Workers retornam 500
2. **Mitigação**: ativar maintenance mode (se existir), comunicar
3. **Restauração**: Neon point-in-time restore para branch nova
4. **Validação**: smoke tests, integridade de tenants
5. **Pós-incidente**: postmortem obrigatório

### 2.2 Corrupção de R2 Bucket
1. **Detecção**: downloads falhando, hashes divergentes
2. **Mitigação**: bloquear novos uploads até diagnóstico
3. **Restauração**: R2 versioning (restaurar versão anterior) ou backup externo
4. **Validação**: verificar documentos de tenants afetados

### 2.3 Cloudflare Worker Indisponível
1. **Detecção**: Cloudflare status page ou health check externo
2. **Mitigação**: nenhuma (dependência da plataforma)
3. **Restauração**: automática pela Cloudflare; redeploy se necessário
4. **Alternativa**: se prolongado, avaliar failover manual (improvável)

### 2.4 Comprometimento de Secrets
1. **Detecção**: alerta de uso anômalo ou reporte externo
2. **Mitigação imediata**: rotar TODOS os secrets afetados
3. **Validação**: auditar acessos durante a janela de exposição
4. **Restauração**: re-inject secrets, redeploy workers

## 3. Testes de DR

| Teste | Frequência | Responsável | Evidência |
|-------|:----------:|-------------|-----------|
| Restore PostgreSQL de backup | Trimestral (meta) | Operations Owner | Log de restore + row count |
| Redeploy completo do zero | Semestral (meta) | Engineering Owner | Deploy log + smoke tests |
| Rebuild Vectorize | Quando necessário | Engineering | Comparação de índice |
| Rotação de secrets | Trimestral (meta) | Security Owner | Confirmação de health check |

> **Status atual**: nenhum teste de DR foi executado. Estes são targets a serem implementados na Fase 1.

## 4. Dependências Externas

| Serviço | SLA do Provedor | Alternativa |
|---------|:---------------:|-------------|
| Cloudflare Workers | 99.99% | Nenhuma (core dependency) |
| Neon PostgreSQL | 99.95% | Outro PostgreSQL managed |
| Google OAuth | 99.9% | Email/password (fallback) |
| Cloudflare R2 | 99.9% | S3-compatible |

## 5. Comunicação

- **Interna**: Slack/Teams/Email conforme definido pelo Incident Commander
- **Externa** (tenants): via email ou status page (quando existir)
- **Registro**: `docs/operations/postmortems/`

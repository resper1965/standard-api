# k6 Load Test — Standard API

Scripts de load test para o gate §9 Performance (production go-live checklist).

## Pré-requisitos

```bash
# Instalar k6
# Windows (chocolatey):
choco install k6
# macOS:
brew install k6
# Linux:
sudo apt-get install k6

# Verificar instalação:
k6 version
```

## Scripts disponíveis

| Script | Cenário | Duração | VUs |
|--------|---------|---------|-----|
| `smoke.js` | Sanidade rápida (health + SCF) | 1 min | 5 |
| `api-gateway.js` | Carga completa (throughput + rate limit) | ~7 min | até 100 |

---

## Execução — Smoke Test (começar aqui)

```bash
# 1. Smoke test sem autenticação (endpoints públicos)
k6 run scripts/load-test/smoke.js \
  -e BASE_URL=https://standard-api.bekaa.eu

# 2. Smoke test com API key
k6 run scripts/load-test/smoke.js \
  -e BASE_URL=https://standard-api.bekaa.eu \
  -e API_KEY=standard_live_XXXXXXXXXXXXXXXX
```

**Critério de passagem**: P95 < 500ms, error rate < 5%

---

## Execução — Load Test Completo (gate §9)

```bash
# Exportar variáveis
$env:BASE_URL = "https://standard-api.bekaa.eu"
$env:API_KEY  = "standard_live_XXXXXXXXXXXXXXXX"
$env:TENANT_ID = "uuid-do-tenant-de-staging"
$env:ASSESSMENT_ID = "uuid-do-assessment-de-staging"

# Executar
k6 run scripts/load-test/api-gateway.js \
  -e BASE_URL=$env:BASE_URL \
  -e API_KEY=$env:API_KEY \
  -e TENANT_ID=$env:TENANT_ID \
  -e ASSESSMENT_ID=$env:ASSESSMENT_ID \
  --out json=results/load-test-$(Get-Date -Format 'yyyyMMdd-HHmm').json
```

**Critério de passagem (P0 Gate §9):**
- P95 latência < 500ms em todos os endpoints
- P99 latência < 1000ms
- Error rate < 1%
- Rate limit: 429 retornado corretamente para tráfego acima do limite

---

## Interpretando os resultados

```
✓ health status 200            ← endpoint saudável
✓ scf < 300ms                  ← SCF dentro do SLO
✓ assessment < 500ms           ← assessments dentro do SLO

http_req_duration............: avg=45ms  min=12ms med=38ms max=890ms p(90)=120ms p(95)=180ms p(99)=450ms
http_req_failed..............: 0.12%    ← < 1% = OK
health_latency...............: p(95)=48ms ← < 100ms = OK
scf_latency.................: p(95)=210ms ← < 300ms = OK
assessment_latency...........: p(95)=380ms ← < 500ms = OK
```

---

## Staging vs Produção

| Ambiente | URL | Quando usar |
|----------|-----|-------------|
| Staging | `https://staging-api.bekaa.eu` | Antes de cada release |
| Produção | `https://standard-api.bekaa.eu` | Gate go-live §9 + mensal |

> **Atenção**: Nunca executar load test com dados reais de clientes.
> Use tenant de staging com dados sintéticos (ver `evals/fixtures`).

---

## Monitoramento durante o teste

- Cloudflare Analytics: Workers → Requests/sec, CPU time, Errors
- Neon Dashboard: Connections, Query time, Cache hit rate
- k6 Cloud (opcional): `k6 run --out cloud api-gateway.js`

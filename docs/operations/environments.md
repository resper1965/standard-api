# Ambientes

## Visão Geral

| Ambiente | Propósito | Dados |
|----------|-----------|-------|
| **Local** | Desenvolvimento e testes | Sintéticos (fixtures/seeds) |
| **Staging** | Validação pré-produção | Sintéticos (nunca dados reais) |
| **Production** | Operação com clientes reais | Reais (isolados por tenant) |

## Local

### Stack
- API Gateway: `pnpm dev:api` → Wrangler dev (localhost:8787)
- Web: `pnpm dev:web` → Vite dev server (localhost:5173)
- PostgreSQL: Docker Compose (`infra/docker/docker-compose.yml`)
- Workers: Wrangler dev com bindings simulados
- Auth: Better Auth com Google OAuth (localhost redirect)

### Configuração
- `.dev.vars` no API Gateway (não versionado)
- `DATABASE_URL` apontando para PostgreSQL local
- Seeds sintéticos via `infra/docker/postgres/seeds/`

### Status
- ✅ Funcional
- ✅ Docker Compose para PostgreSQL
- ✅ Seeds SCF oficial + QNRCS
- ⚠️ R2, Queues e Vectorize usam simulador Wrangler (não persistente)

## Staging

### Stack
- API Gateway: Cloudflare Worker (`standard-api-standard-api-gateway`)
- Web: Cloudflare Pages (`standard-web`)
- PostgreSQL: Neon PostgreSQL (database staging separado)
- Auth: Better Auth com Google OAuth (redirect para domínio staging)

### Configuração
- Secrets via `wrangler secret put` ou GitHub Secrets
- Deploy via `.github/workflows/deploy-staging.yml`
- Domínio: configurar via Cloudflare

### Status
- ⚠️ Parcialmente provisionado
- ⚠️ Resources Cloudflare (R2, Queues, Vectorize) não separados de dev
- ✅ Deploy workflow existe
- ⚠️ Smoke tests não executados em staging real

### O que falta
- [ ] Provisionar R2 bucket staging separado
- [ ] Provisionar Queues staging separadas
- [ ] Provisionar Vectorize namespace staging
- [ ] Configurar domínio staging
- [ ] Executar smoke tests reais

## Production

### Stack
- Mesma arquitetura de staging com resources isolados
- Domínio: `standard-api.bekaa.eu` (API) + `apistandard.bekaa.eu` (Web)

### Configuração
- Deploy via `.github/workflows/deploy-production.yml` (manual com approval)
- Secrets gerenciados por GitHub Environment `production`
- Cloudflare Access para admin endpoints

### Status
- ❌ Não provisionado formalmente
- ✅ Deploy workflow existe com environment protection
- ❌ Resources não separados
- ❌ Backup/restore não configurado
- ❌ Monitoring/alertas não ativos

### O que falta
- [ ] Provisionar todos os Cloudflare resources separados
- [ ] Configurar Cloudflare Access para admin
- [ ] Configurar backup/restore PostgreSQL
- [ ] Configurar monitoring e alertas
- [ ] Custom domains com SSL
- [ ] Data retention policy enforcement
- [ ] Revisão legal/privacy

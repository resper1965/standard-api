---
title: "Ambientes"
---

# Ambientes

## Risco Aceito

> **[RISCO ACEITO — 2026-05-06]** Deploy direto em production sem staging separado. Validação será feita em local + CI. Staging pode ser introduzido depois se necessário.

## Visão Geral

| Ambiente | Propósito | Dados |
|----------|-----------|-------|
| **Local** | Desenvolvimento e testes | Sintéticos (fixtures/seeds) |
| **Production** | Operação real | Reais (isolados por tenant) |

## Local

### Stack
- API Gateway: `pnpm dev:api` → Wrangler dev (localhost:8787)
- Web: `pnpm dev:web` → Vite dev server (localhost:5173)
- PostgreSQL: Docker Compose (`infra/docker/docker-compose.yml`)
- Workers: Wrangler dev com bindings simulados
- Auth: Standard Native Auth com Google OAuth (localhost redirect)

### Configuração
- `.dev.vars` no API Gateway (não versionado)
- `DATABASE_URL` apontando para PostgreSQL local
- Seeds sintéticos via `infra/docker/postgres/seeds/`

### Status
- ✅ Funcional
- ✅ Docker Compose para PostgreSQL
- ✅ Seeds SCF oficial + QNRCS
- ⚠️ R2, Queues e Vectorize usam simulador Wrangler (não persistente)

## Staging (não utilizado — risco aceito)

O deploy staging workflow existe (`.github/workflows/deploy-staging.yml`) mas não será utilizado na fase atual. Validação ocorre em local + CI antes de deploy direto em production.

Se no futuro staging for necessário, os workflows já estão prontos.

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

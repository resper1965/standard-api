# CI/CD Process

> Documentação do processo de integração contínua e deploy contínuo como processo operacional, não apenas como YAML.

## 1. Visão Geral do Pipeline

```
Push to branch → CI (lint + typecheck + test + build) → PR Review → Merge to main
                                                                         ↓
                                                                  Deploy Staging (auto)
                                                                         ↓
                                                                  Deploy Production (manual com approval)
```

## 2. Continuous Integration

### Trigger
- Todo push e PR para qualquer branch

### Steps (`.github/workflows/ci.yml`)

| Step | Comando | Bloqueante |
|------|---------|:----------:|
| Install | `pnpm install --frozen-lockfile` | Sim |
| Lint | `pnpm lint` | Sim |
| Typecheck | `pnpm typecheck` | Sim |
| Unit tests | `pnpm test` | Sim |
| Contract tests | `pnpm test:contracts` | Sim |
| Integration tests | `pnpm test:integration` | Sim |
| Build | `pnpm build` | Sim |
| Context check | `.github/workflows/context-check.yml` | Não (advisory) |

### Regras
- Nenhum merge se CI falhar
- Testes usam apenas dados sintéticos (`evals/fixtures/`)
- Secrets de teste em environment variables do CI, nunca hardcoded
- Todo test deve ser idempotente e reproduzível

## 3. Deploy Staging

### Trigger
- Manual (`workflow_dispatch`)
- Automático após CI verde na `main`

### Pipeline (`.github/workflows/deploy-staging.yml`)

1. Checkout + Install
2. `pnpm test:ci` (validação de release candidate)
3. Deploy Workers: workflows → api-gateway → ingestion → kb → reporting
4. Secrets via GitHub environment `staging`

### Validação Pós-Deploy
- `GET /api/v1/health` retorna `200`
- `trace_id` presente em respostas
- Enfileirar job sintético e confirmar processamento
- Confirmar logs sem dados sensíveis

## 4. Deploy Production

### Trigger
- Manual apenas (`workflow_dispatch`)
- Requer approval do environment `production` no GitHub

### Pipeline (`.github/workflows/deploy-production.yml`)

1. Checkout + Install
2. `pnpm test:ci`
3. Deploy Workers (mesma ordem de staging)
4. Secrets via GitHub environment `production`

### Pré-requisitos
- CI verde na `main`
- Staging validado e smoke tests verdes
- Go-live checklist executado (`docs/operations/production-go-live-checklist.md`)
- Migração de banco executada se necessário

## 5. Rollback Process

### Worker Rollback
```bash
# Opção 1: Redeploy commit anterior
git checkout <commit-sha>
pnpm install && pnpm cf:deploy:staging  # ou production

# Opção 2: Cloudflare dashboard
# Workers → Deployments → Rollback to previous version
```

### Regras de Rollback
- Migration irreversível bloqueia rollback simples → requer plano específico
- Rollback não pode apagar audit logs
- Rollback deve preservar tenant isolation
- Comunicação interna deve ser registrada
- Após rollback, executar smoke tests

### Database Rollback
- Neon: point-in-time restore para branch nova
- Drizzle: não tem `down` migrations por padrão → planejar rollback manual se necessário
- Backup antes de migration em production é obrigatório

## 6. Monitoring do Pipeline

| Métrica | Onde |
|---------|------|
| CI pass rate | GitHub Actions dashboard |
| Deploy frequency | GitHub Actions runs |
| Deploy lead time | Merge to main → staging deploy |
| Mean time to restore | Alerta → rollback deployed |
| Change failure rate | Deploys que geraram rollback |

## 7. Branch Strategy

| Branch | Propósito | Deploy? |
|--------|-----------|:-------:|
| `main` | Trunk, sempre deployable | Staging auto |
| `feature/*` | Desenvolvimento de funcionalidade | Não |
| `fix/*` | Bugfix | Não |
| `chore/*` | Manutenção, docs, cleanup | Não |
| `hotfix/*` | Fix urgente para production | Manual |

### Regras
- PRs abertos contra `main`
- Squash merge preferred
- Branch context em `tasks/branch-context/<branch-name>.md`
- Delete branch após merge

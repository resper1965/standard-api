# Deployment

## Pré-Requisitos

- Node.js compatível com o monorepo.
- `pnpm`.
- `wrangler`.
- Conta Cloudflare com permissões mínimas para Workers, Queues, R2, Vectorize, KV e Workflows.
- PostgreSQL local ou `DATABASE_URL` de ambiente.

## Desenvolvimento Local

```bash
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d
pnpm dev:api
```

Workers individuais:

```bash
pnpm dev:ingestion
pnpm dev:queues
pnpm dev:workflows
```

Local deve usar dados sintéticos e mocks/adapters quando Cloudflare real não estiver disponível.

## Secrets

Nunca grave secrets em `wrangler.toml`, `.env.example`, docs ou logs. Configure por ambiente:

```bash
wrangler secret put DATABASE_URL -c infra/cloudflare/wrangler.api-gateway.toml -e staging
wrangler secret put AI_GATEWAY_ACCOUNT_ID -c infra/cloudflare/wrangler.api-gateway.toml -e staging
```

Repita para cada Worker que realmente precise do secret.

## Deploy Staging

Staging usa `deploy-staging.yml` e recursos com sufixo `-staging`.

Checklist operacional: `docs/operations/staging-deployment-checklist.md`.

Comando manual equivalente:

```bash
wrangler deploy -c infra/cloudflare/wrangler.workflows.toml -e staging
wrangler deploy -c infra/cloudflare/wrangler.api-gateway.toml -e staging
wrangler deploy -c infra/cloudflare/wrangler.ingestion-worker.toml -e staging
wrangler deploy -c infra/cloudflare/wrangler.kb-worker.toml -e staging
wrangler deploy -c infra/cloudflare/wrangler.reporting-worker.toml -e staging
```

## Deploy Production

Production usa `deploy-production.yml`, trigger manual e environment protection `production`.

Antes do primeiro deploy, provisione os recursos Cloudflare:

```bash
# 1. Provisionar Queues, R2 Buckets, KV Namespaces e injetar IDs no wrangler.api-gateway.toml
node scripts/provision-cloudflare.mjs production

# 2. Criar o índice Vectorize (somente na primeira execução)
npx wrangler vectorize create aegis-kb-prod --dimensions=1536 --metric=cosine

# 3. Criar a Dead Letter Queue (somente na primeira execução)
npx wrangler queues create aegis-dead-letter-prod

# 4. Injetar secrets nos Workers
node scripts/put-secrets.mjs

# 5. Executar migração do banco (Neon)
cd packages/schemas && npx tsx migrate.ts

# 6. Deploy completo
pnpm cf:deploy:production
```

Checklist de prontidão: `docs/operations/production-readiness-checklist.md`.


## Rollback Básico

- Reimplantar o último commit/tag conhecido como estável.
- Usar histórico de deployments do Cloudflare Workers para rollback quando aplicável.
- Não reutilizar filas ou buckets de outro ambiente como atalho.

## Smoke Tests Pós-Deploy

- `GET /api/v1/health` ou endpoint equivalente.
- Verificar se `trace_id` aparece em respostas/erros seguros.
- Enfileirar job sintético em staging.
- Confirmar que consumers processam mensagens sem DLQ.
- Confirmar que logs não contêm documento/chunk/prompt sensível.

## GitHub Actions

- `ci.yml`: lint, typecheck, tests e build.
- `deploy-staging.yml`: deploy manual ou após main com secrets de staging.
- `deploy-production.yml`: deploy manual com aprovação do ambiente production.

## Troubleshooting

- Erro de binding: confirme `infra/cloudflare/bindings.md` e recursos criados.
- Erro de secret: rode `wrangler secret put` no Worker e ambiente corretos.
- Queue acumulando backlog: verifique consumer, DLQ e retries.
- R2 403: revisar permissões do token e nome do bucket por ambiente.
- Vectorize indisponível: voltar para adapters/mock locais apenas em local/dev, nunca mascarar falha de production.

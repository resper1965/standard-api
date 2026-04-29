# Cloudflare Environments

## Local

- Usa `pnpm dev:*`, `wrangler dev` e `docker compose -f infra/docker/docker-compose.yml up -d`.
- Usa PostgreSQL local e adapters/mock quando R2, Vectorize ou AI Gateway reais não estiverem configurados.
- Nunca deve apontar para buckets, filas ou Vectorize de production.

## Development

- Ambiente Cloudflare para dados sintéticos e validação de integração.
- Buckets, filas, KV e Vectorize usam sufixo `-dev`.
- Pode ser recriado sem impacto operacional.

## Staging

- Ambiente de validação pré-produção com dados sintéticos ou mascarados.
- Buckets, filas, KV e Vectorize usam sufixo `-staging`.
- Deploy via GitHub Actions `deploy-staging.yml`.

## Production

- Ambiente de operação real.
- Buckets, filas, KV e Vectorize usam sufixo `-prod`.
- Deploy apenas manual via GitHub Actions com environment protection `production`.
- Secrets são obrigatórios e não podem aparecer em logs.

## Regras

- `DATABASE_URL` de staging/production deve vir de Cloudflare secrets ou GitHub Secrets.
- `CLOUDFLARE_API_TOKEN` deve ter menor privilégio e escopo por ambiente.
- Dados reais de cliente não podem ser usados em development/staging.
- Logs devem conter IDs seguros (`trace_id`, `tenant_id`, `assessment_id`) e nunca documento/chunk completo.

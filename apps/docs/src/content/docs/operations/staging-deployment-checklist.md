---
title: "Staging Deployment Checklist"
---

# Staging Deployment Checklist

## Pré-Requisitos

- Branch de release com `pnpm test:ci` verde.
- GitHub Environment `staging` configurado.
- GitHub Secrets de staging configurados sem valores production.
- Conta Cloudflare com permissões mínimas para Workers, Workflows, Queues, R2, Vectorize e KV.
- PostgreSQL staging separado de local/dev/production.
- Dados exclusivamente sintéticos ou mascarados.
- Operadores cientes de que o MVP não deve receber dados reais de cliente.

## Secrets Necessários

Configurar via GitHub Secrets e/ou `wrangler secret put`:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `DATABASE_URL`
- `AI_GATEWAY_ACCOUNT_ID` quando AI Gateway real for usado
- provider keys de LLM apenas em testes manuais explicitamente aprovados
- credenciais R2/S3-compatible somente se ferramentas locais exigirem

Não versionar secrets em `.env.example`, docs, logs ou fixtures.

## Recursos Cloudflare Staging

- Workers:
  - `api-gateway`
  - `ingestion-worker`
  - `kb-worker`
  - `reporting-worker`
  - `lifecycle-workflow`
- Workflows:
  - `ASSESSMENT_WORKFLOW`
- KV opcional:
  - `STANDARD_CONFIG_KV`
  - `STANDARD_FEATURE_FLAGS_KV`
  - `STANDARD_CACHE_KV`

## Banco Staging

- PostgreSQL gerenciado ou ambiente separado.
- `DATABASE_URL` configurado como secret.
- Nenhum dump real de cliente.
- Migrations aplicadas apenas após revisão.
- Backup habilitado antes de dados persistentes relevantes.

## Buckets Staging

- `standard-documents-staging`
- `standard-reports-staging`
- `standard-exports-staging`

Regras:

- keys com prefixo lógico por `organization_id/organization_id/assessment_id`;
- sem documentos reais;
- lifecycle/retention revisado antes de produção.

## Vectorize Staging

- índice sugerido: `standard-kb-staging`.
- usar apenas embeddings de fixtures sintéticas ou dados mascarados.
- metadados devem carregar organization e assessment.
- Vectorize não pode ser usado como fonte normativa SCF.

## Queues Staging

- `standard-document-ingestion-staging`
- `standard-kb-embedding-staging`
- `standard-report-export-staging`
- `standard-dead-letter-staging`

Critérios:

- DLQ configurada;
- retries documentados;
- mensagens não incluem documento/chunk/prompt integral.

## Deploy Steps

1. Confirmar que `pnpm test:ci` passou.
2. Confirmar secrets de staging.
3. Confirmar recursos Cloudflare staging.
4. Executar GitHub Action `Deploy Staging` ou:

```bash
pnpm cf:deploy:staging
```

5. Conferir logs de deploy.
6. Executar smoke tests.
7. Registrar resultado no checklist de release.

## Smoke Tests

- Health endpoint responde.
- Erros seguros retornam `trace_id`.
- Requisição sem auth/organization é bloqueada.
- Organization mismatch é bloqueado.
- Upload sintético aceito/rejeitado conforme política.
- KB search retorna candidate evidence escopado.
- Workflow inicia com assessment sintético.
- Signal de approval exige approval event válido.
- Report/export sintético gera artifact metadata.
- Logs não contêm documento, chunk, prompt, token ou secret.
- DLQ sem mensagens inesperadas.

## Rollback

- Reimplantar último commit/tag estável.
- Usar rollback do Cloudflare Workers quando aplicável.
- Não reapontar staging para recursos production.
- Registrar motivo, trace, deployment anterior e deployment novo.

## Logs e Monitoramento

- Revisar logs estruturados por `trace_id`.
- Verificar security events de auth/organization/RBAC.
- Verificar metrics por endpoint e workflow step.
- Verificar usage/cost records quando agents/KB/reporting informarem uso.
- Monitorar DLQ e erros de binding.

## Critérios de Sucesso

- Deploy concluído sem erro.
- Smoke tests críticos verdes.
- Nenhum secret em logs.
- Nenhum cross-organization access.
- Approval gates não burláveis.
- Dados sintéticos processados ponta a ponta.
- Production permanece isolado e sem deploy automático.


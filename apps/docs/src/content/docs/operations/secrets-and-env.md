---
title: "Secrets and Environment"
---

# Secrets and Environment

## Variáveis

| Variável | Uso | Local | Cloudflare | GitHub Actions |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | Runtime Node | `.env` local | var não secreta | env |
| `STANDARD_ENV` | Ambiente lógico | `.env` local | `[vars]` | env |
| `LOG_LEVEL` | Verbosidade de logs | `.env` local | `[vars]` | env |
| `DATABASE_URL` | PostgreSQL transacional | `.env` local | secret | secret |
| `CLOUDFLARE_ACCOUNT_ID` | Deploy/API Cloudflare | placeholder | secret quando necessário | secret |
| `CLOUDFLARE_API_TOKEN` | Deploy Cloudflare | nunca obrigatório local | não hardcoded | secret |
| `AI_GATEWAY_ACCOUNT_ID` | AI Gateway | placeholder | secret/var segura | secret |
| `AI_GATEWAY_NAME` | Nome do gateway | `.env.example` | `[vars]` | env |
| `AI_GATEWAY_BASE_URL` | Base URL gateway | placeholder | `[vars]` | env |
| `OPENAI_API_KEY` | Provider futuro | placeholder vazio | secret | secret |
| `R2_ACCESS_KEY_ID` | S3-compatible local/ferramentas | placeholder | secret se usado | secret |
| `R2_SECRET_ACCESS_KEY` | S3-compatible local/ferramentas | placeholder | secret se usado | secret |
| `R2_ENDPOINT` | Endpoint R2/S3-compatible | placeholder | var/secret | secret/env |
| `VECTORIZE_INDEX_NAME` | Índice local/dev | placeholder | binding via wrangler | env |

## Configuração Local

Copie `.env.example` para `.env` apenas na máquina local. `.env` não deve ser commitado.

## Configuração Cloudflare

Use `wrangler secret put` para segredos:

```bash
wrangler secret put DATABASE_URL -c infra/cloudflare/wrangler.api-gateway.toml -e staging
wrangler secret put AI_GATEWAY_ACCOUNT_ID -c infra/cloudflare/wrangler.api-gateway.toml -e staging
```

Variáveis não secretas ficam em `[vars]` nos arquivos Wrangler.

## Configuração GitHub Actions

Secrets mínimos:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `DATABASE_URL_STAGING`
- `DATABASE_URL_PRODUCTION`

Use environments `staging` e `production`; production deve exigir aprovação manual.

## Nunca Commitar

- `.env`
- tokens Cloudflare;
- account IDs se a política do projeto os tratar como sensíveis;
- chaves R2;
- provider API keys;
- dumps de banco;
- documentos reais;
- outputs contendo prompt completo ou conteúdo de cliente.

## Rotação

- Rotacione tokens Cloudflare por ambiente.
- Revogue tokens usados em máquinas pessoais ao sair de um projeto.
- Reconfigure secrets em Cloudflare e GitHub Actions após rotação.
- Registre rotação sem expor valores.

## Separação por Ambiente

Cada ambiente deve ter recursos próprios. Dev/staging nunca usam bucket, fila, Vectorize ou PostgreSQL production.


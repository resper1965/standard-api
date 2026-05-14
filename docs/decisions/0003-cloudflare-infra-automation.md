# ADR-0003: Provisionamento Automatizado de Infraestrutura Cloudflare

**Data:** 2026-04-30
**Status:** Aceita
**Contexto:** Production Infrastructure Automation

---

## Contexto

O deploy de produção exige a existência prévia de recursos Cloudflare (Queues, R2 Buckets, KV Namespaces, Vectorize Index) com IDs específicos que devem ser referenciados nos arquivos `wrangler.*.toml`. O processo manual de criação e coleta de IDs é propenso a erros e não-reproduzível.

## Decisão

Adotar um script de provisionamento automatizado (`scripts/provision-cloudflare.mjs`) que:

1. Cria Queues via `wrangler queues create`.
2. Cria R2 Buckets via `wrangler r2 bucket create`.
3. Cria KV Namespaces via `wrangler kv namespace create`.
4. Lista os IDs gerados via `wrangler kv namespace list` (parsing de JSON).
5. Injeta automaticamente os IDs no arquivo `infra/cloudflare/wrangler.api-gateway.toml`, substituindo placeholders `replace-with-<env>-<recurso>-id`.

Recursos adicionais (Vectorize, Dead Letter Queues) exigem comandos separados documentados em `docs/operations/`.

## Justificativa

- **Reproduzibilidade**: qualquer colaborador com credenciais Cloudflare pode recriar a infra a partir do script.
- **Rastreabilidade**: os IDs reais ficam comitados no TOML, visíveis em PRs.
- **Rollback**: a estrutura de placeholders permite identificar facilmente recursos não provisionados.
- **Separação de responsabilidades**: o script não toca secrets — `DATABASE_URL` e tokens LLM são gerenciados via `wrangler secret put` separadamente.

## Recursos Provisionados em Produção

| Recurso | Comando | Sufixo |
|---|---|---|
| Queue | `wrangler queues create standard-<name>-prod` | `-prod` |
| R2 Bucket | `wrangler r2 bucket create standard-<name>-prod` | `-prod` |
| KV Namespace | `wrangler kv namespace create standard-<name>-kv-prod` | `-prod` |
| Vectorize Index | `wrangler vectorize create standard-kb-prod --dimensions=1536 --metric=cosine` | `-prod` |
| Dead Letter Queue | `wrangler queues create standard-dead-letter-prod` | `-prod` |

## Consequências

- O script deve ser executado **antes** de qualquer `pnpm cf:deploy:*`.
- Placeholders remanescentes em arquivos TOML indicam recurso não provisionado.
- IDs de KV são estáveis e podem ser comitados com segurança (não são secrets).
- O Vectorize index deve ser criado manualmente na primeira execução por não ter comando idempotente padronizado.
- Secrets (`DATABASE_URL`, AI tokens) são gerenciados via `scripts/put-secrets.mjs` e nunca comitados.

## Alternativas Consideradas

- **Terraform**: descartado no MVP por overhead de configuração e ausência de backend de state definido. Candidato para fase seguinte.
- **Pulumi**: descartado pelos mesmos motivos.
- **CI/CD Pipeline**: desejado na fase seguinte; dependente de secrets Cloudflare no repositório GitHub.


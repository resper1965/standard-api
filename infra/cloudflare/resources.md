# Cloudflare Resources

Recursos a criar manualmente ou por IaC futura. Os comandos abaixo usam nomes sugeridos e não incluem IDs, tokens ou credenciais reais.

## R2

| Recurso | Development | Staging | Production | Consumidores |
| --- | --- | --- | --- | --- |
| Documents bucket | `standard-documents-dev` | `standard-documents-staging` | `standard-documents-prod` | API, ingestion, KB |
| Reports bucket | `standard-reports-dev` | `standard-reports-staging` | `standard-reports-prod` | API, reporting |
| Exports bucket | `standard-exports-dev` | `standard-exports-staging` | `standard-exports-prod` | API, reporting |

Exemplo:

```bash
wrangler r2 bucket create standard-documents-dev
```

## Queues

| Recurso | Development | Staging | Production | Consumidores |
| --- | --- | --- | --- | --- |
| Document ingestion | `standard-document-ingestion-dev` | `standard-document-ingestion-staging` | `standard-document-ingestion-prod` | ingestion worker |
| KB embedding | `standard-kb-embedding-dev` | `standard-kb-embedding-staging` | `standard-kb-embedding-prod` | KB worker |
| Report export | `standard-report-export-dev` | `standard-report-export-staging` | `standard-report-export-prod` | reporting worker |
| Agent task | `standard-agent-task-dev` | `standard-agent-task-staging` | `standard-agent-task-prod` | futuro |
| Dead letter | `standard-dead-letter-dev` | `standard-dead-letter-staging` | `standard-dead-letter-prod` | consumers |

Exemplo:

```bash
wrangler queues create standard-document-ingestion-dev
```

## Vectorize

| Recurso | Nome | Observação |
| --- | --- | --- |
| Development KB index | `standard-kb-dev` | Dados sintéticos. |
| Staging KB index | `standard-kb-staging` | Dados sintéticos ou mascarados. |
| Production KB index | `standard-kb-prod` | Nunca usado por dev/staging. |

Dimensões e métrica dependem do embedding provider aprovado. Não fixe valores antes da decisão do provider.

## KV

| Binding | Development | Staging | Production |
| --- | --- | --- | --- |
| `STANDARD_CONFIG_KV` | `standard-config-dev` | `standard-config-staging` | `standard-config-prod` |
| `STANDARD_FEATURE_FLAGS_KV` | `standard-feature-flags-dev` | `standard-feature-flags-staging` | `standard-feature-flags-prod` |
| `STANDARD_CACHE_KV` | `standard-cache-dev` | `standard-cache-staging` | `standard-cache-prod` |

KV é opcional e não substitui PostgreSQL para dados críticos.

## AI Gateway

| Recurso | Development | Staging | Production |
| --- | --- | --- | --- |
| Gateway | `standard-dev` | `standard-staging` | `standard-prod` |

Configurar DLP, rate limits e logging conforme política de privacidade antes de uso com dados reais.

## Pages

Projeto sugerido: `standard-api-standard-web`.

Nesta etapa o frontend permanece placeholder; Pages é apenas planejamento de hosting.

## Acesso e SaaS

- Cloudflare Access / Zero Trust deve proteger consoles internos e endpoints administrativos antes de exposição pública.
- Cloudflare for SaaS / custom hostnames por tenant entra em roadmap.
- Workers for Platforms não deve ser usado até existir requisito de extensões executáveis por tenant.


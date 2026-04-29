# Cloudflare Resources

Recursos a criar manualmente ou por IaC futura. Os comandos abaixo usam nomes sugeridos e não incluem IDs, tokens ou credenciais reais.

## R2

| Recurso | Development | Staging | Production | Consumidores |
| --- | --- | --- | --- | --- |
| Documents bucket | `aegis-documents-dev` | `aegis-documents-staging` | `aegis-documents-prod` | API, ingestion, KB |
| Reports bucket | `aegis-reports-dev` | `aegis-reports-staging` | `aegis-reports-prod` | API, reporting |
| Exports bucket | `aegis-exports-dev` | `aegis-exports-staging` | `aegis-exports-prod` | API, reporting |

Exemplo:

```bash
wrangler r2 bucket create aegis-documents-dev
```

## Queues

| Recurso | Development | Staging | Production | Consumidores |
| --- | --- | --- | --- | --- |
| Document ingestion | `aegis-document-ingestion-dev` | `aegis-document-ingestion-staging` | `aegis-document-ingestion-prod` | ingestion worker |
| KB embedding | `aegis-kb-embedding-dev` | `aegis-kb-embedding-staging` | `aegis-kb-embedding-prod` | KB worker |
| Report export | `aegis-report-export-dev` | `aegis-report-export-staging` | `aegis-report-export-prod` | reporting worker |
| Agent task | `aegis-agent-task-dev` | `aegis-agent-task-staging` | `aegis-agent-task-prod` | futuro |
| Dead letter | `aegis-dead-letter-dev` | `aegis-dead-letter-staging` | `aegis-dead-letter-prod` | consumers |

Exemplo:

```bash
wrangler queues create aegis-document-ingestion-dev
```

## Vectorize

| Recurso | Nome | Observação |
| --- | --- | --- |
| Development KB index | `aegis-kb-dev` | Dados sintéticos. |
| Staging KB index | `aegis-kb-staging` | Dados sintéticos ou mascarados. |
| Production KB index | `aegis-kb-prod` | Nunca usado por dev/staging. |

Dimensões e métrica dependem do embedding provider aprovado. Não fixe valores antes da decisão do provider.

## KV

| Binding | Development | Staging | Production |
| --- | --- | --- | --- |
| `AEGIS_CONFIG_KV` | `aegis-config-dev` | `aegis-config-staging` | `aegis-config-prod` |
| `AEGIS_FEATURE_FLAGS_KV` | `aegis-feature-flags-dev` | `aegis-feature-flags-staging` | `aegis-feature-flags-prod` |
| `AEGIS_CACHE_KV` | `aegis-cache-dev` | `aegis-cache-staging` | `aegis-cache-prod` |

KV é opcional e não substitui PostgreSQL para dados críticos.

## AI Gateway

| Recurso | Development | Staging | Production |
| --- | --- | --- | --- |
| Gateway | `aegis-dev` | `aegis-staging` | `aegis-prod` |

Configurar DLP, rate limits e logging conforme política de privacidade antes de uso com dados reais.

## Pages

Projeto sugerido: `aegis-api-standard-web`.

Nesta etapa o frontend permanece placeholder; Pages é apenas planejamento de hosting.

## Acesso e SaaS

- Cloudflare Access / Zero Trust deve proteger consoles internos e endpoints administrativos antes de exposição pública.
- Cloudflare for SaaS / custom hostnames por tenant entra em roadmap.
- Workers for Platforms não deve ser usado até existir requisito de extensões executáveis por tenant.

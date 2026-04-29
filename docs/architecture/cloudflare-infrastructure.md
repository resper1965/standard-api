# Cloudflare Infrastructure

## Visão Geral

O `aegis-api-standard` é Cloudflare-oriented, mas o core continua API-first e testável localmente. Cloudflare hospeda a borda, filas, storage de artefatos, índice vetorial auxiliar e governança de chamadas AI. PostgreSQL externo/gerenciado permanece a fonte transacional crítica.

## Produtos Cloudflare

- Workers: API Gateway/BFF, endpoints leves, validação e integração com bindings.
- Workflows: orquestração durável do lifecycle com retries, checkpoints e approval gates.
- Queues: jobs assíncronos de ingestão, embeddings, reports, exports e tarefas futuras de agentes.
- R2: documentos, evidências, relatórios e exports versionados.
- Vectorize: Knowledge Base vetorial auxiliar; nunca fonte normativa SCF.
- AI Gateway: observabilidade, rate limiting, DLP/guardrails futuros e governança de chamadas LLM/embedding.
- Pages: hosting do frontend placeholder/futuro consumidor da API.
- KV: cache/config/feature flags leves, sem dados críticos.
- D1: não usado no MVP; não substitui PostgreSQL.
- Durable Objects: não usado no MVP; reservado para locks/sessões coordenadas quando houver requisito real.
- Access / Zero Trust: estratégia obrigatória para console/admin antes de exposição pública.

## Workers Previstos

- `api-gateway`: expõe `/api/v1`, valida requests, produz jobs em Queues e aciona Workflows.
- `ingestion-worker`: consome `DOCUMENT_INGESTION_QUEUE`, processa ingestão documental e grava artefatos em R2.
- `kb-worker`: consome `KB_EMBEDDING_QUEUE` e atualiza Vectorize por tenant/assessment.
- `reporting-worker`: consome `REPORT_EXPORT_QUEUE` e gera reports/exports assíncronos.
- `lifecycle-workflow`: executa `ASSESSMENT_WORKFLOW` para transições duráveis do lifecycle.

## Workflows

`ASSESSMENT_WORKFLOW` representa a orquestração durável do assessment lifecycle. Ele não substitui validações do `assessment-engine`; apenas coordena passos, retries e checkpoints.

## Queues

- `DOCUMENT_INGESTION_QUEUE`: ingestão e chunking.
- `KB_EMBEDDING_QUEUE`: embeddings e indexação vetorial.
- `REPORT_EXPORT_QUEUE`: geração de relatórios e exports.
- `AGENT_TASK_QUEUE`: placeholder futuro para agentes funcionais.
- `DEAD_LETTER_QUEUE`: mensagens que excedem retries.

## R2

Buckets por ambiente:

- `aegis-documents-*`
- `aegis-reports-*`
- `aegis-exports-*`

R2 keys devem preservar `tenant_id`, `organization_id` e `assessment_id` no prefixo lógico. Buckets production nunca são usados por dev/staging.

## Vectorize

Índices:

- `aegis-kb-dev`
- `aegis-kb-staging`
- `aegis-kb-prod`

Namespaces/metadados devem separar tenant e assessment. Vectorize só recupera evidências; SCF estruturado continua fonte normativa.

## AI Gateway

Configuração por variáveis:

- `AI_GATEWAY_ACCOUNT_ID`
- `AI_GATEWAY_NAME`
- `AI_GATEWAY_BASE_URL`

Nenhum endpoint real ou segredo é hardcoded. Produção deve habilitar controles de custo, logs seguros, DLP/guardrails conforme política e metadados como `trace_id`.

## Ambientes

- local: PostgreSQL via Docker, mocks/adapters para Cloudflare quando necessário.
- development: Cloudflare dev com dados sintéticos.
- staging: validação com dados sintéticos/mascarados.
- production: deploy manual, secrets obrigatórios, proteção adicional.

## Segurança e Multi-Tenancy

- Nenhum fluxo crítico sem `tenant_id`, `organization_id`, `assessment_id` e `trace_id`.
- Logs não podem conter documentos, chunks completos, prompts sensíveis ou secrets.
- Deploy production exige aprovação manual.
- Endpoints admin devem ficar protegidos por Access/Zero Trust antes de exposição.
- Tokens Cloudflare e GitHub devem seguir menor privilégio.

## Limitações do MVP

- Terraform é placeholder.
- Storage R2 real ainda depende de adapters completos nas camadas de runtime.
- Vectorize real ainda não substitui mocks locais.
- Workers for Platforms, Cloudflare for SaaS e Access são planejamento, não provisionamento.
- D1 e Durable Objects não foram configurados por ausência de necessidade atual.

## Decisões em Aberto

- Provider e dimensão de embeddings para Vectorize.
- Estratégia de custom hostnames por tenant.
- Política formal de DLP/log retention no AI Gateway.
- Adoção de Terraform/Pulumi e backend de state.
- Separação física ou lógica de buckets por tenant enterprise.

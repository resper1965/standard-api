# Cloudflare Bindings

| Binding | Tipo | Ambientes | Usado por | Obrigatório | Observação |
| --- | --- | --- | --- | --- | --- |
| `STANDARD_DOCUMENTS_BUCKET` | R2 | dev/staging/prod | API, ingestion, KB worker | Sim | Documentos e evidências com keys escopadas por tenant/assessment. |
| `STANDARD_REPORTS_BUCKET` | R2 | dev/staging/prod | API, reporting worker | Sim | Relatórios e artefatos versionados. |
| `STANDARD_EXPORTS_BUCKET` | R2 | dev/staging/prod | API, reporting worker | Opcional | Pode ser unido ao bucket de reports no MVP. |
| `DOCUMENT_INGESTION_QUEUE` | Queue producer | dev/staging/prod | API | Sim | Publica jobs de ingestão documental. |
| `KB_EMBEDDING_QUEUE` | Queue producer/consumer | dev/staging/prod | API, KB worker | Sim | Publica e consome jobs de embeddings/indexação. |
| `REPORT_EXPORT_QUEUE` | Queue producer/consumer | dev/staging/prod | API, reporting worker | Sim | Publica e consome jobs de geração de reports/exports. |
| `AGENT_TASK_QUEUE` | Queue producer | dev/staging/prod | API | Futuro | Placeholder para runtime de agentes; não executa achados finais. |
| `DEAD_LETTER_QUEUE` | Queue | dev/staging/prod | queue consumers | Recomendado | Usada via `dead_letter_queue` nos consumers. |
| `STANDARD_KB_INDEX` | Vectorize | dev/staging/prod | ingestion, KB worker | Sim para KB real | Índice vetorial auxiliar; SCF continua fonte normativa. |
| `STANDARD_CONFIG_KV` | KV | dev/staging/prod | API | Opcional | Configuração leve não crítica. |
| `STANDARD_FEATURE_FLAGS_KV` | KV | dev/staging/prod | API | Opcional | Feature flags por ambiente. |
| `STANDARD_CACHE_KV` | KV | dev/staging/prod | API | Opcional | Cache edge de baixo risco. |
| `ASSESSMENT_WORKFLOW` | Workflows | dev/staging/prod | API, workflows Worker | Sim | Orquestração durável do lifecycle. |

## Não usados nesta etapa

- D1 não foi configurado porque PostgreSQL externo/gerenciado permanece a fonte transacional crítica.
- Durable Objects não foram configurados porque ainda não há lock/coordenação stateful implementada que justifique o custo operacional.
- Workers for Platforms e Cloudflare for SaaS ficam documentados como roadmap, sem provisionamento no MVP.


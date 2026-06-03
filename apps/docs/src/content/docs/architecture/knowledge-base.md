---
title: "Knowledge Base Service"
---

# Knowledge Base Service

## Objetivo

O Knowledge Base Service é a camada de recuperação de evidências documentais do Standard. Ele conecta chunks gerados pelo pipeline de ingestão a embeddings e referências vetoriais, permitindo busca semântica e híbrida por assessment.

A KB retorna evidências candidatas. Ela ajuda futuros agentes e serviços a encontrar material relevante, mas não decide conformidade, maturidade, escopo, SoA ou mapping oficial.

## KB, SCF Estruturado e RAG

- SCF estruturado: fonte normativa versionada para controles, frameworks, requirements, mappings e STRM.
- KB: evidências do cliente derivadas de documentos e operações do assessment.
- RAG: padrão de recuperação e composição de contexto; no Standard ele deve sempre declarar fonte, limitação e nível de confiança.

Vector search não é fonte normativa. Um resultado vetorial alto significa apenas que um chunk parece semanticamente relacionado à consulta.

## Por Que A KB Não É Fonte Normativa

Documentos de cliente podem estar incompletos, desatualizados, conflitantes ou conter instruções maliciosas. Por isso:

- ausência de resultado significa apenas `não evidenciado na KB consultada`;
- resultado recuperado é `candidate_evidence: true`;
- classificação posterior por Evidence Analyst, Gap Analyst ou Maturity Assessor é obrigatória antes de qualquer conclusão;
- mappings oficiais continuam vindo exclusivamente do SCF estruturado.

## Fluxo De Indexação

1. A ingestão documental cria `documents` e `document_chunks`.
2. `POST /api/v1/assessments/:assessmentId/kb/index` lista chunks do assessment no tenant.
3. Para cada chunk pendente, o serviço cria ou reutiliza `vector_reference`.
4. O serviço cria `kb_embedding_jobs` e enfileira `KbEmbeddingJobMessage`.
5. Jobs duplicados são evitados quando já existe job `queued`, `running` ou `retrying` para o chunk.
6. Reindexação força novo job, preservando documento e chunks originais.

## Fluxo De Embeddings

O contrato `EmbeddingProvider` expõe:

- `embedText(text, options)`
- `embedBatch(texts, options)`
- `getModelInfo()`

O MVP implementa `MockEmbeddingProvider` para testes locais. O placeholder `CloudflareAiEmbeddingProviderPlaceholder` documenta o ponto de extensão para Workers AI ou outro provider real. Nenhum modelo real ou secret foi hardcoded.

Estados de embedding:

- `pending`
- `queued`
- `embedding`
- `embedded`
- `failed`
- `skipped`
- `reprocess_required`

## Integração Com Cloudflare Vectorize

O contrato `VectorStore` expõe:

- `upsert(records)`
- `query(queryVector, filters, options)`
- `delete(ids, filters)`
- `getIndexInfo()`

O MVP usa `MockVectorStore` local. `CloudflareVectorizeStore` é compatível com a assinatura esperada de binding Vectorize e aplica filtros por metadata quando disponíveis, além de refiltrar no backend por segurança.

Metadata mínima enviada ao índice:

- `tenant_id`
- `organization_id`
- `assessment_id`
- `document_id`
- `chunk_id`
- `content_hash`
- `text_hash`
- `document_type`
- `page_number`
- `created_at`

Em produção, o `wrangler.toml` deve declarar o binding Vectorize, por exemplo:

```toml
[[vectorize]]
binding = "KNOWLEDGE_BASE_INDEX"
index_name = "standard-kb"
```

## Integração Com Document Ingestion

`packages/kb` recebe `DocumentIngestionServiceDependencies` por injeção. Isso permite reutilizar os repositórios de documentos/chunks existentes no gateway local e substituir por adapters PostgreSQL em produção.

Após chunking, a etapa de KB deve ser acionada por API, workflow ou queue. O worker `workers/queues/src/kb-embedding.consumer.ts` valida a mensagem e delega para `processKbEmbeddingJob`.

## Multi-Tenancy

Toda operação de KB exige `tenant_id`. Toda busca exige `assessment_id` e é limitada por:

- tenant;
- organization;
- assessment;
- filtros opcionais de documento e tipo documental.

Mesmo quando o Vectorize suporta filtro de metadata, o backend refiltra resultados por tenant e assessment antes de responder. Não há busca global cross-tenant.

## Segurança

- Logs de busca armazenam `query_hash`, nunca query integral.
- Resultados retornam snippets curtos, não chunks completos por padrão.
- Conteúdo dos documentos não é logado em eventos operacionais.
- O adapter real não deve carregar secrets no código; usar bindings/secret manager.
- Rate limiting por tenant fica como placeholder de API Gateway.
- Prompt injection deve ser tratado por classificação posterior; conteúdo recuperado nunca deve ser executado como instrução.

## Rastreabilidade

Resultados de busca incluem:

- `tenant_id`
- `organization_id`
- `assessment_id`
- `document_id`
- `chunk_id`
- `vector_reference_id`
- `score`
- `retrieval_method`
- metadata documental mínima
- `trace_id`

Jobs de embedding incluem:

- `tenant_id`
- `organization_id`
- `assessment_id`
- `document_id`
- `chunk_id`
- `trace_id`
- `embedding_model`
- `vector_index_name`

Eventos auditáveis previstos:

- `kb_index_requested`
- `kb_embedding_job_queued`
- `kb_embedding_started`
- `kb_embedding_completed`
- `kb_embedding_failed`
- `kb_search_executed`
- `kb_reindex_requested`
- `vector_reference_created`
- `vector_reference_updated`

## Uso Futuro Por Agentes

- Knowledge Steward: organiza e reprocessa KB.
- Evidence Analyst: classifica evidências recuperadas.
- SoA Architect: consulta evidências para apoiar escopo, sem aprovar SoA.
- Gap Analyst: usa evidências classificadas, não resultados vetoriais crus.
- Maturity Assessor: considera evidências aprovadas e rastreáveis.

## Limitações Do MVP

- Repositórios de KB são in-memory no gateway local.
- Vectorize real não é chamado nos testes.
- Workers AI/AI Gateway estão como extension points.
- Busca híbrida usa a mesma base semântica com filtros simples; BM25/ranking dedicado fica futuro.
- `vector_references` persistente no schema existente ainda precisa adapter PostgreSQL completo.
- Rate limiting e audit log persistente ainda são placeholders.

## Decisões Em Aberto

- Definir modelo final de namespaces/índices Vectorize por ambiente e tenant.
- Escolher provider real de embeddings e dimensão oficial.
- Definir política de reembedding por mudança de `text_hash` e versão de modelo.
- Implementar adapters PostgreSQL para jobs, search logs e vector references.
- Definir avaliação de qualidade de recuperação separada dos agentes LLM.


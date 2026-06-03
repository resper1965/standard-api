---
title: "Document Ingestion"
---

# Document Ingestion

## Objetivo

O pipeline de ingestão documental registra documentos de assessment, armazena o arquivo em storage compatível com Cloudflare R2, enfileira extração assíncrona, gera chunks rastreáveis e cria referências pendentes para vetorização futura no Cloudflare Vectorize.

## Fluxo de Upload

O MVP usa `POST /api/v1/assessments/:assessmentId/documents` com `multipart/form-data`. O campo `file` é obrigatório. Metadados opcionais: `classification`, `document_type`, `language`, `version_label` e `effective_date`.

O API Gateway valida `tenant_id` via contexto, exige `actor_id`, verifica o assessment do tenant e chama `packages/document-ingestion`.

## Fluxo de Armazenamento

O pacote calcula `content_hash`, normaliza filename e gera storage key segura:

```text
tenants/{tenant_id}/organizations/{organization_id}/assessments/{assessment_id}/documents/{document_id}/{safe_filename}
```

O adapter atual é mock/local para testes. O worker de ingestão inclui um adapter inicial para R2, mas a persistência transacional real ainda será conectada depois.

## Fluxo de Extração

Extractors usam a interface `DocumentTextExtractor`:

- `PlainTextExtractor`
- `MarkdownExtractor`
- `CsvExtractor`
- `JsonExtractor`
- `PlaceholderBinaryExtractor` para PDF/DOCX

PDF e DOCX são aceitos como tipos documentais, mas a extração real fica pendente por adapter externo/server-side para evitar dependências pesadas e incompatíveis com Workers.

## Fluxo de Chunking

O chunker determinístico normaliza whitespace, mantém `chunk_index`, calcula `text_hash`, estima tokens e preserva `page_number` quando existir. Estratégias previstas:

- `by_tokens_estimate`
- `by_paragraphs`
- `by_pages`

## Preparação para Vectorize

Após chunking, o consumer cria `vector_references` com:

- `vector_provider = cloudflare_vectorize`
- `vector_index_name`
- `vector_id = null`
- `embedding_model = null`
- `embedding_status = pending`

Embeddings reais não são gerados nesta etapa.

## Segurança

- Tamanho máximo validado.
- MIME type, extensão e assinatura básica são verificados.
- Filename é sanitizado contra path traversal.
- `content_hash` é calculado antes do registro.
- Logs/audits não armazenam conteúdo integral.
- Erros usam mensagem segura.
- Tipos não permitidos são rejeitados.
- Antivírus/sandbox/file scanning fica como ponto futuro.

## Multi-Tenancy

Todo documento, job, chunk e vector reference carrega `tenant_id`, `organization_id`, `assessment_id` e `trace_id`. A API não lista documentos fora do tenant resolvido.

## Rastreabilidade

Eventos auditáveis preparados:

- `document_uploaded`
- `document_rejected`
- `document_extraction_queued`
- `document_extraction_started`
- `document_extraction_completed`
- `document_chunking_completed`
- `document_ingestion_failed`
- `document_reprocess_requested`
- `document_archived`

## Integração com Assessment Engine

O upload incrementa o snapshot mock do assessment com `documentCount`. Isso prepara a transição `draft -> documents_uploaded`, mas a API não força transição automática. Após extração/chunking, o estado `documents_ingested` dependerá das validações do Assessment Engine e de projections reais.

## Filas e Workers

`QueueAdapter` abstrai Cloudflare Queues. O mock grava mensagens em memória. `workers/ingestion` possui um consumer inicial que valida `DocumentIngestionJobMessage` e chama `processDocumentIngestionJob`.

## Limitações do MVP

- Repositories são mocks em memória.
- Upload usa multipart no gateway, não signed URL.
- PDF/DOCX não possuem extração real.
- Não há antivírus/sandbox real.
- Worker não persiste chunks/jobs em PostgreSQL ainda.
- Vectorize real não é chamado.

## Decisões em Aberto

- Escolher entre multipart direto e signed upload URL para produção.
- Definir limite máximo oficial por tenant/plano.
- Conectar adapters PostgreSQL para documents, jobs, chunks e vector references.
- Adicionar file scanning real antes de extração.
- Implementar extractors PDF/DOCX em ambiente compatível.
- Definir política de retenção e purge físico no R2.

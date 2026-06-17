# Ingestão de Documentos e Base de Conhecimento (KB)

Este módulo documenta o motor de ingestão de arquivos massivos e a arquitetura de "Knowledge Base" e Recuperação Semântica (RAG).

## Ingestão de Documentos Massivos (PDFs, Docx, Scans)
**Capacidade:** Processar políticas corporativas, evidências de auditoria e scans de vulnerabilidade pesados, extraindo o texto de forma estruturada.
- **Implementação API-First:** A ingestão não ocorre no fluxo síncrono. Arquivos enviados pelo cliente são persistidos temporariamente (ex: via Cloudflare R2) e um evento é disparado para a fila de `document-ingestion`. 
- **Onde consumir:** 
  - As rotas de upload na raiz `/api/v1/documents` processam a requisição inicial.
  - A API devolve o `trace_id` em um status `202 Accepted` para o frontend acompanhar a indexação assíncrona.

## Recuperação Semântica (Knowledge Base e Vectorize)
**Capacidade:** Traduzir os arquivos brutos para "Chunks" (pedaços com sentido semântico) para que a IA possa argumentar se uma evidência atende ou não a um controle do SCF.
- **Implementação API-First:** A API expõe uma infraestrutura nativa de RAG (Retrieval-Augmented Generation). Ela converte trechos de texto em vetores matemáticos (`embeddings`) e os armazena no banco vetorial com rigoroso isolamento `organization_id`.
- **Regra para Agentes IA (Contexto):** *CRITICAL RULE: O banco vetorial (Knowledge Base) representa apenas a evidência do cliente, não a Autoridade Normativa. Vetores apoiam a recuperação, mas a decisão final de compliance sempre obedece às amarras estáticas do modelo SCF.*

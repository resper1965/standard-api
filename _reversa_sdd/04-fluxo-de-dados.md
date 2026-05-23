# Reversa — Fase 4: Fluxo de Dados

> Gerado em 2026-05-23 por Antigravity
> Projeto: standard-api-standard v0.1.0

---

## 1. Pipeline de Ingestão de Documentos (RAG)

O fluxo de ingestão transforma documentos brutos (comprovantes de conformidade) em conhecimento semântico para os agentes IA.

```mermaid
sequenceDiagram
    participant User as Usuário
    participant GW as API Gateway
    participant R2 as Cloudflare R2
    participant Q as Document Queue
    participant IW as Ingestion Worker
    participant DB as Neon PostgreSQL
    participant V as Vectorize (KB)

    User->>GW: POST /api/documents/upload
    GW->>GW: Malware Scan (Sync)
    GW->>R2: Store Raw Object
    GW->>Q: Enqueue {document_id, r2_key}
    GW-->>User: 202 Accepted
    
    Q->>IW: Trigger Task
    IW->>R2: Get Raw Object
    IW->>IW: Extract Text (OCR/Tesseract/Azure)
    IW->>IW: Semantic Chunking
    IW->>DB: Store Document Metadata + Chunks
    IW->>Q: Enqueue {chunk_ids} for Embedding
    
    Q->>IW: (Next Job) Generate Embeddings
    IW->>V: Upsert Vectors
```

---

## 2. Ciclo de Vida do Assessment (Workflow)

A transição entre estados do assessment é garantida por Cloudflare Workflows para garantir durabilidade em processos que podem durar semanas.

| Fase | Gatilho | Ação | Output Esperado |
|---|---|---|---|
| Ingestão | Upload Finalizado | `processDocumentIngestionJob` | KB Populada |
| Escopo | Seleção de Framework | `generateDraftSoA` | SoA Draft |
| SoA Approval | Ação Humana | `approveSoA` | SoA Base-line |
| Análise | SoA Aprovado | `dispatchCouncilAnalysis` | Findings + Gaps |
| POA&M | Gap Approved | `generatePoamDraft` | POA&M Plan |

---

## 3. Orquestração de Agentes (Council)

O "Council" coordena agentes especializados para análise profunda e validação normativa.

```mermaid
graph TD
    Input[Input Context] --> Council{Council Orchestrator}
    
    subgraph "Specialized Agents"
        EE[Evidence Evaluator]
        PA[POAM Architect]
        BT[Board Translator]
        IT[Incident Triager]
    end
    
    Council --> EE
    EE --> PA
    PA --> BT
    
    BT --> Output[Executive Summary + Validated Findings]
    
    subgraph "Validation"
        Schema[Schema Validator]
        Guard[Guardrails]
    end
    
    Output --> Schema
    Schema --> Guard
    Guard --> DB[(PostgreSQL)]
```

### Regras de Ouro da Orquestração:
1. **Schema Validation:** Nenhum output de agente é gravado sem validar contra o Zod schema em `@standard/schemas`.
2. **Traceability:** Todo run de agente gera um `agent_run_id` e é vinculado a um `trace_id`.
3. **Normative Source:** Agentes consultam o `@standard/scf-core` via repositórios específicos; nunca alucinam mapeamentos.

---

## 4. Próximos Passos (Reversa)
- Fase 5: Mapeamento de Dependências de Runtime (CORS, ENV, Secrets).
- Fase 6: Diagnóstico de Saúde e Dívida Técnica.

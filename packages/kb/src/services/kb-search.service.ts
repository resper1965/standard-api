import type { DocumentChunk } from "@standard/document-ingestion";
import type { DocumentResponse } from "@standard/schemas";
import { CANDIDATE_EVIDENCE_WARNING, DEFAULT_SNIPPET_LENGTH, MAX_TOP_K } from "../constants";
import { sha256Hex } from "../hash";
import type { KbRequestContext, KbSearchRequest, KbSearchResponse, KbSearchResult, KbServiceDependencies, VectorSearchResult } from "../types";

const snippet = (text: string, maxLength = DEFAULT_SNIPPET_LENGTH): string => {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 3)}...`;
};

export class KbSearchService {
  constructor(private readonly deps: KbServiceDependencies) {}

  async semanticSearch(context: KbRequestContext, request: KbSearchRequest): Promise<KbSearchResponse> {
    return this.search(context, { ...request, search_type: "semantic" });
  }

  async hybridSearch(context: KbRequestContext, request: KbSearchRequest): Promise<KbSearchResponse> {
    return this.search(context, { ...request, search_type: "hybrid" });
  }

  async search(context: KbRequestContext, request: KbSearchRequest): Promise<KbSearchResponse> {
    const topK = Math.min(request.top_k, MAX_TOP_K);
    const embedding = await this.deps.embeddingProvider.embedText(request.query);
    const vectorResults = await this.deps.vectorStore.query(
      embedding.vector,
      {
        organization_id: context.organizationId,
        assessment_id: context.assessmentId,
        ...(request.filters.document_id ? { document_id: request.filters.document_id } : {}),
        ...(request.filters.document_type ? { document_type: request.filters.document_type } : {})
      },
      { topK }
    );

    const results = await this.hydrateResults(vectorResults, context, request.search_type);
    let filtered = results.filter((result) => this.matchesRequestFilters(result, request));

    if (this.deps.rerankerProvider && filtered.length > 0) {
      const documentsText = filtered.map(r => r.snippet);
      try {
        const reranked = await this.deps.rerankerProvider.rerank(request.query, documentsText);
        // O reranked devolve [{index, score}], onde index é a posição no array 'documentsText' original
        // Vamos reconstruir o array 'filtered' ordenado por score do rerank e atualizar as notas (scores)
        filtered = reranked
          .map(r => {
            const originalResult = filtered[r.index];
            if (originalResult) {
              originalResult.score = Number(r.score.toFixed(6));
              // Adicionamos flag para a UI saber que foi reranked
              (originalResult as any).reranked = true; 
            }
            return originalResult;
          })
          .filter(Boolean) as KbSearchResult[];
        
        // Cortar o excesso caso o rerank tenha reordenado, vamos devolver apenas o topK real para o LLM
        filtered = filtered.slice(0, topK);
      } catch (error) {
        console.error("[KbSearchService] Erro no reranking, caindo para busca vetorial padrão", error);
        filtered = filtered.slice(0, topK);
      }
    } else {
      // Se não houver rerank, apenas garantimos o corte de topK (caso o hydrate tenha trazido muitos e o banco tenha devolvido > topK)
      filtered = filtered.slice(0, topK);
    }

    await this.deps.repositories.searchLogs.record({
      id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      ...(context.actorId ? { actor_id: context.actorId } : {}),
      query_hash: await sha256Hex(request.query),
      search_type: request.search_type,
      filters: request.filters,
      result_count: filtered.length,
      trace_id: context.traceId,
      created_at: new Date().toISOString()
    });

    return {
      assessment_id: context.assessmentId,
      search_type: request.search_type,
      candidate_evidence: true,
      warning: CANDIDATE_EVIDENCE_WARNING,
      data: filtered,
      trace_id: context.traceId
    };
  }

  async getChunkContext(chunkId: string, context: KbRequestContext): Promise<{
    chunk: DocumentChunk;
    previous?: DocumentChunk;
    next?: DocumentChunk;
    document: DocumentResponse;
  } | null> {
    const documents = await this.deps.documentIngestion.repositories.documents.listDocuments(context.assessmentId, context.organizationId);
    for (const document of documents) {
      const chunks = await this.deps.documentIngestion.repositories.chunks.listChunks(document.document_id, context.organizationId, 1000);
      const index = chunks.findIndex((chunk) => chunk.chunk_id === chunkId && chunk.assessment_id === context.assessmentId);
      if (index >= 0) {
        return {
          chunk: chunks[index]!,
          ...(chunks[index - 1] ? { previous: chunks[index - 1] } : {}),
          ...(chunks[index + 1] ? { next: chunks[index + 1] } : {}),
          document
        };
      }
    }
    return null;
  }

  private async hydrateResults(results: VectorSearchResult[], context: KbRequestContext, searchType: KbSearchRequest["search_type"]): Promise<KbSearchResult[]> {
    const hydrated: KbSearchResult[] = [];
    for (const result of results) {
      if (result.metadata.organization_id !== context.organizationId || result.metadata.assessment_id !== context.assessmentId) continue;
      const document = await this.deps.documentIngestion.repositories.documents.getDocument(result.metadata.document_id, context.organizationId);
      if (!document || document.assessment_id !== context.assessmentId || document.status === "archived") continue;
      const chunks = await this.deps.documentIngestion.repositories.chunks.listChunks(document.document_id, context.organizationId, 1000);
      const chunk = chunks.find((candidate) => candidate.chunk_id === result.metadata.chunk_id);
      if (!chunk) continue;
      const reference = await this.deps.repositories.vectorReferences.findByChunk(chunk.chunk_id, context.organizationId);

      hydrated.push({
        organization_id: chunk.organization_id,
        assessment_id: chunk.assessment_id,
        document_id: chunk.document_id,
        chunk_id: chunk.chunk_id,
        ...(reference ? { vector_reference_id: reference.vector_reference_id } : {}),
        score: Number(result.score.toFixed(6)),
        snippet: snippet(chunk.chunk_text),
        ...(chunk.page_number ? { page_number: chunk.page_number } : {}),
        document_type: document.document_type,
        document_title: document.original_filename,
        retrieval_method: searchType === "hybrid" ? "hybrid" : "vector",
        candidate_evidence: true,
        trace_id: context.traceId
      });
    }
    return hydrated;
  }

  private matchesRequestFilters(result: KbSearchResult, request: KbSearchRequest): boolean {
    if (request.filters.document_id && result.document_id !== request.filters.document_id) return false;
    if (request.filters.document_type && result.document_type !== request.filters.document_type) return false;
    return true;
  }
}



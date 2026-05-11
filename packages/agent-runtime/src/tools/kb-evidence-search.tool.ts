/**
 * @module kb-evidence-search
 * @description KB evidence semantic search tool for agent runtime.
 * Queries the knowledge base via injected repository. Returns candidate
 * evidence — never makes compliance decisions.
 */

export type KbEvidenceResult = {
  chunk_id: string;
  document_id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
};

export type KbEvidenceSearchDependencies = {
  semanticSearch: (
    query: string,
    tenantId: string,
    assessmentId: string,
    topK?: number
  ) => Promise<KbEvidenceResult[]>;
};

export type KbEvidenceSearchArgs = {
  tenant_id: string;
  organization_id: string;
  assessment_id: string;
  trace_id: string;
  query: string;
  top_k?: number;
};

export type KbEvidenceSearchOutput = {
  evidence: KbEvidenceResult[];
  query: string;
  count: number;
  disclaimer: string;
};

export function createKbEvidenceSearchTool(kb: KbEvidenceSearchDependencies) {
  return {
    execute: async (args: KbEvidenceSearchArgs): Promise<KbEvidenceSearchOutput> => {
      const topK = args.top_k ?? 5;
      const evidence = await kb.semanticSearch(
        args.query,
        args.tenant_id,
        args.assessment_id,
        topK
      );
      return {
        evidence,
        query: args.query,
        count: evidence.length,
        disclaimer:
          "Evidence retrieved via semantic search. Absence of evidence does NOT imply absence of implementation.",
      };
    },
  };
}

// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module scf-control-lookup
 * @description Real SCF control lookup tool for agent runtime.
 * Queries the normative SCF data layer via injected repository.
 */

export type ScfControlResult = {
  id: string;
  domain: string;
  title: string;
  description?: string;
  mappings?: string[];
};

export type ScfControlLookupDependencies = {
  searchControls: (query: string, topK?: number) => Promise<ScfControlResult[]>;
};

export type ScfControlLookupArgs = {
  organization_id: string;
  assessment_id: string;
  trace_id: string;
  query?: string;
  top_k?: number;
};

export type ScfControlLookupOutput = {
  controls: ScfControlResult[];
  query: string;
  count: number;
};

export function createScfControlLookupTool(scf: ScfControlLookupDependencies) {
  return {
    execute: async (args: ScfControlLookupArgs): Promise<ScfControlLookupOutput> => {
      const query = args.query ?? "";
      const topK = args.top_k ?? 10;
      const controls = await scf.searchControls(query, topK);
      return {
        controls,
        query,
        count: controls.length,
      };
    },
  };
}


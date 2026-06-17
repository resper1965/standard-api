/**
 * @module scf-mapping-lookup
 * @description Official STRM-based SCF mapping lookup tool for agent runtime.
 * Queries scf_mappings by control code or framework ID.
 * Never invents crosswalks â€” returns only structured SCF data.
 */

export type ScfMappingResult = {
  control_code: string;
  framework_id: string;
  framework_name: string;
  external_reference: string;
};

export type ScfMappingLookupDependencies = {
  lookupMappings: (
    query: { controlCode?: string | undefined; frameworkId?: string | undefined },
    topK?: number
  ) => Promise<ScfMappingResult[]>;
};

export type ScfMappingLookupArgs = {
  organization_id: string;
  assessment_id: string;
  trace_id: string;
  query?: string;
  top_k?: number;
};

export type ScfMappingLookupOutput = {
  mappings: ScfMappingResult[];
  query: string;
  count: number;
  disclaimer: string;
};

export function createScfMappingLookupTool(deps: ScfMappingLookupDependencies) {
  return {
    execute: async (args: ScfMappingLookupArgs): Promise<ScfMappingLookupOutput> => {
      const query = args.query ?? "";
      // Parse "framework_id:control_code" format, or treat as control_code
      const lookupQuery: { controlCode?: string | undefined; frameworkId?: string | undefined } = {};
      if (query.includes(":")) {
        const [fw, ctrl] = query.split(":");
        if (fw) lookupQuery.frameworkId = fw;
        if (ctrl) lookupQuery.controlCode = ctrl;
      } else if (query) {
        lookupQuery.controlCode = query;
      }
      const mappings = await deps.lookupMappings(lookupQuery, args.top_k ?? 20);
      return {
        mappings,
        query,
        count: mappings.length,
        disclaimer:
          "Only official STRM-based mappings are returned. No crosswalks are invented.",
      };
    },
  };
}


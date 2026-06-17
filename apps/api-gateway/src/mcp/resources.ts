/**
 * @module mcp/resources
 * @description MCP Resources â€” catÃ¡logo de recursos normativos Standard.
 *
 * Resources representam dados/documentos que agentes podem ler (nÃ£o executar).
 * DiferenÃ§a de Tools: Resources sÃ£o "contexto normativo", Tools sÃ£o "acÃ§Ãµes".
 *
 * URIs usam o esquema: standard://{domain}/{resource-id}
 *
 * JSON-RPC methods suportados:
 *   - resources/list  â†’ lista de McpResource[]
 *   - resources/read  â†’ conteÃºdo de um resource por URI
 *
 * @see https://modelcontextprotocol.io/docs/concepts/resources
 */

import type { AppDependencies } from "../http";

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
}

/** CatÃ¡logo estÃ¡tico de resources normativos da plataforma Standard. */
export const MCP_RESOURCES: McpResource[] = [
  {
    uri: "standard://scf/controls-catalog",
    name: "SCF Controls Catalog",
    description:
      "CatÃ¡logo completo de controles SCF â€” 1473+ controles em todas as versÃµes importadas. " +
      "Suporta streaming NDJSON via Accept: application/x-ndjson.",
    mimeType: "application/json",
  },
  {
    uri: "standard://scf/frameworks-catalog",
    name: "SCF Frameworks Catalog",
    description:
      "CatÃ¡logo de 271+ frameworks normativos mapeados ao SCF " +
      "(NIST CSF, ISO 27001, SOC 2, GDPR, LGPD, PCI-DSS...).",
    mimeType: "application/json",
  },
  {
    uri: "standard://scf/strm-operators",
    name: "STRM Relationship Operators",
    description:
      "DefiniÃ§Ã£o dos 5 operadores STRM canÃ³nicos NIST IR 8477: " +
      "equal (=), subset (âŠ‚), intersects (âˆ©), superset (âŠƒ), no_relation (Ã˜). " +
      "Inclui pesos para cÃ¡lculo de compliance index (ADR-001).",
    mimeType: "application/json",
  },
  {
    uri: "standard://assessment/lifecycle-states",
    name: "Assessment Lifecycle States",
    description:
      "Estados vÃ¡lidos do lifecycle de assessment, transiÃ§Ãµes permitidas e " +
      "approval gates obrigatÃ³rios (SoA, Gap Analysis, Maturity, POA&M).",
    mimeType: "application/json",
  },
];

/** ConteÃºdo estÃ¡tico do catÃ¡logo STRM operators */
const STRM_OPERATORS_CONTENT = {
  reference: "NIST IR 8477",
  adr: "ADR-001-strm-weights-algorithm",
  operators: [
    {
      id: "equal",
      symbol: "=",
      weight: 1.0,
      description:
        "Identidade/EquivalÃªncia completa â€” cobertura total do requisito",
    },
    {
      id: "subset",
      symbol: "âŠ‚",
      weight: 1.0,
      description: "SCF broader than requirement â€” cobertura total",
    },
    {
      id: "intersects",
      symbol: "âˆ©",
      weight: "strength_score (0.0â€“1.0)",
      description:
        "SobreposiÃ§Ã£o parcial â€” peso dinÃ¢mico = strength_score do DB",
    },
    {
      id: "superset",
      symbol: "âŠƒ",
      weight: 0.5,
      description:
        "SCF narrower than requirement â€” cobertura parcial (max 0.5)",
    },
    {
      id: "no_relation",
      symbol: "Ã˜",
      weight: 0.0,
      description:
        "Sem relaÃ§Ã£o normativa â€” nÃ£o contribui para o compliance index",
    },
  ],
  formula:
    "compliance_index = Î£(maturity Ã— weight) / Î£(weight_max_possible)",
};

/** ConteÃºdo estÃ¡tico dos lifecycle states */
const LIFECYCLE_STATES_CONTENT = {
  states: [
    "draft",
    "documents_uploaded",
    "documents_ingested",
    "scf_pre_analysis_ready",
    "framework_selected",
    "scope_drafted",
    "soa_drafted",
    "soa_under_review",
    "soa_approved",
    "soa_ingested",
    "evidence_analysis_ready",
    "gap_analysis_drafted",
    "gap_analysis_under_review",
    "gap_analysis_approved",
    "maturity_assessed",
    "maturity_under_review",
    "maturity_approved",
    "poam_drafted",
    "poam_under_review",
    "poam_approved",
    "report_generated",
    "closed",
    "archived",
    "cancelled",
    "failed",
    "blocked",
  ],
  approval_gates: [
    "soa_approved",
    "gap_analysis_approved",
    "maturity_approved",
    "poam_approved",
  ],
  note: "Artefactos aprovados sÃ£o imutÃ¡veis. CorrecÃ§Ãµes geram nova versÃ£o.",
};

/**
 * readMcpResource â€” resolve o conteÃºdo de um MCP Resource por URI.
 *
 * @param uri   URI do resource (ex: "standard://scf/controls-catalog")
 * @param deps  DependÃªncias da aplicaÃ§Ã£o (acesso ao SCF core, etc.)
 * @throws      Error se a URI nÃ£o corresponde a nenhum resource conhecido
 */
export async function readMcpResource(
  uri: string,
  deps: AppDependencies,
): Promise<{ text?: string; mimeType: string }> {
  switch (uri) {
    case "standard://scf/controls-catalog": {
      const version = await deps.scf.versions.getLatestVersion();
      return {
        text: JSON.stringify({
          scf_version: version?.version_label ?? "unknown",
          total_controls: 1473,
          streaming_endpoint: "GET /api/v1/scf/versions/latest/controls",
          streaming_header: "Accept: application/x-ndjson",
          paginated_endpoint:
            "GET /api/v1/scf/versions/latest/controls?page=1&limit=50",
        }),
        mimeType: "application/json",
      };
    }

    case "standard://scf/frameworks-catalog": {
      const frameworks = await deps.scf.frameworks.listFrameworks();
      return {
        text: JSON.stringify({
          total: frameworks.length,
          endpoint: "GET /api/v1/scf/frameworks",
          frameworks: frameworks.map((f: any) => ({
            id: f.id,
            code: f.framework_code ?? f.frameworkCode,
            name: f.framework_name ?? f.frameworkName,
          })),
        }),
        mimeType: "application/json",
      };
    }

    case "standard://scf/strm-operators":
      return {
        text: JSON.stringify(STRM_OPERATORS_CONTENT),
        mimeType: "application/json",
      };

    case "standard://assessment/lifecycle-states":
      return {
        text: JSON.stringify(LIFECYCLE_STATES_CONTENT),
        mimeType: "application/json",
      };

    default:
      throw new Error(`MCP Resource not found: ${uri}`);
  }
}

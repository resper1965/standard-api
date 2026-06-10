/**
 * @module mcp/resources
 * @description MCP Resources — catálogo de recursos normativos Standard.
 *
 * Resources representam dados/documentos que agentes podem ler (não executar).
 * Diferença de Tools: Resources são "contexto normativo", Tools são "acções".
 *
 * URIs usam o esquema: standard://{domain}/{resource-id}
 *
 * JSON-RPC methods suportados:
 *   - resources/list  → lista de McpResource[]
 *   - resources/read  → conteúdo de um resource por URI
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

/** Catálogo estático de resources normativos da plataforma Standard. */
export const MCP_RESOURCES: McpResource[] = [
  {
    uri: "standard://scf/controls-catalog",
    name: "SCF Controls Catalog",
    description:
      "Catálogo completo de controles SCF — 1473+ controles em todas as versões importadas. " +
      "Suporta streaming NDJSON via Accept: application/x-ndjson.",
    mimeType: "application/json",
  },
  {
    uri: "standard://scf/frameworks-catalog",
    name: "SCF Frameworks Catalog",
    description:
      "Catálogo de 271+ frameworks normativos mapeados ao SCF " +
      "(NIST CSF, ISO 27001, SOC 2, GDPR, LGPD, PCI-DSS...).",
    mimeType: "application/json",
  },
  {
    uri: "standard://scf/strm-operators",
    name: "STRM Relationship Operators",
    description:
      "Definição dos 5 operadores STRM canónicos NIST IR 8477: " +
      "equal (=), subset (⊂), intersects (∩), superset (⊃), no_relation (Ø). " +
      "Inclui pesos para cálculo de compliance index (ADR-001).",
    mimeType: "application/json",
  },
  {
    uri: "standard://assessment/lifecycle-states",
    name: "Assessment Lifecycle States",
    description:
      "Estados válidos do lifecycle de assessment, transições permitidas e " +
      "approval gates obrigatórios (SoA, Gap Analysis, Maturity, POA&M).",
    mimeType: "application/json",
  },
];

/** Conteúdo estático do catálogo STRM operators */
const STRM_OPERATORS_CONTENT = {
  reference: "NIST IR 8477",
  adr: "ADR-001-strm-weights-algorithm",
  operators: [
    {
      id: "equal",
      symbol: "=",
      weight: 1.0,
      description: "Identidade/Equivalência completa — cobertura total do requisito",
    },
    {
      id: "subset",
      symbol: "⊂",
      weight: 1.0,
      description: "SCF broader than requirement — cobertura total",
    },
    {
      id: "intersects",
      symbol: "∩",
      weight: "strength_score (0.0–1.0)",
      description: "Sobreposição parcial — peso dinâmico = strength_score do DB",
    },
    {
      id: "superset",
      symbol: "⊃",
      weight: 0.5,
      description: "SCF narrower than requirement — cobertura parcial (max 0.5)",
    },
    {
      id: "no_relation",
      symbol: "Ø",
      weight: 0.0,
      description: "Sem relação normativa — não contribui para o compliance index",
    },
  ],
  formula: "compliance_index = Σ(maturity × weight) / Σ(weight_max_possible)",
};

/** Conteúdo estático dos lifecycle states */
const LIFECYCLE_STATES_CONTENT = {
  states: [
    "draft", "documents_uploaded", "documents_ingested",
    "scf_pre_analysis_ready", "framework_selected",
    "scope_drafted", "soa_drafted", "soa_under_review", "soa_approved", "soa_ingested",
    "evidence_analysis_ready",
    "gap_analysis_drafted", "gap_analysis_under_review", "gap_analysis_approved",
    "maturity_assessed", "maturity_under_review", "maturity_approved",
    "poam_drafted", "poam_under_review", "poam_approved",
    "report_generated", "closed", "archived", "cancelled", "failed", "blocked",
  ],
  approval_gates: [
    "soa_approved",
    "gap_analysis_approved",
    "maturity_approved",
    "poam_approved",
  ],
  note: "Artefactos aprovados são imutáveis. Correcções geram nova versão.",
};

/**
 * readMcpResource — resolve o conteúdo de um MCP Resource por URI.
 *
 * @param uri   URI do resource (ex: "standard://scf/controls-catalog")
 * @param deps  Dependências da aplicação (acesso ao SCF core, etc.)
 * @throws      Error se a URI não corresponde a nenhum resource conhecido
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
          paginated_endpoint: "GET /api/v1/scf/versions/latest/controls?page=1&limit=50",
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

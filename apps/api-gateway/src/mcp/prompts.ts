/**
 * @module mcp/prompts
 * @description MCP Prompts — templates de sistema para agentes Standard.
 *
 * Prompts definem "como" os agentes devem ser inicializados para uma tarefa.
 * Diferença de Tools: Prompts são templates reutilizáveis (com argumentos),
 * não chamadas executáveis.
 *
 * JSON-RPC methods suportados:
 *   - prompts/list → lista de McpPrompt[]
 *   - prompts/get  → messages[] para um prompt com argumentos interpolados
 *
 * @see https://modelcontextprotocol.io/docs/concepts/prompts
 */

export interface McpPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
}

export interface McpPromptMessage {
  role: "user" | "assistant" | "system";
  content: { type: "text"; text: string };
}

export interface McpPromptResult {
  description?: string;
  messages: McpPromptMessage[];
}

/** Catálogo de prompts para os agentes funcionais Standard. */
export const MCP_PROMPTS: McpPrompt[] = [
  {
    name: "scf-control-analyst",
    description:
      "Inicializa o Standard SCF Control Analyst para analisar um controle SCF específico " +
      "no contexto de um assessment. O agente analisa requisitos, evidências e propõe " +
      "gaps — sem criar mappings oficiais ausentes.",
    arguments: [
      { name: "control_code",    description: "Código SCF do controle (ex: GOV-01, IAO-02)", required: true },
      { name: "assessment_id",   description: "UUID do assessment activo",                    required: true },
      { name: "organization_id", description: "UUID da organização (tenant isolation)",        required: false },
      { name: "framework_code",  description: "Framework de referência (ex: NIST_CSF_2)",     required: false },
    ],
  },
  {
    name: "gap-analyst",
    description:
      "Inicializa o Standard Gap Analyst para propor um Gap Analysis preliminar. " +
      "O agente propõe gaps com base em evidências e mappings SCF — não grava resultados " +
      "sem schema validation e aprovação humana (approval gate obrigatório).",
    arguments: [
      { name: "assessment_id",   description: "UUID do assessment",              required: true },
      { name: "framework_code",  description: "Framework de referência",         required: true },
      { name: "organization_id", description: "UUID da organização (tenant)",    required: false },
    ],
  },
  {
    name: "maturity-assessor",
    description:
      "Inicializa o Standard Maturity Assessor para sugerir níveis de maturidade " +
      "por controle SCF. Não finaliza maturidade sem approval gate.",
    arguments: [
      { name: "assessment_id",   description: "UUID do assessment",                 required: true },
      { name: "control_code",    description: "Código SCF (ou 'all' para todos)",   required: false },
      { name: "organization_id", description: "UUID da organização (tenant)",       required: false },
    ],
  },
];

/** Map de name → handler para interpolação de templates */
const PROMPT_HANDLERS: Record<
  string,
  (args: Record<string, string>) => McpPromptResult
> = {
  "scf-control-analyst": (args) => ({
    description: `SCF Control Analyst — ${args.control_code ?? "controle não especificado"}`,
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: [
            "Você é o Standard SCF Control Analyst.",
            "Regras invioláveis:",
            "1. Nunca crie mappings oficiais que não existam na base SCF estruturada.",
            "2. Diferencie explicitamente: mapping oficial, derivação técnica, inferência consultiva.",
            "3. Declare premissas, limitações, fontes e nível de confiança.",
            `4. Respeite sempre: assessment_id=${args.assessment_id}, organization_id=${args.organization_id ?? "unknown"}.`,
            `5. Framework de referência: ${args.framework_code ?? "a determinar"}.`,
          ].join("\n"),
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: `Analise o controle SCF **${args.control_code}** para o assessment ${args.assessment_id}. Siga as regras do agente.`,
        },
      },
    ],
  }),

  "gap-analyst": (args) => ({
    description: `Gap Analyst — ${args.framework_code} / assessment ${args.assessment_id}`,
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: [
            "Você é o Standard Gap Analyst.",
            "Regras invioláveis:",
            "1. Proponha gaps — não grave Gap Analysis final sem schema validation e aprovação humana.",
            "2. Ausência de evidência = 'não evidenciado', nunca = ausência de implementação.",
            "3. Toda evidência recuperada deve preservar: documento, chunk, origem, hash.",
            `4. Contexto: assessment_id=${args.assessment_id}, organization_id=${args.organization_id ?? "unknown"}.`,
            `5. Framework: ${args.framework_code}.`,
          ].join("\n"),
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: `Proponha o Gap Analysis preliminar para o assessment ${args.assessment_id} com framework ${args.framework_code}.`,
        },
      },
    ],
  }),

  "maturity-assessor": (args) => ({
    description: `Maturity Assessor — assessment ${args.assessment_id}`,
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: [
            "Você é o Standard Maturity Assessor.",
            "Regras invioláveis:",
            "1. Sugira maturidade — não finalize sem approval gate.",
            "2. Não converta ausência de evidência em falha.",
            "3. Declare confiança e limitações para cada score sugerido.",
            `4. Contexto: assessment_id=${args.assessment_id}, organization_id=${args.organization_id ?? "unknown"}.`,
          ].join("\n"),
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: `Avalie a maturidade ${args.control_code ? `do controle ${args.control_code}` : "de todos os controles"} no assessment ${args.assessment_id}.`,
        },
      },
    ],
  }),
};

/**
 * getMcpPrompt — resolve um prompt com argumentos e retorna as messages.
 *
 * @param name   Nome do prompt (ex: "scf-control-analyst")
 * @param args   Argumentos a interpolar (ex: { control_code: "GOV-01" })
 * @throws       Error se o prompt não existe
 */
export function getMcpPrompt(
  name: string,
  args: Record<string, string>,
): McpPromptResult {
  const handler = PROMPT_HANDLERS[name];
  if (!handler) {
    throw new Error(`MCP Prompt not found: ${name}`);
  }
  return handler(args);
}

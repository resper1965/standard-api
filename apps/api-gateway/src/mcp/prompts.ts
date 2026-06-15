// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module mcp/prompts
 * @description MCP Prompts â€” templates de sistema para agentes Standard.
 *
 * Prompts definem "como" os agentes devem ser inicializados para uma tarefa.
 * DiferenÃ§a de Tools: Prompts sÃ£o templates reutilizÃ¡veis (com argumentos),
 * nÃ£o chamadas executÃ¡veis.
 *
 * JSON-RPC methods suportados:
 *   - prompts/list â†’ lista de McpPrompt[]
 *   - prompts/get  â†’ messages[] para um prompt com argumentos interpolados
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

/** CatÃ¡logo de prompts para os agentes funcionais Standard. */
export const MCP_PROMPTS: McpPrompt[] = [
  {
    name: "scf-control-analyst",
    description:
      "Inicializa o Standard SCF Control Analyst para analisar um controle SCF especÃ­fico " +
      "no contexto de um assessment. O agente analisa requisitos, evidÃªncias e propÃµe " +
      "gaps â€” sem criar mappings oficiais ausentes.",
    arguments: [
      {
        name: "control_code",
        description: "CÃ³digo SCF do controle (ex: GOV-01, IAO-02)",
        required: true,
      },
      {
        name: "assessment_id",
        description: "UUID do assessment activo",
        required: true,
      },
      {
        name: "organization_id",
        description: "UUID da organizaÃ§Ã£o (tenant isolation)",
        required: false,
      },
      {
        name: "framework_code",
        description: "Framework de referÃªncia (ex: NIST_CSF_2)",
        required: false,
      },
    ],
  },
  {
    name: "gap-analyst",
    description:
      "Inicializa o Standard Gap Analyst para propor um Gap Analysis preliminar. " +
      "O agente propÃµe gaps com base em evidÃªncias e mappings SCF â€” nÃ£o grava resultados " +
      "sem schema validation e aprovaÃ§Ã£o humana (approval gate obrigatÃ³rio).",
    arguments: [
      {
        name: "assessment_id",
        description: "UUID do assessment",
        required: true,
      },
      {
        name: "framework_code",
        description: "Framework de referÃªncia",
        required: true,
      },
      {
        name: "organization_id",
        description: "UUID da organizaÃ§Ã£o (tenant)",
        required: false,
      },
    ],
  },
  {
    name: "maturity-assessor",
    description:
      "Inicializa o Standard Maturity Assessor para sugerir nÃ­veis de maturidade " +
      "por controle SCF. NÃ£o finaliza maturidade sem approval gate.",
    arguments: [
      {
        name: "assessment_id",
        description: "UUID do assessment",
        required: true,
      },
      {
        name: "control_code",
        description: "CÃ³digo SCF (ou 'all' para todos)",
        required: false,
      },
      {
        name: "organization_id",
        description: "UUID da organizaÃ§Ã£o (tenant)",
        required: false,
      },
    ],
  },
];

/** Map de name â†’ handler para interpolaÃ§Ã£o de templates */
const PROMPT_HANDLERS: Record<
  string,
  (args: Record<string, string>) => McpPromptResult
> = {
  "scf-control-analyst": (args) => ({
    description: `SCF Control Analyst â€” ${args.control_code ?? "controle nÃ£o especificado"}`,
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: [
            "VocÃª Ã© o Standard SCF Control Analyst.",
            "Regras inviolÃ¡veis:",
            "1. Nunca crie mappings oficiais que nÃ£o existam na base SCF estruturada.",
            "2. Diferencie explicitamente: mapping oficial, derivaÃ§Ã£o tÃ©cnica, inferÃªncia consultiva.",
            "3. Declare premissas, limitaÃ§Ãµes, fontes e nÃ­vel de confianÃ§a.",
            `4. Respeite sempre: assessment_id=${args.assessment_id}, organization_id=${args.organization_id ?? "unknown"}.`,
            `5. Framework de referÃªncia: ${args.framework_code ?? "a determinar"}.`,
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
    description: `Gap Analyst â€” ${args.framework_code} / assessment ${args.assessment_id}`,
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: [
            "VocÃª Ã© o Standard Gap Analyst.",
            "Regras inviolÃ¡veis:",
            "1. Proponha gaps â€” nÃ£o grave Gap Analysis final sem schema validation e aprovaÃ§Ã£o humana.",
            "2. AusÃªncia de evidÃªncia = 'nÃ£o evidenciado', nunca = ausÃªncia de implementaÃ§Ã£o.",
            "3. Toda evidÃªncia recuperada deve preservar: documento, chunk, origem, hash.",
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
    description: `Maturity Assessor â€” assessment ${args.assessment_id}`,
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: [
            "VocÃª Ã© o Standard Maturity Assessor.",
            "Regras inviolÃ¡veis:",
            "1. Sugira maturidade â€” nÃ£o finalize sem approval gate.",
            "2. NÃ£o converta ausÃªncia de evidÃªncia em falha.",
            "3. Declare confianÃ§a e limitaÃ§Ãµes para cada score sugerido.",
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
 * getMcpPrompt â€” resolve um prompt com argumentos e retorna as messages.
 *
 * @param name   Nome do prompt (ex: "scf-control-analyst")
 * @param args   Argumentos a interpolar (ex: { control_code: "GOV-01" })
 * @throws       Error se o prompt nÃ£o existe
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

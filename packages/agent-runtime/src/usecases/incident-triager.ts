import type { LlmProvider } from "../llm";
import { generateStructuredOutput } from "../structured-output";

export const AGENT_VERSION_INCIDENT = "1.0.0";

export type IncidentTriagerInput = {
  rawLogsExcerpt: string;
  systemModuleName: string;
  organizationId: string;
};

export type IncidentTriagerOutput = {
  is_false_positive: boolean;
  severity_level: "low" | "medium" | "high" | "critical";
  attack_vector_guessed: string;
  affected_assets_identified: string[];
  immediate_containment_actions: string[];
  requires_dpo_breach_notification: boolean;
};

const incidentTriagerSchema = {
  type: "object",
  properties: {
    is_false_positive: { type: "boolean" },
    severity_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
    attack_vector_guessed: { type: "string" },
    affected_assets_identified: { type: "array", items: { type: "string" } },
    immediate_containment_actions: { type: "array", items: { type: "string" } },
    requires_dpo_breach_notification: { type: "boolean" }
  },
  required: [
    "is_false_positive",
    "severity_level",
    "attack_vector_guessed",
    "affected_assets_identified",
    "immediate_containment_actions",
    "requires_dpo_breach_notification"
  ],
  additionalProperties: false
};

export class IncidentTriagerUseCase {
  constructor(private provider: LlmProvider, private defaultModel: string = "dynamic/assessment-general") {}

  async triage(input: IncidentTriagerInput): Promise<IncidentTriagerOutput> {
    const systemPrompt = `You are an L3 SOC analyst specializing in cyber incident triage.
Classify raw SIEM/WAF/EDR logs as real attacks or false positives.
Return: severity level, suspected attack vector, affected assets, immediate containment actions, and whether DPO breach notification is required for PII exposure.`;

    const _truncatedLogs = truncateLogPayload(input.rawLogsExcerpt);
    const userPrompt = `Alert Analysis - Module: "${input.systemModuleName}"

Logs/Payload:
---
${_truncatedLogs}
---`;

    return await generateStructuredOutput<IncidentTriagerOutput>({
      provider: this.provider,
      model: this.defaultModel,
      systemPrompt,
      userPrompt,
      schemaName: "soc_incident_triage",
      schema: incidentTriagerSchema,
      maxTokens: 800
    });
  }
}

export const truncateLogPayload = (logText: string, maxTokensChar = 10000): string => {
  if (logText.length <= maxTokensChar) return logText;
  
  const half = Math.floor(maxTokensChar / 2);
  const head = logText.slice(0, half);
  const tail = logText.slice(-half);
  
  return `${head}\n\n[... LOG TRUNCADO PELA PROTEÇÃO DE TOKENS (GRC) ...]\n\n${tail}`;
};

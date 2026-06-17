import type { AgentOutput, AgentRuntimeContext } from "@standard/schemas";
import { AgentRuntimeError } from "./errors";

export class AgentGuardrailService {
  validateContext(context: AgentRuntimeContext): void {
    if (!context.organization_id || !context.organization_id || !context.assessment_id || !context.trace_id) {
      throw new AgentRuntimeError("TENANT_CONTEXT_REQUIRED", "Agent runtime requires tenant, organization, assessment and trace context.");
    }
  }

  validateToolInputContext(input: Record<string, unknown>, context: AgentRuntimeContext): void {
    const expected = {
      organization_id: context.organization_id,
      assessment_id: context.assessment_id
    };

    for (const [key, value] of Object.entries(expected)) {
      if (input[key] !== value) {
        throw new AgentRuntimeError("TENANT_CONTEXT_MISMATCH", "Tool input must match the agent runtime context.", { key });
      }
    }
  }

  validateOutput(output: AgentOutput): void {
    if (output.writes_final_finding) {
      throw new AgentRuntimeError("GUARDRAIL_VIOLATION", "Agents cannot write final findings directly.");
    }
    if (output.creates_official_mapping) {
      throw new AgentRuntimeError("GUARDRAIL_VIOLATION", "Agents cannot create official SCF mappings.");
    }
  }
}



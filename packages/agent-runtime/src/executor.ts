/**
 * @module executor
 * @description Core execution loop for functional agents.
 */
import { AgentRuntimeError } from "./errors";
import type { AgentRuntimeDependencies, StartAgentRunInput, CompleteAgentRunInput } from "./types";
import { AGENT_TOOL_CONTRACTS, FUNCTIONAL_AGENT_CONTRACTS } from "./contracts";
import type { LlmMessage, LlmTool } from "./llm";

export class AgentExecutor {
  constructor(
    private readonly runtimeService: any, // AgentRuntimeService
    private readonly deps: AgentRuntimeDependencies
  ) {}

  /**
   * Executes a functional agent to completion, handling tool calls in a loop.
   */
  async execute(input: StartAgentRunInput): Promise<any> {
    if (!this.deps.llm) {
      throw new AgentRuntimeError("NO_LLM_PROVIDER", "LLM provider is not configured.");
    }

    const contract = FUNCTIONAL_AGENT_CONTRACTS.find(c => c.agent_id === input.agent_id);
    if (!contract) {
      throw new AgentRuntimeError("AGENT_NOT_FOUND", "Functional agent not found.");
    }

    const run = await this.runtimeService.startRun(input);

    const tools: LlmTool[] = contract.allowed_tools.map(toolName => {
      const tc = AGENT_TOOL_CONTRACTS.find(t => t.tool_name === toolName);
      if (!tc) throw new Error(`Tool ${toolName} not found`);
      // Convert Zod schema to minimal JSON schema representation (duck typed).
      // Zod schema would typically be converted using zod-to-json-schema,
      // but for simplicity we rely on the provider implementation accepting any JSON schema.
      // E.g. we might need a utility or pass the structure directly.
      return {
        type: "function",
        function: {
          name: tc.tool_name,
          description: tc.description,
          parameters: {
            type: "object",
            properties: {
              tenant_id: { type: "string" },
              organization_id: { type: "string" },
              assessment_id: { type: "string" },
              trace_id: { type: "string" },
              query: { type: "string" },
              top_k: { type: "number" },
              gate: { type: "string" },
              artifact_type: { type: "string" },
              artifact_version_id: { type: "string" }
            },
            required: ["tenant_id", "organization_id", "assessment_id", "trace_id"]
          }
        }
      };
    });

    const messages: LlmMessage[] = [
      {
        role: "system",
        content: `You are the ${contract.display_name}.
Responsibility: ${contract.responsibility}
Forbidden Actions: ${contract.forbidden_actions.join(", ")}
You must fulfill the task using provided tools. Output a final decision matching the required schema.`
      },
      {
        role: "user",
        content: JSON.stringify(input.input)
      }
    ];

    try {
      while (true) {
        const response = await this.deps.llm.generate({
          model: input.model,
          messages,
          tools,
          temperature: 0.1,
        });

        messages.push(response.message);

        if (response.message.tool_calls && response.message.tool_calls.length > 0) {
          // Handle tool calls
          for (const call of response.message.tool_calls) {
            let toolResult: any;
            try {
              const args = JSON.parse(call.function.arguments);
              // Trace the tool call locally
              await this.runtimeService.invokeTool(run.agent_run_id, {
                tool_name: call.function.name as any,
                input: args,
                context: input.context
              });
              
              // In a real implementation we would route this to actual Tool Handlers
              // Here we just return a stub to continue the LLM loop
              toolResult = { ack: "tool_executed_stub" };
            } catch (err: any) {
              toolResult = { error: err.message };
            }

            messages.push({
              role: "tool",
              content: JSON.stringify(toolResult),
              tool_call_id: call.id,
              name: call.function.name
            });
          }
          continue; // Loop back to LLM with tool responses
        }

        // Generate final output based on final assistant message
        let finalOutputData: any;
        try {
           finalOutputData = JSON.parse(response.message.content);
        } catch {
           finalOutputData = {
              summary: response.message.content.substring(0, 500) || "Executed task",
              assumptions: ["None explicitly provided"],
              limitations: ["Unstructured output provided"],
              sources: [],
              confidence_score: 0.8,
              writes_final_finding: false,
              creates_official_mapping: false,
              metadata: { raw: response.message.content }
           };
        }

        // Fix basic structural issues for Schema Validation
        const completionInput: CompleteAgentRunInput = {
          context: input.context,
          output: {
            summary: finalOutputData.summary || "No summary",
            assumptions: Array.isArray(finalOutputData.assumptions) && finalOutputData.assumptions.length ? finalOutputData.assumptions : ["Assumed normal operation"],
            limitations: Array.isArray(finalOutputData.limitations) && finalOutputData.limitations.length ? finalOutputData.limitations : ["None reported"],
            sources: Array.isArray(finalOutputData.sources) && finalOutputData.sources.length ? finalOutputData.sources : ["System"],
            confidence_score: finalOutputData.confidence_score ?? 0.8,
            writes_final_finding: !!finalOutputData.writes_final_finding,
            creates_official_mapping: !!finalOutputData.creates_official_mapping,
            metadata: finalOutputData.metadata || {}
          }
        };

        const completedRun = await this.runtimeService.completeRun(run.agent_run_id, completionInput);
        return completedRun;
      }
    } catch (err: any) {
      await this.runtimeService.failRun(run.agent_run_id, err.message);
      throw err;
    }
  }
}

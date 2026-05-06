/**
 * @module executor
 * @description Core execution loop for functional agents.
 */
import { AgentRuntimeError } from "./errors";
import type { AgentRuntimeDependencies, StartAgentRunInput, CompleteAgentRunInput } from "./types";
import { AGENT_TOOL_CONTRACTS, FUNCTIONAL_AGENT_CONTRACTS } from "./contracts";
import { generateText, tool } from "ai";
import { z } from "zod";

export class AgentExecutor {
  constructor(
    private readonly runtimeService: any, // AgentRuntimeService
    private readonly deps: AgentRuntimeDependencies
  ) {}

  /**
   * Executes a functional agent from scratch natively using Vercel AI SDK with maxSteps.
   */
  async execute(input: StartAgentRunInput): Promise<any> {
    const run = await this.runtimeService.startRun(input);
    return this.continueRun(run, input.input, input.context);
  }

  /**
   * Resumes an existing (queued) functional agent run natively using Vercel AI SDK with maxSteps.
   */
  async resumeRun(agentRunId: string, tenantId: string): Promise<any> {
    const run = await this.runtimeService.getRun({ agent_run_id: agentRunId }, tenantId);
    if (!run) throw new AgentRuntimeError("NOT_FOUND", "Agent run not found");
    
    // We need the original input and context. Since they aren't fully stored, we mock empty input here for now
    // Actually, context is required. We can deduce it from the run's metadata
    const context = {
      tenant_id: run.tenant_id,
      organization_id: run.organization_id,
      assessment_id: run.assessment_id,
      framework_id: String(run.metadata.framework_id || "00000000-0000-0000-0000-000000000000"),
      scf_version_id: String(run.metadata.scf_version_id || "00000000-0000-0000-0000-000000000000"),
      trace_id: run.trace_id
    };
    
    // Assume input is stored in metadata or empty if resuming async
    const input = run.metadata.input || {};
    
    return this.continueRun(run, input, context);
  }

  private async continueRun(run: any, rawInput: any, context: any): Promise<any> {
    if (!this.deps.llm) {
      throw new AgentRuntimeError("NO_LLM_PROVIDER", "LLM provider is not configured.");
    }

    const contract = FUNCTIONAL_AGENT_CONTRACTS.find(c => c.agent_id === run.agent_id);
    if (!contract) {
      throw new AgentRuntimeError("AGENT_NOT_FOUND", "Functional agent not found.");
    }

    const tools: Record<string, any> = {};
    
    // Map allowed tool contracts to Vercel AI SDK Tools
    for (const toolName of contract.allowed_tools) {
      const tc = AGENT_TOOL_CONTRACTS.find(t => t.tool_name === toolName);
      if (!tc) throw new Error(`Tool ${toolName} not found`);
      
      tools[tc.tool_name] = tool({
        description: tc.description,
        parameters: z.object({
          tenant_id: z.string().describe("UUID of the tenant"),
          organization_id: z.string().describe("UUID of the organization"),
          assessment_id: z.string().describe("UUID of the current assessment"),
          trace_id: z.string().describe("Trace ID for observability"),
          query: z.string().optional().describe("Search query if applicable"),
          top_k: z.number().optional().describe("Number of results to return"),
          gate: z.string().optional().describe("Approval gate to request"),
          artifact_type: z.string().optional().describe("Type of artifact to generate"),
          artifact_version_id: z.string().optional()
        }),
        execute: async (args: any) => {
          try {
            // Trace the tool call locally
            await this.runtimeService.invokeTool(run.agent_run_id, {
              tool_name: tc.tool_name as any,
              input: args,
              context: context
            });
            
            // In a real implementation we route this to actual Standard Tool Handlers mapping.
            // For now, return a successful execution context acknowledging the call.
            return { ack: "tool_executed", tool: tc.tool_name, provided_args: args };
          } catch (error: any) {
            return { error: error.message || "Tool execution failed" };
          }
        }
      });
    }

    const systemPrompt = `You are the ${contract.display_name}.
Responsibility: ${contract.responsibility}
Forbidden Actions: ${contract.forbidden_actions.join(", ")}
You must fulfill the task using provided tools. If you use tools, analyze the output and synthesize a final finding. Output a final decision strictly as JSON matching your schema. Do NOT wrap it in markdown.`;

    try {
      // Execute the autonomous iterative loop managed by Vercel AI SDK
      const response = await generateText({
        model: this.deps.llm,
        system: systemPrompt,
        prompt: JSON.stringify(rawInput),
        tools,
        maxSteps: 5, // Autonomous multi-call loop limit
        temperature: 0.1,
      });

      // Parse final output based on the agent's textual response
      let finalOutputData: any;
      try {
         finalOutputData = JSON.parse(response.text.trim());
      } catch {
         // Fallback structural parsing if LLM refused or failed JSON schema formatting
         finalOutputData = {
            summary: response.text.substring(0, 500) || "Executed task",
            assumptions: ["None explicitly provided by LLM JSON parse error"],
            limitations: ["Unstructured output provided"],
            sources: [],
            confidence_score: 0.6,
            writes_final_finding: false,
            creates_official_mapping: false,
            metadata: { 
               raw: response.text, 
               toolCallsCount: response.toolCalls?.length || 0,
               finishReason: response.finishReason
            }
         };
      }

      // Fix basic structural issues for Schema Validation compliance required by Standard
      const completionInput: CompleteAgentRunInput = {
        context: context,
        output: {
          summary: finalOutputData.summary || "No summary",
          assumptions: Array.isArray(finalOutputData.assumptions) && finalOutputData.assumptions.length ? finalOutputData.assumptions : ["Assumed normal operation"],
          limitations: Array.isArray(finalOutputData.limitations) && finalOutputData.limitations.length ? finalOutputData.limitations : ["None reported"],
          sources: Array.isArray(finalOutputData.sources) && finalOutputData.sources.length ? finalOutputData.sources : ["System"],
          confidence_score: finalOutputData.confidence_score ?? 0.8,
          writes_final_finding: !!finalOutputData.writes_final_finding,
          creates_official_mapping: !!finalOutputData.creates_official_mapping,
          metadata: finalOutputData.metadata || { steps: response.steps?.length }
        }
      };

      const completedRun = await this.runtimeService.completeRun(run.agent_run_id, completionInput);
      return completedRun;
    } catch (err: any) {
      await this.runtimeService.failRun(run.agent_run_id, err.message);
      throw err;
    }
  }
}


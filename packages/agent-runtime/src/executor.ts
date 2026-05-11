/**
 * @module executor
 * @description Core execution loop for functional agents.
 *
 * Uses the Vercel AI SDK `generateText` with `maxSteps` for autonomous
 * multi-step tool calling, bounded by the agent's contract and guardrails.
 */
import type { AgentRunResponse, AgentRuntimeContext, AgentOutput, AgentToolName } from "@standard/schemas";
import { AgentRuntimeError } from "./errors";
import type { AgentRuntimeDependencies, StartAgentRunInput, CompleteAgentRunInput, InvokeAgentToolInput } from "./types";
import { AGENT_TOOL_CONTRACTS, FUNCTIONAL_AGENT_CONTRACTS, type FunctionalAgentContract } from "./contracts";
import type { AgentRuntimeService } from "./runtime";
import { generateText, tool, stepCountIs, type ToolSet, type GenerateTextResult } from "ai";
import { z } from "zod";

type ToolExecuteArgs = {
  tenant_id: string;
  organization_id: string;
  assessment_id: string;
  trace_id: string;
  query?: string;
  top_k?: number;
  gate?: string;
  artifact_type?: string;
  artifact_version_id?: string;
};

type ToolResult = {
  ack: string;
  tool: string;
  provided_args: ToolExecuteArgs;
} | {
  error: string;
};

type ParsedAgentOutput = {
  summary?: string;
  assumptions?: string[];
  limitations?: string[];
  sources?: string[];
  confidence_score?: number;
  writes_final_finding?: boolean;
  creates_official_mapping?: boolean;
  metadata?: Record<string, unknown>;
};

export class AgentExecutor {
  constructor(
    private readonly runtimeService: AgentRuntimeService,
    private readonly deps: AgentRuntimeDependencies
  ) {}

  /**
   * Executes a functional agent from scratch using Vercel AI SDK with maxSteps.
   */
  async execute(input: StartAgentRunInput): Promise<AgentRunResponse> {
    const run = await this.runtimeService.startRun(input);
    return this.continueRun(run, input.input, input.context);
  }

  /**
   * Resumes an existing (queued) functional agent run.
   */
  async resumeRun(agentRunId: string, tenantId: string): Promise<AgentRunResponse> {
    const run = await this.runtimeService.getRun(agentRunId, tenantId);
    if (!run) throw new AgentRuntimeError("NOT_FOUND", "Agent run not found");

    const context: AgentRuntimeContext = {
      tenant_id: run.tenant_id,
      organization_id: run.organization_id,
      assessment_id: run.assessment_id,
      framework_id: String((run.metadata as Record<string, unknown>)?.framework_id ?? "00000000-0000-0000-0000-000000000000"),
      scf_version_id: String((run.metadata as Record<string, unknown>)?.scf_version_id ?? "00000000-0000-0000-0000-000000000000"),
      trace_id: run.trace_id,
    };

    const storedInput = ((run.metadata as Record<string, unknown>)?.input ?? {}) as Record<string, unknown>;
    return this.continueRun(run, storedInput, context);
  }

  private async continueRun(
    run: AgentRunResponse,
    rawInput: Record<string, unknown>,
    context: AgentRuntimeContext
  ): Promise<AgentRunResponse> {
    if (!this.deps.llm) {
      throw new AgentRuntimeError("NO_LLM_PROVIDER", "LLM provider is not configured.");
    }

    const contract = FUNCTIONAL_AGENT_CONTRACTS.find(c => c.agent_id === run.agent_id);
    if (!contract) {
      throw new AgentRuntimeError("AGENT_NOT_FOUND", "Functional agent not found.");
    }

    const tools = this.buildTools(contract, run.agent_run_id, context);

    const systemPrompt = `You are the ${contract.display_name}.
Responsibility: ${contract.responsibility}
Forbidden Actions: ${contract.forbidden_actions.join(", ")}
You must fulfill the task using provided tools. If you use tools, analyze the output and synthesize a final finding. Output a final decision strictly as JSON matching your schema. Do NOT wrap it in markdown.`;

    try {
      const startTime = Date.now();

      const response = await generateText({
        model: this.deps.llm,
        system: systemPrompt,
        prompt: JSON.stringify(rawInput),
        tools,
        stopWhen: stepCountIs(5),
        temperature: 0.1,
      });

      const totalLatencyMs = Date.now() - startTime;

      // Emit observability telemetry (best-effort)
      try {
        await this.deps.observability?.record({
          agent_run_id: run.agent_run_id,
          model: run.model ?? "unknown",
          ...(response.usage?.inputTokens != null ? { prompt_tokens: response.usage.inputTokens } : {}),
          ...(response.usage?.outputTokens != null ? { completion_tokens: response.usage.outputTokens } : {}),
          total_latency_ms: totalLatencyMs,
          tool_calls: response.toolCalls?.length ?? 0,
          ...(response.finishReason ? { finish_reason: response.finishReason } : {}),
        });
      } catch (obsErr) {
        console.warn(`[agent-executor] Observability recording failed:`, obsErr);
      }

      const finalOutputData = this.parseAgentResponse(response);

      const completionInput: CompleteAgentRunInput = {
        context,
        output: {
          summary: finalOutputData.summary ?? "No summary",
          assumptions: this.ensureNonEmptyArray(finalOutputData.assumptions, "Assumed normal operation"),
          limitations: this.ensureNonEmptyArray(finalOutputData.limitations, "None reported"),
          sources: this.ensureNonEmptyArray(finalOutputData.sources, "System"),
          confidence_score: finalOutputData.confidence_score ?? 0.8,
          writes_final_finding: !!finalOutputData.writes_final_finding,
          creates_official_mapping: !!finalOutputData.creates_official_mapping,
          metadata: {
            ...(finalOutputData.metadata ?? {}),
            steps: response.steps?.length,
            total_latency_ms: totalLatencyMs,
            prompt_tokens: response.usage?.inputTokens,
            completion_tokens: response.usage?.outputTokens,
          },
        },
      };

      return await this.runtimeService.completeRun(run.agent_run_id, completionInput);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.runtimeService.failRun(run.agent_run_id, message);
      throw err;
    }
  }

  /**
   * Build typed Vercel AI SDK tools from the agent's allowed tool contracts.
   */
  private buildTools(
    contract: FunctionalAgentContract,
    agentRunId: string,
    context: AgentRuntimeContext
  ): ToolSet {
    const tools: ToolSet = {};

    for (const toolName of contract.allowed_tools) {
      const tc = AGENT_TOOL_CONTRACTS.find(t => t.tool_name === toolName);
      if (!tc) throw new AgentRuntimeError("TOOL_CONTRACT_NOT_FOUND", `Tool ${toolName} not found`);

      tools[tc.tool_name] = tool({
        description: tc.description,
        inputSchema: z.object({
          tenant_id: z.string().describe("UUID of the tenant"),
          organization_id: z.string().describe("UUID of the organization"),
          assessment_id: z.string().describe("UUID of the current assessment"),
          trace_id: z.string().describe("Trace ID for observability"),
          query: z.string().optional().describe("Search query if applicable"),
          top_k: z.number().optional().describe("Number of results to return"),
          gate: z.string().optional().describe("Approval gate to request"),
          artifact_type: z.string().optional().describe("Type of artifact to generate"),
          artifact_version_id: z.string().optional(),
        }),
        outputSchema: z.record(z.string(), z.unknown()),
        execute: async (args, _options) => {
          try {
            const toolInput: InvokeAgentToolInput = {
              tool_name: tc.tool_name as AgentToolName,
              input: args,
              context,
            };
            // Record the tool invocation for audit
            await this.runtimeService.invokeTool(agentRunId, toolInput);

            // Dispatch to real tool if registered, otherwise return ack stub
            const realTool = this.deps.toolRegistry?.[tc.tool_name];
            if (realTool) {
              const result = await realTool.execute(args as Record<string, unknown>);
              return (result ?? { ack: "tool_executed", tool: tc.tool_name }) as Record<string, unknown>;
            }

            return { ack: "tool_executed", tool: tc.tool_name, provided_args: args } as Record<string, unknown>;
          } catch (error) {
            const message = error instanceof Error ? error.message : "Tool execution failed";
            return { error: message } as Record<string, unknown>;
          }
        },
      });
    }

    return tools;
  }

  /**
   * Parse the LLM's textual response into a structured agent output.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseAgentResponse(response: GenerateTextResult<ToolSet, any>): ParsedAgentOutput {
    try {
      return JSON.parse(response.text.trim()) as ParsedAgentOutput;
    } catch {
      return {
        summary: response.text.substring(0, 500) || "Executed task",
        assumptions: ["None explicitly provided by LLM — JSON parse failed"],
        limitations: ["Unstructured output provided"],
        sources: [],
        confidence_score: 0.6,
        writes_final_finding: false,
        creates_official_mapping: false,
        metadata: {
          raw_truncated: response.text.substring(0, 1000),
          tool_calls_count: response.toolCalls?.length ?? 0,
          finish_reason: response.finishReason,
        },
      };
    }
  }

  /**
   * Ensure an array has at least one element; use fallback if empty/missing.
   */
  private ensureNonEmptyArray(arr: string[] | undefined, fallback: string): string[] {
    return Array.isArray(arr) && arr.length > 0 ? arr : [fallback];
  }
}

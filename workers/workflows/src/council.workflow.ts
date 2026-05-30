import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";
import { AgentExecutor, AgentRuntimeService, CouncilOrchestrator, createDrizzleAgentRuntimeDependencies, type AgentRuntimeDependencies } from "@standard/agent-runtime";
export interface Env {
  DATABASE_URL: string;
  OPENAI_API_KEY?: string;
  AI_GATEWAY_BASE_URL?: string;
  STANDARD_CACHE: KVNamespace;
}

type CouncilWorkflowParams = {
  runId: string;
  tenantId: string;
  agents: string[];
  inputData: any;
};

export class CouncilOrchestrationWorkflow extends WorkflowEntrypoint<Env, CouncilWorkflowParams> {
  async run(event: WorkflowEvent<CouncilWorkflowParams>, step: WorkflowStep) {
    const { runId, tenantId, agents, inputData } = event.payload;

    // Load Database and runtime inside workflow
    const sql = neon(this.env.DATABASE_URL);
    const db = drizzle(sql, { schema: schema as any });

    let llm: any = { generateText: async () => ({ text: "", usage: {} }) };
    if (this.env.OPENAI_API_KEY && this.env.AI_GATEWAY_BASE_URL) {
      try {
        const { createOpenAI } = await import("@ai-sdk/openai");
        llm = createOpenAI({
          apiKey: this.env.OPENAI_API_KEY,
          baseURL: this.env.AI_GATEWAY_BASE_URL,
        });
      } catch (e) {
        console.error("Failed to load @ai-sdk/openai in Workflows", e);
      }
    }

    const agentDeps: AgentRuntimeDependencies = {
      ...createDrizzleAgentRuntimeDependencies(db as never),
      llm,
    };

    const runtimeService = new AgentRuntimeService(agentDeps);
    const executor = new AgentExecutor(runtimeService, agentDeps);
    
    const council = new CouncilOrchestrator(runtimeService, executor);

    // Fetch the run context
    const run = await step.do("fetch-run-context", {
        retries: { limit: 3, delay: 5000, backoff: "exponential" }
    }, async () => {
        const rawRun = await runtimeService.getRun(runId, tenantId);
        return rawRun ? JSON.parse(JSON.stringify(rawRun)) : null;
    });

    if (!run) {
        throw new Error("Council run not found during workflow start.");
    }

    // Initialize state into KV before starting agent steps
    const stateKey = `council:runs:${runId}:payload`;
    await step.do("initialize-run-state", async () => {
        const serialized = JSON.stringify(inputData);
        const payloadSizeKB = Math.round(serialized.length / 1024);

        // Hard limit: reject payloads > 512KB to prevent KV degradation
        if (serialized.length > 512 * 1024) {
            throw new Error(
                `Council payload too large (${payloadSizeKB}KB). Max allowed: 512KB. ` +
                `Use R2 references instead of inline document content.`
            );
        }

        // Soft warning: payloads > 256KB indicate potential design issues
        if (serialized.length > 256 * 1024) {
            console.warn(
                `[council:workflow] Large payload detected: ${payloadSizeKB}KB for run ${runId}. ` +
                `Consider using R2 references to reduce payload size.`
            );
        }

        await this.env.STANDARD_CACHE.put(stateKey, serialized, { expirationTtl: 86400 });
        return { executed: true, payload_size_kb: payloadSizeKB };
    });

    let finalSummary = "Council durable execution completed.";

    for (let i = 0; i < agents.length; i++) {
      const agentName = agents[i];
      if (!agentName) continue;

      
      // We set aggressive retries (5) and a long timeout (5 mins) per LLM step to survive timeouts.
      await step.do(`execute-agent-${i}-${agentName}`, {
          retries: { limit: 5, delay: 10000, backoff: "exponential" },
          timeout: "5 minutes"
      }, async () => {
         // Claim-Check: Load payload
         const stateStr = await this.env.STANDARD_CACHE.get(stateKey);
         if (!stateStr) {
             throw new Error(`State lost for ${runId} during step ${agentName}`);
         }
         let currentPayload = JSON.parse(stateStr);
         
         // Execute
         if (agentName === "evidence_evaluator") {
             currentPayload = await council.executeEvidenceEvaluator(tenantId, currentPayload);
         } else if (agentName === "poam_architect") {
             currentPayload = await council.executePoamArchitect(tenantId, currentPayload, inputData);
         } else if (agentName === "board_translator") {
             currentPayload = await council.executeBoardTranslator(tenantId, currentPayload, inputData);
         } else if (agentName === "incident_triager") {
             currentPayload = await council.executeIncidentTriager(tenantId, currentPayload, inputData);
         } else if (agentName === "vendor_scanner") {
             currentPayload = await council.executeVendorScanner(tenantId, currentPayload, inputData);
         } else if (agentName === "ropa_analyzer") {
             currentPayload = await council.executeRopaAnalyzer(tenantId, currentPayload, inputData);
         } else if (agentName === "dpia_assessor") {
             currentPayload = await council.executeDpiaAssessor(tenantId, currentPayload, inputData);
         } else {
             currentPayload = await council.executeGenericAgent(tenantId, agentName, currentPayload, run, inputData);
         }
         
         // Claim-Check: Save mutated payload
         await this.env.STANDARD_CACHE.put(stateKey, JSON.stringify(currentPayload), { expirationTtl: 86400 });
         
         return {
             ok: true,
             agentName,
             ts: Date.now()
         };
      });

      if (agentName === "board_translator") {
          // Special Step: Extract final summary safely
          const extParams = await step.do(`extract-summary-${i}`, async () => {
              const stateStr = await this.env.STANDARD_CACHE.get(stateKey);
              let _sum = "Council durable execution completed.";
              if (stateStr) {
                  const p = JSON.parse(stateStr);
                  if (p.executive_summary) {
                      _sum = String(p.executive_summary);
                  }
              }
              return { extracted: true, summary: _sum };
          });
          finalSummary = extParams.summary;
      }
    }

    // Finalize state to database
    await step.do("finalize-council-run", {
        retries: { limit: 5, delay: 5000, backoff: "exponential" }
    }, async () => {
        const stateStr = await this.env.STANDARD_CACHE.get(stateKey);
        const finalPayload = stateStr ? JSON.parse(stateStr) : inputData;
        const sumStr: string = finalSummary || "Council durable execution completed.";
        await council.finalizeCouncilRun(runId, tenantId, finalPayload, sumStr, inputData);
        // Optional Cleanup: await this.env.STANDARD_CACHE.delete(stateKey);
        return { finalized: true };
    });

    return {
        success: true,
        runId,
        finalSummary
    };
  }
}

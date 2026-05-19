import type { AgentRunResponse, AgentRuntimeContext, FunctionalAgentId } from "@standard/schemas";
import { AgentExecutor } from "./executor";
import { AgentRuntimeError } from "./errors";
import type { AgentRuntimeService } from "./runtime";

/**
 * The Council orchestrates multiple specialized Agents in a sequence.
 * E.g., an Analyst proposes findings, a Reviewer critiques them, and an Arbiter finalizes the score.
 */
export class CouncilOrchestrator {
  constructor(
    private readonly runtimeService: AgentRuntimeService,
    private readonly executor: AgentExecutor
  ) {}

  /**
   * Dispatches a Council execution in the background.
   * This method returns immediately with the created Run ID so the frontend can poll.
   * The actual execution should happen via Queues or background waitUntil.
   */
  async startCouncilDetached(options: {
    tenant_id: string;
    organization_id: string;
    assessment_id: string;
    target_framework_id: string;
    trace_id: string;
    agents: FunctionalAgentId[]; // E.g., ["evidence_evaluator", "compliance_arbiter"]
    input: Record<string, unknown>;
  }): Promise<{ run_id: string; status: string }> {
    // We create a root orchestrator run
    const context: AgentRuntimeContext = {
      tenant_id: options.tenant_id,
      organization_id: options.organization_id,
      assessment_id: options.assessment_id,
      framework_id: options.target_framework_id,
      scf_version_id: "latest",
      trace_id: options.trace_id,
    };

    const run = await this.runtimeService.startRun({
      agent_id: "council_orchestrator" as any, // Pseudo agent
      agent_version: "1.0.0",
      prompt_version: "1.0",
      model: "orchestrator",
      input: options.input,
      context,
    });

    // In a full implementation, we'd fire an event to a Cloudflare Queue here.
    // For now we persist the run, and the caller is expected to enqueue it.
    
    return {
      run_id: run.agent_run_id,
      status: "queued"
    };
  }

  /**
   * Resumes and executes the council sequentially.
   * Driven by the background Queue consumer (agent-run.consumer.ts).
   */
  async executeCouncilRun(runId: string, tenantId: string): Promise<AgentRunResponse> {
    const run = await this.runtimeService.getRun(runId, tenantId);
    if (!run) throw new AgentRuntimeError("NOT_FOUND", "Council run not found");

    const inputData = (run.metadata as Record<string, unknown>)?.input as Record<string, unknown>;
    const agents = (run.metadata as Record<string, unknown>)?.agents as string[] ?? [];
    
    let currentPayload: any = inputData;
    let finalSummary = "Council execution completed.";

    // Dynamically load UseCases from the current context
    const { EvidenceEvaluatorUseCase } = await import("./usecases/evidence-evaluator").catch(() => ({ EvidenceEvaluatorUseCase: null }));
    const { PoamArchitectUseCase } = await import("./usecases/poam-architect").catch(() => ({ PoamArchitectUseCase: null }));
    const { CLevelBoardTranslatorUseCase } = await import("./usecases/c-level-translator").catch(() => ({ CLevelBoardTranslatorUseCase: null }));
    const { IncidentTriagerUseCase } = await import("./usecases/incident-triager").catch(() => ({ IncidentTriagerUseCase: null }));
    const { VendorScannerUseCase } = await import("./usecases/vendor-scanner").catch(() => ({ VendorScannerUseCase: null }));
    const { RopaAnalyzerUseCase } = await import("./usecases/ropa-analyzer").catch(() => ({ RopaAnalyzerUseCase: null }));
    const { DpiaAssessorUseCase } = await import("./usecases/dpia-assessor").catch(() => ({ DpiaAssessorUseCase: null }));

    const llmProvider = (this.runtimeService as any).deps.llm; // Safely grabbing the LLM from DI
    
    // Process pipeline sequentially
    for (const agentName of agents) {
        if (agentName === "evidence_evaluator" && EvidenceEvaluatorUseCase) {
           const evaluator = new EvidenceEvaluatorUseCase(llmProvider);
           currentPayload = await evaluator.evaluate({
               controlRequirement: currentPayload.controlObjective || "Ensure proper configuration",
               evidenceDescription: currentPayload.evidenceText || "",
               tenantId: tenantId
           });
        } 
        else if (agentName === "poam_architect" && PoamArchitectUseCase) {
           const architect = new PoamArchitectUseCase(llmProvider);
           currentPayload = await architect.architect({
               evidenceContext: currentPayload,
               systemArchitectureDescription: inputData.systemArchitectureDescription as string || "Default Architecture",
               tenantId: tenantId
           });
        }
        else if (agentName === "board_translator" && CLevelBoardTranslatorUseCase) {
           const translator = new CLevelBoardTranslatorUseCase(llmProvider);
           currentPayload = await translator.translate({
               poamPlan: currentPayload,
               regulatoryContext: inputData.regulatoryContext as string || "Standard Compliance Framework",
               tenantId: tenantId
           });
           finalSummary = currentPayload.executive_summary;
        }
        else if (agentName === "incident_triager" && IncidentTriagerUseCase) {
           const triager = new IncidentTriagerUseCase(llmProvider);
           currentPayload = await triager.triage({
               rawLogsExcerpt: currentPayload.rawLogsExcerpt || inputData.rawLogsExcerpt || "",
               systemModuleName: currentPayload.systemModuleName || inputData.systemModuleName || "Unknown",
               tenantId: tenantId
           });
           if (currentPayload.severity_level === "critical") finalSummary = "CRITICAL security incident triaged.";
        }
        else if (agentName === "vendor_scanner" && VendorScannerUseCase) {
           const scanner = new VendorScannerUseCase(llmProvider);
           currentPayload = await scanner.scan({
               contractExcerpt: currentPayload.contractExcerpt || inputData.contractExcerpt || "",
               vendorName: currentPayload.vendorName || inputData.vendorName || "Unknown Vendor",
               tenantId: tenantId
           });
        }
        else if (agentName === "ropa_analyzer" && RopaAnalyzerUseCase) {
           const analyzer = new RopaAnalyzerUseCase(llmProvider);
           currentPayload = await analyzer.analyze({
               naturalLanguageDescription: currentPayload.naturalLanguageDescription || inputData.naturalLanguageDescription || "",
               tenantId: tenantId
           });
        }
        else if (agentName === "dpia_assessor" && DpiaAssessorUseCase) {
           const assessor = new DpiaAssessorUseCase(llmProvider);
           currentPayload = await assessor.assess({
               ropaContext: currentPayload,
               projectDescription: inputData.projectDescription as string || "General data processing project",
               tenantId: tenantId
           });
           if (currentPayload.residual_risk_level === "high" || currentPayload.residual_risk_level === "critical") finalSummary = "High-Risk DPIA Requires Board Sign-off.";
        }
        else {
           // Fallback to generic functional agent execution via executor
           // For a deep DAG, we would enqueue it. Here we await it directly.
           // This represents the Functional Tool-using Agent execution
           const genericRun = await this.executor.execute({
               agent_id: agentName as any,
               agent_version: "1.0.0",
               prompt_version: "1.0",
               model: "orchestrator",
               context: {
                  tenant_id: tenantId,
                  organization_id: run.organization_id,
                  assessment_id: run.assessment_id,
                  framework_id: (run.metadata as any)?.framework_id ?? "",
                  scf_version_id: "latest",
                  trace_id: run.trace_id,
               },
               input: { prior_output: currentPayload }
           });

           currentPayload = (genericRun.metadata as any)?.FinalOutput || (genericRun as any).summary;
        }
    }

    const finalOutput = {
      summary: finalSummary,
      assumptions: [],
      limitations: [],
      sources: agents,
      confidence_score: 0.95,
      writes_final_finding: true,
      creates_official_mapping: false,
      metadata: { final_payload: currentPayload, input_data: inputData }
    };

    return await this.runtimeService.completeRun(runId, {
      context: {
        tenant_id: run.tenant_id,
        organization_id: run.organization_id,
        assessment_id: run.assessment_id,
        trace_id: run.trace_id,
        framework_id: (run as any).framework_id ?? "",
        scf_version_id: (run as any).scf_version_id ?? "latest"
      },
      output: finalOutput
    });
  }

  // Atomic Steps for Cloudflare Workflows SDK Integration

  async executeEvidenceEvaluator(tenantId: string, currentPayload: any): Promise<any> {
    const { EvidenceEvaluatorUseCase } = await import("./usecases/evidence-evaluator");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const evaluator = new EvidenceEvaluatorUseCase(llmProvider);
    return await evaluator.evaluate({
        controlRequirement: currentPayload.controlObjective || "Ensure proper configuration",
        evidenceDescription: currentPayload.evidenceText || "",
        tenantId: tenantId
    });
  }

  async executePoamArchitect(tenantId: string, currentPayload: any, inputData: any): Promise<any> {
    const { PoamArchitectUseCase } = await import("./usecases/poam-architect");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const architect = new PoamArchitectUseCase(llmProvider);
    return await architect.architect({
        evidenceContext: currentPayload,
        systemArchitectureDescription: inputData.systemArchitectureDescription as string || "Default Architecture",
        tenantId: tenantId
    });
  }

  async executeBoardTranslator(tenantId: string, currentPayload: any, inputData: any): Promise<any> {
    const { CLevelBoardTranslatorUseCase } = await import("./usecases/c-level-translator");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const translator = new CLevelBoardTranslatorUseCase(llmProvider);
    return await translator.translate({
        poamPlan: currentPayload,
        regulatoryContext: inputData.regulatoryContext as string || "Standard Compliance Framework",
        tenantId: tenantId
    });
  }

  async executeIncidentTriager(tenantId: string, currentPayload: any, inputData: any): Promise<any> {
    const { IncidentTriagerUseCase } = await import("./usecases/incident-triager");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const triager = new IncidentTriagerUseCase(llmProvider);
    return await triager.triage({
        rawLogsExcerpt: currentPayload.rawLogsExcerpt || inputData.rawLogsExcerpt || "",
        systemModuleName: currentPayload.systemModuleName || inputData.systemModuleName || "Unknown",
        tenantId: tenantId
    });
  }

  async executeVendorScanner(tenantId: string, currentPayload: any, inputData: any): Promise<any> {
    const { VendorScannerUseCase } = await import("./usecases/vendor-scanner");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const scanner = new VendorScannerUseCase(llmProvider);
    return await scanner.scan({
        contractExcerpt: currentPayload.contractExcerpt || inputData.contractExcerpt || "",
        vendorName: currentPayload.vendorName || inputData.vendorName || "Unknown Vendor",
        tenantId: tenantId
    });
  }

  async executeRopaAnalyzer(tenantId: string, currentPayload: any, inputData: any): Promise<any> {
    const { RopaAnalyzerUseCase } = await import("./usecases/ropa-analyzer");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const analyzer = new RopaAnalyzerUseCase(llmProvider);
    return await analyzer.analyze({
        naturalLanguageDescription: currentPayload.naturalLanguageDescription || inputData.naturalLanguageDescription || "",
        tenantId: tenantId
    });
  }

  async executeDpiaAssessor(tenantId: string, currentPayload: any, inputData: any): Promise<any> {
    const { DpiaAssessorUseCase } = await import("./usecases/dpia-assessor");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const assessor = new DpiaAssessorUseCase(llmProvider);
    return await assessor.assess({
        ropaContext: currentPayload,
        projectDescription: inputData.projectDescription as string || "General data processing project",
        tenantId: tenantId
    });
  }

  async executeGenericAgent(tenantId: string, agentName: string, currentPayload: any, run: any, inputData: any): Promise<any> {
    const genericRun = await this.executor.execute({
        agent_id: agentName as any,
        agent_version: "1.0.0",
        prompt_version: "1.0",
        model: "orchestrator",
        context: {
           tenant_id: tenantId,
           organization_id: run.organization_id,
           assessment_id: run.assessment_id,
           framework_id: (run.metadata as any)?.framework_id ?? "",
           scf_version_id: "latest",
           trace_id: run.trace_id,
        },
        input: { prior_output: currentPayload }
    });
    return (genericRun.metadata as any)?.FinalOutput || (genericRun as any).summary;
  }

  async finalizeCouncilRun(runId: string, tenantId: string, finalPayload: any, finalSummary: string, inputData: any): Promise<AgentRunResponse> {
    const run = await this.runtimeService.getRun(runId, tenantId);
    if (!run) throw new AgentRuntimeError("NOT_FOUND", "Council run not found");

    const finalOutput = {
      summary: finalSummary,
      assumptions: [],
      limitations: [],
      sources: (run.metadata as Record<string, unknown>)?.agents as string[] ?? [],
      confidence_score: 0.95,
      writes_final_finding: true,
      creates_official_mapping: false,
      metadata: { final_payload: finalPayload, input_data: inputData }
    };

    return await this.runtimeService.completeRun(runId, {
      context: {
        tenant_id: run.tenant_id,
        organization_id: run.organization_id,
        assessment_id: run.assessment_id,
        trace_id: run.trace_id,
        framework_id: (run as any).framework_id ?? "",
        scf_version_id: (run as any).scf_version_id ?? "latest"
      },
      output: finalOutput
    });
  }
}

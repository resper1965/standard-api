import type { AgentRunResponse, AgentRuntimeContext, FunctionalAgentId } from "@standard/schemas";
import { AgentExecutor } from "./executor";
import { AgentRuntimeError } from "./errors";
import type { AgentRuntimeService } from "./runtime";

// ---------------------------------------------------------------------------
// Internal types for executeCouncilRun decomposition
// ---------------------------------------------------------------------------

/** Result of dynamically importing all UseCase modules. Null when import fails. */
interface UseCaseModules {
  EvidenceEvaluatorUseCase: (new (llm: any) => any) | null;
  PoamArchitectUseCase: (new (llm: any) => any) | null;
  CLevelBoardTranslatorUseCase: (new (llm: any) => any) | null;
  IncidentTriagerUseCase: (new (llm: any) => any) | null;
  VendorScannerUseCase: (new (llm: any) => any) | null;
  RopaAnalyzerUseCase: (new (llm: any) => any) | null;
  DpiaAssessorUseCase: (new (llm: any) => any) | null;
}

/** Return value from a single agent dispatch step. */
interface AgentStepResult {
  payload: any;
  summaryOverride?: string;
}

/** Handler signature for a specialized agent in the dispatch map. */
type AgentHandler = (
  currentPayload: any,
  inputData: Record<string, unknown>,
  organizationId: string,
  run: any
) => Promise<AgentStepResult>;

/** Map from agent name â†’ handler function. */
type AgentDispatchMap = Record<string, AgentHandler>;

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
    organization_id: string;
    assessment_id: string;
    target_framework_id: string;
    trace_id: string;
    agents: FunctionalAgentId[]; // E.g., ["evidence_evaluator", "compliance_arbiter"]
    input: Record<string, unknown>;
  }): Promise<{ run_id: string; status: string }> {
    // We create a root orchestrator run
    const context: AgentRuntimeContext = {
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
  async executeCouncilRun(runId: string, organizationId: string): Promise<AgentRunResponse> {
    const run = await this.runtimeService.getRun(runId, organizationId);
    if (!run) throw new AgentRuntimeError("NOT_FOUND", "Council run not found");

    const inputData = (run.metadata as Record<string, unknown>)?.input as Record<string, unknown>;
    const agents = (run.metadata as Record<string, unknown>)?.agents as string[] ?? [];

    // Dynamically load UseCases from the current context
    const modules = await this.loadUseCaseModules();
    const llmProvider = (this.runtimeService as any).deps.llm; // Safely grabbing the LLM from DI
    const dispatch = this.buildAgentDispatcher(modules, llmProvider);

    // Process pipeline sequentially
    let currentPayload: any = inputData;
    let finalSummary = "Council execution completed.";

    for (const agentName of agents) {
      const result = await this.dispatchSingleAgent(
        agentName, dispatch, currentPayload, inputData, organizationId, run
      );
      currentPayload = result.payload;
      if (result.summaryOverride) {
        finalSummary = result.summaryOverride;
      }
    }

    const finalOutput = this.buildCouncilOutput(finalSummary, agents, currentPayload, inputData);

    return await this.runtimeService.completeRun(runId, {
      context: {
        organization_id: run.organization_id,
        assessment_id: run.assessment_id,
        trace_id: run.trace_id,
        framework_id: (run as any).framework_id ?? "",
        scf_version_id: (run as any).scf_version_id ?? "latest"
      },
      output: finalOutput
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers extracted from executeCouncilRun to reduce cognitive complexity
  // ---------------------------------------------------------------------------

  /**
   * Dynamically imports all UseCase modules, returning null for any that fail to load.
   */
  private async loadUseCaseModules(): Promise<UseCaseModules> {
    const [
      evidenceEvaluator,
      poamArchitect,
      cLevelTranslator,
      incidentTriager,
      vendorScanner,
      ropaAnalyzer,
      dpiaAssessor,
    ] = await Promise.all([
      import("./usecases/evidence-evaluator").catch(() => ({ EvidenceEvaluatorUseCase: null })),
      import("./usecases/poam-architect").catch(() => ({ PoamArchitectUseCase: null })),
      import("./usecases/c-level-translator").catch(() => ({ CLevelBoardTranslatorUseCase: null })),
      import("./usecases/incident-triager").catch(() => ({ IncidentTriagerUseCase: null })),
      import("./usecases/vendor-scanner").catch(() => ({ VendorScannerUseCase: null })),
      import("./usecases/ropa-analyzer").catch(() => ({ RopaAnalyzerUseCase: null })),
      import("./usecases/dpia-assessor").catch(() => ({ DpiaAssessorUseCase: null })),
    ]);

    return {
      EvidenceEvaluatorUseCase: evidenceEvaluator.EvidenceEvaluatorUseCase,
      PoamArchitectUseCase: poamArchitect.PoamArchitectUseCase,
      CLevelBoardTranslatorUseCase: cLevelTranslator.CLevelBoardTranslatorUseCase,
      IncidentTriagerUseCase: incidentTriager.IncidentTriagerUseCase,
      VendorScannerUseCase: vendorScanner.VendorScannerUseCase,
      RopaAnalyzerUseCase: ropaAnalyzer.RopaAnalyzerUseCase,
      DpiaAssessorUseCase: dpiaAssessor.DpiaAssessorUseCase,
    };
  }

  /**
   * Builds a dispatch map from agent name to handler function.
   * Each handler receives (currentPayload, inputData, organizationId, run) and returns an AgentStepResult.
   */
  private buildAgentDispatcher(
    modules: UseCaseModules,
    llmProvider: any
  ): AgentDispatchMap {
    const dispatch: AgentDispatchMap = {};

    if (modules.EvidenceEvaluatorUseCase) {
      dispatch["evidence_evaluator"] = async (currentPayload, _inputData, organizationId) => {
        const evaluator = new modules.EvidenceEvaluatorUseCase!(llmProvider);
        const payload = await evaluator.evaluate({
          controlRequirement: currentPayload.controlObjective || "Ensure proper configuration",
          evidenceDescription: currentPayload.evidenceText || "",
          organizationId: organizationId,
        });
        return { payload };
      };
    }

    if (modules.PoamArchitectUseCase) {
      dispatch["poam_architect"] = async (currentPayload, inputData, organizationId, run) => {
        const architect = new modules.PoamArchitectUseCase!(llmProvider);
        const payload = await architect.architect({
          evidenceContext: currentPayload,
          systemArchitectureDescription: inputData.systemArchitectureDescription as string || "Default Architecture",
          organizationId: run.organization_id,
          frameworkId: (run as any).framework_id ?? (run.metadata as any)?.framework_id,
        });
        return { payload };
      };
    }

    if (modules.CLevelBoardTranslatorUseCase) {
      dispatch["board_translator"] = async (currentPayload, inputData, organizationId) => {
        const translator = new modules.CLevelBoardTranslatorUseCase!(llmProvider);
        const payload = await translator.translate({
          poamPlan: currentPayload,
          regulatoryContext: inputData.regulatoryContext as string || "Standard Compliance Framework",
          organizationId: organizationId,
        });
        return { payload, summaryOverride: payload.executive_summary };
      };
    }

    if (modules.IncidentTriagerUseCase) {
      dispatch["incident_triager"] = async (currentPayload, inputData, organizationId) => {
        const triager = new modules.IncidentTriagerUseCase!(llmProvider);
        const payload = await triager.triage({
          rawLogsExcerpt: currentPayload.rawLogsExcerpt || inputData.rawLogsExcerpt || "",
          systemModuleName: currentPayload.systemModuleName || inputData.systemModuleName || "Unknown",
          organizationId: organizationId,
        });
        const result: AgentStepResult = { payload };
        if (payload.severity_level === "critical") {
          result.summaryOverride = "CRITICAL security incident triaged.";
        }
        return result;
      };
    }

    if (modules.VendorScannerUseCase) {
      dispatch["vendor_scanner"] = async (currentPayload, inputData, organizationId) => {
        const scanner = new modules.VendorScannerUseCase!(llmProvider);
        const payload = await scanner.scan({
          contractExcerpt: currentPayload.contractExcerpt || inputData.contractExcerpt || "",
          vendorName: currentPayload.vendorName || inputData.vendorName || "Unknown Vendor",
          organizationId: organizationId,
        });
        return { payload };
      };
    }

    if (modules.RopaAnalyzerUseCase) {
      dispatch["ropa_analyzer"] = async (currentPayload, inputData, _organizationId, _run) => {
        const analyzer = new modules.RopaAnalyzerUseCase!(llmProvider);
        const payload = await analyzer.analyze({
          naturalLanguageDescription: currentPayload.naturalLanguageDescription || inputData.naturalLanguageDescription || "",
          organizationId: _organizationId,
        });
        return { payload };
      };
    }

    if (modules.DpiaAssessorUseCase) {
      dispatch["dpia_assessor"] = async (currentPayload, inputData, organizationId) => {
        const assessor = new modules.DpiaAssessorUseCase!(llmProvider);
        const payload = await assessor.assess({
          ropaContext: currentPayload,
          projectDescription: inputData.projectDescription as string || "General data processing project",
          organizationId: organizationId,
        });
        const result: AgentStepResult = { payload };
        if (payload.residual_risk_level === "high" || payload.residual_risk_level === "critical") {
          result.summaryOverride = "High-Risk DPIA Requires Board Sign-off.";
        }
        return result;
      };
    }

    return dispatch;
  }

  /**
   * Dispatches a single agent step, falling back to the generic executor when
   * no specialized handler is registered for the given agent name.
   */
  private async dispatchSingleAgent(
    agentName: string,
    dispatch: AgentDispatchMap,
    currentPayload: any,
    inputData: Record<string, unknown>,
    organizationId: string,
    run: any
  ): Promise<AgentStepResult> {
    const handler = dispatch[agentName];
    if (handler) {
      return handler(currentPayload, inputData, organizationId, run);
    }

    // Fallback to generic functional agent execution via executor
    // For a deep DAG, we would enqueue it. Here we await it directly.
    // This represents the Functional Tool-using Agent execution
    const genericRun = await this.executor.execute({
      agent_id: agentName as any,
      agent_version: "1.0.0",
      prompt_version: "1.0",
      model: "orchestrator",
      context: {
        organization_id: run.organization_id,
        assessment_id: run.assessment_id,
        framework_id: (run.metadata as any)?.framework_id ?? "",
        scf_version_id: "latest",
        trace_id: run.trace_id,
      },
      input: { prior_output: currentPayload },
    });

    const payload = (genericRun.metadata as any)?.FinalOutput || (genericRun as any).summary;
    return { payload };
  }

  /**
   * Assembles the final council output object.
   * Council orchestrates agents; it does NOT write final findings directly (AGENTS.md Â§10).
   */
  private buildCouncilOutput(
    finalSummary: string,
    agents: string[],
    currentPayload: any,
    inputData: Record<string, unknown>
  ) {
    return {
      summary: finalSummary,
      assumptions: [],
      limitations: [],
      sources: agents,
      confidence_score: 0.95,
      writes_final_finding: false, // Council orchestrates agents; it does NOT write final findings directly (AGENTS.md Â§10)
      creates_official_mapping: false,
      metadata: { final_payload: currentPayload, input_data: inputData },
    };
  }

  // Atomic Steps for Cloudflare Workflows SDK Integration

  async executeEvidenceEvaluator(organizationId: string, currentPayload: any): Promise<any> {
    const { EvidenceEvaluatorUseCase } = await import("./usecases/evidence-evaluator");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const evaluator = new EvidenceEvaluatorUseCase(llmProvider);
    return await evaluator.evaluate({
        controlRequirement: currentPayload.controlObjective || "Ensure proper configuration",
        evidenceDescription: currentPayload.evidenceText || "",
        organizationId: organizationId
    });
  }

  async executePoamArchitect(organizationId: string, currentPayload: any, inputData: any): Promise<any> {
    const { PoamArchitectUseCase } = await import("./usecases/poam-architect");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const architect = new PoamArchitectUseCase(llmProvider);
    return await architect.architect({
        evidenceContext: currentPayload,
        systemArchitectureDescription: inputData.systemArchitectureDescription as string || "Default Architecture",
        organizationId: organizationId,
        frameworkId: inputData.frameworkId
    });
  }

  async executeBoardTranslator(organizationId: string, currentPayload: any, inputData: any): Promise<any> {
    const { CLevelBoardTranslatorUseCase } = await import("./usecases/c-level-translator");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const translator = new CLevelBoardTranslatorUseCase(llmProvider);
    return await translator.translate({
        poamPlan: currentPayload,
        regulatoryContext: inputData.regulatoryContext as string || "Standard Compliance Framework",
        organizationId: organizationId
    });
  }

  async executeIncidentTriager(organizationId: string, currentPayload: any, inputData: any): Promise<any> {
    const { IncidentTriagerUseCase } = await import("./usecases/incident-triager");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const triager = new IncidentTriagerUseCase(llmProvider);
    return await triager.triage({
        rawLogsExcerpt: currentPayload.rawLogsExcerpt || inputData.rawLogsExcerpt || "",
        systemModuleName: currentPayload.systemModuleName || inputData.systemModuleName || "Unknown",
        organizationId: organizationId
    });
  }

  async executeVendorScanner(organizationId: string, currentPayload: any, inputData: any): Promise<any> {
    const { VendorScannerUseCase } = await import("./usecases/vendor-scanner");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const scanner = new VendorScannerUseCase(llmProvider);
    return await scanner.scan({
        contractExcerpt: currentPayload.contractExcerpt || inputData.contractExcerpt || "",
        vendorName: currentPayload.vendorName || inputData.vendorName || "Unknown Vendor",
        organizationId: organizationId
    });
  }

  async executeRopaAnalyzer(organizationId: string, currentPayload: any, inputData: any): Promise<any> {
    const { RopaAnalyzerUseCase } = await import("./usecases/ropa-analyzer");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const analyzer = new RopaAnalyzerUseCase(llmProvider);
    return await analyzer.analyze({
        naturalLanguageDescription: currentPayload.naturalLanguageDescription || inputData.naturalLanguageDescription || "",
        organizationId: organizationId
    });
  }

  async executeDpiaAssessor(organizationId: string, currentPayload: any, inputData: any): Promise<any> {
    const { DpiaAssessorUseCase } = await import("./usecases/dpia-assessor");
    const llmProvider = (this.runtimeService as any).deps.llm;
    const assessor = new DpiaAssessorUseCase(llmProvider);
    return await assessor.assess({
        ropaContext: currentPayload,
        projectDescription: inputData.projectDescription as string || "General data processing project",
        organizationId: organizationId
    });
  }

  async executeGenericAgent(organizationId: string, agentName: string, currentPayload: any, run: any, inputData: any): Promise<any> {
    const genericRun = await this.executor.execute({
        agent_id: agentName as any,
        agent_version: "1.0.0",
        prompt_version: "1.0",
        model: "orchestrator",
        context: {
           organization_id: organizationId,
           assessment_id: run.assessment_id,
           framework_id: (run.metadata as any)?.framework_id ?? "",
           scf_version_id: "latest",
           trace_id: run.trace_id,
        },
        input: { prior_output: currentPayload }
    });
    return (genericRun.metadata as any)?.FinalOutput || (genericRun as any).summary;
  }

  async finalizeCouncilRun(runId: string, organizationId: string, finalPayload: any, finalSummary: string, inputData: any): Promise<AgentRunResponse> {
    const run = await this.runtimeService.getRun(runId, organizationId);
    if (!run) throw new AgentRuntimeError("NOT_FOUND", "Council run not found");

    const finalOutput = {
      summary: finalSummary,
      assumptions: [],
      limitations: [],
      sources: (run.metadata as Record<string, unknown>)?.agents as string[] ?? [],
      confidence_score: 0.95,
      writes_final_finding: false, // Council orchestrates agents; it does NOT write final findings directly (AGENTS.md Â§10)
      creates_official_mapping: false,
      metadata: { final_payload: finalPayload, input_data: inputData }
    };

    return await this.runtimeService.completeRun(runId, {
      context: {
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


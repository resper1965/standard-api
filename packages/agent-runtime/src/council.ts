/**
 * @module council
 * @description Privacy Council — multi-step agentic pipeline for ROPA-style
 * data-protection impact assessments.
 *
 * Each step enriches a shared CouncilPayload that accumulates findings from
 * specialised assessors:
 *   1. DataFlowMapper   → maps personal-data flows
 *   2. RiskAssessor     → evaluates risk per flow
 *   3. ComplianceChecker→ checks regulatory alignment
 *   4. DPIAAssessor     → produces DPIA narrative
 *
 * The pipeline is intentionally sequential so each assessor can consume the
 * output of the previous one(s).  An AgentContext carries LLM config to
 * the assessors without coupling them to a specific provider.
 */

import type { AgentContext, AgentRun } from "./types";

// ── Assessor contracts ──────────────────────────────────────────────

export interface CouncilPayload {
  ropaContext: string;
  dataFlows?: string;
  riskAnalysis?: string;
  complianceFindings?: string;
  dpiaReport?: string;
}

interface DataFlowMapperInput {
  ropaContext: string;
  systemArchitectureDescription: string;
  tenantId: string;
}

interface RiskAssessorInput {
  ropaContext: string;
  dataFlows: string;
  tenantId: string;
}

interface ComplianceCheckerInput {
  ropaContext: string;
  regulatoryContext: string;
  tenantId: string;
}

interface DPIAAssessorInput {
  ropaContext: string;
  projectDescription: string;
  tenantId: string;
}

export interface Assessor<TInput, TOutput> {
  assess(input: TInput): Promise<TOutput>;
}

// ── Concrete assessor stubs (replaced by LLM-backed implementations) ─

const createDataFlowMapper = (_ctx: AgentContext): Assessor<DataFlowMapperInput, CouncilPayload> => ({
  async assess(input) {
    return {
      ropaContext: input.ropaContext,
      dataFlows: `[DataFlowMapper] Mapped flows for architecture: ${input.systemArchitectureDescription.slice(0, 80)}…`,
    };
  },
});

const createRiskAssessor = (_ctx: AgentContext): Assessor<RiskAssessorInput, CouncilPayload> => ({
  async assess(input) {
    return {
      ropaContext: input.ropaContext,
      dataFlows: input.dataFlows,
      riskAnalysis: `[RiskAssessor] Analysed risks across ${(input.dataFlows ?? "").length} chars of flow data.`,
    };
  },
});

const createComplianceChecker = (_ctx: AgentContext): Assessor<ComplianceCheckerInput, CouncilPayload> => ({
  async assess(input) {
    return {
      ropaContext: input.ropaContext,
      complianceFindings: `[ComplianceChecker] Checked against: ${input.regulatoryContext.slice(0, 80)}…`,
    };
  },
});

const createDPIAAssessor = (_ctx: AgentContext): Assessor<DPIAAssessorInput, CouncilPayload> => ({
  async assess(input) {
    return {
      ropaContext: input.ropaContext,
      dpiaReport: `[DPIAAssessor] DPIA report for: ${input.projectDescription.slice(0, 80)}…`,
    };
  },
});

// ── Pipeline orchestrator ───────────────────────────────────────────

export const runPrivacyCouncil = async (
  run: AgentRun,
  ctx: AgentContext,
): Promise<CouncilPayload> => {
  const tenantId = run.tenantId ?? "unknown";
  const inputData = (run.metadata as Record<string, unknown>)?.input as Record<string, unknown>;

  let currentPayload: CouncilPayload = {
    ropaContext: (inputData.ropaContext as string) || "No ROPA context provided.",
  };

  // Step 1 — Data Flow Mapping
  const mapper = createDataFlowMapper(ctx);
  currentPayload = await mapper.assess({
    ropaContext: currentPayload.ropaContext,
    systemArchitectureDescription: (inputData.systemArchitectureDescription as string) || "Standard SaaS architecture",
    tenantId,
  });

  // Step 2 — Risk Assessment
  const riskAssessor = createRiskAssessor(ctx);
  currentPayload = await riskAssessor.assess({
    ropaContext: currentPayload.ropaContext,
    dataFlows: currentPayload.dataFlows ?? "",
    tenantId,
  });

  // Step 3 — Compliance Check
  const complianceChecker = createComplianceChecker(ctx);
  currentPayload = await complianceChecker.assess({
    ropaContext: currentPayload.ropaContext,
    regulatoryContext: (inputData.regulatoryContext as string) || "GDPR, LGPD",
    tenantId,
  });

  // Step 4 — DPIA Assessment
  const assessor = createDPIAAssessor(ctx);
  currentPayload = await assessor.assess({
    ropaContext: currentPayload.ropaContext,
    projectDescription: (inputData.projectDescription as string) || "General data processing project",
    tenantId,
  });

  return currentPayload;
};

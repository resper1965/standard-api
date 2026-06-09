/**
 * Gap Analysis Execution Service (LLM-integrated)
 *
 * Orchestrates the full gap analysis pipeline:
 * 1. Iterate approved SoA items
 * 2. Query Vectorize for candidate evidence
 * 3. LLM evidence classification (EvidenceClassificationPrompt)
 * 4. LLM gap identification (GapIdentificationPrompt)
 * 5. Persist findings with full traceability
 * 6. Compute aggregated summary
 *
 * AGENTS.md §10: All outputs are schema-validated via structured output.
 * AGENTS.md §9:  KB is evidence source, not normative authority.
 * AGENTS.md §8:  SCF structured data is normative truth.
 * AGENTS.md §7:  All data carries organization_id, assessment_id, trace_id.
 */
import type { LlmProvider, LlmResponseCache } from "@standard/agent-runtime";
import {
  EvidenceClassificationPrompt,
  PROMPT_VERSION_EVIDENCE_CLASSIFICATION,
  type EvidenceClassificationOutput,
  GapIdentificationPrompt,
  PROMPT_VERSION_GAP_IDENTIFICATION,
  type GapIdentificationOutput,
} from "@standard/agent-runtime";
import { KbSearchService } from "@standard/kb";
import {
  assertActor,
  assertContext,
  GapAnalysisWorkflowError,
} from "../errors";
import type {
  EvidenceFindingResponse,
  GapAnalysisContext,
  GapAnalysisDependencies,
  GapAnalysisVersionResponse,
  GapFindingResponse,
  KbSearchResult,
  SoaItemResponse,
  SoaVersionResponse,
} from "../types";

// ── Types ────────────────────────────────────────────────────────────

export type GapAnalysisExecutionConfig = {
  /** LLM model identifier for evidence classification */
  classificationModel: string;
  /** LLM model identifier for gap identification */
  gapModel: string;
  /** Optional LLM response cache */
  cache?: LlmResponseCache;
  /** Token usage telemetry callback */
  onUsage?: (usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }) => void;
  /** Top-K KB search results to retrieve per SoA item */
  topK?: number;
};

export type GapAnalysisExecutionResult = {
  version: GapAnalysisVersionResponse;
  findings: GapFindingResponse[];
  evidenceFindings: EvidenceFindingResponse[];
  summary: GapAnalysisSummary;
  totalTokensUsed: number;
};

export type GapAnalysisSummary = {
  total_findings: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
  by_gap_type: Record<string, number>;
  requires_validation_count: number;
  mean_confidence: number;
};

const snippet = (value: string): string =>
  value.length <= 300 ? value : `${value.slice(0, 297)}...`;

// ── Service ──────────────────────────────────────────────────────────

export class GapAnalysisExecutionService {
  private readonly classificationPrompt: EvidenceClassificationPrompt;
  private readonly gapPrompt: GapIdentificationPrompt;
  private readonly topK: number;
  private totalTokensUsed = 0;

  constructor(
    private readonly deps: GapAnalysisDependencies,
    private readonly llmProvider: LlmProvider,
    config: GapAnalysisExecutionConfig,
  ) {
    const usageTracker = (usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    }) => {
      this.totalTokensUsed += usage.total_tokens;
      config.onUsage?.(usage);
    };

    this.classificationPrompt = new EvidenceClassificationPrompt({
      provider: llmProvider,
      model: config.classificationModel,
      onUsage: usageTracker,
      ...(config.cache !== undefined ? { cache: config.cache } : {}),
    });

    this.gapPrompt = new GapIdentificationPrompt({
      provider: llmProvider,
      model: config.gapModel,
      onUsage: usageTracker,
      ...(config.cache !== undefined ? { cache: config.cache } : {}),
    });

    this.topK = config.topK ?? 5;
  }

  /**
   * Execute full gap analysis for an assessment against an approved SoA.
   * Creates a new gap analysis version with all findings.
   */
  async execute(
    assessmentId: string,
    soaVersionId: string,
    context: GapAnalysisContext,
  ): Promise<GapAnalysisExecutionResult> {
    assertContext(context);
    assertActor(context);
    if (assessmentId !== context.assessmentId) {
      throw new GapAnalysisWorkflowError(
        "TENANT_CONTEXT_MISMATCH",
        "Assessment id does not match context.",
      );
    }

    this.totalTokensUsed = 0;

    // 1. Validate SoA is approved
    const soaVersion = await this.getApprovedSoa(soaVersionId, context);

    // 2. Get all SoA items
    const soaItems = await this.deps.soa.repositories.items.listByVersion(
      soaVersionId,
      context.organizationId,
    );
    if (soaItems.length === 0) {
      throw new GapAnalysisWorkflowError(
        "EMPTY_SOA",
        "SoA contains no items to analyze.",
      );
    }

    // 3. Create gap analysis version
    const existingVersions =
      await this.deps.repositories.gapVersions.listByAssessment(
        assessmentId,
        context.organizationId,
      );
    const version: GapAnalysisVersionResponse = {
      gap_analysis_version_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: assessmentId,
      version_number: existingVersions.length + 1,
      status: "draft",
      source_soa_version_id: soaVersion.soa_version_id,
      framework_id: soaVersion.source_framework_id,
      scf_version_id: soaVersion.scf_version_id,
      created_by: context.actorId!,
      created_at: new Date().toISOString(),
      trace_id: context.traceId,
      metadata: {
        prompt_versions: {
          evidence_classification: PROMPT_VERSION_EVIDENCE_CLASSIFICATION,
          gap_identification: PROMPT_VERSION_GAP_IDENTIFICATION,
        },
        execution_mode: "llm_assisted",
      },
    };

    // 4. Process each SoA item through the LLM pipeline
    const allGapFindings: GapFindingResponse[] = [];
    const allEvidenceFindings: EvidenceFindingResponse[] = [];

    for (let i = 0; i < soaItems.length; i++) {
      const item = soaItems[i];
      if (!item) continue;
      const { evidenceFinding, gapFinding } = await this.processItem(
        item,
        context,
        soaVersion,
        version,
        i + 1,
      );
      allEvidenceFindings.push(evidenceFinding);
      allGapFindings.push(gapFinding);
    }

    // 5. Persist everything
    await this.deps.repositories.gapVersions.save(version);
    for (const ef of allEvidenceFindings) {
      const existing =
        await this.deps.repositories.evidenceFindings.findBySoaItem(
          ef.soa_item_id,
          context.organizationId,
        );
      if (existing) await this.deps.repositories.evidenceFindings.update(ef);
      else await this.deps.repositories.evidenceFindings.save(ef);
    }
    await this.deps.repositories.gapFindings.saveMany(allGapFindings);

    // 6. Compute summary
    const summary = this.computeSummary(allGapFindings);

    return {
      version,
      findings: allGapFindings,
      evidenceFindings: allEvidenceFindings,
      summary,
      totalTokensUsed: this.totalTokensUsed,
    };
  }

  /**
   * Process a single SoA item through the full LLM pipeline:
   * KB search → Evidence Classification → Gap Identification
   */
  private async processItem(
    soaItem: SoaItemResponse,
    context: GapAnalysisContext,
    soaVersion: SoaVersionResponse,
    gapVersion: GapAnalysisVersionResponse,
    index: number,
  ): Promise<{
    evidenceFinding: EvidenceFindingResponse;
    gapFinding: GapFindingResponse;
  }> {
    const now = new Date().toISOString();

    // Step 1: KB Search
    const kbResults = await this.searchKb(soaItem, context);

    // Step 2: LLM Evidence Classification
    const classificationResult = await this.classifyEvidence(
      soaItem,
      kbResults,
      context,
    );
    const classification = classificationResult.data;

    // Step 3: Build and persist evidence finding
    const existingFinding =
      await this.deps.repositories.evidenceFindings.findBySoaItem(
        soaItem.soa_item_id,
        context.organizationId,
      );
    const evidenceFinding: EvidenceFindingResponse = {
      evidence_finding_id:
        existingFinding?.evidence_finding_id ?? crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      soa_version_id: soaVersion.soa_version_id,
      soa_item_id: soaItem.soa_item_id,
      framework_id: soaItem.framework_id,
      framework_requirement_id: soaItem.framework_requirement_id,
      scf_version_id: soaItem.scf_version_id,
      ...(soaItem.scf_control_id
        ? { scf_control_id: soaItem.scf_control_id }
        : {}),
      evidence_strength: classification.evidence_strength,
      evidence_status: classification.evidence_status,
      evidence_summary: classification.evidence_summary,
      evidence_limitations: classification.evidence_limitations,
      confidence_score: classification.confidence_score,
      trace_id: context.traceId,
      created_at: existingFinding?.created_at ?? now,
      updated_at: now,
    };

    // Step 3b: Persist evidence sources
    await this.deps.repositories.evidenceSources.saveMany(
      this.toSources(evidenceFinding, kbResults, context),
    );

    // Step 4: LLM Gap Identification
    const gapResult = await this.identifyGap(soaItem, classification, context);
    const gap = gapResult.data;

    // Step 5: Build gap finding
    const gapFinding: GapFindingResponse = {
      gap_finding_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      gap_analysis_version_id: gapVersion.gap_analysis_version_id,
      soa_version_id: soaItem.soa_version_id,
      soa_item_id: soaItem.soa_item_id,
      framework_id: soaItem.framework_id,
      framework_requirement_id: soaItem.framework_requirement_id,
      scf_version_id: soaItem.scf_version_id,
      ...(soaItem.scf_control_id
        ? { scf_control_id: soaItem.scf_control_id }
        : {}),
      evidence_finding_id: evidenceFinding.evidence_finding_id,
      gap_code: `GAP-${String(index).padStart(3, "0")}`,
      assessment_status: gap.assessment_status,
      gap_type: gap.gap_type,
      severity: gap.severity,
      // MCR enrichment deferred to Iniciativa 4 (Gap×STRM linkage).
      is_mcr_gap: false,
      gap_summary: gap.gap_summary,
      gap_rationale: gap.gap_rationale,
      recommendation_summary: gap.recommendation_summary,
      responsibility_type: "internal",
      confidence_score: gap.confidence_score,
      requires_user_validation: gap.requires_user_validation,
      created_at: now,
      updated_at: now,
    };

    return { evidenceFinding, gapFinding };
  }

  // ── KB Search ────────────────────────────────────────────────────────

  private async searchKb(
    item: SoaItemResponse,
    context: GapAnalysisContext,
  ): Promise<KbSearchResult[]> {
    if (!this.deps.kb) return [];
    try {
      const response = await new KbSearchService(this.deps.kb).semanticSearch(
        {
          organizationId: context.organizationId,
          assessmentId: context.assessmentId,
          ...(context.actorId ? { actorId: context.actorId } : {}),
          traceId: context.traceId,
        },
        {
          query: `${item.framework_requirement_id} ${item.scf_control_id ?? ""}`,
          search_type: "semantic",
          filters: {},
          top_k: this.topK,
          include_context: false,
        },
      );
      return response.data;
    } catch {
      // KB unavailable should not block gap analysis
      return [];
    }
  }

  // ── LLM Classification ──────────────────────────────────────────────

  private async classifyEvidence(
    soaItem: SoaItemResponse,
    kbResults: KbSearchResult[],
    context: GapAnalysisContext,
  ) {
    return this.classificationPrompt.classify({
      controlId: soaItem.scf_control_id ?? soaItem.framework_requirement_id,
      controlRequirement: soaItem.framework_requirement_id, // Will be enriched with SCF data
      frameworkRequirementId: soaItem.framework_requirement_id,
      evidenceSnippets: kbResults.map((r) => ({
        snippet: r.snippet,
        source: r.document_title ?? r.document_id,
        retrievalScore: r.score,
      })),
      organizationId: context.organizationId,
    });
  }

  // ── LLM Gap Identification ──────────────────────────────────────────

  private async identifyGap(
    soaItem: SoaItemResponse,
    classification: EvidenceClassificationOutput,
    context: GapAnalysisContext,
  ) {
    return this.gapPrompt.identify({
      controlId: soaItem.scf_control_id ?? soaItem.framework_requirement_id,
      controlRequirement: soaItem.framework_requirement_id,
      frameworkRequirementId: soaItem.framework_requirement_id,
      evidenceClassification: {
        evidence_strength: classification.evidence_strength,
        evidence_status: classification.evidence_status,
        evidence_summary: classification.evidence_summary,
        confidence_score: classification.confidence_score,
        supporting_quotes: classification.supporting_quotes,
      },
      soaApplicabilityStatus: soaItem.applicability_status ?? "applicable",
      ...(soaItem.non_applicability_rationale !== undefined
        ? { soaNonApplicabilityRationale: soaItem.non_applicability_rationale }
        : {}),
      organizationId: context.organizationId,
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private toSources(
    finding: EvidenceFindingResponse,
    kbResults: KbSearchResult[],
    context: GapAnalysisContext,
  ) {
    return kbResults.map((result) => ({
      evidence_source_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      evidence_finding_id: finding.evidence_finding_id,
      document_id: result.document_id,
      chunk_id: result.chunk_id,
      ...(result.vector_reference_id
        ? { vector_reference_id: result.vector_reference_id }
        : {}),
      source_type: result.document_type,
      ...(result.document_title ? { source_title: result.document_title } : {}),
      ...(result.page_number
        ? { source_location: `page:${result.page_number}` }
        : {}),
      snippet: snippet(result.snippet),
      retrieval_score: result.score,
      retrieval_method: result.retrieval_method,
      candidate_evidence: true,
      created_at: new Date().toISOString(),
    }));
  }

  private computeSummary(findings: GapFindingResponse[]): GapAnalysisSummary {
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byGapType: Record<string, number> = {};
    let validationCount = 0;
    let totalConfidence = 0;

    for (const f of findings) {
      byStatus[f.assessment_status] = (byStatus[f.assessment_status] ?? 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
      byGapType[f.gap_type] = (byGapType[f.gap_type] ?? 0) + 1;
      if (f.requires_user_validation) validationCount++;
      totalConfidence += f.confidence_score;
    }

    return {
      total_findings: findings.length,
      by_status: byStatus,
      by_severity: bySeverity,
      by_gap_type: byGapType,
      requires_validation_count: validationCount,
      mean_confidence:
        findings.length > 0 ? totalConfidence / findings.length : 0,
    };
  }

  private async getApprovedSoa(
    soaVersionId: string,
    context: GapAnalysisContext,
  ): Promise<SoaVersionResponse> {
    const soaVersion = await this.deps.soa.repositories.versions.get(
      soaVersionId,
      context.organizationId,
    );
    if (
      !soaVersion ||
      soaVersion.assessment_id !== context.assessmentId ||
      soaVersion.status !== "approved"
    ) {
      throw new GapAnalysisWorkflowError(
        "APPROVED_SOA_REQUIRED",
        "Gap Analysis requires an approved SoA.",
      );
    }
    return soaVersion;
  }
}

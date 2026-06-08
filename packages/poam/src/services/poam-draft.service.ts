import { MATURITY_UNAVAILABLE_LIMITATION } from "../constants";
import { assertActor, assertContext, PoamWorkflowError } from "../errors";
import type {
  CreatePoamDraftOptions,
  GapFindingResponse,
  MaturityScoreReference,
  PoamDependencies,
  PoamItemFilters,
  PoamItemResponse,
  PoamVersionResponse,
  PoamContext,
} from "../types";
import { PoamPrioritizationService } from "./poam-prioritization.service";
import { PoamSchedulingService } from "./poam-scheduling.service";

const actionableStatuses = new Set([
  "not_met",
  "partially_met",
  "not_evidenced",
  "requires_validation",
  "not_applicable_not_justified",
]);

export class PoamDraftService {
  private readonly prioritization = new PoamPrioritizationService();
  private readonly scheduling = new PoamSchedulingService();

  constructor(private readonly deps: PoamDependencies) {}

  async createPoamDraft(
    assessmentId: string,
    gapAnalysisVersionId: string,
    options: CreatePoamDraftOptions = {},
    context: PoamContext,
  ): Promise<PoamVersionResponse> {
    assertContext(context);
    assertActor(context);
    if (assessmentId !== context.assessmentId)
      throw new PoamWorkflowError(
        "POAM_CONTEXT_REQUIRED",
        "Assessment id must match POA&M context.",
      );
    const gapVersion = await this.deps.gapAnalysis.repositories.gapVersions.get(
      gapAnalysisVersionId,
      context.organizationId,
    );
    if (
      !gapVersion ||
      gapVersion.assessment_id !== context.assessmentId ||
      gapVersion.status !== "approved"
    ) {
      throw new PoamWorkflowError(
        "APPROVED_GAP_ANALYSIS_REQUIRED",
        "POA&M draft requires an approved Gap Analysis version.",
      );
    }

    const versions = await this.deps.repositories.versions.listByAssessment(
      assessmentId,
      context.organizationId,
    );
    const maturityVersion = options.maturity_assessment_version_id
      ? {
          maturity_assessment_version_id:
            options.maturity_assessment_version_id,
          status: "approved" as const,
        }
      : await this.deps.maturity?.findApprovedOrDraftByAssessment(
          assessmentId,
          context.organizationId,
        );
    const limitations = maturityVersion
      ? []
      : [MATURITY_UNAVAILABLE_LIMITATION];
    const now = new Date().toISOString();
    const version: PoamVersionResponse = {
      poam_version_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      version_number: versions.length + 1,
      status: "draft",
      source_gap_analysis_version_id: gapVersion.gap_analysis_version_id,
      ...(maturityVersion
        ? {
            source_maturity_assessment_version_id:
              maturityVersion.maturity_assessment_version_id,
          }
        : {}),
      framework_id: gapVersion.framework_id,
      scf_version_id: gapVersion.scf_version_id,
      created_by: context.actorId!,
      created_at: now,
      trace_id: context.traceId,
      metadata: {
        limitations,
        assumptions: [
          "Generated from approved Gap Analysis findings using conservative MVP rules.",
        ],
        source_status: maturityVersion?.status,
      },
    };
    await this.deps.repositories.versions.save(version);

    const gapFindings =
      await this.deps.gapAnalysis.repositories.gapFindings.listByVersion(
        gapAnalysisVersionId,
        context.organizationId,
      );
    const items = await this.generateItems(
      version,
      gapFindings,
      maturityVersion?.maturity_assessment_version_id,
      context,
    );
    await this.deps.repositories.items.saveMany(items);
    for (const item of items)
      await this.deps.repositories.milestones.saveMany(
        this.scheduling.generateMilestones(item),
      );
    await this.deps.repositories.dependencies.saveMany(
      this.scheduling.detectDependencies(items),
    );
    return version;
  }

  async regeneratePoamDraft(
    poamVersionId: string,
    options: CreatePoamDraftOptions = {},
    context: PoamContext,
  ): Promise<PoamVersionResponse> {
    const existing = await this.getPoamVersion(poamVersionId, context);
    if (existing.status === "approved")
      throw new PoamWorkflowError(
        "POAM_IMMUTABLE",
        "Approved POA&M versions are immutable. Create a new draft version.",
      );
    return this.createPoamDraft(
      existing.assessment_id,
      existing.source_gap_analysis_version_id,
      options,
      context,
    );
  }

  async getPoamVersion(
    poamVersionId: string,
    context: PoamContext,
  ): Promise<PoamVersionResponse> {
    assertContext(context);
    const version = await this.deps.repositories.versions.get(
      poamVersionId,
      context.organizationId,
    );
    if (!version || version.assessment_id !== context.assessmentId)
      throw new PoamWorkflowError("POAM_NOT_FOUND", "POA&M version not found.");
    return version;
  }

  async listPoamVersions(
    assessmentId: string,
    context: PoamContext,
  ): Promise<PoamVersionResponse[]> {
    assertContext(context);
    if (assessmentId !== context.assessmentId)
      throw new PoamWorkflowError(
        "POAM_CONTEXT_REQUIRED",
        "Assessment id must match POA&M context.",
      );
    return this.deps.repositories.versions.listByAssessment(
      assessmentId,
      context.organizationId,
    );
  }

  async listPoamItems(
    poamVersionId: string,
    filters: PoamItemFilters,
    context: PoamContext,
  ): Promise<PoamItemResponse[]> {
    const version = await this.getPoamVersion(poamVersionId, context);
    return this.deps.repositories.items.listByVersion(
      version.poam_version_id,
      context.organizationId,
      filters,
    );
  }

  async getPoamItem(
    poamItemId: string,
    context: PoamContext,
  ): Promise<PoamItemResponse> {
    assertContext(context);
    const item = await this.deps.repositories.items.get(
      poamItemId,
      context.organizationId,
    );
    if (!item || item.assessment_id !== context.assessmentId)
      throw new PoamWorkflowError(
        "POAM_ITEM_NOT_FOUND",
        "POA&M item not found.",
      );
    return item;
  }

  private async generateItems(
    version: PoamVersionResponse,
    findings: GapFindingResponse[],
    maturityVersionId: string | undefined,
    context: PoamContext,
  ): Promise<PoamItemResponse[]> {
    const rawItems: {
      item: Omit<PoamItemResponse, "poam_code">;
      score: number;
    }[] = [];
    for (const finding of findings) {
      if (!this.shouldGenerateItem(finding)) continue;
      const maturityScore =
        maturityVersionId && finding.scf_control_id
          ? await this.deps.maturity?.findScoreByControl(
              maturityVersionId,
              finding.scf_control_id,
              context.organizationId,
            )
          : null;
      const scfControl = finding.scf_control_id
        ? await this.deps.scf?.controls.getControl(finding.scf_control_id)
        : null;
      const actionType = this.prioritization.determineActionType(finding);
      const priority = this.prioritization.calculatePriority(
        finding,
        maturityScore,
        scfControl,
      );
      const score = this.prioritization.calculatePriorityScore(
        finding,
        maturityScore,
        scfControl,
      );
      const effort = this.prioritization.suggestEffort(finding, actionType);
      const now = new Date().toISOString();
      rawItems.push({
        score,
        item: {
          poam_item_id: crypto.randomUUID(),
          organization_id: context.organizationId,
          assessment_id: context.assessmentId,
          poam_version_id: version.poam_version_id,
          related_gap_finding_id: finding.gap_finding_id,
          ...(maturityScore
            ? { source_maturity_score_id: maturityScore.maturity_score_id }
            : {}),
          soa_item_id: finding.soa_item_id,
          framework_id: finding.framework_id,
          framework_requirement_id: finding.framework_requirement_id,
          scf_version_id: finding.scf_version_id,
          ...(scfControl?.scf_domain_id
            ? { scf_domain_id: scfControl.scf_domain_id }
            : {}),
          ...(finding.scf_control_id
            ? { scf_control_id: finding.scf_control_id }
            : {}),
          corrective_action: this.correctiveActionFor(finding, actionType),
          action_type: actionType,
          priority,
          severity: this.prioritization.normalizeSeverity(finding.severity),
          risk_rating: this.prioritization.calculateRiskRating(
            finding,
            maturityScore,
          ),
          effort_estimate: effort,
          owner_role: this.ownerRoleFor(actionType),
          due_date: this.scheduling.suggestDueDate(priority, effort),
          ...(maturityScore
            ? { target_maturity_score: this.targetMaturityScore(maturityScore) }
            : {}),
          expected_evidence: this.expectedEvidenceFor(actionType),
          acceptance_criteria: this.acceptanceCriteriaFor(finding, actionType),
          dependencies_summary:
            "No blocking dependency detected in MVP generation.",
          status: "draft",
          rationale: `Generated from ${finding.assessment_status} ${finding.gap_type} finding ${finding.gap_code}.`,
          confidence_score: finding.confidence_score,
          requires_user_validation:
            finding.requires_user_validation ||
            finding.confidence_score < 0.5 ||
            actionType === "validation_required",
          created_at: now,
          updated_at: now,
        },
      });
    }

    // Sort descending by priority score
    rawItems.sort((a, b) => b.score - a.score);

    return rawItems.map((raw, idx) => ({
      ...raw.item,
      poam_code: `POAM-${String(idx + 1).padStart(3, "0")}`,
    })) as PoamItemResponse[];
  }

  private shouldGenerateItem(finding: GapFindingResponse): boolean {
    if (finding.assessment_status === "not_applicable_justified") return false;
    return actionableStatuses.has(finding.assessment_status);
  }

  private correctiveActionFor(
    finding: GapFindingResponse,
    actionType: string,
  ): string {
    if (actionType === "evidence_collection")
      return `Collect and validate missing evidence for ${finding.gap_code} before concluding implementation status.`;
    if (actionType === "validation_required")
      return `Validate applicability and remediation need for ${finding.gap_code} with a human reviewer.`;
    return `Remediate ${finding.gap_type} identified in ${finding.gap_code}: ${finding.recommendation_summary ?? finding.gap_summary}`;
  }

  private expectedEvidenceFor(actionType: string): string[] {
    if (actionType === "evidence_collection")
      return [
        "Accepted evidence artifact linked to the related SoA item.",
        "Reviewer note confirming evidence sufficiency.",
      ];
    if (actionType === "technical_implementation")
      return [
        "Implementation record or change ticket.",
        "Test or monitoring evidence showing the control operates as intended.",
      ];
    if (actionType === "monitoring_improvement")
      return [
        "Monitoring procedure or dashboard evidence.",
        "Review cadence evidence.",
      ];
    return [
      "Approved policy/procedure or validation record.",
      "Reviewer acceptance note.",
    ];
  }

  private acceptanceCriteriaFor(
    finding: GapFindingResponse,
    actionType: string,
  ): string[] {
    return [
      `Related gap ${finding.gap_code} is addressed or explicitly risk accepted.`,
      `Action type ${actionType} has supporting evidence attached or referenced.`,
    ];
  }

  private ownerRoleFor(actionType: string): string {
    if (
      actionType === "technical_implementation" ||
      actionType === "monitoring_improvement"
    )
      return "control_owner";
    if (actionType === "third_party_action") return "vendor_manager";
    return "compliance_owner";
  }

  private targetMaturityScore(score: MaturityScoreReference): number {
    if (score.score <= 1) return 3;
    if (score.score === 2) return 3;
    if (score.score === 3) return 4;
    return score.score;
  }
}

/**
 * @module poam.repository
 * @description Drizzle PostgreSQL repositories for POA&M.
 * Uses $inferSelect for type-safe row mapping.
 */
import { eq, and } from "drizzle-orm";
import { poamVersions, poamItems, poamMilestones, poamDependencies } from "@standard/schemas";
import type { PoamVersionResponse, PoamItemResponse, PoamMilestoneResponse, PoamDependencyResponse } from "@standard/schemas";
import type { PoamVersionRepository, PoamItemRepository, PoamMilestoneRepository, PoamDependencyRepository, PoamRepositories } from "@standard/poam";
import type { DbClient } from "./db";

export const createDrizzlePoamVersionRepository = (db: DbClient): PoamVersionRepository => ({
  async save(version: PoamVersionResponse) {
    await db.insert(poamVersions).values({
      id: version.poam_version_id,
      organizationId: version.organization_id,
      assessmentId: version.assessment_id,
      versionNumber: version.version_number,
      status: version.status,
      sourceGapAnalysisVersionId: version.source_gap_analysis_version_id,
      sourceMaturityAssessmentVersionId: version.source_maturity_assessment_version_id,
      frameworkId: version.framework_id,
      scfVersionId: version.scf_version_id,
      generatedByAgentRunId: version.generated_by_agent_run_id,
      createdBy: version.created_by,
      traceId: version.trace_id,
      metadata: version.metadata,
    }).onConflictDoNothing();
  },
  async update(version: PoamVersionResponse) {
    await db.update(poamVersions).set({
      status: version.status,
      submittedForReviewAt: version.submitted_for_review_at ? new Date(version.submitted_for_review_at) : undefined,
      approvedBy: version.approved_by,
      approvedAt: version.approved_at ? new Date(version.approved_at) : undefined,
      approvalEventId: version.approval_event_id,
      supersededBy: version.superseded_by,
      metadata: version.metadata,
      updatedAt: new Date(),
    }).where(eq(poamVersions.id, version.poam_version_id));
  },
  async get(poamVersionId, organizationId) {
    const [row] = await db.select().from(poamVersions)
      .where(eq(poamVersions.id, poamVersionId))
      .limit(1);
    return row ? mapPoamVersionRow(row) : null;
  },
  async listByAssessment(assessmentId, organizationId) {
    const rows = await db.select().from(poamVersions)
      .where(eq(poamVersions.assessmentId, assessmentId));
    return rows.map(mapPoamVersionRow);
  },
  withOrganization(organizationId) {
    return {
      save: async (version) => this.save(version),
      update: async (version) => this.update(version),
      get: async (poamVersionId) => this.get(poamVersionId, organizationId),
      listByAssessment: async (assessmentId) => this.listByAssessment(assessmentId, organizationId),
    };
  },
});

export const createDrizzlePoamItemRepository = (db: DbClient): PoamItemRepository => ({
  async saveMany(items: PoamItemResponse[]) {
    if (items.length === 0) return;
    await db.insert(poamItems).values(items.map(i => ({
      id: i.poam_item_id,
      organizationId: i.organization_id,
      assessmentId: i.assessment_id,
      poamVersionId: i.poam_version_id,
      relatedGapFindingId: i.related_gap_finding_id,
      sourceMaturityScoreId: i.source_maturity_score_id,
      soaItemId: i.soa_item_id,
      frameworkId: i.framework_id,
      frameworkRequirementId: i.framework_requirement_id,
      scfVersionId: i.scf_version_id,
      scfDomainId: i.scf_domain_id,
      scfControlId: i.scf_control_id,
      poamCode: i.poam_code,
      correctiveAction: i.corrective_action,
      actionType: i.action_type,
      priority: i.priority,
      severity: i.severity,
      riskRating: i.risk_rating,
      effortEstimate: i.effort_estimate,
      suggestedOwner: i.suggested_owner,
      ownerRole: i.owner_role,
      dueDate: i.due_date,
      targetMaturityScore: i.target_maturity_score,
      expectedEvidence: i.expected_evidence,
      acceptanceCriteria: i.acceptance_criteria,
      dependenciesSummary: i.dependencies_summary,
      status: i.status,
      rationale: i.rationale,
      confidenceScore: String(i.confidence_score),
      requiresUserValidation: i.requires_user_validation,
    }))).onConflictDoNothing();
  },
  async update(item: PoamItemResponse) {
    await db.update(poamItems).set({
      correctiveAction: item.corrective_action,
      actionType: item.action_type,
      priority: item.priority,
      severity: item.severity,
      riskRating: item.risk_rating,
      effortEstimate: item.effort_estimate,
      suggestedOwner: item.suggested_owner,
      ownerRole: item.owner_role,
      dueDate: item.due_date,
      targetMaturityScore: item.target_maturity_score,
      status: item.status,
      rationale: item.rationale,
      confidenceScore: String(item.confidence_score),
      requiresUserValidation: item.requires_user_validation,
      updatedAt: new Date(),
    }).where(eq(poamItems.id, item.poam_item_id));
  },
  async get(poamItemId, organizationId) {
    const [row] = await db.select().from(poamItems)
      .where(eq(poamItems.id, poamItemId))
      .limit(1);
    return row ? mapPoamItemRow(row) : null;
  },
  async listByVersion(poamVersionId, organizationId) {
    const rows = await db.select().from(poamItems)
      .where(eq(poamItems.poamVersionId, poamVersionId));
    return rows.map(mapPoamItemRow);
  },
  withOrganization(organizationId) {
    return {
      saveMany: async (items) => this.saveMany(items),
      update: async (item) => this.update(item),
      get: async (poamItemId) => this.get(poamItemId, organizationId),
      listByVersion: async (poamVersionId, filters) => this.listByVersion(poamVersionId, organizationId, filters),
    };
  },
});

export const createDrizzlePoamMilestoneRepository = (db: DbClient): PoamMilestoneRepository => ({
  async save(milestone: PoamMilestoneResponse) {
    await db.insert(poamMilestones).values({
      id: milestone.poam_milestone_id,
      organizationId: milestone.organization_id,
      assessmentId: milestone.assessment_id,
      poamItemId: milestone.poam_item_id,
      milestoneCode: milestone.milestone_code,
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.due_date,
      status: milestone.status,
      acceptanceCriteria: milestone.acceptance_criteria,
      expectedEvidence: milestone.expected_evidence,
    }).onConflictDoNothing();
  },
  async saveMany(milestones: PoamMilestoneResponse[]) {
    if (milestones.length === 0) return;
    await db.insert(poamMilestones).values(milestones.map(m => ({
      id: m.poam_milestone_id,
      organizationId: m.organization_id,
      assessmentId: m.assessment_id,
      poamItemId: m.poam_item_id,
      milestoneCode: m.milestone_code,
      title: m.title,
      description: m.description,
      dueDate: m.due_date,
      status: m.status,
      acceptanceCriteria: m.acceptance_criteria,
      expectedEvidence: m.expected_evidence,
    }))).onConflictDoNothing();
  },
  async update(milestone: PoamMilestoneResponse) {
    await db.update(poamMilestones).set({
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.due_date,
      status: milestone.status,
      acceptanceCriteria: milestone.acceptance_criteria,
      expectedEvidence: milestone.expected_evidence,
    }).where(eq(poamMilestones.id, milestone.poam_milestone_id));
  },
  async get(milestoneId, organizationId) {
    const [row] = await db.select().from(poamMilestones)
      .where(eq(poamMilestones.id, milestoneId))
      .limit(1);
    return row ? mapPoamMilestoneRow(row) : null;
  },
  async listByItem(poamItemId, organizationId) {
    const rows = await db.select().from(poamMilestones)
      .where(eq(poamMilestones.poamItemId, poamItemId));
    return rows.map(mapPoamMilestoneRow);
  },
  withOrganization(organizationId) {
    return {
      save: async (milestone) => this.save(milestone),
      saveMany: async (milestones) => this.saveMany(milestones),
      update: async (milestone) => this.update(milestone),
      get: async (milestoneId) => this.get(milestoneId, organizationId),
      listByItem: async (poamItemId) => this.listByItem(poamItemId, organizationId),
    };
  },
});

export const createDrizzlePoamDependencyRepository = (db: DbClient): PoamDependencyRepository => ({
  async save(dep: PoamDependencyResponse) {
    await db.insert(poamDependencies).values({
      id: dep.poam_dependency_id,
      organizationId: dep.organization_id,
      assessmentId: dep.assessment_id,
      poamItemId: dep.poam_item_id,
      dependsOnPoamItemId: dep.depends_on_poam_item_id,
      dependencyType: dep.dependency_type,
      description: dep.description,
    }).onConflictDoNothing();
  },
  async saveMany(deps: PoamDependencyResponse[]) {
    if (deps.length === 0) return;
    await db.insert(poamDependencies).values(deps.map(d => ({
      id: d.poam_dependency_id,
      organizationId: d.organization_id,
      assessmentId: d.assessment_id,
      poamItemId: d.poam_item_id,
      dependsOnPoamItemId: d.depends_on_poam_item_id,
      dependencyType: d.dependency_type,
      description: d.description,
    }))).onConflictDoNothing();
  },
  async listByItem(poamItemId, organizationId) {
    const rows = await db.select().from(poamDependencies)
      .where(eq(poamDependencies.poamItemId, poamItemId));
    return rows.map(mapPoamDependencyRow);
  },
  withOrganization(organizationId) {
    return {
      save: async (dep) => this.save(dep),
      saveMany: async (deps) => this.saveMany(deps),
      listByItem: async (poamItemId) => this.listByItem(poamItemId, organizationId),
    };
  },
});

export const createDrizzlePoamRepositories = (db: DbClient): PoamRepositories => ({
  versions: createDrizzlePoamVersionRepository(db),
  items: createDrizzlePoamItemRepository(db),
  milestones: createDrizzlePoamMilestoneRepository(db),
  dependencies: createDrizzlePoamDependencyRepository(db),
});

// --- Row mappers ---

type PoamVersionRow = typeof poamVersions.$inferSelect;
type PoamItemRow = typeof poamItems.$inferSelect;
type PoamMilestoneRow = typeof poamMilestones.$inferSelect;
type PoamDependencyRow = typeof poamDependencies.$inferSelect;

const mapPoamVersionRow = (row: PoamVersionRow): PoamVersionResponse => ({
  poam_version_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  version_number: row.versionNumber,
  status: row.status as PoamVersionResponse["status"],
  source_gap_analysis_version_id: row.sourceGapAnalysisVersionId ?? "",
  source_maturity_assessment_version_id: row.sourceMaturityAssessmentVersionId ?? undefined,
  framework_id: row.frameworkId ?? "",
  scf_version_id: row.scfVersionId ?? "",
  generated_by_agent_run_id: row.generatedByAgentRunId ?? undefined,
  created_by: row.createdBy ?? "system",
  created_at: row.createdAt.toISOString(),
  submitted_for_review_at: row.submittedForReviewAt?.toISOString(),
  approved_by: row.approvedBy ?? undefined,
  approved_at: row.approvedAt?.toISOString(),
  approval_event_id: row.approvalEventId ?? undefined,
  superseded_by: row.supersededBy ?? undefined,
  trace_id: row.traceId ?? "trace-not-set",
  metadata: {
    limitations: ((row.metadata as Record<string, unknown>)?.limitations as string[]) ?? [],
    assumptions: ((row.metadata as Record<string, unknown>)?.assumptions as string[]) ?? [],
    source_status: ((row.metadata as Record<string, unknown>)?.source_status as string) ?? undefined,
  },
});

const mapPoamItemRow = (row: PoamItemRow): PoamItemResponse => ({
  poam_item_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  poam_version_id: row.poamVersionId,
  related_gap_finding_id: row.relatedGapFindingId ?? undefined,
  source_maturity_score_id: row.sourceMaturityScoreId ?? undefined,
  soa_item_id: row.soaItemId ?? undefined,
  framework_id: row.frameworkId ?? "",
  framework_requirement_id: row.frameworkRequirementId ?? undefined,
  scf_version_id: row.scfVersionId ?? "",
  scf_domain_id: row.scfDomainId ?? undefined,
  scf_control_id: row.scfControlId ?? undefined,
  poam_code: row.poamCode,
  corrective_action: row.correctiveAction,
  action_type: row.actionType,
  priority: row.priority as PoamItemResponse["priority"],
  severity: row.severity,
  risk_rating: row.riskRating,
  effort_estimate: row.effortEstimate,
  suggested_owner: row.suggestedOwner ?? undefined,
  owner_role: row.ownerRole ?? undefined,
  due_date: row.dueDate ?? undefined,
  target_maturity_score: row.targetMaturityScore ?? undefined,
  expected_evidence: row.expectedEvidence,
  acceptance_criteria: row.acceptanceCriteria,
  dependencies_summary: row.dependenciesSummary ?? undefined,
  status: row.status,
  rationale: row.rationale,
  confidence_score: Number(row.confidenceScore),
  requires_user_validation: row.requiresUserValidation,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});

const mapPoamMilestoneRow = (row: PoamMilestoneRow): PoamMilestoneResponse => ({
  poam_milestone_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  poam_item_id: row.poamItemId,
  milestone_code: row.milestoneCode,
  title: row.title,
  description: row.description,
  due_date: row.dueDate ?? undefined,
  status: row.status,
  acceptance_criteria: row.acceptanceCriteria,
  expected_evidence: row.expectedEvidence,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});

const mapPoamDependencyRow = (row: PoamDependencyRow): PoamDependencyResponse => ({
  poam_dependency_id: row.id,
  organization_id: row.organizationId,
  assessment_id: row.assessmentId,
  poam_item_id: row.poamItemId,
  depends_on_poam_item_id: row.dependsOnPoamItemId ?? undefined,
  dependency_type: row.dependencyType,
  description: row.description,
  created_at: row.createdAt.toISOString(),
});


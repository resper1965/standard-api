import { assertActor, assertContext, PoamWorkflowError } from "../errors";
import type { CreatePoamMilestoneRequest, PoamContext, PoamDependencies, PoamMilestoneResponse, UpdatePoamMilestoneRequest } from "../types";

export class PoamMilestoneService {
  constructor(private readonly deps: PoamDependencies) {}

  async listMilestones(poamItemId: string, context: PoamContext): Promise<PoamMilestoneResponse[]> {
    const item = await this.requireItem(poamItemId, context);
    return this.deps.repositories.milestones.listByItem(item.poam_item_id, context.organizationId);
  }

  async createMilestone(poamItemId: string, request: CreatePoamMilestoneRequest, context: PoamContext): Promise<PoamMilestoneResponse> {
    assertActor(context);
    const item = await this.requireEditableItem(poamItemId, context);
    const count = (await this.deps.repositories.milestones.listByItem(poamItemId, context.organizationId)).length;
    const now = new Date().toISOString();
    const milestone: PoamMilestoneResponse = {
      poam_milestone_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      poam_item_id: item.poam_item_id,
      milestone_code: `${item.poam_code}-M${count + 1}`,
      title: request.title,
      description: request.description,
      ...(request.due_date ? { due_date: request.due_date } : {}),
      status: "draft",
      acceptance_criteria: request.acceptance_criteria,
      expected_evidence: request.expected_evidence,
      created_at: now,
      updated_at: now
    };
    await this.deps.repositories.milestones.save(milestone);
    return milestone;
  }

  async updateMilestone(milestoneId: string, patch: UpdatePoamMilestoneRequest, context: PoamContext): Promise<PoamMilestoneResponse> {
    assertActor(context);
    assertContext(context);
    const milestone = await this.deps.repositories.milestones.get(milestoneId, context.organizationId);
    if (!milestone || milestone.assessment_id !== context.assessmentId) throw new PoamWorkflowError("POAM_MILESTONE_NOT_FOUND", "POA&M milestone not found.");
    await this.requireEditableItem(milestone.poam_item_id, context);
    const next: PoamMilestoneResponse = { ...milestone, updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) (next as Record<string, unknown>)[key] = value;
    }
    await this.deps.repositories.milestones.update(next);
    return next;
  }

  private async requireItem(poamItemId: string, context: PoamContext) {
    assertContext(context);
    const item = await this.deps.repositories.items.get(poamItemId, context.organizationId);
    if (!item || item.assessment_id !== context.assessmentId) throw new PoamWorkflowError("POAM_ITEM_NOT_FOUND", "POA&M item not found.");
    return item;
  }

  private async requireEditableItem(poamItemId: string, context: PoamContext) {
    const item = await this.requireItem(poamItemId, context);
    const version = await this.deps.repositories.versions.get(item.poam_version_id, context.organizationId);
    if (!version || version.status === "approved") throw new PoamWorkflowError("POAM_IMMUTABLE", "Approved POA&M versions are immutable.");
    return item;
  }
}


import { assertActor, assertContext, SoaWorkflowError } from "../errors";
import type { CreateScopeRequest, ScopeResponse, SoaDependencies, SoaWorkflowContext, UpdateScopeRequest } from "../types";

const definedPatch = <T extends Record<string, unknown>>(patch: T): Partial<T> =>
  Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>;

export class ScopeService {
  constructor(private readonly deps: SoaDependencies) {}

  async createDraftScope(input: CreateScopeRequest, context: SoaWorkflowContext): Promise<ScopeResponse> {
    assertContext(context);
    assertActor(context);
    const now = new Date().toISOString();
    const existing = await this.deps.repositories.scopes.listByAssessment(context.assessmentId, context.tenantId);
    const scope: ScopeResponse = {
      scope_id: crypto.randomUUID(),
      tenant_id: context.tenantId,
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      scope_version: existing.length + 1,
      status: "draft",
      title: input.title,
      description: input.description,
      business_units: input.business_units ?? [],
      processes: input.processes ?? [],
      systems: input.systems ?? [],
      locations: input.locations ?? [],
      legal_entities: input.legal_entities ?? [],
      data_types: input.data_types ?? [],
      third_parties: input.third_parties ?? [],
      exclusions: input.exclusions ?? [],
      assumptions: input.assumptions ?? [],
      constraints: input.constraints ?? [],
      created_by: context.actorId!,
      created_at: now,
      updated_at: now,
      trace_id: context.traceId
    };
    await this.deps.repositories.scopes.save(scope);
    return scope;
  }

  async updateDraftScope(scopeId: string, patch: UpdateScopeRequest, context: SoaWorkflowContext): Promise<ScopeResponse> {
    assertContext(context);
    assertActor(context);
    const scope = await this.getScope(scopeId, context);
    if (scope.status !== "draft") throw new SoaWorkflowError("SCOPE_IMMUTABLE", "Only draft scopes can be updated.");
    const cleanPatch = definedPatch(patch) as Partial<ScopeResponse>;
    const updated: ScopeResponse = { ...scope, ...cleanPatch, updated_at: new Date().toISOString(), trace_id: context.traceId };
    await this.deps.repositories.scopes.update(updated);
    return updated;
  }

  async submitScopeForReview(scopeId: string, context: SoaWorkflowContext): Promise<ScopeResponse> {
    assertActor(context);
    const scope = await this.getScope(scopeId, context);
    if (scope.status !== "draft") throw new SoaWorkflowError("SCOPE_REVIEW_BLOCKED", "Only draft scopes can be submitted.");
    const updated = { ...scope, status: "under_review" as const, updated_at: new Date().toISOString(), trace_id: context.traceId };
    await this.deps.repositories.scopes.update(updated);
    return updated;
  }

  async approveScope(scopeId: string, approval: { approval_event_id?: string }, context: SoaWorkflowContext): Promise<ScopeResponse> {
    assertActor(context);
    if (!approval.approval_event_id) throw new SoaWorkflowError("APPROVAL_EVENT_REQUIRED", "Scope approval requires a human approval event.");
    const scope = await this.getScope(scopeId, context);
    const updated = {
      ...scope,
      status: "approved" as const,
      approval_event_id: approval.approval_event_id,
      updated_at: new Date().toISOString(),
      trace_id: context.traceId
    };
    await this.deps.repositories.scopes.update(updated);
    return updated;
  }

  async getScope(scopeId: string, context: SoaWorkflowContext): Promise<ScopeResponse> {
    assertContext(context);
    const scope = await this.deps.repositories.scopes.get(scopeId, context.tenantId);
    if (!scope || scope.assessment_id !== context.assessmentId) throw new SoaWorkflowError("SCOPE_NOT_FOUND", "Scope not found.");
    return scope;
  }

  listScopes(assessmentId: string, context: SoaWorkflowContext): Promise<ScopeResponse[]> {
    assertContext(context);
    return this.deps.repositories.scopes.listByAssessment(assessmentId, context.tenantId);
  }
}

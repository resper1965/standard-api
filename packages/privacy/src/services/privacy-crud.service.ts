import type {
  CreatePrivacyActivityRequest,
  UpdatePrivacyActivityRequest,
  PrivacyActivityResponse,
  CreatePrivacyDataSubjectRequest,
  PrivacyDataSubjectResponse,
  CreatePrivacyDataCategoryRequest,
  PrivacyDataCategoryResponse,
  CreatePrivacyThirdPartyRequest,
  PrivacyThirdPartyResponse,
  CreatePrivacyFieldReviewRequest,
  UpdatePrivacyFieldReviewRequest,
  PrivacyFieldReviewResponse,
} from "@standard/schemas";
import { PrivacyError } from "../errors";
import type { PrivacyContext, PrivacyDependencies, PrivacyActivityFilters } from "../types";

export class PrivacyCrudService {
  constructor(private readonly deps: PrivacyDependencies) {}

  // ─── Activity CRUD ──────────────────────────────────────────────

  async createActivity(
    request: CreatePrivacyActivityRequest,
    context: PrivacyContext
  ): Promise<PrivacyActivityResponse> {
    const now = new Date().toISOString();
    const activity: PrivacyActivityResponse = {
      id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: request.assessment_id ?? null,
      name: request.name,
      description: request.description ?? null,
      business_process: request.business_process ?? null,
      department_id: request.department_id ?? null,
      owner_person_id: request.owner_person_id ?? null,
      controller_role: request.controller_role ?? "unknown",
      status: "draft",
      purpose: request.purpose ?? null,
      // Multi-regime legal basis (global, Brazil first)
      privacy_regime: request.privacy_regime ?? "lgpd",
      legal_bases: request.legal_bases ?? [],
      legal_basis_lgpd: request.legal_basis_lgpd ?? null,
      legal_basis_detail: request.legal_basis_detail ?? null,
      retention_period: request.retention_period ?? null,
      retention_justification: request.retention_justification ?? null,
      third_party_sharing: request.third_party_sharing ?? false,
      international_transfer: request.international_transfer ?? false,
      automated_decision_making: request.automated_decision_making ?? false,
      large_scope_processing: request.large_scope_processing ?? false,
      vulnerable_subjects: request.vulnerable_subjects ?? false,
      systematic_monitoring: request.systematic_monitoring ?? false,
      security_measures_summary: request.security_measures_summary ?? null,
      dpia_required: request.dpia_required ?? null,
      lia_required: request.lia_required ?? null,
      tia_required: request.tia_required ?? null,
      risk_level: request.risk_level ?? null,
      created_by: context.actorId ?? null,
      metadata: {},
      created_at: now,
      updated_at: now,
    };

    await this.deps.repositories.activities.save(activity);
    return activity;
  }

  async getActivity(id: string, organizationId: string): Promise<PrivacyActivityResponse | null> {
    return this.deps.repositories.activities.get(id, organizationId);
  }

  async listActivities(organizationId: string, filters?: PrivacyActivityFilters): Promise<PrivacyActivityResponse[]> {
    return this.deps.repositories.activities.list(organizationId, filters);
  }

  async updateActivity(
    id: string,
    patch: UpdatePrivacyActivityRequest,
    context: PrivacyContext
  ): Promise<PrivacyActivityResponse> {
    const existing = await this.deps.repositories.activities.get(id, context.organizationId);
    if (!existing) throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${id} not found.`);
    if (existing.status === "archived") {
      throw new PrivacyError("ACTIVITY_ARCHIVED", "Cannot update an archived activity.");
    }

    const updated: PrivacyActivityResponse = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(patch).filter(([_, v]) => v !== undefined)
      ),
      updated_at: new Date().toISOString(),
    } as PrivacyActivityResponse;

    await this.deps.repositories.activities.update(updated);
    return updated;
  }

  async deleteActivity(id: string, context: PrivacyContext): Promise<void> {
    const existing = await this.deps.repositories.activities.get(id, context.organizationId);
    if (!existing) throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${id} not found.`);
    await this.deps.repositories.activities.softDelete(id, context.organizationId);
  }

  // ─── Data Subjects ────────────────────────────────────────────

  async addDataSubjects(
    activityId: string,
    subjects: CreatePrivacyDataSubjectRequest[],
    context: PrivacyContext
  ): Promise<PrivacyDataSubjectResponse[]> {
    const activity = await this.deps.repositories.activities.get(activityId, context.organizationId);
    if (!activity) throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${activityId} not found.`);

    const now = new Date().toISOString();
    const records: PrivacyDataSubjectResponse[] = subjects.map((s) => ({
      id: crypto.randomUUID(),
      organization_id: context.organizationId,
      activity_id: activityId,
      category: s.category,
      description: s.description ?? null,
      estimated_count: s.estimated_count ?? null,
      vulnerable_group: s.vulnerable_group ?? false,
      age_restrictions: s.age_restrictions ?? null,
      created_at: now,
      updated_at: now,
    }));

    await this.deps.repositories.dataSubjects.saveMany(records);
    return records;
  }

  async listDataSubjects(activityId: string, organizationId: string): Promise<PrivacyDataSubjectResponse[]> {
    return this.deps.repositories.dataSubjects.listByActivity(activityId, organizationId);
  }

  async removeDataSubject(subjectId: string, organizationId: string): Promise<void> {
    await this.deps.repositories.dataSubjects.remove(subjectId, organizationId);
  }

  // ─── Data Categories ──────────────────────────────────────────

  async addDataCategories(
    activityId: string,
    categories: CreatePrivacyDataCategoryRequest[],
    context: PrivacyContext
  ): Promise<PrivacyDataCategoryResponse[]> {
    const activity = await this.deps.repositories.activities.get(activityId, context.organizationId);
    if (!activity) throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${activityId} not found.`);

    const now = new Date().toISOString();
    const records: PrivacyDataCategoryResponse[] = categories.map((c) => ({
      id: crypto.randomUUID(),
      organization_id: context.organizationId,
      activity_id: activityId,
      category_name: c.category_name,
      sensitivity: c.sensitivity ?? "personal",
      specific_data_elements: c.specific_data_elements ?? [],
      source_of_data: c.source_of_data ?? null,
      retention_period: c.retention_period ?? null,
      created_at: now,
      updated_at: now,
    }));

    await this.deps.repositories.dataCategories.saveMany(records);
    return records;
  }

  async listDataCategories(activityId: string, organizationId: string): Promise<PrivacyDataCategoryResponse[]> {
    return this.deps.repositories.dataCategories.listByActivity(activityId, organizationId);
  }

  async removeDataCategory(categoryId: string, organizationId: string): Promise<void> {
    await this.deps.repositories.dataCategories.remove(categoryId, organizationId);
  }

  // ─── Phase 2: Third Parties ───────────────────────────────────

  async addThirdParties(
    activityId: string,
    parties: CreatePrivacyThirdPartyRequest[],
    context: PrivacyContext
  ): Promise<PrivacyThirdPartyResponse[]> {
    const activity = await this.deps.repositories.activities.get(activityId, context.organizationId);
    if (!activity) throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${activityId} not found.`);

    const now = new Date().toISOString();
    const records: PrivacyThirdPartyResponse[] = parties.map((p) => ({
      id: crypto.randomUUID(),
      organization_id: context.organizationId,
      activity_id: activityId,
      name: p.name,
      role: p.role ?? "processor",
      country: p.country ?? null,
      purpose: p.purpose ?? null,
      data_shared: p.data_shared ?? [],
      contract_reference: p.contract_reference ?? null,
      safeguards: p.safeguards ?? null,
      transfer_mechanism: p.transfer_mechanism ?? null,
      active: p.active ?? true,
      created_at: now,
      updated_at: now,
    }));

    await this.deps.repositories.thirdParties.saveMany(records);
    return records;
  }

  async listThirdParties(activityId: string, organizationId: string): Promise<PrivacyThirdPartyResponse[]> {
    return this.deps.repositories.thirdParties.listByActivity(activityId, organizationId);
  }

  async removeThirdParty(partyId: string, organizationId: string): Promise<void> {
    await this.deps.repositories.thirdParties.remove(partyId, organizationId);
  }

  // ─── Phase 4: Field Reviews ───────────────────────────────────

  async addFieldReview(
    activityId: string,
    request: CreatePrivacyFieldReviewRequest,
    context: PrivacyContext
  ): Promise<PrivacyFieldReviewResponse> {
    const activity = await this.deps.repositories.activities.get(activityId, context.organizationId);
    if (!activity) throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${activityId} not found.`);

    const now = new Date().toISOString();
    const review: PrivacyFieldReviewResponse = {
      id: crypto.randomUUID(),
      organization_id: context.organizationId,
      activity_id: activityId,
      field_name: request.field_name,
      review_status: "pending",
      reviewer_id: null,
      comment: request.comment ?? null,
      suggested_value: request.suggested_value ?? null,
      current_value: request.current_value ?? null,
      source: request.source ?? "human",
      reviewed_at: null,
      created_at: now,
      updated_at: now,
    };

    await this.deps.repositories.fieldReviews.save(review);
    return review;
  }

  async updateFieldReview(
    reviewId: string,
    update: UpdatePrivacyFieldReviewRequest,
    context: PrivacyContext
  ): Promise<PrivacyFieldReviewResponse> {
    const review = await this.deps.repositories.fieldReviews.get(reviewId, context.organizationId);
    if (!review) throw new PrivacyError("FIELD_REVIEW_NOT_FOUND", `Field review ${reviewId} not found.`);

    const updated: PrivacyFieldReviewResponse = {
      ...review,
      review_status: update.review_status,
      comment: update.comment ?? review.comment,
      reviewer_id: context.actorId ?? null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.deps.repositories.fieldReviews.update(updated);
    return updated;
  }

  async listFieldReviews(activityId: string, organizationId: string): Promise<PrivacyFieldReviewResponse[]> {
    return this.deps.repositories.fieldReviews.listByActivity(activityId, organizationId);
  }
}

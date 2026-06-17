import { eq, and, isNull, desc } from "drizzle-orm";
import {
  privacyProcessingActivities,
  privacyProcessingActivityDataSubjects,
  privacyProcessingActivityDataCategories,
  privacyProcessingActivityThirdParties,
  privacyProcessingActivityScreenings,
  privacyProcessingActivityFieldReviews,
  privacyProcessingActivityScfControls,
} from "@standard/schemas";
import type {
  PrivacyActivityResponse,
  PrivacyDataSubjectResponse,
  PrivacyDataCategoryResponse,
  PrivacyThirdPartyResponse,
  PrivacyScreeningResponse,
  PrivacyFieldReviewResponse,
  PrivacyScfControlResponse,
} from "@standard/schemas";
import type {
  PrivacyRepositories,
  PrivacyActivityRepository,
  PrivacyDataSubjectRepository,
  PrivacyDataCategoryRepository,
  PrivacyThirdPartyRepository,
  PrivacyScreeningRepository,
  PrivacyFieldReviewRepository,
  PrivacyScfControlRepository,
  PrivacyActivityFilters,
} from "@standard/privacy";
import type { DbClient } from "./db";

// â”€â”€â”€ Row Mapping Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Drizzle returns camelCase, API expects snake_case response shapes.
// These mappers are the single point of translation.

const toIsoOrNull = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null;

const toIso = (d: Date | null | undefined): string =>
  d ? d.toISOString() : new Date().toISOString();

function mapActivityRow(
  row: typeof privacyProcessingActivities.$inferSelect,
): PrivacyActivityResponse {
  return {
    id: row.id,
    organization_id: row.organizationId,
    assessment_id: row.assessmentId ?? null,
    name: row.name,
    description: row.description ?? null,
    business_process: row.businessProcess ?? null,
    department_id: row.departmentId ?? null,
    owner_person_id: row.ownerPersonId ?? null,
    controller_role:
      row.controllerRole as PrivacyActivityResponse["controller_role"],
    status: row.status as PrivacyActivityResponse["status"],
    purpose: row.purpose ?? null,
    // Multi-regime fields â€” stored in metadata JSON until schema catches up
    privacy_regime:
      ((row.metadata as Record<string, unknown>)
        ?.privacy_regime as PrivacyActivityResponse["privacy_regime"]) ??
      "lgpd",
    legal_bases:
      ((row.metadata as Record<string, unknown>)
        ?.legal_bases as PrivacyActivityResponse["legal_bases"]) ?? [],
    legal_basis_lgpd:
      (row.legalBasisLgpd as PrivacyActivityResponse["legal_basis_lgpd"]) ??
      null,
    legal_basis_detail: row.legalBasisDetail ?? null,
    retention_period: row.retentionPeriod ?? null,
    retention_justification: row.retentionJustification ?? null,
    third_party_sharing: row.thirdPartySharing,
    international_transfer: row.internationalTransfer,
    automated_decision_making: row.automatedDecisionMaking,
    large_scope_processing: row.largeScopeProcessing,
    vulnerable_subjects: row.vulnerableSubjects,
    systematic_monitoring: row.systematicMonitoring,
    security_measures_summary: row.securityMeasuresSummary ?? null,
    dpia_required: row.dpiaRequired ?? null,
    lia_required: row.liaRequired ?? null,
    tia_required: row.tiaRequired ?? null,
    risk_level: row.riskLevel ?? null,
    created_by: row.createdBy ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

function mapDataSubjectRow(
  row: typeof privacyProcessingActivityDataSubjects.$inferSelect,
): PrivacyDataSubjectResponse {
  return {
    id: row.id,
    organization_id: row.organizationId,
    activity_id: row.activityId,
    category: row.category as PrivacyDataSubjectResponse["category"],
    description: row.description ?? null,
    estimated_count: row.estimatedCount ?? null,
    vulnerable_group: row.vulnerableGroup,
    age_restrictions: row.ageRestrictions ?? null,
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

function mapDataCategoryRow(
  row: typeof privacyProcessingActivityDataCategories.$inferSelect,
): PrivacyDataCategoryResponse {
  return {
    id: row.id,
    organization_id: row.organizationId,
    activity_id: row.activityId,
    category_name: row.categoryName,
    sensitivity: row.sensitivity as PrivacyDataCategoryResponse["sensitivity"],
    specific_data_elements: (row.specificDataElements as string[]) ?? [],
    source_of_data: row.sourceOfData ?? null,
    retention_period: row.retentionPeriod ?? null,
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

function mapThirdPartyRow(
  row: typeof privacyProcessingActivityThirdParties.$inferSelect,
): PrivacyThirdPartyResponse {
  return {
    id: row.id,
    organization_id: row.organizationId,
    activity_id: row.activityId,
    name: row.name,
    role: row.role as PrivacyThirdPartyResponse["role"],
    country: row.country ?? null,
    purpose: row.purpose ?? null,
    data_shared: (row.dataShared as string[]) ?? [],
    contract_reference: row.contractReference ?? null,
    safeguards: row.safeguards ?? null,
    transfer_mechanism:
      (row.transferMechanism as PrivacyThirdPartyResponse["transfer_mechanism"]) ??
      null,
    active: row.active,
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

function mapScreeningRow(
  row: typeof privacyProcessingActivityScreenings.$inferSelect,
): PrivacyScreeningResponse {
  return {
    id: row.id,
    organization_id: row.organizationId,
    activity_id: row.activityId,
    screening_type:
      row.screeningType as PrivacyScreeningResponse["screening_type"],
    result: row.result as PrivacyScreeningResponse["result"],
    triggered_by: (row.triggeredBy as string[]) ?? [],
    risk_factors: (row.riskFactors as string[]) ?? [],
    recommendation: row.recommendation ?? null,
    screened_at: toIso(row.screenedAt),
    screened_by: row.screenedBy ?? null,
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

function mapFieldReviewRow(
  row: typeof privacyProcessingActivityFieldReviews.$inferSelect,
): PrivacyFieldReviewResponse {
  return {
    id: row.id,
    organization_id: row.organizationId,
    activity_id: row.activityId,
    field_name: row.fieldName,
    review_status:
      row.reviewStatus as PrivacyFieldReviewResponse["review_status"],
    reviewer_id: row.reviewerId ?? null,
    comment: row.comment ?? null,
    suggested_value: row.suggestedValue ?? null,
    current_value: row.currentValue ?? null,
    source: row.source as PrivacyFieldReviewResponse["source"],
    reviewed_at: toIsoOrNull(row.reviewedAt),
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

function mapScfControlRow(
  row: typeof privacyProcessingActivityScfControls.$inferSelect,
): PrivacyScfControlResponse {
  return {
    id: row.id,
    organization_id: row.organizationId,
    activity_id: row.activityId,
    scf_version: row.scfVersion ?? null,
    control_id: row.controlId ?? null,
    control_code: row.controlCode,
    control_title: row.controlTitle,
    scf_domain: row.scfDomain ?? null,
    applicability_status:
      row.applicabilityStatus as PrivacyScfControlResponse["applicability_status"],
    priority: row.priority as PrivacyScfControlResponse["priority"],
    justification: row.justification ?? null,
    expected_evidence: (row.expectedEvidence as string[]) ?? [],
    assessment_questions: (row.assessmentQuestions as string[]) ?? [],
    gaps: (row.gaps as string[]) ?? [],
    suggested_by: row.suggestedBy ?? null,
    reviewed_by: row.reviewedBy ?? null,
    reviewed_at: toIsoOrNull(row.reviewedAt),
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

// â”€â”€â”€ Drizzle Repository Implementations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createDrizzleActivityRepository = (
  db: DbClient,
): PrivacyActivityRepository => ({
  async save(activity) {
    await db
      .insert(privacyProcessingActivities)
      .values({
        id: activity.id,
        organizationId: activity.organization_id,
        assessmentId: activity.assessment_id ?? undefined,
        name: activity.name,
        description: activity.description,
        businessProcess: activity.business_process,
        departmentId: activity.department_id,
        ownerPersonId: activity.owner_person_id,
        controllerRole: activity.controller_role,
        status: activity.status,
        purpose: activity.purpose,
        legalBasisLgpd: activity.legal_basis_lgpd ?? undefined,
        legalBasisDetail: activity.legal_basis_detail,
        retentionPeriod: activity.retention_period,
        retentionJustification: activity.retention_justification,
        thirdPartySharing: activity.third_party_sharing,
        internationalTransfer: activity.international_transfer,
        automatedDecisionMaking: activity.automated_decision_making,
        largeScopeProcessing: activity.large_scope_processing,
        vulnerableSubjects: activity.vulnerable_subjects,
        systematicMonitoring: activity.systematic_monitoring,
        securityMeasuresSummary: activity.security_measures_summary,
        dpiaRequired: activity.dpia_required,
        liaRequired: activity.lia_required,
        tiaRequired: activity.tia_required,
        riskLevel: activity.risk_level,
        createdBy: activity.created_by,
        metadata: {
          ...activity.metadata,
          privacy_regime: activity.privacy_regime,
          legal_bases: activity.legal_bases,
        },
      } as any)
      .onConflictDoNothing();
  },

  async get(id, organizationId) {
    const [row] = await db
      .select()
      .from(privacyProcessingActivities)
      .where(
        and(
          eq(privacyProcessingActivities.id, id),
          isNull(privacyProcessingActivities.deletedAt),
        ),
      )
      .limit(1);
    return row ? mapActivityRow(row) : null;
  },

  async list(organizationId, filters?: PrivacyActivityFilters) {
    let query = db
      .select()
      .from(privacyProcessingActivities)
      .where(
        and(
          isNull(privacyProcessingActivities.deletedAt),
          ...(filters?.status
            ? [
                eq(
                  privacyProcessingActivities.status,
                  filters.status as (typeof privacyProcessingActivities.status.enumValues)[number],
                ),
              ]
            : []),
          ...(filters?.assessment_id
            ? [
                eq(
                  privacyProcessingActivities.assessmentId,
                  filters.assessment_id,
                ),
              ]
            : []),
        ),
      )
      .orderBy(desc(privacyProcessingActivities.createdAt))
      .$dynamic();

    if (filters?.limit) {
      query = query.limit(filters.limit).offset(filters.offset ?? 0);
    }

    const rows = await query;
    return rows.map(mapActivityRow);
  },

  async update(activity) {
    await db
      .update(privacyProcessingActivities)
      .set({
        name: activity.name,
        description: activity.description,
        businessProcess: activity.business_process,
        controllerRole: activity.controller_role,
        status: activity.status,
        purpose: activity.purpose,
        legalBasisLgpd: activity.legal_basis_lgpd ?? undefined,
        legalBasisDetail: activity.legal_basis_detail,
        retentionPeriod: activity.retention_period,
        retentionJustification: activity.retention_justification,
        thirdPartySharing: activity.third_party_sharing,
        internationalTransfer: activity.international_transfer,
        automatedDecisionMaking: activity.automated_decision_making,
        largeScopeProcessing: activity.large_scope_processing,
        vulnerableSubjects: activity.vulnerable_subjects,
        systematicMonitoring: activity.systematic_monitoring,
        securityMeasuresSummary: activity.security_measures_summary,
        dpiaRequired: activity.dpia_required,
        liaRequired: activity.lia_required,
        tiaRequired: activity.tia_required,
        riskLevel: activity.risk_level,
        metadata: {
          ...activity.metadata,
          privacy_regime: activity.privacy_regime,
          legal_bases: activity.legal_bases,
        },
        updatedAt: new Date(),
      } as any)
      .where(and(eq(privacyProcessingActivities.id, activity.id)));
  },

  async softDelete(id, organizationId) {
    await db
      .update(privacyProcessingActivities)
      .set({ deletedAt: new Date() })
      .where(and(eq(privacyProcessingActivities.id, id)));
  },
});

// â”€â”€â”€ Child Entity Repositories (shared pattern) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createDrizzleDataSubjectRepository = (
  db: DbClient,
): PrivacyDataSubjectRepository => ({
  async saveMany(subjects) {
    if (subjects.length === 0) return;
    await db
      .insert(privacyProcessingActivityDataSubjects)
      .values(
        subjects.map(
          (s) =>
            ({
              id: s.id,
              organizationId: s.organization_id,
              activityId: s.activity_id,
              category: s.category,
              description: s.description,
              estimatedCount: s.estimated_count,
              vulnerableGroup: s.vulnerable_group,
              ageRestrictions: s.age_restrictions,
            }) as any,
        ),
      )
      .onConflictDoNothing();
  },
  async listByActivity(activityId, organizationId) {
    const rows = await db
      .select()
      .from(privacyProcessingActivityDataSubjects)
      .where(
        and(
          eq(privacyProcessingActivityDataSubjects.activityId, activityId),
          isNull(privacyProcessingActivityDataSubjects.deletedAt),
        ),
      );
    return rows.map(mapDataSubjectRow);
  },
  async remove(id, organizationId) {
    await db
      .update(privacyProcessingActivityDataSubjects)
      .set({ deletedAt: new Date() })
      .where(and(eq(privacyProcessingActivityDataSubjects.id, id)));
  },
});

const createDrizzleDataCategoryRepository = (
  db: DbClient,
): PrivacyDataCategoryRepository => ({
  async saveMany(categories) {
    if (categories.length === 0) return;
    await db
      .insert(privacyProcessingActivityDataCategories)
      .values(
        categories.map(
          (c) =>
            ({
              id: c.id,
              organizationId: c.organization_id,
              activityId: c.activity_id,
              categoryName: c.category_name,
              sensitivity: c.sensitivity,
              specificDataElements: c.specific_data_elements,
              sourceOfData: c.source_of_data,
              retentionPeriod: c.retention_period,
            }) as any,
        ),
      )
      .onConflictDoNothing();
  },
  async listByActivity(activityId, organizationId) {
    const rows = await db
      .select()
      .from(privacyProcessingActivityDataCategories)
      .where(
        and(
          eq(privacyProcessingActivityDataCategories.activityId, activityId),
          isNull(privacyProcessingActivityDataCategories.deletedAt),
        ),
      );
    return rows.map(mapDataCategoryRow);
  },
  async remove(id, organizationId) {
    await db
      .update(privacyProcessingActivityDataCategories)
      .set({ deletedAt: new Date() })
      .where(and(eq(privacyProcessingActivityDataCategories.id, id)));
  },
});

const createDrizzleThirdPartyRepository = (
  db: DbClient,
): PrivacyThirdPartyRepository => ({
  async saveMany(parties) {
    if (parties.length === 0) return;
    await db
      .insert(privacyProcessingActivityThirdParties)
      .values(
        parties.map(
          (p) =>
            ({
              id: p.id,
              organizationId: p.organization_id,
              activityId: p.activity_id,
              name: p.name,
              role: p.role,
              country: p.country,
              purpose: p.purpose,
              dataShared: p.data_shared,
              contractReference: p.contract_reference,
              safeguards: p.safeguards,
              transferMechanism: p.transfer_mechanism ?? undefined,
              active: p.active,
            }) as any,
        ),
      )
      .onConflictDoNothing();
  },
  async listByActivity(activityId, organizationId) {
    const rows = await db
      .select()
      .from(privacyProcessingActivityThirdParties)
      .where(
        and(eq(privacyProcessingActivityThirdParties.activityId, activityId)),
      );
    return rows.map(mapThirdPartyRow);
  },
  async remove(id, organizationId) {
    await db
      .delete(privacyProcessingActivityThirdParties)
      .where(and(eq(privacyProcessingActivityThirdParties.id, id)));
  },
});

const createDrizzleScreeningRepository = (
  db: DbClient,
): PrivacyScreeningRepository => ({
  async save(screening) {
    await db
      .insert(privacyProcessingActivityScreenings)
      .values({
        id: screening.id,
        organizationId: screening.organization_id,
        activityId: screening.activity_id,
        screeningType: screening.screening_type,
        result: screening.result,
        triggeredBy: screening.triggered_by,
        riskFactors: screening.risk_factors,
        recommendation: screening.recommendation,
        screenedAt: screening.screened_at
          ? new Date(screening.screened_at)
          : new Date(),
        screenedBy: screening.screened_by,
      } as any)
      .onConflictDoNothing();
  },
  async listByActivity(activityId, organizationId) {
    const rows = await db
      .select()
      .from(privacyProcessingActivityScreenings)
      .where(
        and(eq(privacyProcessingActivityScreenings.activityId, activityId)),
      )
      .orderBy(desc(privacyProcessingActivityScreenings.createdAt));
    return rows.map(mapScreeningRow);
  },
});

const createDrizzleFieldReviewRepository = (
  db: DbClient,
): PrivacyFieldReviewRepository => ({
  async save(review) {
    await db
      .insert(privacyProcessingActivityFieldReviews)
      .values({
        id: review.id,
        organizationId: review.organization_id,
        activityId: review.activity_id,
        fieldName: review.field_name,
        reviewStatus: review.review_status,
        reviewerId: review.reviewer_id,
        comment: review.comment,
        suggestedValue: review.suggested_value,
        currentValue: review.current_value,
        source: review.source,
        reviewedAt: review.reviewed_at
          ? new Date(review.reviewed_at)
          : undefined,
      } as any)
      .onConflictDoNothing();
  },
  async listByActivity(activityId, organizationId) {
    const rows = await db
      .select()
      .from(privacyProcessingActivityFieldReviews)
      .where(
        and(eq(privacyProcessingActivityFieldReviews.activityId, activityId)),
      )
      .orderBy(desc(privacyProcessingActivityFieldReviews.createdAt));
    return rows.map(mapFieldReviewRow);
  },
  async get(id, organizationId) {
    const [row] = await db
      .select()
      .from(privacyProcessingActivityFieldReviews)
      .where(and(eq(privacyProcessingActivityFieldReviews.id, id)))
      .limit(1);
    return row ? mapFieldReviewRow(row) : null;
  },
  async update(review) {
    await db
      .update(privacyProcessingActivityFieldReviews)
      .set({
        reviewStatus: review.review_status,
        reviewerId: review.reviewer_id,
        comment: review.comment,
        reviewedAt: review.reviewed_at
          ? new Date(review.reviewed_at)
          : new Date(),
        updatedAt: new Date(),
      } as any)
      .where(and(eq(privacyProcessingActivityFieldReviews.id, review.id)));
  },
});

const createDrizzleScfControlRepository = (
  db: DbClient,
): PrivacyScfControlRepository => ({
  async saveMany(controls) {
    if (controls.length === 0) return;
    await db
      .insert(privacyProcessingActivityScfControls)
      .values(
        controls.map(
          (c) =>
            ({
              id: c.id,
              organizationId: c.organization_id,
              activityId: c.activity_id,
              scfVersion: c.scf_version,
              controlId: c.control_id,
              controlCode: c.control_code,
              controlTitle: c.control_title,
              scfDomain: c.scf_domain,
              applicabilityStatus: c.applicability_status,
              priority: c.priority,
              justification: c.justification,
              expectedEvidence: c.expected_evidence,
              assessmentQuestions: c.assessment_questions,
              gaps: c.gaps,
              suggestedBy: c.suggested_by,
              reviewedBy: c.reviewed_by,
              reviewedAt: c.reviewed_at ? new Date(c.reviewed_at) : undefined,
            }) as any,
        ),
      )
      .onConflictDoNothing();
  },
  async listByActivity(activityId, organizationId) {
    const rows = await db
      .select()
      .from(privacyProcessingActivityScfControls)
      .where(
        and(eq(privacyProcessingActivityScfControls.activityId, activityId)),
      );
    return rows.map(mapScfControlRow);
  },
  async remove(id, organizationId) {
    await db
      .delete(privacyProcessingActivityScfControls)
      .where(and(eq(privacyProcessingActivityScfControls.id, id)));
  },
});

// â”€â”€â”€ Factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const createDrizzlePrivacyRepositories = (
  db: DbClient,
): PrivacyRepositories => ({
  activities: createDrizzleActivityRepository(db),
  dataSubjects: createDrizzleDataSubjectRepository(db),
  dataCategories: createDrizzleDataCategoryRepository(db),
  thirdParties: createDrizzleThirdPartyRepository(db),
  screenings: createDrizzleScreeningRepository(db),
  fieldReviews: createDrizzleFieldReviewRepository(db),
  scfControls: createDrizzleScfControlRepository(db),
});

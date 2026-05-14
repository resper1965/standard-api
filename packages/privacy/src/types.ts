import type {
  PrivacyActivityResponse,
  PrivacyDataSubjectResponse,
  PrivacyDataCategoryResponse,
  PrivacyThirdPartyResponse,
  PrivacyScreeningResponse,
  PrivacyFieldReviewResponse,
  PrivacyScfControlResponse,
} from "@standard/schemas";
import type { ScfRepository } from "@standard/scf-core";

// ─── Privacy Context ────────────────────────────────────────────────

export type PrivacyContext = {
  tenantId: string;
  actorId?: string | undefined;
  traceId: string;
};

// ─── List Filters ───────────────────────────────────────────────────

export type PrivacyActivityFilters = {
  status?: string | undefined;
  assessment_id?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
};

// ─── Repositories ───────────────────────────────────────────────────

export type PrivacyActivityRepository = {
  save(activity: PrivacyActivityResponse): Promise<void>;
  get(id: string, tenantId: string): Promise<PrivacyActivityResponse | null>;
  list(tenantId: string, filters?: PrivacyActivityFilters): Promise<PrivacyActivityResponse[]>;
  update(activity: PrivacyActivityResponse): Promise<void>;
  softDelete(id: string, tenantId: string): Promise<void>;
};

export type PrivacyDataSubjectRepository = {
  saveMany(subjects: PrivacyDataSubjectResponse[]): Promise<void>;
  listByActivity(activityId: string, tenantId: string): Promise<PrivacyDataSubjectResponse[]>;
  remove(id: string, tenantId: string): Promise<void>;
};

export type PrivacyDataCategoryRepository = {
  saveMany(categories: PrivacyDataCategoryResponse[]): Promise<void>;
  listByActivity(activityId: string, tenantId: string): Promise<PrivacyDataCategoryResponse[]>;
  remove(id: string, tenantId: string): Promise<void>;
};

export type PrivacyThirdPartyRepository = {
  saveMany(parties: PrivacyThirdPartyResponse[]): Promise<void>;
  listByActivity(activityId: string, tenantId: string): Promise<PrivacyThirdPartyResponse[]>;
  remove(id: string, tenantId: string): Promise<void>;
};

export type PrivacyScreeningRepository = {
  save(screening: PrivacyScreeningResponse): Promise<void>;
  listByActivity(activityId: string, tenantId: string): Promise<PrivacyScreeningResponse[]>;
};

export type PrivacyFieldReviewRepository = {
  save(review: PrivacyFieldReviewResponse): Promise<void>;
  listByActivity(activityId: string, tenantId: string): Promise<PrivacyFieldReviewResponse[]>;
  get(id: string, tenantId: string): Promise<PrivacyFieldReviewResponse | null>;
  update(review: PrivacyFieldReviewResponse): Promise<void>;
};

export type PrivacyScfControlRepository = {
  saveMany(controls: PrivacyScfControlResponse[]): Promise<void>;
  listByActivity(activityId: string, tenantId: string): Promise<PrivacyScfControlResponse[]>;
  remove(id: string, tenantId: string): Promise<void>;
};

export type PrivacyRepositories = {
  activities: PrivacyActivityRepository;
  dataSubjects: PrivacyDataSubjectRepository;
  dataCategories: PrivacyDataCategoryRepository;
  thirdParties: PrivacyThirdPartyRepository;
  screenings: PrivacyScreeningRepository;
  fieldReviews: PrivacyFieldReviewRepository;
  scfControls: PrivacyScfControlRepository;
};

// ─── Dependencies ───────────────────────────────────────────────────

export type PrivacyDependencies = {
  repositories: PrivacyRepositories;
  /** Optional SCF repository for normative anchoring. When absent, rules fall back to hardcoded. */
  scfRepository?: ScfRepository;
};

// Re-export schema types for convenience
export type {
  PrivacyActivityResponse,
  PrivacyDataSubjectResponse,
  PrivacyDataCategoryResponse,
  PrivacyThirdPartyResponse,
  PrivacyScreeningResponse,
  PrivacyFieldReviewResponse,
  PrivacyScfControlResponse,
};

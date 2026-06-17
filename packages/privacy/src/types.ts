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

// â”€â”€â”€ Privacy Context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PrivacyContext = {
  organizationId: string;
  actorId?: string | undefined;
  traceId: string;
};

// â”€â”€â”€ List Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PrivacyActivityFilters = {
  status?: string | undefined;
  assessment_id?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
};

// â”€â”€â”€ Repositories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PrivacyActivityRepository = {
  save(activity: PrivacyActivityResponse): Promise<void>;
  get(id: string, organizationId: string): Promise<PrivacyActivityResponse | null>;
  list(organizationId: string, filters?: PrivacyActivityFilters): Promise<PrivacyActivityResponse[]>;
  update(activity: PrivacyActivityResponse): Promise<void>;
  softDelete(id: string, organizationId: string): Promise<void>;
};

export type PrivacyDataSubjectRepository = {
  saveMany(subjects: PrivacyDataSubjectResponse[]): Promise<void>;
  listByActivity(activityId: string, organizationId: string): Promise<PrivacyDataSubjectResponse[]>;
  remove(id: string, organizationId: string): Promise<void>;
};

export type PrivacyDataCategoryRepository = {
  saveMany(categories: PrivacyDataCategoryResponse[]): Promise<void>;
  listByActivity(activityId: string, organizationId: string): Promise<PrivacyDataCategoryResponse[]>;
  remove(id: string, organizationId: string): Promise<void>;
};

export type PrivacyThirdPartyRepository = {
  saveMany(parties: PrivacyThirdPartyResponse[]): Promise<void>;
  listByActivity(activityId: string, organizationId: string): Promise<PrivacyThirdPartyResponse[]>;
  remove(id: string, organizationId: string): Promise<void>;
};

export type PrivacyScreeningRepository = {
  save(screening: PrivacyScreeningResponse): Promise<void>;
  listByActivity(activityId: string, organizationId: string): Promise<PrivacyScreeningResponse[]>;
};

export type PrivacyFieldReviewRepository = {
  save(review: PrivacyFieldReviewResponse): Promise<void>;
  listByActivity(activityId: string, organizationId: string): Promise<PrivacyFieldReviewResponse[]>;
  get(id: string, organizationId: string): Promise<PrivacyFieldReviewResponse | null>;
  update(review: PrivacyFieldReviewResponse): Promise<void>;
};

export type PrivacyScfControlRepository = {
  saveMany(controls: PrivacyScfControlResponse[]): Promise<void>;
  listByActivity(activityId: string, organizationId: string): Promise<PrivacyScfControlResponse[]>;
  remove(id: string, organizationId: string): Promise<void>;
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

// â”€â”€â”€ Dependencies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


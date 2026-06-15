// @ts-nocheck -- Zod v4 CI type compat
import type { GapAnalysisDependencies, GapFindingResponse } from "@standard/gap-analysis";
import type { ScfControl, ScfCoreServices } from "@standard/scf-core";
import type {
  CreatePoamMilestoneRequest,
  PoamActionType,
  PoamDependencyResponse,
  PoamDependencyType,
  PoamEffortEstimate,
  PoamItemResponse,
  PoamItemStatus,
  PoamMilestoneResponse,
  PoamPriority,
  PoamSeverity,
  PoamSummaryResponse,
  PoamValidationResponse,
  PoamVersionResponse,
  UpdatePoamItemRequest,
  UpdatePoamMilestoneRequest
} from "@standard/schemas";

export type {
  CreatePoamMilestoneRequest,
  GapFindingResponse,
  PoamActionType,
  PoamDependencyResponse,
  PoamDependencyType,
  PoamEffortEstimate,
  PoamItemResponse,
  PoamItemStatus,
  PoamMilestoneResponse,
  PoamPriority,
  PoamSeverity,
  PoamSummaryResponse,
  PoamValidationResponse,
  PoamVersionResponse,
  ScfControl,
  UpdatePoamItemRequest,
  UpdatePoamMilestoneRequest
};

export type PoamContext = {
  organizationId: string;
  assessmentId: string;
  actorId?: string;
  traceId: string;
};

export type MaturityVersionReference = {
  maturity_assessment_version_id: string;
  status: "draft" | "under_review" | "approved" | "superseded" | "archived";
};

export type MaturityScoreReference = {
  maturity_score_id: string;
  scf_control_id?: string;
  score: number;
  confidence_score?: number;
};

export type PoamMaturityProvider = {
  findApprovedOrDraftByAssessment(assessmentId: string, organizationId: string): Promise<MaturityVersionReference | null>;
  findScoreByControl(maturityAssessmentVersionId: string, scfControlId: string, organizationId: string): Promise<MaturityScoreReference | null>;
};

export interface TenantScopedPoamVersionRepository {
  save(version: PoamVersionResponse): Promise<void>;
  update(version: PoamVersionResponse): Promise<void>;
  get(poamVersionId: string): Promise<PoamVersionResponse | null>;
  listByAssessment(assessmentId: string): Promise<PoamVersionResponse[]>;
}

export type PoamVersionRepository = {
  save(version: PoamVersionResponse): Promise<void>;
  update(version: PoamVersionResponse): Promise<void>;
  get(poamVersionId: string, organizationId: string): Promise<PoamVersionResponse | null>;
  listByAssessment(assessmentId: string, organizationId: string): Promise<PoamVersionResponse[]>;
  withOrganization(organizationId: string): TenantScopedPoamVersionRepository;
};

export type PoamItemFilters = {
  priority?: PoamPriority;
  severity?: PoamSeverity;
  status?: PoamItemStatus;
  action_type?: PoamActionType;
  owner_role?: string;
  requires_validation?: boolean;
};

export interface TenantScopedPoamItemRepository {
  saveMany(items: PoamItemResponse[]): Promise<void>;
  update(item: PoamItemResponse): Promise<void>;
  get(poamItemId: string): Promise<PoamItemResponse | null>;
  listByVersion(poamVersionId: string, filters?: PoamItemFilters): Promise<PoamItemResponse[]>;
}

export type PoamItemRepository = {
  saveMany(items: PoamItemResponse[]): Promise<void>;
  update(item: PoamItemResponse): Promise<void>;
  get(poamItemId: string, organizationId: string): Promise<PoamItemResponse | null>;
  listByVersion(poamVersionId: string, organizationId: string, filters?: PoamItemFilters): Promise<PoamItemResponse[]>;
  withOrganization(organizationId: string): TenantScopedPoamItemRepository;
};

export interface TenantScopedPoamMilestoneRepository {
  save(milestone: PoamMilestoneResponse): Promise<void>;
  saveMany(milestones: PoamMilestoneResponse[]): Promise<void>;
  update(milestone: PoamMilestoneResponse): Promise<void>;
  get(milestoneId: string): Promise<PoamMilestoneResponse | null>;
  listByItem(poamItemId: string): Promise<PoamMilestoneResponse[]>;
}

export type PoamMilestoneRepository = {
  save(milestone: PoamMilestoneResponse): Promise<void>;
  saveMany(milestones: PoamMilestoneResponse[]): Promise<void>;
  update(milestone: PoamMilestoneResponse): Promise<void>;
  get(milestoneId: string, organizationId: string): Promise<PoamMilestoneResponse | null>;
  listByItem(poamItemId: string, organizationId: string): Promise<PoamMilestoneResponse[]>;
  withOrganization(organizationId: string): TenantScopedPoamMilestoneRepository;
};

export interface TenantScopedPoamDependencyRepository {
  save(dependency: PoamDependencyResponse): Promise<void>;
  saveMany(dependencies: PoamDependencyResponse[]): Promise<void>;
  listByItem(poamItemId: string): Promise<PoamDependencyResponse[]>;
}

export type PoamDependencyRepository = {
  save(dependency: PoamDependencyResponse): Promise<void>;
  saveMany(dependencies: PoamDependencyResponse[]): Promise<void>;
  listByItem(poamItemId: string, organizationId: string): Promise<PoamDependencyResponse[]>;
  withOrganization(organizationId: string): TenantScopedPoamDependencyRepository;
};

export type PoamRepositories = {
  versions: PoamVersionRepository;
  items: PoamItemRepository;
  milestones: PoamMilestoneRepository;
  dependencies: PoamDependencyRepository;
};

export type PoamDependencies = {
  repositories: PoamRepositories;
  gapAnalysis: GapAnalysisDependencies;
  scf?: ScfCoreServices;
  maturity?: PoamMaturityProvider;
};

export type CreatePoamDraftOptions = {
  maturity_assessment_version_id?: string;
  include_optional_improvements?: boolean;
};



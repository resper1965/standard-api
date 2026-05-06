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
  tenantId: string;
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
  findApprovedOrDraftByAssessment(assessmentId: string, tenantId: string): Promise<MaturityVersionReference | null>;
  findScoreByControl(maturityAssessmentVersionId: string, scfControlId: string, tenantId: string): Promise<MaturityScoreReference | null>;
};

export type PoamVersionRepository = {
  save(version: PoamVersionResponse): Promise<void>;
  update(version: PoamVersionResponse): Promise<void>;
  get(poamVersionId: string, tenantId: string): Promise<PoamVersionResponse | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<PoamVersionResponse[]>;
};

export type PoamItemFilters = {
  priority?: PoamPriority;
  severity?: PoamSeverity;
  status?: PoamItemStatus;
  action_type?: PoamActionType;
  owner_role?: string;
  requires_validation?: boolean;
};

export type PoamItemRepository = {
  saveMany(items: PoamItemResponse[]): Promise<void>;
  update(item: PoamItemResponse): Promise<void>;
  get(poamItemId: string, tenantId: string): Promise<PoamItemResponse | null>;
  listByVersion(poamVersionId: string, tenantId: string, filters?: PoamItemFilters): Promise<PoamItemResponse[]>;
};

export type PoamMilestoneRepository = {
  save(milestone: PoamMilestoneResponse): Promise<void>;
  saveMany(milestones: PoamMilestoneResponse[]): Promise<void>;
  update(milestone: PoamMilestoneResponse): Promise<void>;
  get(milestoneId: string, tenantId: string): Promise<PoamMilestoneResponse | null>;
  listByItem(poamItemId: string, tenantId: string): Promise<PoamMilestoneResponse[]>;
};

export type PoamDependencyRepository = {
  save(dependency: PoamDependencyResponse): Promise<void>;
  saveMany(dependencies: PoamDependencyResponse[]): Promise<void>;
  listByItem(poamItemId: string, tenantId: string): Promise<PoamDependencyResponse[]>;
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


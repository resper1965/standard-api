import type { KbServiceDependencies } from "@standard/kb";
import type { ScfCoreServices, ScfFrameworkRequirement, ScfMapping } from "@standard/scf-core";
import type {
  CreateScopeRequest,
  EvidenceCoverageStatus,
  ScopeResponse,
  SoaValidationResponse,
  SoaItemResponse,
  SoaVersionResponse,
  UpdateScopeRequest,
  UpdateSoaItemRequest
} from "@standard/schemas";

export type {
  CreateScopeRequest,
  EvidenceCoverageStatus,
  ScopeResponse,
  SoaValidationResponse,
  SoaItemResponse,
  SoaVersionResponse,
  UpdateScopeRequest,
  UpdateSoaItemRequest
};

export type SoaWorkflowContext = {
  tenantId: string;
  organizationId: string;
  assessmentId: string;
  actorId?: string;
  traceId: string;
};

export type ScopeRepository = {
  save(scope: ScopeResponse): Promise<void>;
  update(scope: ScopeResponse): Promise<void>;
  get(scopeId: string, tenantId: string): Promise<ScopeResponse | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<ScopeResponse[]>;
};

export type SoaVersionRepository = {
  save(version: SoaVersionResponse): Promise<void>;
  update(version: SoaVersionResponse): Promise<void>;
  get(soaVersionId: string, tenantId: string): Promise<SoaVersionResponse | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<SoaVersionResponse[]>;
};

export type SoaItemRepository = {
  saveMany(items: SoaItemResponse[]): Promise<void>;
  update(item: SoaItemResponse): Promise<void>;
  get(soaItemId: string, tenantId: string): Promise<SoaItemResponse | null>;
  listByVersion(soaVersionId: string, tenantId: string): Promise<SoaItemResponse[]>;
};

export type SoaRepositories = {
  scopes: ScopeRepository;
  versions: SoaVersionRepository;
  items: SoaItemRepository;
};

export type SoaDependencies = {
  repositories: SoaRepositories;
  scf: ScfCoreServices;
  kb?: KbServiceDependencies;
};

export type CreateDraftFromRequirementsInput = {
  assessmentId: string;
  frameworkId: string;
  scfVersionId: string;
  sourceScopeId?: string;
  requirements: ScfFrameworkRequirement[];
  mappings: ScfMapping[];
};

export type SoaItemFilters = {
  applicability_status?: string;
};


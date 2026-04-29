import type { z } from "zod";
import type { AgentRuntimeDependencies } from "@aegis/agent-runtime";
import type { ObservabilityDependencies } from "@aegis/observability";
import type {
  ArtifactVersion,
  ArtifactType,
  AssessmentLifecycleEvent,
  AssessmentSnapshot,
  ApprovalEvent,
  ApprovalGate
} from "@aegis/assessment-engine";
import type { DocumentIngestionServiceDependencies } from "@aegis/document-ingestion";
import type { GapAnalysisDependencies } from "@aegis/gap-analysis";
import type { KbServiceDependencies } from "@aegis/kb";
import type { PoamDependencies } from "@aegis/poam";
import type { ReportingDependencies } from "@aegis/reporting";
import type { ScfCoreServices } from "@aegis/scf-core";
import type { AuthContext, Permission, SecurityTenantContext } from "@aegis/security";
import type { SoaDependencies } from "@aegis/soa";
import type { WorkflowDependencies } from "@aegis/workflows";
import { ApiError } from "./errors/api-error";

export type TenantRecord = {
  tenant_id: string;
  slug: string;
  name: string;
  status: string;
};

export type OrganizationRecord = {
  organization_id: string;
  tenant_id: string;
  slug: string;
  name: string;
  status: string;
};

export type AssessmentRecord = {
  assessment_id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
  scf_version_id: string;
  snapshot: AssessmentSnapshot;
  trace_id: string;
};

export type ApprovalRecord = ApprovalEvent & {
  tenantId: string;
  organizationId: string;
  assessmentId: string;
  targetType: "assessment_state" | "artifact_version";
  targetId: string;
  reason: string;
};

export type AssessmentRepositoryAdapter = {
  create(input: Omit<AssessmentRecord, "snapshot"> & { documentCount: number }): Promise<AssessmentRecord>;
  get(assessmentId: string, tenantId: string): Promise<AssessmentRecord | null>;
  listByOrganization(organizationId: string, tenantId: string): Promise<AssessmentRecord[]>;
  save(record: AssessmentRecord): Promise<void>;
};

export type TenantRepositoryAdapter = {
  create(input: Omit<TenantRecord, "tenant_id" | "status">): Promise<TenantRecord>;
  get(tenantId: string): Promise<TenantRecord | null>;
  update(tenantId: string, patch: Partial<Pick<TenantRecord, "name" | "status">>): Promise<TenantRecord | null>;
};

export type OrganizationRepositoryAdapter = {
  create(input: Omit<OrganizationRecord, "organization_id" | "status">): Promise<OrganizationRecord>;
  get(organizationId: string, tenantId: string): Promise<OrganizationRecord | null>;
  listByTenant(tenantId: string): Promise<OrganizationRecord[]>;
};

export type ApprovalRepositoryAdapter = {
  create(input: ApprovalRecord): Promise<ApprovalRecord>;
  get(approvalId: string): Promise<ApprovalRecord | null>;
  getForGate(approvalId: string, gate: ApprovalGate): Promise<ApprovalEvent | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<ApprovalRecord[]>;
};

export type ArtifactRepositoryAdapter = {
  create(input: Omit<ArtifactVersion, "versionNumber" | "status">): Promise<ArtifactVersion>;
  get(versionId: string): Promise<ArtifactVersion | null>;
  save(version: ArtifactVersion): Promise<void>;
  listByAssessment(assessmentId: string, artifactType: ArtifactType): Promise<ArtifactVersion[]>;
};

export type LifecycleEventRepositoryAdapter = {
  record(event: AssessmentLifecycleEvent): Promise<void>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<AssessmentLifecycleEvent[]>;
};

export type AuditRepositoryAdapter = {
  record(event: string, metadata: Record<string, unknown>): Promise<void>;
};

export type AppDependencies = {
  tenants: TenantRepositoryAdapter;
  organizations: OrganizationRepositoryAdapter;
  assessments: AssessmentRepositoryAdapter;
  approvals: ApprovalRepositoryAdapter;
  artifacts: ArtifactRepositoryAdapter;
  lifecycleEvents: LifecycleEventRepositoryAdapter;
  audit: AuditRepositoryAdapter;
  documentIngestion: DocumentIngestionServiceDependencies;
  kb: KbServiceDependencies;
  scf: ScfCoreServices;
  soa: SoaDependencies;
  gapAnalysis: GapAnalysisDependencies;
  poam: PoamDependencies;
  reporting: ReportingDependencies;
  agentRuntime: AgentRuntimeDependencies;
  workflows: WorkflowDependencies;
  observability: ObservabilityDependencies;
};

export type RequestContext = {
  request: Request;
  params: Record<string, string>;
  traceId: string;
  tenantId?: string | undefined;
  organizationId?: string | undefined;
  actorId?: string | undefined;
  systemActor?: string | undefined;
  auth?: AuthContext | undefined;
  securityTenant?: SecurityTenantContext | undefined;
  deps: AppDependencies;
};

export type RouteHandler = (context: RequestContext) => Promise<Response> | Response;

export type RouteDefinition = {
  method: string;
  path: string;
  protected?: boolean;
  authRequired?: boolean;
  tenantRequired?: boolean;
  requireActor?: boolean;
  permissions?: Permission[];
  handler: RouteHandler;
};

export const json = (body: unknown, init: ResponseInit = {}): Response =>
  Response.json(body, {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers
    }
  });

export const parseJson = async <T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", "Invalid request body.", 400, parsed.error.issues);
  }

  return parsed.data;
};

export const routeParam = (params: Record<string, string>, name: string): string => {
  const value = params[name];
  if (!value) throw new ApiError("VALIDATION_ERROR", `Missing route parameter: ${name}.`, 400);
  return value;
};

export const newId = (): string => crypto.randomUUID();

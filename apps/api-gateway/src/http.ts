import type { z } from "zod";
import type { Env } from "./types/env";
import type { RouteConfig } from "@asteasolutions/zod-to-openapi";
import type { AgentRuntimeDependencies } from "@standard/agent-runtime";
import type { ObservabilityDependencies } from "@standard/observability";
import type {
  ArtifactVersion,
  ArtifactType,
  AssessmentLifecycleEvent,
  AssessmentSnapshot,
  ApprovalEvent,
  ApprovalGate
} from "@standard/assessment-engine";
import type { DocumentIngestionServiceDependencies } from "@standard/document-ingestion";
import type { GapAnalysisDependencies } from "@standard/gap-analysis";
import type { KbServiceDependencies } from "@standard/kb";
import type { PoamDependencies } from "@standard/poam";
import type { ReportingDependencies } from "@standard/reporting";
import type { ScfCoreServices } from "@standard/scf-core";
import type { AuthContext, Permission, SecurityTenantContext } from "@standard/security";
import type { SoaDependencies } from "@standard/soa";
import type { PrivacyDependencies } from "@standard/privacy";
import type { WorkflowDependencies } from "@standard/workflows";
import type { SendEmail } from "@standard/email";
import type { WebhookRepositoryAdapter } from "@standard/schemas";
import { ApiError } from "./errors/api-error";
import type { ResolvedTenantContext } from "./adapters/tenant-mapping";

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
  billing_tier: string;
};

export type AssessmentRecord = {
  assessment_id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
  scf_version_id: string;
  snapshot: AssessmentSnapshot;
  trace_id: string;
  created_at?: string;
  updated_at?: string;
  scf_version_label?: string;
};

export type ApprovalRecord = ApprovalEvent & {
  tenantId: string;
  organizationId: string;
  assessmentId: string;
  targetType: "assessment_state" | "artifact_version";
  targetId: string;
  reason: string;
};

export interface TenantScopedAssessmentRepository {
  create(input: Omit<AssessmentRecord, "snapshot" | "tenant_id"> & { documentCount: number }): Promise<AssessmentRecord>;
  get(assessmentId: string): Promise<AssessmentRecord | null>;
  listByOrganization(organizationId: string): Promise<AssessmentRecord[]>;
  listAll(): Promise<AssessmentRecord[]>;
  save(record: AssessmentRecord): Promise<void>;
}

export type AssessmentRepositoryAdapter = {
  create(input: Omit<AssessmentRecord, "snapshot"> & { documentCount: number }): Promise<AssessmentRecord>;
  get(assessmentId: string, tenantId: string): Promise<AssessmentRecord | null>;
  listByOrganization(organizationId: string, tenantId: string): Promise<AssessmentRecord[]>;
  listAll(tenantId: string): Promise<AssessmentRecord[]>;
  save(record: AssessmentRecord): Promise<void>;
  /** Strict tenant-scoped data access pattern */
  withTenant(tenantId: string): TenantScopedAssessmentRepository;
};

export type ApiKeyRecord = {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  keyHash: string;
  maskedKey: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Input shape for creating a new API key (server generates id, timestamps). */
export type ApiKeyCreateInput = {
  tenantId: string;
  organizationId: string;
  name: string;
  keyHash: string;
  maskedKey: string;
  scopes?: string[];
  /** Optional expiry — absent means the key never expires.
   * Typed as `Date | undefined` (not just `Date`) so exactOptionalPropertyTypes
   * allows the call site to pass `expiresAt: condition ? new Date(...) : undefined`. */
  expiresAt?: Date | undefined;
};

export type ApiKeysRepositoryAdapter = {
  create(input: ApiKeyCreateInput): Promise<ApiKeyRecord>;
  verifyKey(keyHash: string): Promise<ApiKeyRecord | null>;
  markUsed(id: string): Promise<void>;
  revokeKey(id: string, organizationId: string): Promise<boolean>;
  listByOrganization(organizationId: string): Promise<ApiKeyRecord[]>;
};

export type TenantRepositoryAdapter = {
  create(input: Omit<TenantRecord, "tenant_id" | "status">): Promise<TenantRecord>;
  get(tenantId: string): Promise<TenantRecord | null>;
  update(tenantId: string, patch: Partial<Pick<TenantRecord, "name" | "status">>): Promise<TenantRecord | null>;
};

export interface TenantScopedOrganizationRepository {
  create(input: Omit<OrganizationRecord, "organization_id" | "status" | "tenant_id" | "billing_tier">): Promise<OrganizationRecord>;
  get(organizationId: string): Promise<OrganizationRecord | null>;
  list(): Promise<OrganizationRecord[]>;
  update(organizationId: string, patch: Partial<Pick<OrganizationRecord, "name" | "slug" | "status" | "billing_tier">>): Promise<OrganizationRecord | null>;
}

export type OrganizationRepositoryAdapter = {
  create(input: Omit<OrganizationRecord, "organization_id" | "status" | "billing_tier">): Promise<OrganizationRecord>;
  get(organizationId: string, tenantId: string): Promise<OrganizationRecord | null>;
  listByTenant(tenantId: string): Promise<OrganizationRecord[]>;
  update(organizationId: string, tenantId: string, patch: Partial<Pick<OrganizationRecord, "name" | "slug" | "status" | "billing_tier">>): Promise<OrganizationRecord | null>;
  /** Strict tenant-scoped data access pattern */
  withTenant(tenantId: string): TenantScopedOrganizationRepository;
};

export interface TenantScopedApprovalRepository {
  create(input: ApprovalRecord): Promise<ApprovalRecord>;
  get(approvalId: string): Promise<ApprovalRecord | null>;
  getForGate(approvalId: string, gate: ApprovalGate): Promise<ApprovalEvent | null>;
  listByAssessment(assessmentId: string): Promise<ApprovalRecord[]>;
}

export type ApprovalRepositoryAdapter = {
  create(input: ApprovalRecord): Promise<ApprovalRecord>;
  get(approvalId: string): Promise<ApprovalRecord | null>;
  getForGate(approvalId: string, gate: ApprovalGate): Promise<ApprovalEvent | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<ApprovalRecord[]>;
  withTenant(tenantId: string): TenantScopedApprovalRepository;
};

export interface TenantScopedArtifactRepository {
  create(input: Omit<ArtifactVersion, "versionNumber" | "status">): Promise<ArtifactVersion>;
  get(versionId: string): Promise<ArtifactVersion | null>;
  save(version: ArtifactVersion): Promise<void>;
  listByAssessment(assessmentId: string, artifactType: ArtifactType): Promise<ArtifactVersion[]>;
}

export type ArtifactRepositoryAdapter = {
  create(input: Omit<ArtifactVersion, "versionNumber" | "status">): Promise<ArtifactVersion>;
  get(versionId: string): Promise<ArtifactVersion | null>;
  save(version: ArtifactVersion): Promise<void>;
  listByAssessment(assessmentId: string, artifactType: ArtifactType): Promise<ArtifactVersion[]>;
  withTenant(tenantId: string): TenantScopedArtifactRepository;
};

export interface TenantScopedLifecycleEventRepository {
  record(event: AssessmentLifecycleEvent): Promise<void>;
  listByAssessment(assessmentId: string): Promise<AssessmentLifecycleEvent[]>;
}

export type LifecycleEventRepositoryAdapter = {
  record(event: AssessmentLifecycleEvent): Promise<void>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<AssessmentLifecycleEvent[]>;
  withTenant(tenantId: string): TenantScopedLifecycleEventRepository;
};

export type AuditRepositoryAdapter = {
  record(event: string, metadata: Record<string, unknown>): Promise<void>;
};

export type AppDependencies = {
  tenants: TenantRepositoryAdapter;
  organizations: OrganizationRepositoryAdapter;
  members: import("./adapters/membership.repository").MembershipRepositoryAdapter;
  apiKeys: ApiKeysRepositoryAdapter;
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
  alerts?: import("@standard/observability").AlertService | undefined;
  privacy: PrivacyDependencies;
  /** Cloudflare Email Service binding (optional — unavailable in tests) */
  email?: SendEmail | undefined;
  /** Cloudflare Queue for async agent run processing (optional) */
  AGENT_RUN_QUEUE?: Queue | undefined;
  /** Cloudflare Workflow engine for durable, stateful parallel council agent runs (optional) */
  COUNCIL_WORKFLOW?: Workflow | undefined;
  /** Cloudflare Queue for SOC incident triage background processing (optional) */
  SOC_TRIAGE_QUEUE?: Queue | undefined;
  /** Webhook endpoint management (optional — requires storage adapter) */
  webhooks?: WebhookRepositoryAdapter | undefined;
  /** Resolves Better Auth org ID → Standard domain UUIDs (JIT provisioning) */
  resolveTenantContext?: (betterAuthOrgId: string) => Promise<ResolvedTenantContext | null>;
  /** Resolves Better Auth user email → Standard domain users UUID (JIT provisioning) */
  resolveUserContext?: (email: string, displayName: string) => Promise<{ id: string }>;
  /** Bans/flags a user for deletion via Better Auth admin API (optional — delegates to cachedAuth) */
  banUser?: (userId: string, reason?: string) => Promise<void>;
};

export type RequestContext = {
  request: Request;
  params: Record<string, string>;
  traceId: string;
  tenantId?: string | undefined;
  organizationId?: string | undefined;
  actorId?: string | undefined;
  systemActor?: string | undefined;
  /** M2M API key scopes — populated by auth middleware for M2M requests */
  m2mScopes?: string[] | undefined;
  /** @deprecated Use `session` instead — legacy auth context */
  auth?: AuthContext | undefined;
  securityTenant?: SecurityTenantContext | undefined;
  /** Better Auth session (user + session data) */
  session?: {
    user: {
      id: string;
      email: string;
      name: string;
      role?: string | null | undefined;
      /** Bekaa operator flag — cross-tenant access. Populated from platform_admin DB column. */
      platformAdmin?: boolean;
      [key: string]: unknown;
    };
    session: {
      id: string;
      activeOrganizationId?: string | null | undefined;
      [key: string]: unknown;
    };
  } | null;
  deps: AppDependencies;
  /** Pre-validated request body (populated when route defines bodySchema) */
  validatedBody?: unknown;
  /** Cloudflare native execution context for background tasks */
  execCtx?: ExecutionContext;
  /** Cloudflare Worker Environment variables and bindings.
   * Typed as Partial<Env> because the app is initialised with a partial env
   * in dev/test mode (see createApp signature in app.ts). */
  env?: Partial<Env>;
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
  /** Zod schema for request body validation. When defined, body is parsed
   *  and validated before the handler runs. Access via `context.validatedBody`. */
  bodySchema?: z.ZodType;
  /** OpenAPI configuration mapping for this route */
  openapi?: Omit<RouteConfig, "method" | "path">;
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


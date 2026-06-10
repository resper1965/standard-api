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
  ApprovalGate,
} from "@standard/assessment-engine";
import type { DocumentIngestionServiceDependencies } from "@standard/document-ingestion";
import type { GapAnalysisDependencies } from "@standard/gap-analysis";
import type { KbServiceDependencies } from "@standard/kb";
import type { PoamDependencies } from "@standard/poam";
import type { ReportingDependencies } from "@standard/reporting";
import type { ScfCoreServices } from "@standard/scf-core";
import type {
  AuthContext,
  Permission,
  SecurityTenantContext,
} from "@standard/security";
import type { SoaDependencies } from "@standard/soa";
import type { PrivacyDependencies } from "@standard/privacy";
import type { WorkflowDependencies } from "@standard/workflows";
import type { SendEmail } from "@standard/email";
import type { WebhookRepositoryAdapter } from "@standard/schemas";
import type { AuthRepository } from "@standard/auth";
import { ApiError } from "./errors/api-error";
import type { ResolvedTenantContext } from "./adapters/tenant-mapping";
import type { LedgerServiceAdapter } from "./adapters/ledger.repository";
import type { TpraRepositoryAdapter } from "./adapters/tpra.repository";

export type TenantRecord = {
  organization_id: string;
  slug: string;
  name: string;
  status: string;
};

export type OrganizationRecord = {
  organization_id: string;
  slug: string;
  name: string;
  status: string;
  billing_tier: string;
};

export type AssessmentRecord = {
  assessment_id: string;
  organization_id: string;
  name: string;
  scf_version_id: string;
  snapshot: AssessmentSnapshot;
  trace_id: string;
  observation_start_date?: string | undefined;
  observation_end_date?: string | undefined;
  created_at?: string;
  updated_at?: string;
  scf_version_label?: string;
  /** Continuous Assessment Cycle (SCRMS-PIG Due Care: Steps 27-30) */
  parent_assessment_id?: string | null;
  cycle_number?: number;
  baseline_soa_version_id?: string | null;
};

export type ApprovalRecord = ApprovalEvent & {
  organizationId: string;
  assessmentId: string;
  targetType: "assessment_state" | "artifact_version";
  targetId: string;
  reason: string;
};

export interface TenantScopedAssessmentRepository {
  create(
    input: Omit<AssessmentRecord, "snapshot" | "organization_id"> & {
      documentCount: number;
    },
  ): Promise<AssessmentRecord>;
  get(assessmentId: string): Promise<AssessmentRecord | null>;
  listByOrganization(organizationId: string): Promise<AssessmentRecord[]>;
  listAll(): Promise<AssessmentRecord[]>;
  save(record: AssessmentRecord): Promise<void>;
}

export type AssessmentRepositoryAdapter = {
  create(
    input: Omit<AssessmentRecord, "snapshot"> & { documentCount: number },
  ): Promise<AssessmentRecord>;
  get(
    assessmentId: string,
    organizationId: string,
  ): Promise<AssessmentRecord | null>;
  listByOrganization(organizationId: string): Promise<AssessmentRecord[]>;
  listAll(organizationId: string): Promise<AssessmentRecord[]>;
  save(record: AssessmentRecord): Promise<void>;
  /** Strict tenant-scoped data access pattern */
  withOrganization(organizationId: string): TenantScopedAssessmentRepository;
};

export type ApiKeyRecord = {
  id: string;
  organizationId: string;
  name: string;
  keyHash: string;
  maskedKey: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  scheduledRevokeAt: Date | null;
  rotatedToKeyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Input shape for creating a new API key (server generates id, timestamps). */
export type ApiKeyCreateInput = {
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
  getById(id: string, organizationId: string): Promise<ApiKeyRecord | null>;
  update(
    id: string,
    organizationId: string,
    patch: { name?: string; expiresAt?: Date | null; scopes?: string[] },
  ): Promise<ApiKeyRecord | null>;
  verifyKey(keyHash: string): Promise<ApiKeyRecord | null>;
  markUsed(id: string): Promise<void>;
  revokeKey(id: string, organizationId: string): Promise<boolean>;
  scheduleRevocation(
    id: string,
    organizationId: string,
    revokeAt: Date,
    rotatedToKeyId: string,
  ): Promise<boolean>;
  listByOrganization(
    organizationId: string,
    activeOnly?: boolean,
  ): Promise<ApiKeyRecord[]>;
};

export type TenantRepositoryAdapter = {
  create(
    input: Omit<TenantRecord, "organization_id" | "status">,
  ): Promise<TenantRecord>;
  get(organizationId: string): Promise<TenantRecord | null>;
  update(
    organizationId: string,
    patch: Partial<Pick<TenantRecord, "name" | "status">>,
  ): Promise<TenantRecord | null>;
};

export interface TenantScopedOrganizationRepository {
  create(
    input: Omit<
      OrganizationRecord,
      "organization_id" | "status" | "organization_id" | "billing_tier"
    >,
  ): Promise<OrganizationRecord>;
  get(organizationId: string): Promise<OrganizationRecord | null>;
  list(): Promise<OrganizationRecord[]>;
  update(
    organizationId: string,
    patch: Partial<
      Pick<OrganizationRecord, "name" | "slug" | "status" | "billing_tier">
    >,
  ): Promise<OrganizationRecord | null>;
  /** Soft-delete — marks status=inactive and sets deletedAt */
  delete(organizationId: string): Promise<boolean>;
}

export type OrganizationRepositoryAdapter = {
  create(
    input: Omit<
      OrganizationRecord,
      "organization_id" | "status" | "billing_tier"
    >,
  ): Promise<OrganizationRecord>;
  get(organizationId: string): Promise<OrganizationRecord | null>;
  listByTenant(organizationId: string): Promise<OrganizationRecord[]>;
  update(
    organizationId: string,
    patch: Partial<
      Pick<OrganizationRecord, "name" | "slug" | "status" | "billing_tier">
    >,
  ): Promise<OrganizationRecord | null>;
  /** Soft-delete — marks status=inactive and sets deletedAt */
  delete(organizationId: string): Promise<boolean>;
  /** Strict tenant-scoped data access pattern */
  withOrganization(organizationId: string): TenantScopedOrganizationRepository;
};

export interface TenantScopedApprovalRepository {
  create(input: ApprovalRecord): Promise<ApprovalRecord>;
  get(approvalId: string): Promise<ApprovalRecord | null>;
  getForGate(
    approvalId: string,
    gate: ApprovalGate,
  ): Promise<ApprovalEvent | null>;
  listByAssessment(assessmentId: string): Promise<ApprovalRecord[]>;
  /** List approvals with no decision yet (pending HITL gates) across all assessments */
  listPending(gate?: ApprovalGate): Promise<ApprovalRecord[]>;
}

export type ApprovalRepositoryAdapter = {
  create(input: ApprovalRecord): Promise<ApprovalRecord>;
  get(approvalId: string): Promise<ApprovalRecord | null>;
  getForGate(
    approvalId: string,
    gate: ApprovalGate,
  ): Promise<ApprovalEvent | null>;
  listByAssessment(
    assessmentId: string,
    organizationId: string,
  ): Promise<ApprovalRecord[]>;
  /** List pending approvals across all assessments for an organization */
  listPending(
    organizationId: string,
    gate?: ApprovalGate,
  ): Promise<ApprovalRecord[]>;
  withOrganization(organizationId: string): TenantScopedApprovalRepository;
};

export interface TenantScopedArtifactRepository {
  create(
    input: Omit<ArtifactVersion, "versionNumber" | "status">,
  ): Promise<ArtifactVersion>;
  get(versionId: string): Promise<ArtifactVersion | null>;
  save(version: ArtifactVersion): Promise<void>;
  listByAssessment(
    assessmentId: string,
    artifactType: ArtifactType,
  ): Promise<ArtifactVersion[]>;
}

export type ArtifactRepositoryAdapter = {
  create(
    input: Omit<ArtifactVersion, "versionNumber" | "status">,
  ): Promise<ArtifactVersion>;
  get(versionId: string): Promise<ArtifactVersion | null>;
  save(version: ArtifactVersion): Promise<void>;
  listByAssessment(
    assessmentId: string,
    artifactType: ArtifactType,
  ): Promise<ArtifactVersion[]>;
  withOrganization(organizationId: string): TenantScopedArtifactRepository;
};

export interface TenantScopedLifecycleEventRepository {
  record(event: AssessmentLifecycleEvent): Promise<void>;
  listByAssessment(assessmentId: string): Promise<AssessmentLifecycleEvent[]>;
}

export type LifecycleEventRepositoryAdapter = {
  record(event: AssessmentLifecycleEvent): Promise<void>;
  listByAssessment(
    assessmentId: string,
    organizationId: string,
  ): Promise<AssessmentLifecycleEvent[]>;
  withOrganization(
    organizationId: string,
  ): TenantScopedLifecycleEventRepository;
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
  /** Cloudflare Queue for user lifecycle events (signup, update) */
  USER_LIFECYCLE_QUEUE?: Queue | undefined;
  /** Webhook endpoint management (optional — requires storage adapter) */
  webhooks?: WebhookRepositoryAdapter | undefined;
  /**
   * Ledger de eventos de controlos (ADR-002 — append-only).
   * Regista status_changed, evidence_added, finding_created, approval_gate, mutation_blocked.
   * ⛔ NUNCA fazer UPDATE/DELETE neste repositório.
   */
  ledger: LedgerServiceAdapter;
  /**
   * Repositório TPRA — Third-Party Risk Assessment.
   * Persiste vendors, assessments e risk scores por organization.
   */
  tpra: TpraRepositoryAdapter;
  /** READ-ONLY: resolves Standard Native Auth org ID → Standard domain UUIDs. Returns null if not provisioned. */
  resolveOrganizationContext?: (
    standardAuthOrgId: string,
  ) => Promise<ResolvedTenantContext | null>;
  /** Explicit provisioning: resolves and creates domain tenant/org if missing. Call only at deliberate provisioning points. */
  provisionOrganizationContext?: (
    standardAuthOrgId: string,
  ) => Promise<ResolvedTenantContext>;
  /** Resolves Standard Native Auth user email → Standard domain users UUID (JIT provisioning) */
  resolveUserContext?: (
    email: string,
    displayName: string,
    identityProviderSubject?: string,
  ) => Promise<{ id: string }>;
  /** Bans/flags a user for deletion via Standard Native Auth admin API (optional — delegates to cachedAuth) */
  banUser?: (userId: string, reason?: string) => Promise<void>;
  /**
   * Repositório tipado para operações nas tabelas internas do Better Auth.
   * Este é o ÚNICO acesso permitido a baUser, baSession, baAccount (ADR-009).
   */
  authRepo: AuthRepository;
  /**
   * @deprecated Use `authRepo` para operações em tabelas BA.
   * Mantido temporariamente durante migração — será removido após Tasks 3 e 4.
   */
  _db?: import("./adapters/db").DbClient | undefined;
};

export type RequestContext = {
  request: Request;
  params: Record<string, string>;
  traceId: string;
  organizationId?: string | undefined;
  actorId?: string | undefined;
  systemActor?: string | undefined;
  /** M2M API key scopes — populated by auth middleware for M2M requests */
  m2mScopes?: string[] | undefined;
  /** @deprecated Use `session` instead — legacy auth context */
  auth?: AuthContext | undefined;
  securityTenant?: SecurityTenantContext | undefined;
  /** Better Auth session (user + session data). Populated by auth middleware. */
  session?: {
    user: {
      id: string;
      email: string;
      name: string;
      platformAdmin: boolean;
      approved: boolean;
      [key: string]: unknown;
    };
    session: {
      id: string;
      activeOrganizationId: string | null;
      [key: string]: unknown;
    };
  } | null;
  deps: AppDependencies;
  /** Pre-validated request body (populated when route defines bodySchema) */
  validatedBody?: unknown;
  /** Cloudflare native execution context for background tasks */
  execCtx?: ExecutionContext;
  /** H8: Flag indicating body has already been parsed by declarative bodySchema validation */
  _bodyConsumed?: boolean;
  /** Cloudflare Worker Environment variables and bindings.
   * Typed as Partial<Env> because the app is initialised with a partial env
   * in dev/test mode (see createApp signature in app.ts). */
  env?: Partial<Env>;
  rateLimitHeaders?: Record<string, string>;
  /** Application-level tenant scoping for database queries.
   * Populated by tenant-db middleware after auth resolves organizationId.
   * Use `tenantScope.scopeWhere(table.organizationId)` for SELECTs.
   * Use `tenantScope.scopeInsert(values)` for INSERTs.
   * Undefined for unauthenticated/admin/cross-tenant routes. */
  tenantScope?:
    | import("./middleware/tenant-db.middleware").TenantScope
    | undefined;
};

export type RouteHandler = (
  context: RequestContext,
) => Promise<Response> | Response;

export type RouteDefinition = {
  method: string;
  path: string;
  protected?: boolean;
  authRequired?: boolean;
  tenantRequired?: boolean;
  requireActor?: boolean;
  idempotencyRequired?: boolean;
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
      ...init.headers,
    },
  });

const MAX_JSON_BODY_BYTES = 1_048_576; // 1 MB

export const parseJson = async <T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> => {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_JSON_BODY_BYTES) {
    throw new ApiError("VALIDATION_ERROR", "Request body too large.", 413);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Invalid request body.",
      400,
      parsed.error.issues,
    );
  }

  return parsed.data;
};

export const routeParam = (
  params: Record<string, string>,
  name: string,
): string => {
  const value = params[name];
  if (!value)
    throw new ApiError(
      "VALIDATION_ERROR",
      `Missing route parameter: ${name}.`,
      400,
    );
  return value;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const routeUuidParam = (
  params: Record<string, string>,
  name: string,
): string => {
  const value = routeParam(params, name);
  if (!UUID_REGEX.test(value)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `Invalid UUID format for parameter: ${name}.`,
      400,
    );
  }
  return value;
};

export const newId = (): string => crypto.randomUUID();

/**
 * Safely extract organization_id from context — replaces `organizationId!`.
 * Throws ORGANIZATION_REQUIRED (403) if org context was not resolved. (A2 fix)
 */
export const requireOrganizationId = (
  ctx: Pick<RequestContext, "organizationId">,
): string => {
  if (!ctx.organizationId) {
    throw new ApiError(
      "ORGANIZATION_REQUIRED",
      "Organization context is required for this operation.",
      403,
    );
  }
  return ctx.organizationId;
};

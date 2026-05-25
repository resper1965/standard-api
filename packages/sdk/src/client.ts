/**
 * StandardClient — Main SDK entry point
 *
 * Zero dependencies. Uses native fetch.
 * Works in Node.js 18+, Deno, Bun, Cloudflare Workers, and browsers.
 */
import { StandardError, type StandardErrorResponse } from "./errors";
import type { RequestOptions, PaginatedResponse, StandardResponse, ListQuery } from "./types";
import type {
  Assessment, Document, DocumentChunk, IngestionJob,
  ScfVersion, ScfDomain, ScfControl, ScfFramework, ScfMapping, ScfRequirement, ScfCoverage,
  LifecycleEvent, AvailableTransition, ApprovalRecord, ArtifactVersion,
  SoaVersion, SoaItem, SoaValidation,
  GapAnalysisVersion, GapFinding,
  PoamVersion, PoamItem,
  ReportVersion, ReportSection, ReportExport,
  KbSearchResult, KbChunk,
  WorkflowRun, AgentRun, AgentToolCall,
  WebhookEndpoint, WebhookDelivery,
  Organization, ApiKey, ApiKeyCreated,
  ComplianceGate, ExportJob,
  AssessmentSummary, OrganizationDashboard, AuditLogEntry, Membership,
} from "./models";

export type StandardClientConfig = {
  /** API key (starts with "standard_live_") */
  apiKey: string;
  /** Tenant UUID */
  tenantId: string;
  /** Base URL (defaults to production) */
  baseUrl?: string;
  /** Default timeout in ms (default: 30000) */
  timeout?: number;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
};

const DEFAULT_BASE_URL = "https://standard-api.bekaa.eu";
const DEFAULT_TIMEOUT = 30_000;

export class StandardClient {
  private readonly config: Required<Omit<StandardClientConfig, "fetch">> & { fetch: typeof globalThis.fetch };

  // ── Resource Namespaces ─────────────────────────────────
  readonly assessments: AssessmentsResource;
  readonly documents: DocumentsResource;
  readonly scf: ScfResource;
  readonly lifecycle: LifecycleResource;
  readonly approvals: ApprovalsResource;
  readonly artifacts: ArtifactsResource;
  readonly soa: SoaResource;
  readonly gapAnalysis: GapAnalysisResource;
  readonly poam: PoamResource;
  readonly reports: ReportsResource;
  readonly kb: KbResource;
  readonly workflows: WorkflowsResource;
  readonly agents: AgentsResource;
  readonly webhooks: WebhooksResource;
  readonly organizations: OrganizationsResource;

  constructor(config: StandardClientConfig) {
    this.config = {
      apiKey: config.apiKey,
      tenantId: config.tenantId,
      baseUrl: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      fetch: config.fetch ?? globalThis.fetch.bind(globalThis),
    };

    // Initialize resource namespaces
    this.assessments = new AssessmentsResource(this);
    this.documents = new DocumentsResource(this);
    this.scf = new ScfResource(this);
    this.lifecycle = new LifecycleResource(this);
    this.approvals = new ApprovalsResource(this);
    this.artifacts = new ArtifactsResource(this);
    this.soa = new SoaResource(this);
    this.gapAnalysis = new GapAnalysisResource(this);
    this.poam = new PoamResource(this);
    this.reports = new ReportsResource(this);
    this.kb = new KbResource(this);
    this.workflows = new WorkflowsResource(this);
    this.agents = new AgentsResource(this);
    this.webhooks = new WebhooksResource(this);
    this.organizations = new OrganizationsResource(this);
  }

  // ── Internal HTTP Methods ──────────────────────────────
  /** @internal */
  async _request<T>(method: string, path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    const url = `${this.config.baseUrl}/api/v1${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.config.apiKey}`,
      "x-standard-tenant-id": this.config.tenantId,
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(opts?.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
      ...opts?.headers,
    };

    try {
      const requestBody: BodyInit | null = body instanceof FormData
        ? body
        : body
          ? JSON.stringify(body)
          : null;

      const init: RequestInit = {
        method,
        headers,
        body: requestBody,
        signal: opts?.signal ?? controller.signal,
      };

      const response = await this.config.fetch(url, init);

      clearTimeout(timeout);

      if (!response.ok) {
        let errorBody: StandardErrorResponse;
        try {
          errorBody = await response.json() as StandardErrorResponse;
        } catch {
          errorBody = { error: { code: "UNKNOWN", message: response.statusText } };
        }
        throw new StandardError(response.status, errorBody);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof StandardError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new StandardError(408, { error: { code: "TIMEOUT", message: `Request timed out after ${this.config.timeout}ms` } });
      }
      throw error;
    }
  }

  /** @internal */
  _get<T>(path: string, opts?: RequestOptions) { return this._request<T>("GET", path, undefined, opts); }
  /** @internal */
  _post<T>(path: string, body?: unknown, opts?: RequestOptions) { return this._request<T>("POST", path, body, opts); }
  /** @internal */
  _patch<T>(path: string, body?: unknown, opts?: RequestOptions) { return this._request<T>("PATCH", path, body, opts); }
  /** @internal */
  _delete<T>(path: string, opts?: RequestOptions) { return this._request<T>("DELETE", path, undefined, opts); }
}

// ─── Resource Classes ─────────────────────────────────────────

class AssessmentsResource {
  constructor(private client: StandardClient) {}

  list(opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<Assessment>>("/assessments", opts);
  }
  get(id: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<Assessment>>(`/assessments/${id}`, opts);
  }
  create(data: { organization_id: string; name: string; scf_version_id: string; document_count?: number }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<Assessment>>("/assessments", data, opts);
  }
  update(id: string, data: { name?: string }, opts?: RequestOptions) {
    return this.client._patch<StandardResponse<Assessment>>(`/assessments/${id}`, data, opts);
  }
  status(id: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<Assessment>>(`/assessments/${id}/status`, opts);
  }
  timeline(id: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<LifecycleEvent>>(`/assessments/${id}/timeline`, opts);
  }
  listByOrg(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<Assessment>>(`/organizations/${orgId}/assessments`, opts);
  }
  /** Check the compliance gate status for a given assessment (CI/CD integration) */
  complianceGate(id: string, opts?: RequestOptions) {
    return this.client._get<ComplianceGate>(`/assessments/${id}/compliance-gate`, opts);
  }
  /** Get server-computed KPIs for an assessment */
  summary(id: string, opts?: RequestOptions) {
    return this.client._get<AssessmentSummary>(`/assessments/${id}/summary`, opts);
  }
  /** Get audit logs for an assessment */
  auditLogs(id: string, query?: { action?: string; limit?: number }, opts?: RequestOptions) {
    const p = new URLSearchParams();
    if (query?.action) p.set("action", query.action);
    if (query?.limit) p.set("limit", String(query.limit));
    const q = p.toString();
    return this.client._get<PaginatedResponse<AuditLogEntry>>(`/assessments/${id}/audit-logs${q ? `?${q}` : ""}`, opts);
  }
}

class DocumentsResource {
  constructor(private client: StandardClient) {}

  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<Document>>(`/assessments/${assessmentId}/documents`, opts);
  }
  get(docId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<Document>>(`/documents/${docId}`, opts);
  }
  upload(assessmentId: string, file: File | Blob, description?: string, opts?: RequestOptions) {
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    return this.client._post<StandardResponse<Document>>(`/assessments/${assessmentId}/documents`, form, opts);
  }
  delete(docId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/documents/${docId}`, opts);
  }
  chunks(docId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<DocumentChunk>>(`/documents/${docId}/chunks`, opts);
  }
  reprocess(docId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<Document>>(`/documents/${docId}/reprocess`, undefined, opts);
  }
  ingestionJobs(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<IngestionJob>>(`/assessments/${assessmentId}/ingestion-jobs`, opts);
  }
}

class ScfResource {
  constructor(private client: StandardClient) {}

  readonly versions = {
    list: (opts?: RequestOptions) => this.client._get<PaginatedResponse<ScfVersion>>("/scf/versions", opts),
    latest: (opts?: RequestOptions) => this.client._get<StandardResponse<ScfVersion>>("/scf/versions/latest", opts),
    domains: (versionId: string, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfDomain>>(`/scf/versions/${versionId}/domains`, opts),
    controls: (versionId: string, query?: ListQuery, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfControl>>(`/scf/versions/${versionId}/controls${qs(query)}`, opts),
  };

  readonly controls = {
    get: (controlId: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<ScfControl>>(`/scf/controls/${controlId}`, opts),
    byCode: (code: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<ScfControl>>(`/scf/controls/by-code/${encodeURIComponent(code)}`, opts),
    mappings: (controlId: string, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfMapping>>(`/scf/controls/${controlId}/mappings`, opts),
  };

  readonly frameworks = {
    list: (opts?: RequestOptions) => this.client._get<PaginatedResponse<ScfFramework>>("/scf/frameworks", opts),
    get: (id: string, opts?: RequestOptions) => this.client._get<StandardResponse<ScfFramework>>(`/scf/frameworks/${id}`, opts),
    requirements: (id: string, query?: ListQuery, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfRequirement>>(`/scf/frameworks/${id}/requirements${qs(query)}`, opts),
    coverage: (id: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<ScfCoverage>>(`/scf/frameworks/${id}/coverage`, opts),
  };

  readonly requirements = {
    mappings: (reqId: string, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfMapping>>(`/scf/requirements/${reqId}/mappings`, opts),
  };
}

class LifecycleResource {
  constructor(private client: StandardClient) {}

  transition(assessmentId: string, data: { next_state: string; reason?: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<Assessment>>(`/assessments/${assessmentId}/transitions`, data, opts);
  }
  availableTransitions(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<{ transitions: AvailableTransition[] }>>(`/assessments/${assessmentId}/available-transitions`, opts);
  }
  events(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<LifecycleEvent>>(`/assessments/${assessmentId}/lifecycle-events`, opts);
  }
}

class ApprovalsResource {
  constructor(private client: StandardClient) {}

  submit(assessmentId: string, data: { gate: string; decision: "approved" | "rejected"; target_type: string; target_id: string; reason?: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ApprovalRecord>>(`/assessments/${assessmentId}/approvals`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ApprovalRecord>>(`/assessments/${assessmentId}/approvals`, opts);
  }
  get(approvalId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<ApprovalRecord>>(`/approvals/${approvalId}`, opts);
  }
}

class ArtifactsResource {
  constructor(private client: StandardClient) {}

  createVersion(assessmentId: string, type: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ArtifactVersion>>(`/assessments/${assessmentId}/artifacts/${type}/versions`, data, opts);
  }
  listVersions(assessmentId: string, type: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ArtifactVersion>>(`/assessments/${assessmentId}/artifacts/${type}/versions`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<ArtifactVersion>>(`/artifacts/${versionId}`, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ArtifactVersion>>(`/artifacts/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ArtifactVersion>>(`/artifacts/${versionId}/approve`, undefined, opts);
  }
  supersede(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ArtifactVersion>>(`/artifacts/${versionId}/supersede`, undefined, opts);
  }
}

class SoaResource {
  constructor(private client: StandardClient) {}

  createScope(assessmentId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<SoaVersion>>(`/assessments/${assessmentId}/scope`, data, opts);
  }
  getScope(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<SoaVersion>>(`/assessments/${assessmentId}/scope`, opts);
  }
  draft(assessmentId: string, data?: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<SoaVersion>>(`/assessments/${assessmentId}/soa/draft`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<SoaVersion>>(`/assessments/${assessmentId}/soa`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<SoaVersion>>(`/soa/${versionId}`, opts);
  }
  items(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<SoaItem>>(`/soa/${versionId}/items`, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<SoaVersion>>(`/soa/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<SoaVersion>>(`/soa/${versionId}/approve`, undefined, opts);
  }
  validate(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<SoaValidation>>(`/soa/${versionId}/validation`, opts);
  }
}

class GapAnalysisResource {
  constructor(private client: StandardClient) {}

  draft(assessmentId: string, data?: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<GapAnalysisVersion>>(`/assessments/${assessmentId}/gap-analysis/draft`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<GapAnalysisVersion>>(`/assessments/${assessmentId}/gap-analysis`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<GapAnalysisVersion>>(`/gap-analysis/${versionId}`, opts);
  }
  findings(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<GapFinding>>(`/gap-analysis/${versionId}/findings`, opts);
  }
  addFinding(versionId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<GapFinding>>(`/gap-analysis/${versionId}/findings`, data, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<GapAnalysisVersion>>(`/gap-analysis/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<GapAnalysisVersion>>(`/gap-analysis/${versionId}/approve`, undefined, opts);
  }
}

class PoamResource {
  constructor(private client: StandardClient) {}

  draft(assessmentId: string, data?: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<PoamVersion>>(`/assessments/${assessmentId}/poam/draft`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<PoamVersion>>(`/assessments/${assessmentId}/poam`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<PoamVersion>>(`/poam/${versionId}`, opts);
  }
  items(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<PoamItem>>(`/poam/${versionId}/items`, opts);
  }
  addItem(versionId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<PoamItem>>(`/poam/${versionId}/items`, data, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<PoamVersion>>(`/poam/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<PoamVersion>>(`/poam/${versionId}/approve`, undefined, opts);
  }
}

class ReportsResource {
  constructor(private client: StandardClient) {}

  draft(assessmentId: string, data?: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ReportVersion>>(`/assessments/${assessmentId}/reports/draft`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ReportVersion>>(`/assessments/${assessmentId}/reports`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<ReportVersion>>(`/reports/${versionId}`, opts);
  }
  sections(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ReportSection>>(`/reports/${versionId}/sections`, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ReportVersion>>(`/reports/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ReportVersion>>(`/reports/${versionId}/approve`, undefined, opts);
  }
  export(versionId: string, format?: "pdf" | "docx", opts?: RequestOptions) {
    return this.client._post<StandardResponse<ReportExport>>(`/reports/${versionId}/export`, { format }, opts);
  }
  /** Generate a downloadable audit package (PDF + evidence ZIP) */
  generateAuditPackage(assessmentId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ExportJob>>(`/assessments/${assessmentId}/audit-package`, undefined, opts);
  }
  /** Download a completed export job */
  downloadExport(jobId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<ExportJob>>(`/export-jobs/${jobId}/download`, opts);
  }
}

class KbResource {
  constructor(private client: StandardClient) {}

  search(assessmentId: string, query: string, limit?: number, opts?: RequestOptions) {
    return this.client._post<StandardResponse<{ results: KbSearchResult[] }>>(`/assessments/${assessmentId}/kb/search`, { query, limit }, opts);
  }
  chunks(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<KbChunk>>(`/assessments/${assessmentId}/kb/chunks`, opts);
  }
}

class WorkflowsResource {
  constructor(private client: StandardClient) {}

  startLifecycle(assessmentId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<WorkflowRun>>(`/assessments/${assessmentId}/workflows/lifecycle/start`, undefined, opts);
  }
  getLifecycle(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<WorkflowRun>>(`/assessments/${assessmentId}/workflows/lifecycle`, opts);
  }
  get(runId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<WorkflowRun>>(`/workflows/${runId}`, opts);
  }
  cancel(runId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<WorkflowRun>>(`/workflows/${runId}/cancel`, undefined, opts);
  }
  resume(runId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<WorkflowRun>>(`/workflows/${runId}/resume`, undefined, opts);
  }
  signal(runId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<WorkflowRun>>(`/workflows/${runId}/signals`, data, opts);
  }
}

class AgentsResource {
  constructor(private client: StandardClient) {}

  start(assessmentId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<AgentRun>>(`/assessments/${assessmentId}/agent-runs`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<AgentRun>>(`/assessments/${assessmentId}/agent-runs`, opts);
  }
  get(runId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<AgentRun>>(`/agent-runs/${runId}`, opts);
  }
  toolCalls(runId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<AgentToolCall>>(`/agent-runs/${runId}/tool-calls`, opts);
  }
}

class WebhooksResource {
  constructor(private client: StandardClient) {}

  create(orgId: string, data: { url: string; events?: string[]; description?: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<WebhookEndpoint & { signing_secret: string }>>(`/organizations/${orgId}/webhooks`, data, opts);
  }
  list(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<WebhookEndpoint>>(`/organizations/${orgId}/webhooks`, opts);
  }
  get(webhookId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<WebhookEndpoint>>(`/webhooks/${webhookId}`, opts);
  }
  update(webhookId: string, data: { url?: string; events?: string[]; description?: string; enabled?: boolean }, opts?: RequestOptions) {
    return this.client._patch<StandardResponse<WebhookEndpoint>>(`/webhooks/${webhookId}`, data, opts);
  }
  delete(webhookId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/webhooks/${webhookId}`, opts);
  }
  deliveries(webhookId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<WebhookDelivery>>(`/webhooks/${webhookId}/deliveries`, opts);
  }
}

class OrganizationsResource {
  constructor(private client: StandardClient) {}

  create(data: { name: string; slug: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<Organization>>("/organizations", data, opts);
  }
  get(orgId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<Organization>>(`/organizations/${orgId}`, opts);
  }
  createApiKey(orgId: string, data: { name: string; scopes?: string[]; expiresAt?: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ApiKeyCreated>>(`/organizations/${orgId}/api-keys`, data, opts);
  }
  listApiKeys(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ApiKey>>(`/organizations/${orgId}/api-keys`, opts);
  }
  revokeApiKey(orgId: string, keyId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/organizations/${orgId}/api-keys/${keyId}`, opts);
  }
  /** Get server-computed dashboard KPIs for an organization */
  dashboard(orgId: string, opts?: RequestOptions) {
    return this.client._get<OrganizationDashboard>(`/organizations/${orgId}/dashboard`, opts);
  }
  /** List audit logs for an organization */
  auditLogs(orgId: string, query?: { action?: string; actor_id?: string; since?: string; until?: string; limit?: number }, opts?: RequestOptions) {
    const p = new URLSearchParams();
    if (query?.action) p.set("action", query.action);
    if (query?.actor_id) p.set("actor_id", query.actor_id);
    if (query?.since) p.set("since", query.since);
    if (query?.until) p.set("until", query.until);
    if (query?.limit) p.set("limit", String(query.limit));
    const q = p.toString();
    return this.client._get<PaginatedResponse<AuditLogEntry>>(`/organizations/${orgId}/audit-logs${q ? `?${q}` : ""}`, opts);
  }
  /** List members of an organization */
  listMembers(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<Membership>>(`/organizations/${orgId}/members`, opts);
  }
  /** Invite a new member to an organization */
  inviteMember(orgId: string, data: { email: string; role: string; display_name?: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<Membership>>(`/organizations/${orgId}/members`, data, opts);
  }
  /** Update a member's role */
  updateMemberRole(memberId: string, data: { role: string }, opts?: RequestOptions) {
    return this.client._patch<StandardResponse<Membership>>(`/members/${memberId}`, data, opts);
  }
  /** Remove a member */
  removeMember(memberId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/members/${memberId}`, opts);
  }
}

// ── Helper ──────────────────────────────────────────────────
function qs(query?: ListQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  if (query.page) params.set("page", String(query.page));
  const str = params.toString();
  return str ? `?${str}` : "";
}

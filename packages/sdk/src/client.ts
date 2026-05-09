/**
 * StandardClient — Main SDK entry point
 *
 * Zero dependencies. Uses native fetch.
 * Works in Node.js 18+, Deno, Bun, Cloudflare Workers, and browsers.
 */
import { StandardError, type StandardErrorResponse } from "./errors";
import type { RequestOptions, PaginatedResponse, StandardResponse, ListQuery } from "./types";

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

const DEFAULT_BASE_URL = "https://standard-api-gateway-production.ness.workers.dev";
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
      const response = await this.config.fetch(url, {
        method,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        signal: opts?.signal ?? controller.signal,
      });

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
    return this.client._get<PaginatedResponse<any>>("/assessments", opts);
  }
  get(id: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/assessments/${id}`, opts);
  }
  create(data: { organization_id: string; name: string; scf_version_id: string; document_count?: number }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>("/assessments", data, opts);
  }
  update(id: string, data: { name?: string }, opts?: RequestOptions) {
    return this.client._patch<StandardResponse<any>>(`/assessments/${id}`, data, opts);
  }
  status(id: string, opts?: RequestOptions) {
    return this.client._get<any>(`/assessments/${id}/status`, opts);
  }
  timeline(id: string, opts?: RequestOptions) {
    return this.client._get<any>(`/assessments/${id}/timeline`, opts);
  }
  listByOrg(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/organizations/${orgId}/assessments`, opts);
  }
}

class DocumentsResource {
  constructor(private client: StandardClient) {}

  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/documents`, opts);
  }
  get(docId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/documents/${docId}`, opts);
  }
  upload(assessmentId: string, file: File | Blob, description?: string, opts?: RequestOptions) {
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/documents`, form, opts);
  }
  delete(docId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/documents/${docId}`, opts);
  }
  chunks(docId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/documents/${docId}/chunks`, opts);
  }
  reprocess(docId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/documents/${docId}/reprocess`, undefined, opts);
  }
  ingestionJobs(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/ingestion-jobs`, opts);
  }
}

class ScfResource {
  constructor(private client: StandardClient) {}

  readonly versions = {
    list: (opts?: RequestOptions) => this.client._get<PaginatedResponse<any>>("/scf/versions", opts),
    latest: (opts?: RequestOptions) => this.client._get<StandardResponse<any>>("/scf/versions/latest", opts),
    domains: (versionId: string, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<any>>(`/scf/versions/${versionId}/domains`, opts),
    controls: (versionId: string, query?: ListQuery, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<any>>(`/scf/versions/${versionId}/controls${qs(query)}`, opts),
  };

  readonly controls = {
    get: (controlId: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<any>>(`/scf/controls/${controlId}`, opts),
    byCode: (code: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<any>>(`/scf/controls/by-code/${encodeURIComponent(code)}`, opts),
    mappings: (controlId: string, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<any>>(`/scf/controls/${controlId}/mappings`, opts),
  };

  readonly frameworks = {
    list: (opts?: RequestOptions) => this.client._get<PaginatedResponse<any>>("/scf/frameworks", opts),
    get: (id: string, opts?: RequestOptions) => this.client._get<StandardResponse<any>>(`/scf/frameworks/${id}`, opts),
    requirements: (id: string, query?: ListQuery, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<any>>(`/scf/frameworks/${id}/requirements${qs(query)}`, opts),
    coverage: (id: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<any>>(`/scf/frameworks/${id}/coverage`, opts),
  };

  readonly requirements = {
    mappings: (reqId: string, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<any>>(`/scf/requirements/${reqId}/mappings`, opts),
  };
}

class LifecycleResource {
  constructor(private client: StandardClient) {}

  transition(assessmentId: string, data: { next_state: string; reason?: string }, opts?: RequestOptions) {
    return this.client._post<any>(`/assessments/${assessmentId}/transitions`, data, opts);
  }
  availableTransitions(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<any>(`/assessments/${assessmentId}/available-transitions`, opts);
  }
  events(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/lifecycle-events`, opts);
  }
}

class ApprovalsResource {
  constructor(private client: StandardClient) {}

  submit(assessmentId: string, data: { gate: string; decision: "approved" | "rejected"; target_type: string; target_id: string; reason?: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/approvals`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/approvals`, opts);
  }
  get(approvalId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/approvals/${approvalId}`, opts);
  }
}

class ArtifactsResource {
  constructor(private client: StandardClient) {}

  createVersion(assessmentId: string, type: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/artifacts/${type}/versions`, data, opts);
  }
  listVersions(assessmentId: string, type: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/artifacts/${type}/versions`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/artifacts/${versionId}`, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/artifacts/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/artifacts/${versionId}/approve`, undefined, opts);
  }
  supersede(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/artifacts/${versionId}/supersede`, undefined, opts);
  }
}

class SoaResource {
  constructor(private client: StandardClient) {}

  createScope(assessmentId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/scope`, data, opts);
  }
  getScope(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/assessments/${assessmentId}/scope`, opts);
  }
  draft(assessmentId: string, data?: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/soa/draft`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/soa`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/soa/${versionId}`, opts);
  }
  items(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/soa/${versionId}/items`, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/soa/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/soa/${versionId}/approve`, undefined, opts);
  }
  validate(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/soa/${versionId}/validation`, opts);
  }
}

class GapAnalysisResource {
  constructor(private client: StandardClient) {}

  draft(assessmentId: string, data?: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/gap-analysis/draft`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/gap-analysis`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/gap-analysis/${versionId}`, opts);
  }
  findings(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/gap-analysis/${versionId}/findings`, opts);
  }
  addFinding(versionId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/gap-analysis/${versionId}/findings`, data, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/gap-analysis/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/gap-analysis/${versionId}/approve`, undefined, opts);
  }
}

class PoamResource {
  constructor(private client: StandardClient) {}

  draft(assessmentId: string, data?: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/poam/draft`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/poam`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/poam/${versionId}`, opts);
  }
  items(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/poam/${versionId}/items`, opts);
  }
  addItem(versionId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/poam/${versionId}/items`, data, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/poam/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/poam/${versionId}/approve`, undefined, opts);
  }
}

class ReportsResource {
  constructor(private client: StandardClient) {}

  draft(assessmentId: string, data?: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/reports/draft`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/reports`, opts);
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/reports/${versionId}`, opts);
  }
  sections(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/reports/${versionId}/sections`, opts);
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/reports/${versionId}/submit-review`, undefined, opts);
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/reports/${versionId}/approve`, undefined, opts);
  }
  export(versionId: string, format?: "pdf" | "docx", opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/reports/${versionId}/export`, { format }, opts);
  }
}

class KbResource {
  constructor(private client: StandardClient) {}

  search(assessmentId: string, query: string, limit?: number, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/kb/search`, { query, limit }, opts);
  }
  chunks(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/kb/chunks`, opts);
  }
}

class WorkflowsResource {
  constructor(private client: StandardClient) {}

  startLifecycle(assessmentId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/workflows/lifecycle/start`, undefined, opts);
  }
  getLifecycle(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/assessments/${assessmentId}/workflows/lifecycle`, opts);
  }
  get(runId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/workflows/${runId}`, opts);
  }
  cancel(runId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/workflows/${runId}/cancel`, undefined, opts);
  }
  resume(runId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/workflows/${runId}/resume`, undefined, opts);
  }
  signal(runId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/workflows/${runId}/signals`, data, opts);
  }
}

class AgentsResource {
  constructor(private client: StandardClient) {}

  start(assessmentId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/assessments/${assessmentId}/agent-runs`, data, opts);
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/assessments/${assessmentId}/agent-runs`, opts);
  }
  get(runId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/agent-runs/${runId}`, opts);
  }
  toolCalls(runId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/agent-runs/${runId}/tool-calls`, opts);
  }
}

class WebhooksResource {
  constructor(private client: StandardClient) {}

  create(orgId: string, data: { url: string; events?: string[]; description?: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/organizations/${orgId}/webhooks`, data, opts);
  }
  list(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/organizations/${orgId}/webhooks`, opts);
  }
  get(webhookId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/webhooks/${webhookId}`, opts);
  }
  update(webhookId: string, data: { url?: string; events?: string[]; description?: string; enabled?: boolean }, opts?: RequestOptions) {
    return this.client._patch<StandardResponse<any>>(`/webhooks/${webhookId}`, data, opts);
  }
  delete(webhookId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/webhooks/${webhookId}`, opts);
  }
  deliveries(webhookId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/webhooks/${webhookId}/deliveries`, opts);
  }
}

class OrganizationsResource {
  constructor(private client: StandardClient) {}

  create(data: { name: string; slug: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>("/organizations", data, opts);
  }
  get(orgId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<any>>(`/organizations/${orgId}`, opts);
  }
  createApiKey(orgId: string, data: { name: string; scopes?: string[]; expiresAt?: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<any>>(`/organizations/${orgId}/api-keys`, data, opts);
  }
  listApiKeys(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<any>>(`/organizations/${orgId}/api-keys`, opts);
  }
  revokeApiKey(orgId: string, keyId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/organizations/${orgId}/api-keys/${keyId}`, opts);
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

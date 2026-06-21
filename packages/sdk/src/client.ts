import type { paths } from "./api-types.js";
/**
 * StandardClient — Main SDK entry point
 *
 * Zero dependencies. Uses native fetch.
 * Works in Node.js 18+, Deno, Bun, Cloudflare Workers, and browsers.
 */
import { StandardError, type StandardErrorResponse } from "./errors.js";
import { constructEvent, type WebhookEvent } from "./crypto.js";
import type {
  RequestOptions,
  PaginatedResponse,
  RetryConfig,
  StandardResponse,
  ListQuery,
} from "./types.js";

export type { WebhookEvent } from "./crypto.js";
export type { RetryConfig } from "./types.js";
import type {
  Assessment,
  Document,
  DocumentChunk,
  IngestionJob,
  ScfVersion,
  ScfDomain,
  ScfControl,
  ScfFramework,
  ScfMapping,
  ScfRequirement,
  ScfCoverage,
  LifecycleEvent,
  AvailableTransition,
  ApprovalRecord,
  ArtifactVersion,
  SoaVersion,
  SoaItem,
  SoaValidation,
  GapAnalysisVersion,
  GapFinding,
  PoamVersion,
  PoamItem,
  ReportVersion,
  ReportSection,
  ReportExport,
  KbSearchResult,
  KbChunk,
  WorkflowRun,
  AgentRun,
  AgentToolCall,
  WebhookEndpoint,
  WebhookDelivery,
  Organization,
  ApiKey,
  ApiKeyCreated,
  ComplianceGate,
  ExportJob,
  AssessmentSummary,
  OrganizationDashboard,
  AuditLogEntry,
  Membership,
} from "./models.js";

export type StandardClientConfig = {
  /** API key (starts with "standard_live_" or "standard_test_" for sandbox) */
  apiKey: string;
  /** Organization UUID */
  organizationId: string;
  /** Base URL (defaults to production) */
  baseUrl?: string;
  /** Default timeout in ms (default: 30000) */
  timeout?: number;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
  /**
   * Automatic retry configuration for 429 and 5xx errors.
   * Set `maxAttempts: 1` to disable retry entirely.
   */
  retry?: Partial<RetryConfig>;
};

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 32_000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/** Sleep for `ms` milliseconds, cancellable via signal */
const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const tid = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(tid);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/** Generate a v4-style UUID using Web Crypto */
const newUuid = (): string => crypto.randomUUID();

const DEFAULT_BASE_URL = "https://standard-api.bekaa.eu";
const DEFAULT_TIMEOUT = 30_000;

export class StandardClient {
  private readonly config: Required<
    Omit<StandardClientConfig, "fetch" | "retry">
  > & {
    fetch: typeof globalThis.fetch;
    retry: RetryConfig;
  };

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
  readonly jobs: JobsResource;
  readonly compliance: ComplianceResource;
  readonly tenants: TenantsResource;
  readonly scopes: ScopesResource;
  readonly intelligence: IntelligenceResource;
  readonly evidenceFindings: EvidenceFindingsResource;
  readonly privacy: PrivacyResource;
  readonly me: MeResource;
  readonly soc: SocResource;

  /** True when the client is using a test/sandbox API key (prefix: standard_test_) */
  get isSandbox(): boolean {
    return this.config.apiKey.startsWith("standard_test_");
  }

  constructor(config: StandardClientConfig) {
    this.config = {
      apiKey: config.apiKey,
      organizationId: config.organizationId,
      baseUrl: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      fetch: config.fetch ?? globalThis.fetch.bind(globalThis),
      retry: { ...DEFAULT_RETRY, ...config.retry },
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
    this.jobs = new JobsResource(this);
    this.compliance = new ComplianceResource(this);
    this.tenants = new TenantsResource(this);
    this.scopes = new ScopesResource(this);
    this.intelligence = new IntelligenceResource(this);
    this.evidenceFindings = new EvidenceFindingsResource(this);
    this.privacy = new PrivacyResource(this);
    this.me = new MeResource(this);
    this.soc = new SocResource(this);
  }

  // ── Internal HTTP Methods ──────────────────────────────

  /** @internal */
  async _request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ): Promise<T> {
    const retryConfig: RetryConfig = {
      ...this.config.retry,
      ...opts?.retry,
    };

    // Auto-generate an idempotency key for write operations so retries are safe.
    // Use caller-provided key if supplied; generate one for POST/PATCH/PUT/DELETE.
    const isWrite = ["POST", "PATCH", "PUT", "DELETE"].includes(
      method.toUpperCase(),
    );
    const idempotencyKey =
      opts?.idempotencyKey ?? (isWrite ? newUuid() : undefined);

    let attempt = 0;
    let lastError: unknown;

    while (attempt < retryConfig.maxAttempts) {
      attempt++;
      const url = `${this.config.baseUrl}/api/v1${path}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.config.apiKey}`,
        "x-standard-tenant-id": this.config.organizationId,
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...(this.isSandbox ? { "x-standard-sandbox": "1" } : {}),
        ...opts?.headers,
      };

      try {
        const requestBody: BodyInit | null =
          body instanceof FormData ? body : body ? JSON.stringify(body) : null;

        const init: RequestInit = {
          method,
          headers,
          body: requestBody,
          signal: opts?.signal ?? controller.signal,
        };

        const response = await this.config.fetch(url, init);
        clearTimeout(timeout);

        if (!response.ok) {
          const statusCode = response.status;
          const shouldRetry =
            attempt < retryConfig.maxAttempts &&
            retryConfig.retryableStatuses.includes(statusCode);

          let errorBody: StandardErrorResponse;
          try {
            errorBody = (await response.json()) as StandardErrorResponse;
          } catch {
            errorBody = {
              error: { code: "UNKNOWN", message: response.statusText },
            };
          }

          const err = new StandardError(statusCode, errorBody);

          if (!shouldRetry) throw err;

          // Respect Retry-After header (in seconds or HTTP date)
          let delayMs: number;
          const retryAfter = response.headers.get("Retry-After");
          if (retryAfter) {
            const parsed = parseInt(retryAfter, 10);
            delayMs = isNaN(parsed)
              ? new Date(retryAfter).getTime() - Date.now()
              : parsed * 1000;
            delayMs = Math.max(0, Math.min(delayMs, retryConfig.maxDelayMs));
          } else {
            // Exponential backoff with jitter (+/-20%)
            const base = Math.min(
              retryConfig.initialDelayMs * 2 ** (attempt - 1),
              retryConfig.maxDelayMs,
            );
            delayMs = base * (0.8 + Math.random() * 0.4);
          }

          lastError = err;
          await sleep(delayMs, opts?.signal);
          continue;
        }

        return (await response.json()) as T;
      } catch (error) {
        clearTimeout(timeout);

        // Never retry abort/timeout — propagate immediately
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new StandardError(408, {
            error: {
              code: "TIMEOUT",
              message: `Request timed out after ${this.config.timeout}ms`,
            },
          });
        }
        if (error instanceof StandardError) throw error;
        throw error;
      }
    }

    // All attempts exhausted
    throw lastError;
  }

  /** @internal */
  _get<T>(path: string, opts?: RequestOptions) {
    return this._request<T>("GET", path, undefined, opts);
  }
  /** @internal */
  _post<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this._request<T>("POST", path, body, opts);
  }
  /** @internal */
  _patch<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this._request<T>("PATCH", path, body, opts);
  }
  /** @internal */
  _put<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this._request<T>("PUT", path, body, opts);
  }
  /** @internal */
  _delete<T>(path: string, opts?: RequestOptions) {
    return this._request<T>("DELETE", path, undefined, opts);
  }

  /**
   * Async generator that auto-paginates a list endpoint.
   * Yields individual items, fetching next pages automatically.
   *
   * @example
   * ```typescript
   * for await (const finding of client._paginate<GapFinding>("/assessments/123/gap-findings")) {
   *   console.log(finding.control_code);
   * }
   * ```
   */
  async *_paginate<T>(path: string, opts?: RequestOptions): AsyncGenerator<T> {
    let cursor: string | undefined;
    do {
      const url = cursor
        ? `${path}${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`
        : path;
      const page = await this._get<PaginatedResponse<T>>(url, opts);
      for (const item of page.data) {
        yield item;
      }
      // Support both top-level and nested pagination shapes
      const hasMore = page.has_more ?? page.pagination?.has_more ?? false;
      cursor = hasMore
        ? (page.next_cursor ?? page.pagination?.next_cursor)
        : undefined;
    } while (cursor);
  }
}

// ─── Resource Classes ─────────────────────────────────────────

class AssessmentsResource {
  constructor(private client: StandardClient) {}

  list(opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<Assessment>>(
      "/assessments",
      opts,
    );
  }
  get(id: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<Assessment>>(
      `/assessments/${id}`,
      opts,
    );
  }
  create(
    data: {
      organization_id: string;
      name: string;
      scf_version_id: string;
      document_count?: number;
    },
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<Assessment>>(
      "/assessments",
      data,
      opts,
    );
  }
  update(id: string, data: { name?: string }, opts?: RequestOptions) {
    return this.client._patch<StandardResponse<Assessment>>(
      `/assessments/${id}`,
      data,
      opts,
    );
  }
  status(id: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<Assessment>>(
      `/assessments/${id}/status`,
      opts,
    );
  }
  timeline(id: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<LifecycleEvent>>(
      `/assessments/${id}/timeline`,
      opts,
    );
  }
  listByOrg(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<Assessment>>(
      `/organizations/${orgId}/assessments`,
      opts,
    );
  }
  /** Check the compliance gate status for a given assessment (CI/CD integration) */
  complianceGate(id: string, opts?: RequestOptions) {
    return this.client._get<ComplianceGate>(
      `/assessments/${id}/compliance-gate`,
      opts,
    );
  }
  /** Get server-computed KPIs for an assessment */
  summary(id: string, opts?: RequestOptions) {
    return this.client._get<AssessmentSummary>(
      `/assessments/${id}/summary`,
      opts,
    );
  }
  /** Get audit logs for an assessment */
  auditLogs(
    id: string,
    query?: { action?: string; limit?: number },
    opts?: RequestOptions,
  ) {
    const p = new URLSearchParams();
    if (query?.action) p.set("action", query.action);
    if (query?.limit) p.set("limit", String(query.limit));
    const q = p.toString();
    return this.client._get<PaginatedResponse<AuditLogEntry>>(
      `/assessments/${id}/audit-logs${q ? `?${q}` : ""}`,
      opts,
    );
  }
}

class DocumentsResource {
  constructor(private client: StandardClient) {}

  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<Document>>(
      `/assessments/${assessmentId}/documents`,
      opts,
    );
  }
  get(docId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<Document>>(
      `/documents/${docId}`,
      opts,
    );
  }
  upload(
    assessmentId: string,
    file: File | Blob,
    description?: string,
    opts?: RequestOptions,
  ) {
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    return this.client._post<StandardResponse<Document>>(
      `/assessments/${assessmentId}/documents`,
      form,
      opts,
    );
  }
  delete(docId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/documents/${docId}`, opts);
  }
  chunks(docId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<DocumentChunk>>(
      `/documents/${docId}/chunks`,
      opts,
    );
  }
  reprocess(docId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<Document>>(
      `/documents/${docId}/reprocess`,
      undefined,
      opts,
    );
  }
  ingestionJobs(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<IngestionJob>>(
      `/assessments/${assessmentId}/ingestion-jobs`,
      opts,
    );
  }
}

class ScfResource {
  constructor(private client: StandardClient) {}

  readonly versions = {
    list: (opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfVersion>>("/scf/versions", opts),
    latest: (opts?: RequestOptions) =>
      this.client._get<StandardResponse<ScfVersion>>(
        "/scf/versions/latest",
        opts,
      ),
    domains: (versionId: string, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfDomain>>(
        `/scf/versions/${versionId}/domains`,
        opts,
      ),
    controls: (versionId: string, query?: ListQuery, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfControl>>(
        `/scf/versions/${versionId}/controls${qs(query)}`,
        opts,
      ),
  };

  readonly controls = {
    get: (controlId: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<ScfControl>>(
        `/scf/controls/${controlId}`,
        opts,
      ),
    byCode: (code: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<ScfControl>>(
        `/scf/controls/by-code/${encodeURIComponent(code)}`,
        opts,
      ),
    mappings: (controlId: string, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfMapping>>(
        `/scf/controls/${controlId}/mappings`,
        opts,
      ),
    assessmentObjectives: (
      controlId: string,
      query?: { version?: string },
      opts?: RequestOptions,
    ) => {
      const q = query?.version
        ? `?scf_version=${encodeURIComponent(query.version)}`
        : "";
      return this.client._get<any>(
        `/scf/controls/${controlId}/assessment-objectives${q}`,
        opts,
      );
    },
    evidenceRequests: (
      controlId: string,
      query?: { version?: string },
      opts?: RequestOptions,
    ) => {
      const q = query?.version
        ? `?scf_version=${encodeURIComponent(query.version)}`
        : "";
      return this.client._get<any>(
        `/scf/controls/${controlId}/evidence-requests${q}`,
        opts,
      );
    },
    maturityCriteria: (
      controlId: string,
      query?: { version?: string },
      opts?: RequestOptions,
    ) => {
      const q = query?.version
        ? `?scf_version=${encodeURIComponent(query.version)}`
        : "";
      return this.client._get<any>(
        `/scf/controls/${controlId}/maturity-criteria${q}`,
        opts,
      );
    },
    risks: (
      controlId: string,
      query?: { version?: string },
      opts?: RequestOptions,
    ) => {
      const q = query?.version
        ? `?scf_version=${encodeURIComponent(query.version)}`
        : "";
      return this.client._get<any>(
        `/scf/controls/${controlId}/risks${q}`,
        opts,
      );
    },
    threats: (
      controlId: string,
      query?: { version?: string },
      opts?: RequestOptions,
    ) => {
      const q = query?.version
        ? `?scf_version=${encodeURIComponent(query.version)}`
        : "";
      return this.client._get<any>(
        `/scf/controls/${controlId}/threats${q}`,
        opts,
      );
    },
  };

  readonly frameworks = {
    list: (opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfFramework>>(
        "/scf/frameworks",
        opts,
      ),
    get: (id: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<ScfFramework>>(
        `/scf/frameworks/${id}`,
        opts,
      ),
    requirements: (id: string, query?: ListQuery, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfRequirement>>(
        `/scf/frameworks/${id}/requirements${qs(query)}`,
        opts,
      ),
    coverage: (id: string, opts?: RequestOptions) =>
      this.client._get<StandardResponse<ScfCoverage>>(
        `/scf/frameworks/${id}/coverage`,
        opts,
      ),
  };

  readonly requirements = {
    mappings: (reqId: string, opts?: RequestOptions) =>
      this.client._get<PaginatedResponse<ScfMapping>>(
        `/scf/requirements/${reqId}/mappings`,
        opts,
      ),
  };

  readonly strm = {
    compare: (
      source: string,
      target: string,
      version = "latest",
      opts?: RequestOptions,
    ) =>
      this.client._get<any>(
        `/scf/strm/compare?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}&version=${encodeURIComponent(version)}`,
        opts,
      ),
  };

  readonly optimizer = {
    complianceStrategy: (
      frameworkIds: string[],
      scfVersionId?: string,
      opts?: RequestOptions,
    ) =>
      this.client._post<any>(
        "/optimizer/compliance-strategy",
        { framework_ids: frameworkIds, scf_version_id: scfVersionId },
        opts,
      ),
  };
}

class LifecycleResource {
  constructor(private client: StandardClient) {}

  transition(
    assessmentId: string,
    data: { next_state: string; reason?: string },
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<Assessment>>(
      `/assessments/${assessmentId}/transitions`,
      data,
      opts,
    );
  }
  availableTransitions(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<
      StandardResponse<{ transitions: AvailableTransition[] }>
    >(`/assessments/${assessmentId}/available-transitions`, opts);
  }
  events(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<LifecycleEvent>>(
      `/assessments/${assessmentId}/lifecycle-events`,
      opts,
    );
  }
}

class ApprovalsResource {
  constructor(private client: StandardClient) {}

  submit(
    assessmentId: string,
    data: {
      gate: string;
      decision: "approved" | "rejected";
      target_type: string;
      target_id: string;
      reason?: string;
    },
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<ApprovalRecord>>(
      `/assessments/${assessmentId}/approvals`,
      data,
      opts,
    );
  }

  /**
   * List pending approvals across all assessments for an organization.
   * Use this to build HITL dashboards and notification feeds.
   *
   * @param orgId  - Organization UUID
   * @param gate   - Optional filter: "soa"|"gap_analysis"|"maturity"|"poam"
   */
  listPending(
    orgId: string,
    gate?: "soa" | "gap_analysis" | "maturity" | "poam",
    opts?: RequestOptions,
  ) {
    const q = gate ? `?gate=${gate}` : "";
    return this.client._get<PaginatedResponse<ApprovalRecord>>(
      `/organizations/${orgId}/approvals/pending${q}`,
      opts,
    );
  }

  /**
   * Approve a pending approval gate.
   *
   * @param approvalId - UUID of the approval record
   * @param actor      - Human-readable identifier of the approver (email, user ID, etc.)
   *                     REQUIRED — approval must be traceable to a human actor.
   * @param reason     - Optional justification text
   */
  approve(
    approvalId: string,
    actor: string,
    reason?: string,
    opts?: RequestOptions,
  ) {
    if (!actor) {
      throw new Error(
        "approvals.approve() requires an explicit actor. " +
          "Approval gates must be traceable to a human — do not automate without identifying who approved.",
      );
    }
    return this.client._post<StandardResponse<ApprovalRecord>>(
      `/approvals/${approvalId}/approve`,
      { actor, reason },
      opts,
    );
  }

  /**
   * Reject a pending approval gate.
   *
   * @param approvalId - UUID of the approval record
   * @param actor      - Human-readable identifier of the reviewer (REQUIRED)
   * @param reason     - Rejection justification (REQUIRED)
   */
  reject(
    approvalId: string,
    actor: string,
    reason: string,
    opts?: RequestOptions,
  ) {
    if (!actor) {
      throw new Error("approvals.reject() requires an explicit actor.");
    }
    if (!reason) {
      throw new Error("approvals.reject() requires a reason for rejection.");
    }
    return this.client._post<StandardResponse<ApprovalRecord>>(
      `/approvals/${approvalId}/reject`,
      { actor, reason },
      opts,
    );
  }

  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ApprovalRecord>>(
      `/assessments/${assessmentId}/approvals`,
      opts,
    );
  }
  get(approvalId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<ApprovalRecord>>(
      `/approvals/${approvalId}`,
      opts,
    );
  }
}

class ArtifactsResource {
  constructor(private client: StandardClient) {}

  createVersion(
    assessmentId: string,
    type: string,
    data: Record<string, unknown>,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<ArtifactVersion>>(
      `/assessments/${assessmentId}/artifacts/${type}/versions`,
      data,
      opts,
    );
  }
  listVersions(assessmentId: string, type: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ArtifactVersion>>(
      `/assessments/${assessmentId}/artifacts/${type}/versions`,
      opts,
    );
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<ArtifactVersion>>(
      `/artifacts/${versionId}`,
      opts,
    );
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ArtifactVersion>>(
      `/artifacts/${versionId}/submit-review`,
      undefined,
      opts,
    );
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ArtifactVersion>>(
      `/artifacts/${versionId}/approve`,
      undefined,
      opts,
    );
  }
  supersede(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ArtifactVersion>>(
      `/artifacts/${versionId}/supersede`,
      undefined,
      opts,
    );
  }
}

class SoaResource {
  constructor(private client: StandardClient) {}

  createScope(
    assessmentId: string,
    data: Record<string, unknown>,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<SoaVersion>>(
      `/assessments/${assessmentId}/scope`,
      data,
      opts,
    );
  }
  getScope(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<SoaVersion>>(
      `/assessments/${assessmentId}/scope`,
      opts,
    );
  }
  draft(
    assessmentId: string,
    data?: Record<string, unknown>,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<SoaVersion>>(
      `/assessments/${assessmentId}/soa/draft`,
      data,
      opts,
    );
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<SoaVersion>>(
      `/assessments/${assessmentId}/soa`,
      opts,
    );
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<SoaVersion>>(
      `/soa/${versionId}`,
      opts,
    );
  }
  items(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<SoaItem>>(
      `/soa/${versionId}/items`,
      opts,
    );
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<SoaVersion>>(
      `/soa/${versionId}/submit-review`,
      undefined,
      opts,
    );
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<SoaVersion>>(
      `/soa/${versionId}/approve`,
      undefined,
      opts,
    );
  }
  validate(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<SoaValidation>>(
      `/soa/${versionId}/validation`,
      opts,
    );
  }
}

class GapAnalysisResource {
  constructor(private client: StandardClient) {}

  draft(
    assessmentId: string,
    data?: Record<string, unknown>,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<GapAnalysisVersion>>(
      `/assessments/${assessmentId}/gap-analysis/draft`,
      data,
      opts,
    );
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<GapAnalysisVersion>>(
      `/assessments/${assessmentId}/gap-analysis`,
      opts,
    );
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<GapAnalysisVersion>>(
      `/gap-analysis/${versionId}`,
      opts,
    );
  }
  findings(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<GapFinding>>(
      `/gap-analysis/${versionId}/findings`,
      opts,
    );
  }
  addFinding(
    versionId: string,
    data: Record<string, unknown>,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<GapFinding>>(
      `/gap-analysis/${versionId}/findings`,
      data,
      opts,
    );
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<GapAnalysisVersion>>(
      `/gap-analysis/${versionId}/submit-review`,
      undefined,
      opts,
    );
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<GapAnalysisVersion>>(
      `/gap-analysis/${versionId}/approve`,
      undefined,
      opts,
    );
  }
}

class PoamResource {
  constructor(private client: StandardClient) {}

  draft(
    assessmentId: string,
    data?: Record<string, unknown>,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<PoamVersion>>(
      `/assessments/${assessmentId}/poam/draft`,
      data,
      opts,
    );
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<PoamVersion>>(
      `/assessments/${assessmentId}/poam`,
      opts,
    );
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<PoamVersion>>(
      `/poam/${versionId}`,
      opts,
    );
  }
  items(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<PoamItem>>(
      `/poam/${versionId}/items`,
      opts,
    );
  }
  addItem(
    versionId: string,
    data: Record<string, unknown>,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<PoamItem>>(
      `/poam/${versionId}/items`,
      data,
      opts,
    );
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<PoamVersion>>(
      `/poam/${versionId}/submit-review`,
      undefined,
      opts,
    );
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<PoamVersion>>(
      `/poam/${versionId}/approve`,
      undefined,
      opts,
    );
  }
}

class ReportsResource {
  constructor(private client: StandardClient) {}

  draft(
    assessmentId: string,
    data?: Record<string, unknown>,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<ReportVersion>>(
      `/assessments/${assessmentId}/reports/draft`,
      data,
      opts,
    );
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ReportVersion>>(
      `/assessments/${assessmentId}/reports`,
      opts,
    );
  }
  get(versionId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<ReportVersion>>(
      `/reports/${versionId}`,
      opts,
    );
  }
  sections(versionId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ReportSection>>(
      `/reports/${versionId}/sections`,
      opts,
    );
  }
  submitReview(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ReportVersion>>(
      `/reports/${versionId}/submit-review`,
      undefined,
      opts,
    );
  }
  approve(versionId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ReportVersion>>(
      `/reports/${versionId}/approve`,
      undefined,
      opts,
    );
  }
  export(versionId: string, format?: "pdf" | "docx", opts?: RequestOptions) {
    return this.client._post<StandardResponse<ReportExport>>(
      `/reports/${versionId}/export`,
      { format },
      opts,
    );
  }
  /** Generate a downloadable audit package (PDF + evidence ZIP) */
  generateAuditPackage(assessmentId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<ExportJob>>(
      `/assessments/${assessmentId}/audit-package`,
      undefined,
      opts,
    );
  }
  /** Download a completed export job */
  downloadExport(jobId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<ExportJob>>(
      `/export-jobs/${jobId}/download`,
      opts,
    );
  }
}

class KbResource {
  constructor(private client: StandardClient) {}

  search(
    assessmentId: string,
    query: string,
    limit?: number,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<{ results: KbSearchResult[] }>>(
      `/assessments/${assessmentId}/kb/search`,
      { query, limit },
      opts,
    );
  }
  chunks(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<KbChunk>>(
      `/assessments/${assessmentId}/kb/chunks`,
      opts,
    );
  }
}

class WorkflowsResource {
  constructor(private client: StandardClient) {}

  startLifecycle(assessmentId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<WorkflowRun>>(
      `/assessments/${assessmentId}/workflows/lifecycle/start`,
      undefined,
      opts,
    );
  }
  getLifecycle(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<WorkflowRun>>(
      `/assessments/${assessmentId}/workflows/lifecycle`,
      opts,
    );
  }
  get(runId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<WorkflowRun>>(
      `/workflows/${runId}`,
      opts,
    );
  }
  cancel(runId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<WorkflowRun>>(
      `/workflows/${runId}/cancel`,
      undefined,
      opts,
    );
  }
  resume(runId: string, opts?: RequestOptions) {
    return this.client._post<StandardResponse<WorkflowRun>>(
      `/workflows/${runId}/resume`,
      undefined,
      opts,
    );
  }
  signal(runId: string, data: Record<string, unknown>, opts?: RequestOptions) {
    return this.client._post<StandardResponse<WorkflowRun>>(
      `/workflows/${runId}/signals`,
      data,
      opts,
    );
  }
}

class AgentsResource {
  constructor(private client: StandardClient) {}

  start(
    assessmentId: string,
    data: Record<string, unknown>,
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<AgentRun>>(
      `/assessments/${assessmentId}/agent-runs`,
      data,
      opts,
    );
  }
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<AgentRun>>(
      `/assessments/${assessmentId}/agent-runs`,
      opts,
    );
  }
  get(runId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<AgentRun>>(
      `/agent-runs/${runId}`,
      opts,
    );
  }
  toolCalls(runId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<AgentToolCall>>(
      `/agent-runs/${runId}/tool-calls`,
      opts,
    );
  }
}

class WebhooksResource {
  constructor(private client: StandardClient) {}

  create(
    orgId: string,
    data: { url: string; events?: string[]; description?: string },
    opts?: RequestOptions,
  ) {
    return this.client._post<
      StandardResponse<WebhookEndpoint & { signing_secret: string }>
    >(`/organizations/${orgId}/webhooks`, data, opts);
  }
  list(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<WebhookEndpoint>>(
      `/organizations/${orgId}/webhooks`,
      opts,
    );
  }
  get(webhookId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<WebhookEndpoint>>(
      `/webhooks/${webhookId}`,
      opts,
    );
  }
  update(
    webhookId: string,
    data: {
      url?: string;
      events?: string[];
      description?: string;
      enabled?: boolean;
    },
    opts?: RequestOptions,
  ) {
    return this.client._patch<StandardResponse<WebhookEndpoint>>(
      `/webhooks/${webhookId}`,
      data,
      opts,
    );
  }
  delete(webhookId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/webhooks/${webhookId}`, opts);
  }
  deliveries(webhookId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<WebhookDelivery>>(
      `/webhooks/${webhookId}/deliveries`,
      opts,
    );
  }

  /**
   * Verify and parse a Standard webhook event.
   *
   * IMPORTANT: Pass the **raw** request body string (not parsed JSON).
   * Parsing the body before verification will break the HMAC check.
   *
   * @param rawBody   - The raw request body (string)
   * @param signature - Value of the `X-Standard-Signature` header
   * @param secret    - Your webhook signing secret (from `webhooks.create()`)
   * @returns Parsed WebhookEvent if the signature is valid
   * @throws Error with code `WEBHOOK_SIGNATURE_INVALID` if invalid
   *
   * @example
   * ```typescript
   * app.post("/webhook", express.raw({ type: "*\/*" }), async (req, res) => {
   *   const event = await client.webhooks.constructEvent(
   *     req.body.toString(),
   *     req.headers["x-standard-signature"] as string,
   *     process.env.WEBHOOK_SECRET!,
   *   );
   *   if (event.event_type === "assessment.gap_analysis.approved") {
   *     // handle approved gap analysis
   *   }
   *   res.sendStatus(200);
   * });
   * ```
   */
  constructEvent(
    rawBody: string,
    signature: string,
    secret: string,
  ): Promise<WebhookEvent> {
    return constructEvent(rawBody, signature, secret);
  }
}

class OrganizationsResource {
  constructor(private client: StandardClient) {}

  create(data: { name: string; slug: string }, opts?: RequestOptions) {
    return this.client._post<StandardResponse<Organization>>(
      "/organizations",
      data,
      opts,
    );
  }
  get(orgId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<Organization>>(
      `/organizations/${orgId}`,
      opts,
    );
  }
  createApiKey(
    orgId: string,
    data: { name: string; scopes?: string[]; expiresAt?: string },
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<ApiKeyCreated>>(
      `/organizations/${orgId}/api-keys`,
      data,
      opts,
    );
  }
  listApiKeys(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<ApiKey>>(
      `/organizations/${orgId}/api-keys`,
      opts,
    );
  }
  revokeApiKey(orgId: string, keyId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(
      `/organizations/${orgId}/api-keys/${keyId}`,
      opts,
    );
  }
  /** Get server-computed dashboard KPIs for an organization */
  dashboard(orgId: string, opts?: RequestOptions) {
    return this.client._get<OrganizationDashboard>(
      `/organizations/${orgId}/dashboard`,
      opts,
    );
  }
  /** List audit logs for an organization */
  auditLogs(
    orgId: string,
    query?: {
      action?: string;
      actor_id?: string;
      since?: string;
      until?: string;
      limit?: number;
    },
    opts?: RequestOptions,
  ) {
    const p = new URLSearchParams();
    if (query?.action) p.set("action", query.action);
    if (query?.actor_id) p.set("actor_id", query.actor_id);
    if (query?.since) p.set("since", query.since);
    if (query?.until) p.set("until", query.until);
    if (query?.limit) p.set("limit", String(query.limit));
    const q = p.toString();
    return this.client._get<PaginatedResponse<AuditLogEntry>>(
      `/organizations/${orgId}/audit-logs${q ? `?${q}` : ""}`,
      opts,
    );
  }
  /**
   * List members of an organization.
   * @deprecated Backend uses 1:1 admin/org model — no /members routes exist. Will return 404. Planned for Phase 2.
   */
  listMembers(orgId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<Membership>>(
      `/organizations/${orgId}/members`,
      opts,
    );
  }
  /**
   * Invite a new member to an organization.
   * @deprecated Backend uses 1:1 admin/org model — no /members routes exist. Will return 404. Planned for Phase 2.
   */
  inviteMember(
    orgId: string,
    data: { email: string; role: string; display_name?: string },
    opts?: RequestOptions,
  ) {
    return this.client._post<StandardResponse<Membership>>(
      `/organizations/${orgId}/members`,
      data,
      opts,
    );
  }
  /**
   * Update a member's role.
   * @deprecated Backend uses 1:1 admin/org model — no /members routes exist. Will return 404. Planned for Phase 2.
   */
  updateMemberRole(
    memberId: string,
    data: { role: string },
    opts?: RequestOptions,
  ) {
    return this.client._patch<StandardResponse<Membership>>(
      `/members/${memberId}`,
      data,
      opts,
    );
  }
  /**
   * Remove a member.
   * @deprecated Backend uses 1:1 admin/org model — no /members routes exist. Will return 404. Planned for Phase 2.
   */
  removeMember(memberId: string, opts?: RequestOptions) {
    return this.client._delete<{ ok: boolean }>(`/members/${memberId}`, opts);
  }
}

// ── Jobs Resource ────────────────────────────────────────────

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type JobRecord = {
  id: string;
  type: string;
  status: JobStatus;
  assessment_id?: string;
  organization_id?: string;
  progress?: number;
  error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
};

export type UsagePeriod = "day" | "week" | "month";

export type UsageRecord = {
  period: UsagePeriod;
  tokens_used: number;
  estimated_cost_usd: number;
  requests_count: number;
  quota_limit: number | null;
  quota_remaining: number | null;
  since: string;
  until: string;
};

class JobsResource {
  constructor(private client: StandardClient) {}

  /** Get the current status of a job */
  get(jobId: string, opts?: RequestOptions) {
    return this.client._get<StandardResponse<JobRecord>>(
      `/jobs/${jobId}`,
      opts,
    );
  }

  /** List recent jobs for an assessment */
  list(assessmentId: string, opts?: RequestOptions) {
    return this.client._get<PaginatedResponse<JobRecord>>(
      `/assessments/${assessmentId}/jobs`,
      opts,
    );
  }

  /**
   * Poll a job until it reaches a terminal state (completed | failed | cancelled).
   *
   * @param jobId          - Job UUID to poll
   * @param opts.pollIntervalMs - How often to poll in ms (default: 3000)
   * @param opts.timeoutMs     - Max wait time in ms (default: 300_000 = 5 min)
   * @returns The completed JobRecord
   * @throws StandardError if the job fails or timeout is exceeded
   *
   * @example
   * ```typescript
   * const doc = await client.documents.upload(assessmentId, file);
   * const job = await client.jobs.waitForCompletion(doc.data.ingestion_job_id);
   * console.log("Ingestion complete:", job.status);
   * ```
   */
  async waitForCompletion(
    jobId: string,
    opts?: {
      pollIntervalMs?: number;
      timeoutMs?: number;
      signal?: AbortSignal;
    },
  ): Promise<JobRecord> {
    const pollInterval = opts?.pollIntervalMs ?? 3_000;
    const timeout = opts?.timeoutMs ?? 300_000;
    const deadline = Date.now() + timeout;
    const TERMINAL: JobStatus[] = ["completed", "failed", "cancelled"];

    while (Date.now() < deadline) {
      const res = await this.get(
        jobId,
        opts?.signal ? { signal: opts.signal } : undefined,
      );
      if (TERMINAL.includes(res.data.status)) {
        if (res.data.status === "failed") {
          throw new StandardError(500, {
            error: {
              code: "JOB_FAILED",
              message: res.data.error ?? `Job ${jobId} failed`,
            },
          });
        }
        return res.data;
      }
      await new Promise<void>((resolve, reject) => {
        const tid = setTimeout(resolve, pollInterval);
        opts?.signal?.addEventListener("abort", () => {
          clearTimeout(tid);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }

    throw new StandardError(408, {
      error: {
        code: "JOB_TIMEOUT",
        message: `Job ${jobId} did not complete within ${timeout}ms`,
      },
    });
  }
}

class ComplianceResource {
  constructor(private client: StandardClient) {}

  /**
   * Verifies the compliance status of an assessment for CI/CD pipelines.
   * Fetches the assessment's compliance gate status and gap findings,
   * then verifies if any controls under critical control families are in a non-compliant state.
   * Throws an error (fails the build) if any critical control is not met.
   */
  async verifyPipelineStatus(
    opts: {
      assessmentId: string;
      criticalFamilies?: string[];
    },
    requestOpts?: RequestOptions,
  ): Promise<{
    status: "pass";
    checked_at: string;
    total_findings: number;
    non_compliant_criticals: string[];
  }> {
    const assessmentId = opts.assessmentId;
    const criticalFamilies = opts.criticalFamilies ?? ["SDP", "SDLC"];

    // 1. Fetch compliance gate
    const gate = await this.client.assessments.complianceGate(
      assessmentId,
      requestOpts,
    );

    if (gate.status === "no_data") {
      throw new Error(
        `Compliance verification failed: No approved gap analysis found for assessment ${assessmentId}`,
      );
    }

    if (!gate.gap_analysis_version_id) {
      throw new Error(
        `Compliance verification failed: Missing gap analysis version in compliance gate for assessment ${assessmentId}`,
      );
    }

    // 2. Fetch gap findings
    const findingsResponse = await this.client.gapAnalysis.findings(
      gate.gap_analysis_version_id,
      requestOpts,
    );
    const findings = findingsResponse.data || [];

    // 3. Check for non-compliant controls under critical families
    const nonCompliantCriticals: string[] = [];
    const upperCriticalFamilies = criticalFamilies.map((f) => f.toUpperCase());

    for (const finding of findings) {
      const gapCode =
        (finding as any).gap_code || (finding as any).control_code || "";
      const status = (finding as any).assessment_status || finding.status || "";

      // Determine the control family/domain from the gap code (e.g. SDP-01 -> SDP)
      const family = gapCode.split("-")[0]?.toUpperCase() || "";

      if (upperCriticalFamilies.includes(family)) {
        // A control in a critical family is non-compliant if it's not "met" and not "not_applicable_justified"
        if (status !== "met" && status !== "not_applicable_justified") {
          nonCompliantCriticals.push(`${gapCode} (Status: ${status})`);
        }
      }
    }

    if (nonCompliantCriticals.length > 0) {
      throw new Error(
        `Compliance gate failed: Non-compliant controls found in critical families [${criticalFamilies.join(
          ", ",
        )}]:\n` + nonCompliantCriticals.map((c) => `  - ${c}`).join("\n"),
      );
    }

    return {
      status: "pass",
      checked_at: new Date().toISOString(),
      total_findings: gate.total_findings,
      non_compliant_criticals: [],
    };
  }
}

// ── Helper ──────────────────────────────────────────────────
function qs(query?: ListQuery): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  if (query.page) params.set("page", String(query.page));
  if (query.cursor) params.set("cursor", query.cursor);
  const str = params.toString();
  return str ? `?${str}` : "";
}

// ── Missing Resources Generated ──────────────────────────────────────────────

export type TenantsResourcePostResponse =
  paths["/api/v1/tenants"]["post"]["responses"]["201"]["content"]["application/json"];
export type TenantsResourceGetResponse =
  paths["/api/v1/tenants/{organizationId}"]["get"]["responses"]["200"]["content"]["application/json"];

class TenantsResource {
  constructor(private client: StandardClient) {}

  get(id: string, opts?: RequestOptions) {
    return this.client._get<TenantsResourceGetResponse>(`/tenants/${id}`, opts);
  }
  create(data: any, opts?: RequestOptions) {
    return this.client._post<TenantsResourcePostResponse>(
      "/tenants",
      data,
      opts,
    );
  }
  update(id: string, data: any, opts?: RequestOptions) {
    return this.client._patch<any>(`/tenants/${id}`, data, opts);
  }
  organizations(id: string, opts?: RequestOptions) {
    return this.client._get<any>(`/tenants/${id}/organizations`, opts);
  }
}

class ScopesResource {
  constructor(private client: StandardClient) {}

  get(id: string, opts?: RequestOptions) {
    return this.client._get<any>(`/scopes/${id}`, opts);
  }
  update(id: string, data: any, opts?: RequestOptions) {
    return this.client._patch<any>(`/scopes/${id}`, data, opts);
  }
  submitReview(id: string, opts?: RequestOptions) {
    return this.client._post<any>(
      `/scopes/${id}/submit-review`,
      undefined,
      opts,
    );
  }
  approve(id: string, opts?: RequestOptions) {
    return this.client._post<any>(`/scopes/${id}/approve`, undefined, opts);
  }
}

class IntelligenceResource {
  constructor(private client: StandardClient) {}

  blastRadius(data: any, opts?: RequestOptions) {
    return this.client._post<any>("/intelligence/blast-radius", data, opts);
  }
  gapAnalysis(data: any, opts?: RequestOptions) {
    return this.client._post<any>("/intelligence/gap-analysis", data, opts);
  }
  dpiaScore(data: any, opts?: RequestOptions) {
    return this.client._post<any>("/intelligence/dpia-score", data, opts);
  }
  complianceScore(data: any, opts?: RequestOptions) {
    return this.client._post<any>("/intelligence/compliance-score", data, opts);
  }
  retentionCheck(data: any, opts?: RequestOptions) {
    return this.client._post<any>("/intelligence/retention-check", data, opts);
  }
  breachSla(data: any, opts?: RequestOptions) {
    return this.client._post<any>("/intelligence/breach-sla", data, opts);
  }
  crossCoverage(data: any, opts?: RequestOptions) {
    return this.client._post<any>("/intelligence/cross-coverage", data, opts);
  }
  roiPath(data: any, opts?: RequestOptions) {
    return this.client._post<any>("/intelligence/roi-path", data, opts);
  }
}

class EvidenceFindingsResource {
  constructor(private client: StandardClient) {}

  get(id: string, opts?: RequestOptions) {
    return this.client._get<any>(`/evidence-findings/${id}`, opts);
  }
  sources(id: string, opts?: RequestOptions) {
    return this.client._get<any>(`/evidence-findings/${id}/sources`, opts);
  }
  refresh(id: string, opts?: RequestOptions) {
    return this.client._post<any>(
      `/evidence-findings/${id}/refresh`,
      undefined,
      opts,
    );
  }
}

class PrivacyResource {
  constructor(private client: StandardClient) {}

  scanVendorContract(data: any, opts?: RequestOptions) {
    return this.client._post<any>("/privacy/scan-vendor-contract", data, opts);
  }
  scanVendorContractBatch(data: any, opts?: RequestOptions) {
    return this.client._post<any>(
      "/privacy/scan-vendor-contract/batch",
      data,
      opts,
    );
  }
}

class MeResource {
  constructor(private client: StandardClient) {}

  account(opts?: RequestOptions) {
    return this.client._get<any>("/me/account", opts);
  }
  dataExport(opts?: RequestOptions) {
    return this.client._get<any>("/me/data-export", opts);
  }
}

class SocResource {
  constructor(private client: StandardClient) {}

  status(opts?: RequestOptions) {
    return this.client._get<any>("/soc/status", opts);
  }
}

/**
 * Centralised TanStack Query hooks for the Standard web app.
 *
 * Convention:
 *  - query keys follow the shape [resource, ...params]
 *  - each hook is a thin wrapper around useQuery / useMutation + the api() client
 *  - mutations call queryClient.invalidateQueries() to keep cache fresh
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const qk = {
  orgs: () => ["orgs"] as const,
  orgDetail: (id: string) => ["orgs", id] as const,
  orgMembers: (id: string) => ["orgs", id, "members"] as const,
  orgApiKeys: (id: string) => ["orgs", id, "api-keys"] as const,
  orgWebhooks: (id: string) => ["orgs", id, "webhooks"] as const,
  webhookDeliveries: (orgId: string, endpointId: string) =>
    ["orgs", orgId, "webhooks", endpointId, "deliveries"] as const,
  adminUsers: (page: number, search: string) =>
    ["admin", "users", page, search] as const,
  adminOrgs: (page: number, search: string) =>
    ["admin", "orgs", page, search] as const,
  adminUsage: () => ["admin", "usage"] as const,
  auditLogs: (orgId: string | undefined, page: number, filter: string) =>
    ["audit-logs", orgId, page, filter] as const,
  health: () => ["health"] as const,
  userOrgs: () => ["user", "orgs"] as const,
  scfLatestVersion: () => ["scf", "version", "latest"] as const,
  scfDomains: (versionId: string) => ["scf", "domains", versionId] as const,
  scfControls: (versionId: string, domain: string, q: string) =>
    ["scf", "controls", versionId, domain, q] as const,
  scfFrameworks: () => ["scf", "frameworks"] as const,
  scfFrameworkCoverage: (frameworkId: string, versionId: string) =>
    ["scf", "frameworks", frameworkId, "coverage", versionId] as const,
  pendingUserCount: () => ["admin", "users", "pending-count"] as const,
} as const;

// ─── Auth / Orgs ──────────────────────────────────────────────────────────────

export function useUserOrgs() {
  return useQuery({
    queryKey: qk.userOrgs(),
    queryFn: () => api<{ data: OrgListItem[] }>("/api/v1/users/me/organizations"),
  });
}

// ─── Orgs Detail & Members ────────────────────────────────────────────────────

export function useOrgDetail(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.orgDetail(orgId ?? ""),
    queryFn: () => api<OrgListItem>(`/api/v1/organizations/${orgId}`),
    enabled: !!orgId,
  });
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.orgMembers(orgId ?? ""),
    queryFn: () => api<{ data: OrgMember[] }>(`/api/v1/organizations/${orgId}/members`),
    enabled: !!orgId,
  });
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export function useOrgApiKeys(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.orgApiKeys(orgId ?? ""),
    queryFn: () => api<{ data: ApiKeyRecord[] }>(`/api/v1/organizations/${orgId}/api-keys`),
    enabled: !!orgId,
  });
}

export function useCreateApiKey(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApiKeyBody) =>
      api<{ data: ApiKeyRecord & { key: string }; trace_id: string }>(`/api/v1/organizations/${orgId}/api-keys`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgApiKeys(orgId) }),
  });
}


export function useDeleteApiKey(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      api(`/api/v1/organizations/${orgId}/api-keys/${keyId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgApiKeys(orgId) }),
  });
}

export function useUpdateApiKey(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ keyId, patch }: { keyId: string; patch: UpdateApiKeyBody }) =>
      api<{ data: ApiKeyRecord }>(`/api/v1/organizations/${orgId}/api-keys/${keyId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgApiKeys(orgId) }),
  });
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export function useOrgWebhooks(orgId: string | undefined) {
  return useQuery({
    queryKey: qk.orgWebhooks(orgId ?? ""),
    queryFn: () => api<{ data: WebhookEndpoint[] }>(`/api/v1/organizations/${orgId}/webhooks`),
    enabled: !!orgId,
  });
}

export function useWebhookDeliveries(orgId: string | undefined, endpointId: string | undefined) {
  return useQuery({
    queryKey: qk.webhookDeliveries(orgId ?? "", endpointId ?? ""),
    queryFn: () =>
      api<{ data: WebhookDelivery[] }>(
        `/api/v1/organizations/${orgId}/webhooks/${endpointId}/deliveries`
      ),
    enabled: !!orgId && !!endpointId,
  });
}

export function useCreateWebhook(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWebhookBody) =>
      api<{ data: WebhookEndpoint }>(`/api/v1/organizations/${orgId}/webhooks`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgWebhooks(orgId) }),
  });
}

export function useDeleteWebhook(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (endpointId: string) =>
      api(`/api/v1/organizations/${orgId}/webhooks/${endpointId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgWebhooks(orgId) }),
  });
}

function useToggleWebhook(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ endpointId, enabled }: { endpointId: string; enabled: boolean }) =>
      api<{ data: WebhookEndpoint }>(
        `/api/v1/organizations/${orgId}/webhooks/${endpointId}`,
        { method: "PATCH", body: JSON.stringify({ enabled }) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgWebhooks(orgId) }),
  });
}

function useTestWebhook(orgId: string) {
  return useMutation({
    mutationFn: (endpointId: string) =>
      api(`/api/v1/organizations/${orgId}/webhooks/${endpointId}/test`, { method: "POST" }),
  });
}

// ─── Audit Logs (admin security events) ──────────────────────────────────────

type AuditLogsFilters = {
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
};

const PAGE_SIZE_AUDIT = 50;

export function useAuditLogs(page: number, filters: AuditLogsFilters) {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE_AUDIT + 1)); // fetch +1 to detect hasMore
  params.set("offset", String(page * PAGE_SIZE_AUDIT));
  if (filters.action) params.set("action", filters.action);
  if (filters.actorId) params.set("actor_id", filters.actorId);
  if (filters.from) params.set("from", new Date(filters.from).toISOString());
  if (filters.to) params.set("to", new Date(filters.to + "T23:59:59").toISOString());

  return useQuery({
    queryKey: qk.auditLogs(undefined, page, JSON.stringify(filters)),
    queryFn: () =>
      api<{ data?: RawAuditEvent[]; events?: RawAuditEvent[] }>(
        `/api/v1/admin/security-events?${params}`
      ),
    placeholderData: (prev) => prev,
    retry: (count, err: unknown) => {
      if ((err as { status?: number })?.status === 403) return false;
      return count < 1;
    },
  });
}

type RawAuditEvent = Record<string, unknown>;

// ─── Admin ────────────────────────────────────────────────────────────────────

export function useAdminUsers(page: number, search: string) {
  const limit = 25;
  const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
  if (search) params.set("search", search);

  return useQuery({
    queryKey: qk.adminUsers(page, search),
    queryFn: () =>
      api<{ data: AdminUser[]; total: number }>(`/api/v1/admin/users?${params}`),
    placeholderData: (prev) => prev,
  });
}

export function usePendingUserCount() {
  return useQuery({
    queryKey: qk.pendingUserCount(),
    queryFn: () =>
      api<{ data: { count: number } }>("/api/v1/admin/users/pending-count"),
    refetchInterval: 60_000, // poll every minute
    retry: 1,
  });
}

export function useAdminOrgs(page: number, search: string) {
  const limit = 25;
  const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
  if (search) params.set("search", search);

  return useQuery({
    queryKey: qk.adminOrgs(page, search),
    queryFn: () =>
      api<{ data: AdminOrg[]; total: number }>(`/api/v1/admin/organizations?${params}`),
    placeholderData: (prev) => prev,
  });
}

function useAdminUsage() {
  return useQuery({
    queryKey: qk.adminUsage(),
    queryFn: () => api<{ usage: unknown[]; agent_usage: AgentUsage[] }>("/api/v1/admin/usage"),
  });
}

// ─── Health ───────────────────────────────────────────────────────────────────

type RawHealthPayload = { basic: RawJson | null; detailed: RawJson | null };
type RawJson = Record<string, unknown>;

export function useHealthRaw(apiUrl: string) {
  return useQuery<RawHealthPayload>({
    queryKey: qk.health(),
    queryFn: async () => {
      const [basicRes, detailedRes] = await Promise.allSettled([
        fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(8000) })
          .then((r) => (r.ok ? (r.json() as Promise<RawJson>) : null)),
        fetch(`${apiUrl}/api/v1/health`, { signal: AbortSignal.timeout(8000) })
          .then((r) => (r.ok ? (r.json() as Promise<RawJson>) : null)),
      ]);
      return {
        basic: basicRes.status === "fulfilled" ? basicRes.value : null,
        detailed: detailedRes.status === "fulfilled" ? detailedRes.value : null,
      };
    },
    refetchInterval: 30_000,
    retry: 1,
  });
}

// Lightweight health check used by OverviewPage status card
export function useHealthStatus(apiUrl: string) {
  return useQuery<"operational" | "degraded" | "down" | "unknown">({
    queryKey: [...qk.health(), "status"],
    queryFn: () =>
      fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) })
        .then((r) => (r.ok ? ("operational" as const) : ("degraded" as const)))
        .catch(() => "down" as const),
    refetchInterval: 30_000,
    retry: 1,
  });
}

// ─── SCF Catalog ──────────────────────────────────────────────────────────────

export function useScfLatestVersion() {
  return useQuery<ScfVersionInfo>({
    queryKey: qk.scfLatestVersion(),
    queryFn: () => api<ScfVersionInfo>("/api/v1/scf/versions/latest"),
    staleTime: 1000 * 60 * 30, // catalog is static — cache 30m
  });
}

export function useScfDomains(versionId: string | undefined) {
  return useQuery({
    queryKey: qk.scfDomains(versionId ?? ""),
    queryFn: () =>
      api<{ data: ScfDomainItem[] }>(`/api/v1/scf/versions/${versionId}/domains`),
    enabled: !!versionId,
    staleTime: 1000 * 60 * 30,
  });
}

export function useScfControls(
  versionId: string | undefined,
  filters: { domainCode?: string; q?: string }
) {
  const params = new URLSearchParams();
  if (filters.domainCode) params.set("domain_code", filters.domainCode);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();

  return useQuery({
    queryKey: qk.scfControls(versionId ?? "", filters.domainCode ?? "", filters.q ?? ""),
    queryFn: () =>
      api<{ data: ScfControlItem[] }>(
        `/api/v1/scf/versions/${versionId}/controls${qs ? `?${qs}` : ""}`
      ),
    enabled: !!versionId,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 10,
  });
}

export function useScfFrameworks() {
  return useQuery({
    queryKey: qk.scfFrameworks(),
    queryFn: () => api<{ data: ScfFrameworkItem[] }>("/api/v1/scf/frameworks"),
    staleTime: 1000 * 60 * 30,
  });
}

export function useScfFrameworkCoverage(
  frameworkId: string | undefined,
  versionId: string | undefined
) {
  return useQuery<ScfCoverage>({
    queryKey: qk.scfFrameworkCoverage(frameworkId ?? "", versionId ?? ""),
    queryFn: () =>
      api<ScfCoverage>(
        `/api/v1/scf/frameworks/${frameworkId}/coverage?scf_version=${versionId}`
      ),
    enabled: !!frameworkId && !!versionId,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Shared Types (local to this module) ──────────────────────────────────────

type ScfVersionInfo = {
  scf_version_id: string;
  version_label: string;
  release_date?: string;
  import_status: string;
  is_synthetic: boolean;
};

type ScfDomainItem = {
  id: string;
  domain_code: string;
  domain_name: string;
  description?: string;
  sort_order?: number;
};

type ScfControlItem = {
  control_id: string;
  scf_version_id: string;
  scf_domain_id: string;
  control_code: string;
  control_title: string;
  control_description?: string;
  control_question?: string;
  control_intent?: string;
  implementation_guidance?: string;
  expected_evidence?: string;
  control_weight?: number;
  status: string;
  is_synthetic: boolean;
};

type ScfFrameworkItem = {
  framework_id: string;
  framework_code: string;
  framework_name: string;
  framework_version?: string;
  publisher?: string;
  jurisdiction?: string;
  category?: string;
  status: string;
  is_synthetic: boolean;
};

type ScfCoverage = {
  framework_id: string;
  scf_version_id: string;
  requirement_count: number;
  mapped_requirement_count: number;
  control_count: number;
  official_mapping_count: number;
  is_synthetic: boolean;
};


type OrgListItem = {
  id: string;
  name: string;
  slug?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  logo?: string | null;
  metadata?: Record<string, unknown>;
};

type OrgMember = {
  userId?: string;
  user?: { id: string; name: string; email: string };
  name?: string;
  email?: string;
  role: string;
  createdAt?: string;
};

type ApiKeyRecord = {
  id: string;
  name: string;
  maskedKey: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  isRevoked: boolean;
  status: "active" | "expired" | "revoked";
  createdAt: string;
};

type CreateApiKeyBody = {
  name: string;
  scopes?: string[];
  expiresAt?: string;
};

type UpdateApiKeyBody = {
  name?: string;
  scopes?: string[];
  expiresAt?: string | null;
};

type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  description?: string;
  enabled: boolean;
  signing_secret_masked: string;
  created_at: string;
  updated_at: string;
};

type WebhookDelivery = {
  delivery_id: string;
  endpoint_id: string;
  event_type: string;
  status: "delivered" | "failed" | "pending";
  http_status?: number;
  attempt_count: number;
  last_attempted_at?: string;
};

type CreateWebhookBody = {
  url: string;
  events: string[];
  description?: string;
};

type AuditLog = {
  id?: string;
  event?: string;
  action?: string;
  actorId?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type AgentUsage = {
  agent_type: string;
  total_tokens: number;
  total_calls: number;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  banned?: boolean;
  approved?: boolean;
};

type AdminOrg = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
};

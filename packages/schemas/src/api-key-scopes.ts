/**
 * API Key Scopes â€” granular permission system for M2M API keys.
 *
 * Scopes follow `resource:action` format, matching internal permissions.
 * A key with no scopes has zero permissions (M4 least privilege).
 * At least one scope must be explicitly granted.
 *
 * @module @standard/schemas/api-key-scopes
 */
import { z } from "zod";

/** All possible API key scopes */
export const API_KEY_SCOPES = [
  // Assessment lifecycle
  "assessment:read",
  "assessment:write",
  "assessment:transition",

  // Documents
  "document:read",
  "document:write",
  "document:delete",

  // SCF catalog (read-only for M2M)
  "scf:read",

  // Scope & SoA
  "soa:read",
  "soa:write",

  // Gap Analysis
  "gap:read",
  "gap:write",

  // POA&M
  "poam:read",
  "poam:write",

  // Reporting
  "report:read",
  "report:write",
  "report:export",

  // Knowledge Base
  "kb:read",
  "kb:search",
  "kb:write",

  // Privacy / RoPA / data subject
  "privacy:read",
  "privacy:write",

  // Agent runtime
  "agent:read",
  "agent:run",

  // Integrations
  "integration:analyze",

  // Intelligence & MCP
  "intelligence:read",
  "intelligence:run",
  "job:read",

  // Observability
  "audit:read",
  "metrics:read",
  "usage:read",

  // Workflows
  "workflow:read",
  "workflow:write",
  "workflow:signal",

  // Artifacts
  "artifact:read",
  "artifact:write",

  // Approvals (read-only for M2M by default)
  "approval:read",

  // Own organization (read-only; key management stays console-only)
  "organization:read",
] as const;

export type M2mScope = (typeof API_KEY_SCOPES)[number];

export const M2mScopeSchema = z.enum(API_KEY_SCOPES);

export const M2mScopesArraySchema = z
  .array(M2mScopeSchema)
  .min(1, "At least one scope is required when scopes are specified")
  .max(API_KEY_SCOPES.length);

/**
 * Maps a route path pattern + method to required scopes.
 * Used by the middleware to enforce scope-based access control.
 */
export const ROUTE_SCOPE_MAP: Record<string, M2mScope[]> = {
  // Assessments
  "GET:/api/v1/assessments": ["assessment:read"],
  "POST:/api/v1/assessments": ["assessment:write"],
  "GET:/api/v1/assessments/:assessmentId": ["assessment:read"],
  "PATCH:/api/v1/assessments/:assessmentId": ["assessment:write"],
  "GET:/api/v1/assessments/:assessmentId/status": ["assessment:read"],
  "GET:/api/v1/assessments/:assessmentId/timeline": ["assessment:read"],

  // Lifecycle
  "POST:/api/v1/assessments/:assessmentId/transitions": [
    "assessment:transition",
  ],
  "GET:/api/v1/assessments/:assessmentId/available-transitions": [
    "assessment:read",
  ],
  "GET:/api/v1/assessments/:assessmentId/lifecycle-events": ["assessment:read"],

  // Documents
  "POST:/api/v1/assessments/:assessmentId/documents": ["document:write"],
  "GET:/api/v1/assessments/:assessmentId/documents": ["document:read"],
  "GET:/api/v1/documents/:documentId": ["document:read"],
  "DELETE:/api/v1/documents/:documentId": ["document:delete"],

  // SCF
  "GET:/api/v1/scf/versions": ["scf:read"],
  "GET:/api/v1/scf/versions/latest": ["scf:read"],
  "GET:/api/v1/scf/frameworks": ["scf:read"],
  "GET:/api/v1/scf/controls/:controlId": ["scf:read"],

  // SoA
  "GET:/api/v1/assessments/:assessmentId/soa": ["soa:read"],
  "POST:/api/v1/assessments/:assessmentId/soa/draft": ["soa:write"],

  // Gap Analysis
  "GET:/api/v1/assessments/:assessmentId/gap-analysis": ["gap:read"],
  "POST:/api/v1/assessments/:assessmentId/gap-analysis/draft": ["gap:write"],

  // POA&M
  "GET:/api/v1/assessments/:assessmentId/poam": ["poam:read"],
  "POST:/api/v1/assessments/:assessmentId/poam/draft": ["poam:write"],

  // Reporting
  "GET:/api/v1/assessments/:assessmentId/reports": ["report:read"],
  "POST:/api/v1/assessments/:assessmentId/reports/draft": ["report:write"],
  "POST:/api/v1/reports/:reportVersionId/export": ["report:export"],

  // KB
  "POST:/api/v1/assessments/:assessmentId/kb/search": ["kb:search"],
  "GET:/api/v1/assessments/:assessmentId/kb/chunks": ["kb:read"],

  // Agent runtime
  "POST:/api/v1/assessments/:assessmentId/agent-runs": ["agent:run"],
  "GET:/api/v1/assessments/:assessmentId/agent-runs": ["agent:read"],
  "GET:/api/v1/agent-runs/:agentRunId": ["agent:read"],

  // Integrations
  "POST:/api/v1/integrations/assessments/:assessmentId/analyze-text": [
    "integration:analyze",
  ],

  // Intelligence APIs (Agentic Council and Async Jobs)
  "POST:/api/v1/intelligence/council": ["intelligence:run"],
  "GET:/api/v1/jobs/:jobId": ["job:read", "intelligence:read"],

  // Workflows
  "POST:/api/v1/assessments/:assessmentId/workflows/lifecycle/start": [
    "workflow:write",
  ],
  "GET:/api/v1/assessments/:assessmentId/workflows/lifecycle": [
    "workflow:read",
  ],
  "POST:/api/v1/workflows/:workflowRunId/cancel": ["workflow:write"],
  "POST:/api/v1/workflows/:workflowRunId/signals": ["workflow:signal"],

  // Observability
  "GET:/api/v1/assessments/:assessmentId/audit-logs": ["audit:read"],
  "GET:/api/v1/assessments/:assessmentId/metrics": ["metrics:read"],
  "GET:/api/v1/assessments/:assessmentId/usage": ["usage:read"],

  // GRC MCP Endpoint
  "POST:/mcp": [
    "assessment:read",
    "scf:read",
    "soa:read",
    "gap:read",
    "poam:read",
    "report:read",
    "kb:read",
    "kb:search",
    "agent:run",
    "intelligence:run",
  ],
};

/**
 * Check if a set of key scopes satisfies the required scopes for a route.
 * M4 fix: empty keyScopes = zero permissions (least privilege).
 * ALL required scopes must be present (not just one).
 */
export function hasRequiredScopes(
  keyScopes: M2mScope[] | undefined | null,
  requiredScopes: M2mScope[],
): boolean {
  // Undefined/null = no key = fail-closed
  if (keyScopes == null) return false;
  // M4 fix: empty scopes = zero permissions (least privilege)
  if (keyScopes.length === 0) return false;
  // No required scopes = open route
  if (requiredScopes.length === 0) return true;
  // ALL required scopes must be present
  return requiredScopes.every((scope) => keyScopes.includes(scope));
}

/**
 * Maps an RBAC permission to the M2M scope that grants it.
 *
 * Scopes are a coarser vocabulary than permissions on purpose: an API key gets
 * `assessment:write`, not the create/update/delete triplet. Everything a route
 * needs is already declared in its own `permissions` array, so this table is
 * all that is required to derive scopes from it — no second per-route map to
 * keep in sync.
 *
 * Anything not listed here has no M2M equivalent and is deliberately
 * unreachable with an API key (platform administration, membership management,
 * approval gates that require a human actor).
 */
export const PERMISSION_TO_SCOPE: Partial<Record<string, M2mScope>> = {
  "assessment:read": "assessment:read",
  "assessment:create": "assessment:write",
  "assessment:update": "assessment:write",
  "assessment:delete": "assessment:write",
  "assessment:close": "assessment:write",
  "assessment:cancel": "assessment:write",
  "assessment:run_workflow": "workflow:write",

  "document:read": "document:read",
  "document:upload": "document:write",
  "document:write": "document:write",
  "document:reprocess": "document:write",
  "document:delete": "document:delete",

  "scf:read": "scf:read",

  "scope:create": "soa:write",
  "scope:update": "soa:write",
  "soa:read": "soa:read",
  "soa:create": "soa:write",
  "soa:update": "soa:write",

  "evidence:read": "gap:read",
  "evidence:run": "gap:write",
  "gap:read": "gap:read",
  "gap:create": "gap:write",
  "gap:update": "gap:write",

  "maturity:read": "gap:read",
  "maturity:create": "gap:write",
  "maturity:update": "gap:write",

  "poam:read": "poam:read",
  "poam:create": "poam:write",
  "poam:update": "poam:write",

  "report:read": "report:read",
  "report:create": "report:write",
  "report:update": "report:write",
  "report:render": "report:write",
  "report:download": "report:export",

  "kb:read": "kb:read",
  "kb:search": "kb:search",
  "kb:index": "kb:write",
  "kb:write": "kb:write",

  "agent:read": "agent:read",
  "agent:read_runs": "agent:read",
  "agent:run": "agent:run",
  "agent:dry_run": "agent:run",

  "intelligence:read": "intelligence:read",
  "intelligence:create": "intelligence:run",

  "artifact:read": "artifact:read",
  "artifact:create": "artifact:write",
  "artifact:update": "artifact:write",

  "approval:read": "approval:read",

  "audit:read": "audit:read",

  // Reading your own organization is fine for an integration. Deliberately
  // absent: apikey:* and webhook:* (a key must not enumerate or mint keys) and
  // organization:create/update/delete (account management is console-only).
  "organization:read": "organization:read",
  "tenant:read": "organization:read",

  "privacy:read": "privacy:read",
  "privacy:create": "privacy:write",
  "privacy:update": "privacy:write",
};

/**
 * Resolve the scopes an M2M key needs for a route.
 *
 * Order of precedence:
 *   1. An explicit ROUTE_SCOPE_MAP entry (for routes with no `permissions`
 *      of their own, such as POST /mcp).
 *   2. Scopes derived from the route's declared `permissions`.
 *
 * Returning an empty array means "no M2M scope can satisfy this route", and
 * scope.middleware turns that into a 403 for machine actors. That is the
 * correct answer for platform-admin and human-approval routes — but it used to
 * be the answer for 351 of the 390 protected routes, because ROUTE_SCOPE_MAP
 * only ever covered 39 of them. Deriving from `permissions` closes that gap and
 * keeps new routes covered automatically.
 */
export function getRequiredScopesForRoute(
  method: string,
  pathPattern: string,
  routePermissions: readonly string[] = [],
): M2mScope[] {
  const explicit = ROUTE_SCOPE_MAP[`${method}:${pathPattern}`];
  if (explicit) return explicit;

  const derived = new Set<M2mScope>();
  for (const permission of routePermissions) {
    const scope = PERMISSION_TO_SCOPE[permission];
    if (scope) derived.add(scope);
  }
  return [...derived];
}

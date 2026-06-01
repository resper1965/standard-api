/**
 * API Key Scopes — granular permission system for M2M API keys.
 *
 * Scopes follow `resource:action` format, matching internal permissions.
 * A key with no scopes acts as a wildcard (backward compatible).
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
  "POST:/api/v1/assessments/:assessmentId/transitions": ["assessment:transition"],
  "GET:/api/v1/assessments/:assessmentId/available-transitions": ["assessment:read"],
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
  "POST:/api/v1/integrations/assessments/:assessmentId/analyze-text": ["integration:analyze"],
  
  // Intelligence APIs (Agentic Council and Async Jobs)
  "POST:/api/v1/intelligence/council": ["intelligence:run"],
  "GET:/api/v1/jobs/:jobId": ["job:read", "intelligence:read"],

  // Workflows
  "POST:/api/v1/assessments/:assessmentId/workflows/lifecycle/start": ["workflow:write"],
  "GET:/api/v1/assessments/:assessmentId/workflows/lifecycle": ["workflow:read"],
  "POST:/api/v1/workflows/:workflowRunId/cancel": ["workflow:write"],
  "POST:/api/v1/workflows/:workflowRunId/signals": ["workflow:signal"],

  // Observability
  "GET:/api/v1/assessments/:assessmentId/audit-logs": ["audit:read"],
  "GET:/api/v1/assessments/:assessmentId/metrics": ["metrics:read"],
  "GET:/api/v1/assessments/:assessmentId/usage": ["usage:read"],

  // GRC MCP Endpoint
  "POST:/mcp": [
    "assessment:read", "scf:read", "soa:read", "gap:read", "poam:read",
    "report:read", "kb:read", "kb:search", "agent:run", "intelligence:run"
  ],
};

/**
 * Check if a set of key scopes satisfies the required scopes for a route.
 * Empty keyScopes = wildcard (all access) for backward compatibility.
 */
export function hasRequiredScopes(
  keyScopes: M2mScope[] | undefined | null,
  requiredScopes: M2mScope[]
): boolean {
  // Empty keyScopes = no access (fail-closed)
  if (!keyScopes || keyScopes.length === 0) return false;
  // No required scopes = open route
  if (requiredScopes.length === 0) return true;
  // At least one required scope must be present
  return requiredScopes.some(scope => keyScopes.includes(scope));
}

/**
 * Resolve required scopes for a route from the ROUTE_SCOPE_MAP.
 * Falls back to empty array if route is not mapped (open access).
 */
export function getRequiredScopesForRoute(
  method: string,
  pathPattern: string
): M2mScope[] {
  return ROUTE_SCOPE_MAP[`${method}:${pathPattern}`] ?? [];
}

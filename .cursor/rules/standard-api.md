---
description: Standard GRC API context for AI-assisted development
globs: ["**/*.ts", "**/*.tsx"]
---

# Standard GRC API — Cursor Rules

You are working on the **Standard** platform, an API-first agentic GRC SaaS.

## Monorepo Structure

```
apps/api-gateway/          → Cloudflare Worker (REST API, routes, middleware)
packages/schemas/          → Zod schemas (shared contracts)
packages/sdk/              → TypeScript SDK (@standard/sdk)
packages/assessment-engine/ → State machine (20+ states, approval gates)
packages/soa/              → Statement of Applicability engine
packages/gap-analysis/     → Gap finding engine
packages/poam/             → POA&M remediation engine
packages/reporting/        → PDF/Markdown/JSON report generation
packages/scf-core/         → SCF catalog (1,468 controls, 231 frameworks)
packages/kb/               → Knowledge base (vector search)
packages/observability/    → Audit logs, metrics, security events
packages/security/         → RBAC, permissions, auth middleware
packages/agent-runtime/    → AI agent execution (gpt-4o)
```

## Key Patterns

### Routes
Routes follow `RouteDefinition[]` pattern in `apps/api-gateway/src/routes/`.
Each route: `{ method, path, protected?, permissions?, handler }`.
Handler receives: `{ request, deps, params, tenantId, traceId }`.

### Schemas
All request/response shapes defined in `packages/schemas/src/` as Zod schemas.
Types exported as `z.infer<typeof Schema>`.
Import from `@standard/schemas`.

### SDK
`StandardClient` in `packages/sdk/src/client.ts`.
Methods: `client.assessments.summary()`, `client.organizations.dashboard()`, etc.
Models in `packages/sdk/src/models.ts`.

### Assessment Lifecycle States
```
draft → documents_uploaded → documents_ingested → scf_pre_analysis_ready →
framework_selected → scope_drafted → soa_drafted → soa_under_review →
soa_approved → soa_ingested → evidence_analysis_ready →
gap_analysis_drafted → gap_analysis_under_review → gap_analysis_approved →
maturity_assessed → maturity_under_review → maturity_approved →
poam_drafted → poam_under_review → poam_approved →
report_generated → closed
```

### Error Codes
Use `ApiError` from `../errors/api-error`. Valid codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVALID_STATE_TRANSITION`, `APPROVAL_REQUIRED`, etc.
Full list: `apps/api-gateway/src/errors/error-codes.ts`.

### Permissions
RBAC roles: `owner`, `admin`, `assessor`, `auditor_readonly`, `contributor`.
Permissions: `assessment:read`, `assessment:write`, `membership:manage`, `audit:read`, `organization:read`, etc.
Full mapping: `packages/security/src/constants.ts`.

## API Endpoints (Current)

### Dashboard KPIs
- `GET /api/v1/assessments/:id/summary` → Server-computed compliance %, controls, gaps, POAMs
- `GET /api/v1/organizations/:id/dashboard` → Org-wide aggregate KPIs

### Audit Trail
- `GET /api/v1/tenants/:id/audit-logs` → Tenant-wide events (query: action, actor_id, since, until, limit)
- `GET /api/v1/organizations/:id/audit-logs` → Org events

### Members
- `POST /api/v1/organizations/:orgId/members` → Invite (body: { email, role, display_name? }) → 201
- `GET /api/v1/organizations/:orgId/members` → List
- `GET /api/v1/members/:id` → Single
- `PATCH /api/v1/members/:id` → Update role (body: { role })
- `DELETE /api/v1/members/:id` → Remove → 204

### CI/CD
- `GET /api/v1/assessments/:id/compliance-gate` → pass/fail/no_data

## When Adding New Routes

1. Define Zod schema in `packages/schemas/src/`
2. Export from `packages/schemas/src/index.ts`
3. Create route in `apps/api-gateway/src/routes/`
4. Register in `apps/api-gateway/src/app.ts`
5. Add SDK method in `packages/sdk/src/client.ts`
6. Add type in `packages/sdk/src/models.ts`
7. Verify: `pnpm -r run typecheck`

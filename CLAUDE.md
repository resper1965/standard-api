# CLAUDE.md — Standard GRC Platform

> Context file for Claude Code and Google Antigravity. Read this to understand the full project.

## What This Is

Standard is an **API-first agentic GRC (Governance, Risk, Compliance) platform** that automates security assessments using the Secure Controls Framework (SCF). It ingests organizational documents, maps them against 231 compliance frameworks via 1,468 SCF controls, identifies gaps, and generates remediation plans — all orchestrated by 7 specialized AI agents.

## Monorepo Map

| Package | Purpose | Key Files |
|---------|---------|-----------|
| `apps/api-gateway` | Cloudflare Worker REST API | `src/routes/*.routes.ts`, `src/app.ts` |
| `packages/schemas` | Zod contracts (shared types) | `src/index.ts` exports all |
| `packages/sdk` | TypeScript SDK (`@standard/sdk`) | `src/client.ts`, `src/models.ts` |
| `packages/assessment-engine` | Lifecycle state machine (20+ states) | `src/states.ts`, `src/types.ts` |
| `packages/soa` | Statement of Applicability engine | `src/services/`, `src/types.ts` |
| `packages/gap-analysis` | Gap finding engine | `src/services/`, `src/types.ts` |
| `packages/poam` | POA&M remediation engine | `src/services/`, `src/types.ts` |
| `packages/scf-core` | SCF catalog data access | `src/services/`, `src/types.ts` |
| `packages/kb` | Knowledge base (vector search) | `src/services/` |
| `packages/reporting` | PDF/MD/JSON report generation | `src/services/`, `src/renderers/` |
| `packages/observability` | Audit logs, metrics, security events | `src/audit/`, `src/repositories.ts` |
| `packages/security` | RBAC roles, permissions, auth | `src/constants.ts` |
| `packages/agent-runtime` | AI agent execution (gpt-4o) | `src/agents/`, `src/tool-registry.ts` |

## How to Add a New Feature

### Adding a New API Endpoint
1. Define Zod schema → `packages/schemas/src/{feature}.ts`
2. Export from `packages/schemas/src/index.ts`
3. Create routes → `apps/api-gateway/src/routes/{feature}.routes.ts`
4. Register in `apps/api-gateway/src/app.ts` (import + spread into routes array)
5. Add SDK method → `packages/sdk/src/client.ts`
6. Add type → `packages/sdk/src/models.ts`
7. Verify → `pnpm -r run typecheck`

### Route Pattern
```typescript
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, parseJson, routeParam } from "../http";

export const myRoutes: RouteDefinition[] = [{
  method: "POST",
  path: "/api/v1/resource",
  protected: true,
  requireActor: true,
  permissions: ["resource:write"],
  handler: async ({ request, deps, params, tenantId, traceId }) => {
    const body = await parseJson(request, MyRequestSchema);
    // ... business logic
    return json(result, { status: 201, headers: { "x-trace-id": traceId } });
  }
}];
```

### Error Handling
Use `ApiError` with codes from `error-codes.ts`:
```typescript
throw new ApiError("NOT_FOUND", "Resource not found.", 404);
throw new ApiError("CONFLICT", "Already exists.", 409);
throw new ApiError("FORBIDDEN", "Insufficient permissions.", 403);
```

### RBAC
Roles: `owner` > `admin` > `assessor` > `contributor` > `auditor_readonly`.
Permission check via `permissions: ["permission:name"]` on route definition.
Full mapping: `packages/security/src/constants.ts`.

## Assessment Lifecycle

The core workflow — a state machine with 20+ states and 4 human approval gates:

```
draft → documents_uploaded → documents_ingested → scf_pre_analysis_ready →
framework_selected → scope_drafted → soa_drafted → soa_under_review →
soa_approved → soa_ingested → evidence_analysis_ready →
gap_analysis_drafted → gap_analysis_under_review → gap_analysis_approved →
maturity_assessed → maturity_under_review → maturity_approved →
poam_drafted → poam_under_review → poam_approved →
report_generated → closed
```

**Approval gates** (require human decision): SoA, Gap Analysis, Maturity, POA&M.

## API Surface (86 endpoints)

### Core Assessment Flow
- `POST /assessments` → Create
- `POST /assessments/:id/documents` → Upload evidence
- `POST /assessments/:id/soa/draft` → AI generates SoA
- `POST /assessments/:id/gap-analysis/draft` → AI finds gaps
- `POST /assessments/:id/poam/draft` → AI generates remediation plan
- `GET /assessments/:id/summary` → KPIs (compliance %, gaps by severity, open POAMs)

### Dashboard & Observability
- `GET /organizations/:id/dashboard` → Org-wide KPIs
- `GET /tenants/:id/audit-logs` → Tenant audit trail
- `GET /organizations/:id/audit-logs` → Org audit trail

### Member Management
- `POST /organizations/:id/members` → Invite member
- `GET /organizations/:id/members` → List members
- `PATCH /members/:id` → Update role
- `DELETE /members/:id` → Remove member

### CI/CD
- `GET /assessments/:id/compliance-gate` → pass/fail

## SDK Usage

```typescript
import { StandardClient } from "@standard/sdk";
const client = new StandardClient({ apiKey: "standard_live_...", tenantId: "uuid" });

// KPIs
const { data } = await client.assessments.summary("assessment-id");
// Dashboard
const { data } = await client.organizations.dashboard("org-id");
// Members
await client.organizations.inviteMember("org-id", { email: "x@y.com", role: "assessor" });
```

## Documentation

| File | URL | Purpose |
|------|-----|---------|
| `llms.txt` | `/llms.txt` | AI crawler summary |
| `llms-full.txt` | `/llms-full.txt` | Complete API context for LLMs |
| `openapi.json` | `/docs/openapi.json` | OpenAPI 3.1 spec |
| `cookbook` | `/docs/cookbook` | SDK recipes (ISO 27001, dashboard, audit, members, CI/CD) |
| Interactive docs | `/docs` | Scalar API explorer |

## Commands

```bash
pnpm -r run typecheck    # Type check all 23 packages
pnpm run dev             # Start local dev server
pnpm run deploy          # Deploy to Cloudflare Workers
```

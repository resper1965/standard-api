# GitHub Copilot / Codex Instructions — Standard GRC Platform

## Project Overview
Standard is an API-first agentic GRC platform. Monorepo with TypeScript, Cloudflare Workers, Neon PostgreSQL, and AI agents.

## Tech Stack
- **Runtime**: Cloudflare Workers (no Node.js APIs — use Web APIs)
- **Language**: TypeScript strict mode
- **Build**: pnpm workspaces, turbo
- **Validation**: Zod schemas (`@standard/schemas`)
- **Database**: Drizzle ORM + Neon PostgreSQL (Serverless)
- **Auth**: Standard Native Auth (Edge Hash) + custom RBAC
- **Styling**: Tailwind CSS v4 + PostCSS
- **AI**: OpenAI gpt-4o via Cloudflare AI Gateway

## Project Structure
```
apps/api-gateway/src/routes/  → REST endpoints (RouteDefinition[])
packages/schemas/src/         → Zod schemas (contracts)
packages/sdk/src/             → SDK client + models
packages/assessment-engine/   → Lifecycle state machine
packages/soa/                 → SoA engine
packages/gap-analysis/        → Gap analysis engine
packages/poam/                → POA&M engine
packages/security/            → RBAC roles + permissions
```

## Coding Patterns

### Route Definition
```typescript
export const myRoutes: RouteDefinition[] = [{
  method: "GET",
  path: "/api/v1/resource/:id",
  protected: true,
  permissions: ["resource:read"],
  handler: async ({ deps, params, organizationId, traceId }) => {
    const id = routeParam(params, "id");
    const item = await deps.resource.get(id, organizationId!);
    if (!item) throw new ApiError("NOT_FOUND", "Not found.", 404);
    return json(item, { headers: { "x-trace-id": traceId } });
  }
}];
```

### Schema Pattern
```typescript
export const MyRequestSchema = z.object({ name: z.string().min(1) });
export type MyRequest = z.infer<typeof MyRequestSchema>;
```

### SDK Method Pattern
```typescript
async myMethod(id: string): Promise<ApiResponse<MyType>> {
  return this.get(`/api/v1/resource/${id}`);
}
```

## Assessment Lifecycle
```
draft → documents_uploaded → documents_ingested → scf_pre_analysis_ready →
framework_selected → scope_drafted → soa_drafted → soa_under_review →
soa_approved → gap_analysis_drafted → gap_analysis_approved →
maturity_assessed → maturity_approved → poam_drafted → poam_approved →
report_generated → closed
```

## Available API Endpoints
- Assessments: CRUD + summary + compliance-gate + audit-package
- Documents: upload, list, chunks, reprocess
- SCF: versions, domains, controls, frameworks, requirements, mappings, coverage
- SoA: draft, items, review, approve
- Gap Analysis: draft, findings, review, approve
- POA&M: draft, items, milestones, dependencies, review, approve
- Reports: generate, download, export-jobs
- Dashboard: assessment summary, org dashboard
- Audit: organization audit-logs, org audit-logs
- Members: invite, list, get, update-role, remove
- Agent Runtime: agents, runs, tool-calls

## RBAC Roles
`owner` > `admin` > `assessor` > `contributor` > `auditor_readonly`

## Validation Command
```bash
pnpm -r run typecheck  # Must pass 23/23 packages
```

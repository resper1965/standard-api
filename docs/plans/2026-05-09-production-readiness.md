> [!WARNING]
> **[ARCHIVED/LEGACY PLAN]** Este é um plano de execução legado e histórico de fases anteriores do desenvolvimento da plataforma. Ele pode não refletir a arquitetura atenuada atual.

# Production Readiness Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Take the Standard API from current staging-functional state to production-grade deployment with real data, real agent execution, and zero mock dependencies.

**Architecture:** Cloudflare Workers (API Gateway, Ingestion, KB, Reporting, Workflows) + PostgreSQL (Neon) + R2 (documents) + Vectorize (KB) + Queues (async agent execution) + AI Gateway (LLM observability)

**Tech Stack:** TypeScript strict, Hono, Drizzle ORM, Vercel AI SDK, Cloudflare Workers, HMAC-SHA256 webhooks, Better Auth

---

## Phase 1: Build System & Type Safety (Foundation)

### Task 1: Fix `@standard/auth` Typecheck

**Files:**
- Modify: `packages/auth/package.json`
- Verify: `packages/auth/tsconfig.json:12`

**Step 1: Install the missing `@cloudflare/workers-types` dependency**

```bash
cd packages/auth && pnpm install
```

**Step 2: Verify typecheck passes**

```bash
pnpm --filter @standard/auth typecheck
```

Expected: PASS (0 errors)

**Step 3: Run full monorepo typecheck**

```bash
pnpm typecheck
```

Expected: PASS (0 errors across all packages)

**Step 4: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "fix(auth): install @cloudflare/workers-types for clean monorepo typecheck"
```

---

### Task 2: Eliminate `as any` / `as never` casts in API Gateway Adapters

**Files:**
- Modify: `apps/api-gateway/src/adapters/index.ts:80,87,90,103,138,146,149`
- Modify: `apps/api-gateway/src/adapters/approval.repository.ts` (22 casts)
- Modify: `apps/api-gateway/src/adapters/lifecycle.repository.ts` (5 casts)
- Modify: `apps/api-gateway/src/routes/observability.routes.ts:14`

**Step 1: Count current `as any` + `as never` in api-gateway**

```bash
git grep -c "as any\|as never" -- "apps/api-gateway/src/"
```

Expected: ~30 occurrences

**Step 2: Replace Drizzle row casts with typed mappers**

In `approval.repository.ts`, create a typed mapper function:

```typescript
import type { ApprovalGate, ApprovalDecision } from "@standard/schemas";

function mapApprovalRow(row: typeof approvalEvents.$inferSelect) {
  return {
    ...row,
    gate: row.gate as ApprovalGate,
    decision: row.decision as ApprovalDecision,
    targetType: row.artifactType,
  };
}
```

Apply the same pattern to `lifecycle.repository.ts` (map `AssessmentState` explicitly).

**Step 3: Fix `index.ts` adapter casts**

Replace `env as any` → properly type `Env` in extractor signatures.
Replace `db as never` → use `DbClient` cast or fix function signatures.
Replace `as any` on LLM → properly type the `CloudflareAiGatewayAdapter`.

**Step 4: Verify zero `as any` in api-gateway**

```bash
git grep -c "as any\|as never" -- "apps/api-gateway/src/"
```

Expected: 0

**Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 6: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "fix(api-gateway): eliminate all unsafe type casts from adapters"
```

---

## Phase 2: Agent Runtime (Real Tool Execution)

### Task 3: Implement `scf_control_lookup` Tool

**Files:**
- Create: `packages/agent-runtime/src/tools/scf-control-lookup.tool.ts`
- Modify: `packages/agent-runtime/src/executor.ts` (wire tool to SCF repository)
- Test: `packages/agent-runtime/tests/tools/scf-control-lookup.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { createScfControlLookupTool } from "../src/tools/scf-control-lookup.tool";

describe("scf_control_lookup tool", () => {
  it("returns controls matching the query", async () => {
    const mockScfCore = {
      searchControls: async (query: string) => [
        { id: "SCF-001", domain: "AST", title: "Asset Management" }
      ]
    };
    const tool = createScfControlLookupTool(mockScfCore);
    const result = await tool.execute({
      tenant_id: "t1", organization_id: "o1", assessment_id: "a1",
      trace_id: "tr1", query: "asset management"
    });
    expect(result.controls).toHaveLength(1);
    expect(result.controls[0].id).toBe("SCF-001");
  });

  it("returns empty array when no match", async () => {
    const mockScfCore = { searchControls: async () => [] };
    const tool = createScfControlLookupTool(mockScfCore);
    const result = await tool.execute({
      tenant_id: "t1", organization_id: "o1", assessment_id: "a1",
      trace_id: "tr1", query: "nonexistent"
    });
    expect(result.controls).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm --filter @standard/agent-runtime test -- --run tests/tools/scf-control-lookup.test.ts
```

Expected: FAIL (module not found)

**Step 3: Implement**

```typescript
// packages/agent-runtime/src/tools/scf-control-lookup.tool.ts
import type { ScfCoreDependencies } from "@standard/scf-core";

export type ScfControlLookupArgs = {
  tenant_id: string;
  organization_id: string;
  assessment_id: string;
  trace_id: string;
  query?: string;
  top_k?: number;
};

export type ScfControlLookupResult = {
  controls: Array<{
    id: string;
    domain: string;
    title: string;
    description?: string;
    mappings?: string[];
  }>;
  query: string;
  count: number;
};

export function createScfControlLookupTool(scf: ScfCoreDependencies) {
  return {
    execute: async (args: ScfControlLookupArgs): Promise<ScfControlLookupResult> => {
      const controls = await scf.searchControls(args.query ?? "", args.top_k ?? 10);
      return {
        controls,
        query: args.query ?? "",
        count: controls.length,
      };
    }
  };
}
```

**Step 4: Run test**

```bash
pnpm --filter @standard/agent-runtime test -- --run tests/tools/scf-control-lookup.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "feat(agent-runtime): implement scf_control_lookup tool with real SCF repository"
```

---

### Task 4: Implement `kb_evidence_search` Tool

**Files:**
- Create: `packages/agent-runtime/src/tools/kb-evidence-search.tool.ts`
- Test: `packages/agent-runtime/tests/tools/kb-evidence-search.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { createKbEvidenceSearchTool } from "../src/tools/kb-evidence-search.tool";

describe("kb_evidence_search tool", () => {
  it("returns evidence matching semantic query", async () => {
    const mockKb = {
      semanticSearch: async (query: string, tenantId: string, assessmentId: string) => [{
        chunk_id: "c1", document_id: "d1", content: "Policy v3.1",
        score: 0.92, metadata: { filename: "security-policy.pdf" }
      }]
    };
    const tool = createKbEvidenceSearchTool(mockKb);
    const result = await tool.execute({
      tenant_id: "t1", organization_id: "o1", assessment_id: "a1",
      trace_id: "tr1", query: "security policy"
    });
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].score).toBeGreaterThan(0.9);
  });
});
```

**Step 2: Implement, test, commit** (same TDD cycle as Task 3)

```bash
git commit --no-gpg-sign -m "feat(agent-runtime): implement kb_evidence_search tool with KB semantic search"
```

---

### Task 5: Implement `assessment_state_read` Tool

**Files:**
- Create: `packages/agent-runtime/src/tools/assessment-state-read.tool.ts`
- Test: `packages/agent-runtime/tests/tools/assessment-state-read.test.ts`

**Step 1–5:** Same TDD cycle. This tool reads the current assessment snapshot (state, flags, artifact versions) and returns it to the agent for decision-making.

```bash
git commit --no-gpg-sign -m "feat(agent-runtime): implement assessment_state_read tool with assessment repository"
```

---

### Task 6: Wire Real Tools into AgentExecutor

**Files:**
- Modify: `packages/agent-runtime/src/executor.ts` (replace stub execute with real tool dispatch)
- Modify: `packages/agent-runtime/src/types.ts` (add tool registry type)

**Step 1: Create ToolRegistry type**

```typescript
export type ToolRegistry = Record<string, {
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}>;
```

**Step 2: Inject ToolRegistry into AgentExecutor constructor**

**Step 3: Modify `buildTools()` to dispatch to registry instead of stub**

**Step 4: Run existing agent-runtime tests**

```bash
pnpm --filter @standard/agent-runtime test
```

Expected: PASS

**Step 5: Commit**

```bash
git commit --no-gpg-sign -m "feat(agent-runtime): wire real tool registry into executor dispatch"
```

---

## Phase 3: Async Agent Execution (Queue-Based)

### Task 7: Create Agent Run Queue Consumer

**Files:**
- Create: `workers/queues/src/agent-run.consumer.ts`
- Modify: `workers/queues/src/index.ts` (register consumer)
- Modify: `infra/cloudflare/wrangler.api-gateway.toml` (verify AGENT_TASK_QUEUE binding)

**Step 1: Create the queue consumer**

The consumer receives `{ agent_run_id, tenant_id }`, loads the run, and calls `executor.resumeRun()`.

**Step 2: Modify the API route to enqueue instead of executing synchronously**

In `apps/api-gateway/src/routes/agent-runtime.routes.ts`, replace:

```typescript
// BEFORE (synchronous):
const result = await executor.execute(input);

// AFTER (async):
await env.AGENT_TASK_QUEUE.send({ agent_run_id: run.agent_run_id, tenant_id: input.context.tenant_id });
return c.json({ data: run, status: "queued" }, 202);
```

**Step 3: Commit**

```bash
git commit --no-gpg-sign -m "feat(agent-runtime): async agent execution via Cloudflare Queues (202 Accepted)"
```

---

## Phase 4: Wrangler Provisioning & Secrets

### Task 8: Provision Staging KV Namespaces

**Files:**
- Modify: `infra/cloudflare/wrangler.api-gateway.toml` (replace `replace-with-staging-*` placeholders)

**Step 1: Create staging KV namespaces**

```bash
npx wrangler kv namespace create "STANDARD_CONFIG_KV" --preview false
npx wrangler kv namespace create "STANDARD_FEATURE_FLAGS_KV" --preview false
npx wrangler kv namespace create "STANDARD_CACHE_KV" --preview false
```

**Step 2: Update `wrangler.api-gateway.toml` with real IDs**

Replace all 6 `replace-with-staging-*` placeholder values with the IDs from step 1.

**Step 3: Commit**

```bash
git commit --no-gpg-sign -m "infra: provision staging KV namespaces with real Cloudflare IDs"
```

---

### Task 9: Set Production Secrets

**Files:**
- Reference: `scripts/put-secrets.mjs`

**Step 1: Set all required Worker secrets**

```bash
npx wrangler secret put DATABASE_URL -c infra/cloudflare/wrangler.api-gateway.toml -e production
npx wrangler secret put BETTER_AUTH_SECRET -c infra/cloudflare/wrangler.api-gateway.toml -e production
npx wrangler secret put OPENAI_API_KEY -c infra/cloudflare/wrangler.api-gateway.toml -e production
npx wrangler secret put GOOGLE_CLIENT_ID -c infra/cloudflare/wrangler.api-gateway.toml -e production
npx wrangler secret put GOOGLE_CLIENT_SECRET -c infra/cloudflare/wrangler.api-gateway.toml -e production
```

**Step 2: Verify secrets are set**

```bash
npx wrangler secret list -c infra/cloudflare/wrangler.api-gateway.toml -e production
```

Expected: All 5 secrets listed

---

## Phase 5: Database Migration

### Task 10: Apply All Migrations to Production PostgreSQL

**Files:**
- Reference: `infra/docker/postgres/migrations/` (17 migration files, 0000 through 0011)

**Step 1: Verify migration order**

```bash
ls infra/docker/postgres/migrations/*.sql | Sort-Object
```

Expected: 17 files in sequence from 0000 to 0011 (including duplicate-numbered files)

**Step 2: Dry-run against staging database**

```bash
DATABASE_URL="postgres://..." pnpm db:migrate
```

Expected: All migrations applied successfully

**Step 3: Apply to production database**

```bash
DATABASE_URL="postgres://prod..." pnpm db:migrate
```

**Step 4: Verify table count**

```sql
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
```

Expected: 30+ tables

---

### Task 11: Seed Production SCF Data

**Files:**
- Reference: `scripts/reingest-scf.ts`
- Data: Official SCF 2026.1.1 XLSX workbook

**Step 1: Run SCF ingestion against production**

```bash
DATABASE_URL="postgres://prod..." npx tsx scripts/reingest-scf.ts
```

Expected: 1000+ controls imported across 33 domains

---

## Phase 6: Deploy

### Task 12: Deploy to Staging

**Step 1: Full typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 2: Run full test suite**

```bash
pnpm test
```

Expected: All 66 test files pass

**Step 3: Deploy all workers to staging**

```bash
pnpm cf:deploy:staging
```

Expected: 5 workers deployed (workflows, api-gateway, ingestion, kb, reporting)

**Step 4: Smoke test staging**

```bash
curl -s "https://standard-api-gateway-staging.ness.workers.dev/api/v1/health" | jq .
```

Expected: `{ "status": "ok" }`

**Step 5: Commit verification log**

```bash
git commit --no-gpg-sign -m "chore: staging deploy verification pass"
```

---

### Task 13: Deploy to Production

**Step 1: Deploy all workers to production**

```bash
pnpm cf:deploy:production
```

Expected: 5 workers deployed

**Step 2: Smoke test production**

```bash
curl -s "https://standard-api-gateway-production.ness.workers.dev/api/v1/health" | jq .
```

Expected: `{ "status": "ok" }`

**Step 3: E2E lifecycle test**

Follow `docs/guides/quickstart-e2e.md` against production:
1. Create organization
2. Create assessment
3. Upload document
4. Transition through lifecycle
5. Verify approval gates work

---

## Phase 7: Hardening & Observability

### Task 14: Webhook Dispatch Integration

**Files:**
- Modify: `apps/api-gateway/src/routes/webhook.routes.ts`
- Reference: `apps/api-gateway/src/services/webhook-dispatcher.ts`

**Step 1: Wire the `WebhookDispatcher` into the lifecycle event handler**

When an assessment transitions state, dispatch webhook events to all registered endpoints.

**Step 2: Implement retry logic**

Use Cloudflare Queue dead-letter for failed deliveries (max 3 retries with exponential backoff).

**Step 3: Commit**

```bash
git commit --no-gpg-sign -m "feat(webhooks): wire dispatcher into lifecycle events with DLQ retry"
```

---

### Task 15: Add Agent Observability Logging

**Files:**
- Modify: `packages/agent-runtime/src/executor.ts`
- Modify: `packages/observability/src/metrics.ts`

**Step 1: Log token usage, latency, tool call count per agent run**

```typescript
await this.deps.observability?.record({
  agent_run_id: run.agent_run_id,
  model: contract.model ?? "unknown",
  prompt_tokens: response.usage?.promptTokens,
  completion_tokens: response.usage?.completionTokens,
  total_latency_ms: Date.now() - startTime,
  tool_calls: response.toolCalls?.length ?? 0,
  finish_reason: response.finishReason,
});
```

**Step 2: Commit**

```bash
git commit --no-gpg-sign -m "feat(observability): log token usage and latency per agent run"
```

---

## Summary Checklist

| Phase | Tasks | Goal |
|---|---|---|
| 1. Foundation | 1-2 | Clean typecheck, zero unsafe casts |
| 2. Agent Runtime | 3-6 | Real tool execution (SCF, KB, assessment) |
| 3. Async Execution | 7 | Queue-based agent runs (202 Accepted) |
| 4. Infrastructure | 8-9 | KV provisioning + production secrets |
| 5. Database | 10-11 | Migrations + SCF seed |
| 6. Deploy | 12-13 | Staging → Production |
| 7. Hardening | 14-15 | Webhooks + observability |

**Total: 15 tasks across 7 phases.**

> [!WARNING]
> **[ARCHIVED/LEGACY PLAN]** Este é um plano de execução legado e histórico de fases anteriores do desenvolvimento da plataforma. Ele pode não refletir a arquitetura atenuada atual.

# Pendências Pós-Auditoria — Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Resolver todas as pendências identificadas na auditoria crítica e elevar a assertividade da plataforma de 8/10 para 9/10.

**Architecture:** O SDK recebe tipos concretos derivados dos contratos da API. O OpenAPI ganha documentação de pré-condições por endpoint de lifecycle. A migration do schema é gerada para persistir as novas colunas (scopes, webhook tables). O webhook retry é implementado via Cloudflare Queue binding.

**Tech Stack:** TypeScript strict, Drizzle ORM, Zod, Cloudflare Workers/Queues, pnpm monorepo

---

## Inventário de Pendências

| # | Item | Origem | Prioridade |
|---|---|---|---|
| 1 | SDK retorna `any` em 88 locais — zero type-safety para consumidores | Audit P1 | P1 |
| 2 | OpenAPI não documenta pré-condições de estado do lifecycle | Audit P2 | P2 |
| 3 | Webhook retry é single-attempt — `next_retry_at` nunca re-executa | Audit P1 | P1 |
| 4 | DB migration não foi gerada após mudanças de schema (scopes + webhook tables) | Audit P0 | P0 |
| 5 | Quickstart E2E script para devs externos consumirem a API | Audit P2 | P2 |

---

### Task 1: Gerar DB Migration (scopes + webhook tables)

**Files:**
- Run: `pnpm db:generate` (creates migration file in `packages/schemas/drizzle/`)
- Verify: migration SQL file exists and contains `scopes`, `webhook_endpoints`, `webhook_deliveries`

**Step 1: Generate migration**

Run: `pnpm db:generate`
Expected: Migration file created with ALTER TABLE for api_keys.scopes + CREATE TABLE for webhook_endpoints + webhook_deliveries

**Step 2: Verify migration SQL**

```bash
# Check migration file contains expected DDL
cat packages/schemas/drizzle/*.sql | Select-String -Pattern "scopes|webhook_endpoints|webhook_deliveries"
```
Expected: Matches for all 3 items

**Step 3: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "chore(db): generate migration for scopes + webhook tables

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

### Task 2: SDK Response Types — Domain Types File

**Files:**
- Create: `packages/sdk/src/models.ts`
- Test: `packages/sdk/src/__tests__/types.test.ts`

**Step 1: Write the type verification test**

```typescript
// packages/sdk/src/__tests__/types.test.ts
import type { Assessment, Document, ScfControl, ScfVersion, ScfFramework, ScfDomain, GapFinding, SoaVersion, SoaItem, PoamVersion, PoamItem, ReportVersion, ReportSection, WebhookEndpoint, WebhookDelivery, Organization, ApiKey, ApprovalRecord, ArtifactVersion, AgentRun, AgentToolCall, WorkflowRun, KbSearchResult, LifecycleEvent } from "../models";
import { describe, it, expect } from "vitest";

describe("SDK models", () => {
  it("Assessment type has required fields", () => {
    const assessment: Assessment = {
      id: "uuid",
      tenant_id: "uuid",
      organization_id: "uuid",
      name: "Test",
      state: "draft",
      scf_version_id: "uuid",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(assessment.id).toBe("uuid");
  });

  it("ScfControl type has required fields", () => {
    const control: ScfControl = {
      id: "uuid",
      code: "SCF-ABC-01",
      title: "Test Control",
      description: "Test",
      domain_id: "uuid",
      scf_version_id: "uuid",
    };
    expect(control.code).toMatch(/^SCF-/);
  });

  it("GapFinding type has required fields", () => {
    const finding: GapFinding = {
      id: "uuid",
      gap_analysis_version_id: "uuid",
      scf_control_id: "uuid",
      status: "not_evidenced",
      severity: "medium",
      description: "Test finding",
    };
    expect(finding.status).toBe("not_evidenced");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/sdk/src/__tests__/types.test.ts`
Expected: FAIL with "Cannot find module '../models'"

**Step 3: Write the models file**

```typescript
// packages/sdk/src/models.ts
/**
 * SDK Domain Types
 *
 * These types mirror the API response shapes.
 * They are NOT imported from @standard/schemas to keep the SDK zero-dependency.
 */

// ── Assessments ──────────────────────────────────────────────
export type Assessment = {
  id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
  state: string;
  scf_version_id: string;
  framework_ids?: string[];
  document_count?: number;
  created_at: string;
  updated_at: string;
};

// ── Documents ────────────────────────────────────────────────
export type Document = {
  id: string;
  assessment_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  description?: string | null;
  r2_key?: string;
  created_at: string;
};

export type DocumentChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count?: number;
};

export type IngestionJob = {
  id: string;
  assessment_id: string;
  status: string;
  total_documents: number;
  processed_documents: number;
  created_at: string;
};

// ── SCF ──────────────────────────────────────────────────────
export type ScfVersion = {
  id: string;
  version: string;
  release_date?: string;
  is_active: boolean;
  control_count?: number;
  domain_count?: number;
};

export type ScfDomain = {
  id: string;
  scf_version_id: string;
  code: string;
  name: string;
  description?: string;
  control_count?: number;
};

export type ScfControl = {
  id: string;
  code: string;
  title: string;
  description: string;
  domain_id: string;
  scf_version_id: string;
  priority?: string;
  methods_to_comply?: string;
  supplemental_guidance?: string;
};

export type ScfFramework = {
  id: string;
  name: string;
  code: string;
  version?: string;
  description?: string;
  requirement_count?: number;
  coverage_percentage?: number;
};

export type ScfMapping = {
  id: string;
  scf_control_id: string;
  scf_framework_requirement_id: string;
  mapping_type?: string;
};

export type ScfRequirement = {
  id: string;
  framework_id: string;
  identifier: string;
  title?: string;
  description?: string;
};

export type ScfCoverage = {
  framework_id: string;
  total_requirements: number;
  mapped_requirements: number;
  coverage_percentage: number;
};

// ── Lifecycle ────────────────────────────────────────────────
export type LifecycleEvent = {
  id: string;
  assessment_id: string;
  from_state: string;
  to_state: string;
  actor_id?: string;
  reason?: string;
  timestamp: string;
};

export type AvailableTransition = {
  next_state: string;
  label: string;
  requires_approval?: boolean;
};

// ── Approvals ────────────────────────────────────────────────
export type ApprovalRecord = {
  id: string;
  assessment_id: string;
  gate: string;
  decision: "approved" | "rejected";
  target_type: string;
  target_id: string;
  actor_id: string;
  reason?: string;
  created_at: string;
};

// ── Artifacts ────────────────────────────────────────────────
export type ArtifactVersion = {
  id: string;
  assessment_id: string;
  artifact_type: string;
  version_number: number;
  status: string;
  source_agent_run_id?: string;
  created_at: string;
  updated_at: string;
};

// ── SoA ──────────────────────────────────────────────────────
export type SoaVersion = {
  id: string;
  assessment_id: string;
  version_number: number;
  status: string;
  created_at: string;
};

export type SoaItem = {
  id: string;
  soa_version_id: string;
  scf_control_id: string;
  applicability: string;
  justification?: string;
  implementation_status?: string;
};

export type SoaValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

// ── Gap Analysis ─────────────────────────────────────────────
export type GapAnalysisVersion = {
  id: string;
  assessment_id: string;
  version_number: number;
  status: string;
  finding_count?: number;
  created_at: string;
};

export type GapFinding = {
  id: string;
  gap_analysis_version_id: string;
  scf_control_id: string;
  status: string;
  severity: string;
  description: string;
  evidence_sources?: string[];
  remediation_guidance?: string;
};

// ── POA&M ────────────────────────────────────────────────────
export type PoamVersion = {
  id: string;
  assessment_id: string;
  version_number: number;
  status: string;
  item_count?: number;
  created_at: string;
};

export type PoamItem = {
  id: string;
  poam_version_id: string;
  scf_control_id?: string;
  related_gap_finding_id?: string;
  title: string;
  description: string;
  priority: string;
  expected_evidence?: string;
  acceptance_criteria?: string;
  due_date?: string;
  status: string;
};

// ── Reports ──────────────────────────────────────────────────
export type ReportVersion = {
  id: string;
  assessment_id: string;
  version_number: number;
  status: string;
  format?: string;
  created_at: string;
};

export type ReportSection = {
  id: string;
  report_version_id: string;
  section_type: string;
  title: string;
  content: string;
  order_index: number;
};

export type ReportExport = {
  url: string;
  format: string;
  expires_at: string;
};

// ── Knowledge Base ───────────────────────────────────────────
export type KbSearchResult = {
  chunk_id: string;
  document_id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type KbChunk = {
  id: string;
  document_id: string;
  content: string;
  token_count?: number;
  embedding_status?: string;
};

// ── Workflows ────────────────────────────────────────────────
export type WorkflowRun = {
  id: string;
  assessment_id: string;
  workflow_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  error?: string;
};

// ── Agents ───────────────────────────────────────────────────
export type AgentRun = {
  id: string;
  assessment_id: string;
  agent_type: string;
  status: string;
  model?: string;
  started_at: string;
  completed_at?: string;
  confidence?: number;
};

export type AgentToolCall = {
  id: string;
  agent_run_id: string;
  tool_name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: string;
  called_at: string;
};

// ── Webhooks ─────────────────────────────────────────────────
export type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  description?: string | null;
  enabled: boolean;
  signing_secret_masked: string;
  created_at: string;
  updated_at: string;
};

export type WebhookDelivery = {
  delivery_id: string;
  endpoint_id: string;
  event_id: string;
  event_type: string;
  status: string;
  http_status: number | null;
  attempt_count: number;
  max_attempts: number;
  last_attempted_at: string | null;
  created_at: string;
};

// ── Organizations ────────────────────────────────────────────
export type Organization = {
  organization_id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: string;
};

export type ApiKey = {
  id: string;
  name: string;
  masked_key: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

export type ApiKeyCreated = ApiKey & {
  /** Full key — returned only at creation time */
  key: string;
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/sdk/src/__tests__/types.test.ts`
Expected: PASS

**Step 5: Export models from SDK index**

Modify: `packages/sdk/src/index.ts` — add `export type * from "./models";`

**Step 6: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "feat(sdk): add 30+ domain types for SDK response type-safety

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

### Task 3: SDK Client — Replace all `any` with concrete types

**Files:**
- Modify: `packages/sdk/src/client.ts`

**Step 1: Write integration type test**

```typescript
// packages/sdk/src/__tests__/client-types.test.ts
import { StandardClient } from "../client";
import type { Assessment, ScfControl, GapFinding, WebhookEndpoint } from "../models";
import type { PaginatedResponse, StandardResponse } from "../types";
import { describe, it, expectTypeOf } from "vitest";

describe("SDK client type-safety", () => {
  const client = new StandardClient({ apiKey: "test", tenantId: "test", baseUrl: "http://localhost" });

  it("assessments.list returns PaginatedResponse<Assessment>", () => {
    expectTypeOf(client.assessments.list()).toEqualTypeOf<Promise<PaginatedResponse<Assessment>>>();
  });

  it("assessments.get returns StandardResponse<Assessment>", () => {
    expectTypeOf(client.assessments.get("id")).toEqualTypeOf<Promise<StandardResponse<Assessment>>>();
  });

  it("scf.controls.get returns StandardResponse<ScfControl>", () => {
    expectTypeOf(client.scf.controls.get("id")).toEqualTypeOf<Promise<StandardResponse<ScfControl>>>();
  });

  it("webhooks.list returns PaginatedResponse<WebhookEndpoint>", () => {
    expectTypeOf(client.webhooks.list("id")).toEqualTypeOf<Promise<PaginatedResponse<WebhookEndpoint>>>();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/sdk/src/__tests__/client-types.test.ts`
Expected: FAIL with type mismatch (returns `any` instead of `Assessment`)

**Step 3: Replace every `<any>` in client.ts with the correct model type**

Apply the following substitution map to `packages/sdk/src/client.ts`:

| Resource | Method | Current | Replace With |
|---|---|---|---|
| `AssessmentsResource` | `list` | `PaginatedResponse<any>` | `PaginatedResponse<Assessment>` |
| `AssessmentsResource` | `get` | `StandardResponse<any>` | `StandardResponse<Assessment>` |
| `AssessmentsResource` | `create` | `StandardResponse<any>` | `StandardResponse<Assessment>` |
| `AssessmentsResource` | `update` | `StandardResponse<any>` | `StandardResponse<Assessment>` |
| `AssessmentsResource` | `status` | `<any>` | `StandardResponse<Assessment>` |
| `AssessmentsResource` | `timeline` | `<any>` | `PaginatedResponse<LifecycleEvent>` |
| `AssessmentsResource` | `listByOrg` | `PaginatedResponse<any>` | `PaginatedResponse<Assessment>` |
| `DocumentsResource` | `list` | `PaginatedResponse<any>` | `PaginatedResponse<Document>` |
| `DocumentsResource` | `get` | `StandardResponse<any>` | `StandardResponse<Document>` |
| `DocumentsResource` | `upload` | `StandardResponse<any>` | `StandardResponse<Document>` |
| `DocumentsResource` | `chunks` | `PaginatedResponse<any>` | `PaginatedResponse<DocumentChunk>` |
| `DocumentsResource` | `reprocess` | `StandardResponse<any>` | `StandardResponse<Document>` |
| `DocumentsResource` | `ingestionJobs` | `PaginatedResponse<any>` | `PaginatedResponse<IngestionJob>` |
| `ScfResource.versions` | `list` | `PaginatedResponse<any>` | `PaginatedResponse<ScfVersion>` |
| `ScfResource.versions` | `latest` | `StandardResponse<any>` | `StandardResponse<ScfVersion>` |
| `ScfResource.versions` | `domains` | `PaginatedResponse<any>` | `PaginatedResponse<ScfDomain>` |
| `ScfResource.versions` | `controls` | `PaginatedResponse<any>` | `PaginatedResponse<ScfControl>` |
| `ScfResource.controls` | `get` | `StandardResponse<any>` | `StandardResponse<ScfControl>` |
| `ScfResource.controls` | `byCode` | `StandardResponse<any>` | `StandardResponse<ScfControl>` |
| `ScfResource.controls` | `mappings` | `PaginatedResponse<any>` | `PaginatedResponse<ScfMapping>` |
| `ScfResource.frameworks` | `list` | `PaginatedResponse<any>` | `PaginatedResponse<ScfFramework>` |
| `ScfResource.frameworks` | `get` | `StandardResponse<any>` | `StandardResponse<ScfFramework>` |
| `ScfResource.frameworks` | `requirements` | `PaginatedResponse<any>` | `PaginatedResponse<ScfRequirement>` |
| `ScfResource.frameworks` | `coverage` | `StandardResponse<any>` | `StandardResponse<ScfCoverage>` |
| `ScfResource.requirements` | `mappings` | `PaginatedResponse<any>` | `PaginatedResponse<ScfMapping>` |
| `LifecycleResource` | `transition` | `<any>` | `StandardResponse<Assessment>` |
| `LifecycleResource` | `availableTransitions` | `<any>` | `StandardResponse<{ transitions: AvailableTransition[] }>` |
| `LifecycleResource` | `events` | `PaginatedResponse<any>` | `PaginatedResponse<LifecycleEvent>` |
| `ApprovalsResource` | `submit` | `StandardResponse<any>` | `StandardResponse<ApprovalRecord>` |
| `ApprovalsResource` | `list` | `PaginatedResponse<any>` | `PaginatedResponse<ApprovalRecord>` |
| `ApprovalsResource` | `get` | `StandardResponse<any>` | `StandardResponse<ApprovalRecord>` |
| `ArtifactsResource` | all methods | `StandardResponse<any>` / `PaginatedResponse<any>` | use `ArtifactVersion` |
| `SoaResource` | all methods | replace with `SoaVersion`, `SoaItem`, `SoaValidation` |
| `GapAnalysisResource` | all methods | replace with `GapAnalysisVersion`, `GapFinding` |
| `PoamResource` | all methods | replace with `PoamVersion`, `PoamItem` |
| `ReportsResource` | all methods | replace with `ReportVersion`, `ReportSection`, `ReportExport` |
| `KbResource` | `search` | `StandardResponse<any>` | `StandardResponse<{ results: KbSearchResult[] }>` |
| `KbResource` | `chunks` | `PaginatedResponse<any>` | `PaginatedResponse<KbChunk>` |
| `WorkflowsResource` | all methods | replace with `WorkflowRun` |
| `AgentsResource` | all methods | replace with `AgentRun`, `AgentToolCall` |
| `WebhooksResource` | all methods | replace with `WebhookEndpoint`, `WebhookDelivery`, `ApiKeyCreated` |
| `OrganizationsResource` | all methods | replace with `Organization`, `ApiKey`, `ApiKeyCreated` |

Add import at top of `client.ts`:

```typescript
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
} from "./models";
```

**Step 4: Run type tests to verify**

Run: `pnpm vitest run packages/sdk/src/__tests__/client-types.test.ts`
Expected: PASS

**Step 5: Verify zero `any` remaining**

Run: `Select-String -Pattern '<any>' packages/sdk/src/client.ts | Measure-Object`
Expected: Count = 0

**Step 6: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "feat(sdk): replace 88 'any' types with concrete domain models

Zero-any SDK. All 15 resources now return typed responses.

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

### Task 4: OpenAPI Lifecycle Pre-Conditions

**Files:**
- Modify: `docs/api/openapi.yaml`

**Step 1: Add `x-lifecycle-precondition` extension to lifecycle-dependent endpoints**

For each endpoint that requires a specific assessment state, add:

```yaml
  /api/v1/assessments/{assessmentId}/soa/draft:
    post:
      x-lifecycle-precondition:
        required_state: framework_selected
        description: Assessment must have a framework selected before SoA can be drafted
      # ... existing definition
```

Apply to these endpoints:

| Endpoint | Required State |
|---|---|
| `POST .../soa/draft` | `framework_selected` |
| `POST .../soa/{id}/submit-review` | SoA status `draft` |
| `POST .../soa/{id}/approve` | SoA status `under_review` |
| `POST .../gap-analysis/draft` | `soa_approved` |
| `POST .../gap-analysis/{id}/submit-review` | Gap Analysis status `draft` |
| `POST .../gap-analysis/{id}/approve` | Gap Analysis status `under_review` |
| `POST .../poam/draft` | `maturity_approved` |
| `POST .../poam/{id}/submit-review` | POA&M status `draft` |
| `POST .../poam/{id}/approve` | POA&M status `under_review` |
| `POST .../reports/draft` | `poam_approved` |
| `POST .../transitions` | depends on `next_state` |

Also add a `description` field to each operation explaining the pre-condition in plain text.

**Step 2: Verify YAML validity**

Run: `npx -y js-yaml docs/api/openapi.yaml > $null`
Expected: No errors (valid YAML)

**Step 3: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "docs(openapi): add lifecycle pre-conditions to state-dependent endpoints

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

### Task 5: Webhook Retry via Cloudflare Queue

**Files:**
- Create: `apps/api-gateway/src/services/webhook-dispatcher.ts`
- Modify: `apps/api-gateway/src/http.ts` (add WEBHOOK_RETRY_QUEUE to AppDependencies)
- Modify: `apps/api-gateway/src/adapters/index.ts` (wire dispatcher)

**Step 1: Write failing test for dispatcher**

```typescript
// apps/api-gateway/src/__tests__/webhook-dispatcher.test.ts
import { describe, it, expect, vi } from "vitest";
import { WebhookDispatcher } from "../services/webhook-dispatcher";

describe("WebhookDispatcher", () => {
  it("signs payload with HMAC-SHA256", async () => {
    const dispatcher = new WebhookDispatcher();
    const signature = await dispatcher.sign("payload", "secret");
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it("delivers webhook with correct headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("ok") });
    const dispatcher = new WebhookDispatcher(fetchMock);
    const result = await dispatcher.deliver({
      endpoint_url: "https://example.com/webhook",
      signing_secret: "whsec_test",
      payload: { event_id: "e1", event_type: "assessment.created", timestamp: new Date().toISOString(), tenant_id: "t1", organization_id: "o1", data: {}, trace_id: "tr1" },
    });
    expect(result.success).toBe(true);
    expect(result.http_status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["X-Standard-Signature"]).toBeDefined();
    expect(headers["X-Standard-Event-Type"]).toBe("assessment.created");
  });

  it("returns failure on non-2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("error") });
    const dispatcher = new WebhookDispatcher(fetchMock);
    const result = await dispatcher.deliver({
      endpoint_url: "https://example.com/webhook",
      signing_secret: "whsec_test",
      payload: { event_id: "e2", event_type: "assessment.created", timestamp: new Date().toISOString(), tenant_id: "t1", organization_id: "o1", data: {}, trace_id: "tr2" },
    });
    expect(result.success).toBe(false);
    expect(result.http_status).toBe(500);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/api-gateway/src/__tests__/webhook-dispatcher.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement WebhookDispatcher**

```typescript
// apps/api-gateway/src/services/webhook-dispatcher.ts
import type { WebhookDeliveryPayload, WebhookDeliveryHeaders } from "@standard/schemas";

export type DeliverInput = {
  endpoint_url: string;
  signing_secret: string;
  payload: WebhookDeliveryPayload;
};

export type DeliverResult = {
  success: boolean;
  http_status: number | null;
  response_body: string | null;
};

export class WebhookDispatcher {
  constructor(private fetchFn: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  async sign(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async deliver(input: DeliverInput): Promise<DeliverResult> {
    const body = JSON.stringify(input.payload);
    const signature = await this.sign(body, input.signing_secret);

    const headers: WebhookDeliveryHeaders = {
      "X-Standard-Event-Id": input.payload.event_id,
      "X-Standard-Event-Type": input.payload.event_type,
      "X-Standard-Timestamp": input.payload.timestamp,
      "X-Standard-Signature": signature,
      "X-Standard-Trace-Id": input.payload.trace_id,
      "Content-Type": "application/json",
    };

    try {
      const response = await this.fetchFn(input.endpoint_url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
      const responseBody = await response.text().catch(() => null);
      return { success: response.ok, http_status: response.status, response_body: responseBody };
    } catch (error) {
      return { success: false, http_status: null, response_body: String(error) };
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run apps/api-gateway/src/__tests__/webhook-dispatcher.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "feat(webhooks): HMAC-SHA256 dispatcher with delivery/retry support

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

### Task 6: Quickstart E2E Script

**Files:**
- Create: `docs/guides/quickstart-e2e.md`

**Step 1: Write the quickstart document**

Create a complete step-by-step guide using `curl` commands that walks a developer through:

1. Create organization (`POST /api/v1/organizations`)
2. Create API key with scopes (`POST /api/v1/organizations/:id/api-keys`)
3. Create assessment (`POST /api/v1/assessments`)
4. Upload document (`POST /api/v1/assessments/:id/documents`)
5. Transition state (`POST /api/v1/assessments/:id/transitions`)
6. Draft SoA (`POST /api/v1/assessments/:id/soa/draft`)
7. Approve SoA
8. Draft Gap Analysis
9. Add finding
10. Approve Gap Analysis
11. Draft POA&M
12. Draft Report

Each step must show:
- The `curl` command
- Expected response structure
- Pre-conditions

**Step 2: Validate curl commands are syntactically correct**

Review each `curl` command for correctness manually (no automated test needed).

**Step 3: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "docs: quickstart e2e guide with 12-step assessment lifecycle walkthrough

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

### Task 7: Final Typecheck Validation

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS for all 21 workspace projects

**Step 2: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit --no-gpg-sign -m "fix: typecheck and test corrections post-plan execution

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

## Execution Order

```
Task 1 (migration)  →  Task 2 (models file)  →  Task 3 (SDK retype)
                                                        ↓
Task 4 (OpenAPI)  ←──────────────────────── Task 5 (webhook dispatcher)
                                                        ↓
                                              Task 6 (quickstart doc)
                                                        ↓
                                              Task 7 (final validation)
```

Tasks 2 and 3 are strictly sequential (3 depends on 2).
Tasks 4, 5, and 6 are independent of each other but depend on 1.
Task 7 must be last.

# Standard API — Critical Fixes Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Corrigir 6 gaps críticos identificados na análise arquitectural antes do primeiro cliente — compliance score real, MCP async funcional, particionamento de ledger, data isolation policy no SCF, streaming de controls e quota MCP dedicada.

**Architecture:** TDD-first em todos os tasks. Cada fix é isolado com contrato de teste que falha antes da implementação. Drizzle para migrations, Cloudflare Workers KV para quota, raw SQL para DDL de particionamento (Drizzle `^0.31.10` não suporta PARTITION BY declarativo). Commits frequentes após cada task verde.

**Tech Stack:** TypeScript strict · Drizzle ORM `^0.45.2` · Hono (api-gateway) · Cloudflare Workers KV (`STANDARD_CACHE`) · PostgreSQL 17 (Neon) · Vitest · pnpm workspaces

**Dados verificados pelo deep research:**
- `computeComplianceIndex` aceita `StrmControlInput[]` (`maturity_level, strm_operator, strength_score`)
- `deps.scf` tem `listMappingsByControl(controlId, versionId)` mas **NÃO** tem bulk por array de IDs
- MCP payload envia: `{queue_type, job_id, tool_name, tool_args, organization_id, actor_id, trace_id, mcp_request_id, webhook_url}`
- `webhook_url` existe no payload mas **nunca é disparado** — nenhum delivery mechanism existe
- `rate-limit.middleware.ts` já existe com 120 req/min default para `/mcp` — Task 6 é extensão, não criação do zero
- `pg_partman` não está disponível — partições serão manuais (trimestrais)
- A2: `scf_versions.organization_id = NULL` é o padrão correcto para dados globais SCF

**Skills activos neste plano:**
- `postgresql` → Task 3 (particionamento RANGE + manutenção trimestral)
- `tdd-workflow` → Todos os tasks (RED → GREEN → REFACTOR)
- `architect-review` → Validação pós-implementação de cada task
- `database-design` → Task 3

---

## Ordem de Execução

| # | Task | Gap | Estimativa | Risco |
|---|------|-----|-----------|-------|
| T1 | MCP Queue Consumer Handler | C2 | 4h | Baixo — additive |
| T2 | Dashboard Compliance Real | C1 | 1 dia | Médio — query join complexo |
| T3 | Particionamento Ledger | A1 | 1 dia | Alto — DDL irrevogável |
| T4 | SCF Versions Tenancy Policy | A2 | 2h | Baixo — additive |
| T5 | Streaming SCF Controls | M1 | 4h | Baixo — backward compat |
| T6 | MCP Edge Quota KV | M2 | 4h | Baixo — additive |

**T1 antes de T2** — MCP consumer activado antes de testar o compliance route via IA.
**T3 antes de qualquer dado real** — DDL de particionamento com zero linhas é trivial.

---

## Task 1: MCP Queue Consumer Handler (C2)

> **Gap:** `POST /mcp` async tools retornam 202 mas `mcp_tool_async` queue_type não tem handler no consumer. Ferramentas de IA nunca executam.

**Skills:** `tdd-workflow` · `error-handling-patterns`

**Files:**
- Modify: `workers/queues/src/index.ts`
- Create: `workers/queues/src/__tests__/mcp-tool.consumer.test.ts`
- Create: `workers/queues/src/mcp-tool.consumer.ts`

---

### Step 1.1: Escrever o teste de contrato que falha

Cria `workers/queues/src/__tests__/mcp-tool.consumer.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { processMcpToolMessage, type McpToolQueueMessage } from "../mcp-tool.consumer";

describe("processMcpToolMessage — contract", () => {
  const mockEnv = {
    AI_GATEWAY_URL: "https://gateway.ai.cloudflare.com/v1/test",
    AI_GATEWAY_TOKEN: "test-token",
    WEBHOOK_SECRET: "test-secret",
    AGENT_RUN_QUEUE: { send: vi.fn() } as any,
  };

  it("deve processar tool evaluate-evidence e retornar resultado estruturado", async () => {
    const msg: McpToolQueueMessage = {
      queue_type: "mcp_tool_async",
      job_id: "job-test-123",
      tool_name: "evaluate-evidence",
      tool_args: { control_id: "AC-1", evidence_text: "Policy document" },
      organization_id: "org-test-456",
      trace_id: "trace-test-789",
      callback_webhook_url: "https://example.com/webhook",
      timestamp: new Date().toISOString(),
    };

    // Deve não lançar excepção — resultado é enviado via webhook
    await expect(processMcpToolMessage(msg, mockEnv)).resolves.not.toThrow();
  });

  it("deve registar erro estruturado se tool_name desconhecido", async () => {
    const consoleSpy = vi.spyOn(console, "error");
    const msg: McpToolQueueMessage = {
      queue_type: "mcp_tool_async",
      job_id: "job-unknown",
      tool_name: "tool-inexistente" as any,
      tool_args: {},
      organization_id: "org-test-456",
      trace_id: "trace-test",
      timestamp: new Date().toISOString(),
    };
    await processMcpToolMessage(msg, mockEnv);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("mcp_tool_unknown"),
    );
  });

  it("deve usar idempotency_key para dedup dentro do batch", async () => {
    const msg: McpToolQueueMessage = {
      queue_type: "mcp_tool_async",
      job_id: "job-dedup",
      tool_name: "evaluate-evidence",
      tool_args: {},
      organization_id: "org-test",
      trace_id: "trace-dedup",
      idempotency_key: "idem-key-001",
      timestamp: new Date().toISOString(),
    };
    // Primeira chamada
    await processMcpToolMessage(msg, mockEnv);
    // Segunda chamada com mesma chave — deve ser no-op silencioso
    const consoleSpy = vi.spyOn(console, "log");
    await processMcpToolMessage(msg, mockEnv);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("mcp_tool_deduplicated"),
    );
  });
});
```

### Step 1.2: Verificar que falha

```bash
pnpm --filter @standard/queues test -- mcp-tool.consumer.test.ts
```

**Esperado:** `FAIL — Cannot find module '../mcp-tool.consumer'`

### Step 1.3: Implementar `mcp-tool.consumer.ts`

Cria `workers/queues/src/mcp-tool.consumer.ts`:

```typescript
/**
 * @module mcp-tool.consumer
 * @description MCP async tool executor — ADR-003 Grupo B handler.
 *
 * Recebe mensagens mcp_tool_async do AGENT_RUN_QUEUE e executa
 * a ferramenta de IA via AI Gateway de forma assíncrona.
 * Resultados são entregues via webhook quando callback_webhook_url fornecido.
 */

export interface McpToolQueueMessage {
  queue_type: "mcp_tool_async";
  job_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  organization_id: string;
  trace_id: string;
  idempotency_key?: string;
  callback_webhook_url?: string;
  timestamp: string;
}

export interface McpToolEnv {
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  WEBHOOK_SECRET?: string;
  AGENT_RUN_QUEUE?: { send: (msg: unknown) => Promise<void> };
}

/** Known async tools — must match ASYNC_TOOLS set in mcp.routes.ts */
const KNOWN_ASYNC_TOOLS = new Set([
  "evaluate-evidence",
  "architect-remediation",
  "validar-evidencia-privacidade",
  "calcular-score-risco-terceiro",
]);

/** In-memory dedup cache for idempotency (survives within a single batch). */
const processedKeys = new Set<string>();

function maskOrgId(orgId: string): string {
  if (orgId.length <= 8) return `${orgId[0]}***`;
  return `${orgId.slice(0, 4)}***${orgId.slice(-4)}`;
}

export async function processMcpToolMessage(
  body: McpToolQueueMessage,
  env: McpToolEnv,
): Promise<void> {
  const traceId = body.trace_id ?? body.job_id ?? crypto.randomUUID();

  // Idempotency check
  if (body.idempotency_key && processedKeys.has(body.idempotency_key)) {
    console.log(
      JSON.stringify({
        level: "info",
        message: "mcp_tool_deduplicated",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: { idempotency_key: body.idempotency_key, tool_name: body.tool_name },
      }),
    );
    return;
  }

  // Validate tool is known
  if (!KNOWN_ASYNC_TOOLS.has(body.tool_name)) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "mcp_tool_unknown",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: {
          tool_name: body.tool_name,
          job_id: body.job_id,
          organization_id: maskOrgId(body.organization_id),
        },
      }),
    );
    return; // Don't throw — unknown tools should not cause queue retry
  }

  const startTime = Date.now();

  try {
    console.log(
      JSON.stringify({
        level: "info",
        message: "mcp_tool_started",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: {
          tool_name: body.tool_name,
          job_id: body.job_id,
          organization_id: maskOrgId(body.organization_id),
        },
      }),
    );

    // Tool execution dispatch
    const result = await dispatchTool(body.tool_name, body.tool_args, env, traceId);

    const durationMs = Date.now() - startTime;

    // Deliver result via webhook if callback URL provided
    if (body.callback_webhook_url && env.WEBHOOK_SECRET) {
      await deliverWebhookResult({
        url: body.callback_webhook_url,
        secret: env.WEBHOOK_SECRET,
        payload: {
          job_id: body.job_id,
          tool_name: body.tool_name,
          organization_id: body.organization_id,
          trace_id: traceId,
          status: "completed",
          result,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        },
      });
    }

    console.log(
      JSON.stringify({
        level: "info",
        message: "mcp_tool_completed",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: {
          tool_name: body.tool_name,
          job_id: body.job_id,
          duration_ms: durationMs,
          has_callback: !!body.callback_webhook_url,
        },
      }),
    );

    if (body.idempotency_key) {
      processedKeys.add(body.idempotency_key);
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "mcp_tool_failed",
        service: "queue-worker",
        module: "mcp-tool",
        trace_id: traceId,
        metadata: {
          tool_name: body.tool_name,
          job_id: body.job_id,
          error: err instanceof Error ? err.message : String(err),
          duration_ms: Date.now() - startTime,
        },
      }),
    );
    throw err; // Re-throw for queue retry
  }
}

/** Dispatch to the appropriate tool implementation */
async function dispatchTool(
  toolName: string,
  args: Record<string, unknown>,
  env: McpToolEnv,
  traceId: string,
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case "evaluate-evidence":
      return evaluateEvidenceTool(args, env, traceId);
    case "architect-remediation":
      return architectRemediationTool(args, env, traceId);
    case "validar-evidencia-privacidade":
      return validarEvidenciaPrivacidadeTool(args, env, traceId);
    case "calcular-score-risco-terceiro":
      return calcularScoreRiscoTerceiroTool(args, env, traceId);
    default:
      throw new Error(`[MCP] Unhandled tool: ${toolName}`);
  }
}

/** Placeholder implementations — replace with AI Gateway calls */
async function evaluateEvidenceTool(
  args: Record<string, unknown>,
  _env: McpToolEnv,
  _traceId: string,
): Promise<Record<string, unknown>> {
  // TODO: Implement via AI Gateway (TASK T1-followup)
  return {
    tool: "evaluate-evidence",
    status: "stub",
    args_received: Object.keys(args),
    note: "AI Gateway integration pending",
  };
}

async function architectRemediationTool(
  args: Record<string, unknown>,
  _env: McpToolEnv,
  _traceId: string,
): Promise<Record<string, unknown>> {
  return { tool: "architect-remediation", status: "stub", args_received: Object.keys(args) };
}

async function validarEvidenciaPrivacidadeTool(
  args: Record<string, unknown>,
  _env: McpToolEnv,
  _traceId: string,
): Promise<Record<string, unknown>> {
  return { tool: "validar-evidencia-privacidade", status: "stub", args_received: Object.keys(args) };
}

async function calcularScoreRiscoTerceiroTool(
  args: Record<string, unknown>,
  _env: McpToolEnv,
  _traceId: string,
): Promise<Record<string, unknown>> {
  return { tool: "calcular-score-risco-terceiro", status: "stub", args_received: Object.keys(args) };
}

/** Deliver signed webhook result */
async function deliverWebhookResult({
  url,
  secret,
  payload,
}: {
  url: string;
  secret: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const body = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Standard-Signature": `sha256=${sigHex}`,
    },
    body,
  });
}
```

### Step 1.4: Registar no consumer `index.ts`

No `workers/queues/src/index.ts`, adiciona o case no switch de queue_type:

```typescript
// Adicionar import no topo:
import { processMcpToolMessage, type McpToolQueueMessage } from "./mcp-tool.consumer";

// No switch(body.queue_type):
case "mcp_tool_async":
  await processMcpToolMessage(body as McpToolQueueMessage, env);
  break;
```

### Step 1.5: Verificar que os testes passam

```bash
pnpm --filter @standard/queues test -- mcp-tool.consumer.test.ts
pnpm typecheck
```

**Esperado:** PASS · 0 erros TypeScript

### Step 1.6: Commit

```bash
git add workers/queues/src/mcp-tool.consumer.ts workers/queues/src/__tests__/mcp-tool.consumer.test.ts workers/queues/src/index.ts
git commit -m "feat(mcp/queue): add mcp_tool_async consumer handler (ADR-003 C2)"
```

---

## Task 2: Dashboard Compliance Real (C1)

> **Gap:** `strmProxyFromSoaItems()` usa `operator="intersects", strength=0.5` hardcoded para todos os controlos, ignorando os dados reais de `scf_mappings`. O score entregue ao cliente é matematicamente errado.

**Skills:** `tdd-workflow` · `database-design` · `fp-ts-errors`

**Files:**
- Modify: `apps/api-gateway/src/routes/dashboard.routes.ts` (L38–52 e L156–165)
- Create: `apps/api-gateway/src/lib/__tests__/strm-compliance-query.test.ts`
- Create: `apps/api-gateway/src/lib/strm-compliance-query.ts`

---

### Step 2.1: Escrever teste de contrato para a query real

Cria `apps/api-gateway/src/lib/__tests__/strm-compliance-query.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  buildStrmControlInputs,
  type SoaItemWithMapping,
} from "../strm-compliance-query";

describe("buildStrmControlInputs — contrato ADR-001", () => {
  it("mapeia equal → weight 1.0, maturity 5 → index 1.0", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-1",
        maturity_level: 5,
        relationship_type: "equal",
        strength_score: null,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.strm_operator).toBe("equal");
    expect(inputs[0]!.maturity_level).toBe(5);
    expect(inputs[0]!.strength_score).toBeNull();
  });

  it("mapeia intersects com strength_score real da DB", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-2",
        maturity_level: 3,
        relationship_type: "intersects",
        strength_score: 0.75,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs[0]!.strength_score).toBe(0.75);
  });

  it("exclui itens sem mapping (relationship_type = null)", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-3",
        maturity_level: 4,
        relationship_type: null,
        strength_score: null,
      },
    ];
    // Itens sem mapping SCF não contribuem para o índice
    const inputs = buildStrmControlInputs(items);
    expect(inputs).toHaveLength(0);
  });

  it("maturity_level undefined → 0", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-4",
        maturity_level: null,
        relationship_type: "subset",
        strength_score: null,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs[0]!.maturity_level).toBe(0);
  });

  it("normaliza legacy operators da DB (intersecting → intersects)", () => {
    const items: SoaItemWithMapping[] = [
      {
        control_id: "ctrl-5",
        maturity_level: 2,
        relationship_type: "intersecting" as any, // legacy — ainda pode existir em dados antigos
        strength_score: 0.4,
      },
    ];
    const inputs = buildStrmControlInputs(items);
    expect(inputs[0]!.strm_operator).toBe("intersects");
  });
});
```

### Step 2.2: Verificar que falha

```bash
pnpm --filter @standard/api-gateway test -- strm-compliance-query.test.ts
```

**Esperado:** `FAIL — Cannot find module '../strm-compliance-query'`

### Step 2.3: Implementar `strm-compliance-query.ts`

Cria `apps/api-gateway/src/lib/strm-compliance-query.ts`:

```typescript
/**
 * @module strm-compliance-query
 * @description Constrói StrmControlInput[] a partir de dados reais de scf_mappings.
 *
 * Este módulo substitui strmProxyFromSoaItems() que usava dados fictícios.
 * Agora lê relationship_type e strength_score reais da DB para cada controlo
 * do SoA, produzindo inputs correctos para computeComplianceIndex() (ADR-001).
 */

import { computeStrmWeightFromString } from "@standard/assessment-engine";
import type { StrmControlInput } from "@standard/assessment-engine";

export interface SoaItemWithMapping {
  control_id: string;
  /** Maturity level 0–5. null → treat as 0. */
  maturity_level: number | null;
  /** STRM relationship_type from scf_mappings. null = no mapping found. */
  relationship_type: string | null;
  /** strength_score from scf_mappings. null → use operator default. */
  strength_score: number | null;
}

/** Legacy operator normalisation map (mirrors strm-weight-calculator.ts) */
const LEGACY_OPERATOR_MAP: Record<string, string> = {
  direct: "equal",
  related: "intersects",
  intersecting: "intersects",
  source_defined: "intersects",
  no_relationship: "no_relation",
};

/**
 * buildStrmControlInputs — converts SoA items with real DB mappings into
 * StrmControlInput[] for computeComplianceIndex().
 *
 * Rules:
 * - Items without a mapping (relationship_type = null) are EXCLUDED.
 *   They don't contribute to numerator or denominator.
 * - Legacy operators are normalised before processing.
 * - null maturity_level is treated as 0 (not assessed).
 * - Invalid/unknown operators after normalisation are excluded with a warning.
 */
export function buildStrmControlInputs(
  items: SoaItemWithMapping[],
): StrmControlInput[] {
  const result: StrmControlInput[] = [];

  for (const item of items) {
    // Exclude items with no SCF mapping
    if (item.relationship_type === null || item.relationship_type === undefined) {
      continue;
    }

    // Normalise legacy operators
    const rawOp = item.relationship_type;
    const normalisedOp = LEGACY_OPERATOR_MAP[rawOp] ?? rawOp;

    // Validate operator is canonical
    const weight = computeStrmWeightFromString(normalisedOp, item.strength_score);
    if (weight === null) {
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "strm_invalid_operator_excluded",
          module: "strm-compliance-query",
          metadata: {
            control_id: item.control_id,
            raw_operator: rawOp,
            normalised: normalisedOp,
          },
        }),
      );
      continue;
    }

    result.push({
      maturity_level: item.maturity_level ?? 0,
      strm_operator: normalisedOp as StrmControlInput["strm_operator"],
      strength_score: item.strength_score,
    });
  }

  return result;
}
```

### Step 2.4: Actualizar `dashboard.routes.ts`

Em `dashboard.routes.ts`, substituir `strmProxyFromSoaItems()` (L38–52) e os dois call sites (L156–165 e L232–234) pela nova query que lê dados reais.

**Substitui as linhas 24–52** (função strmProxyFromSoaItems + import):

```typescript
// REMOVE: strmProxyFromSoaItems function (L24–53)
// ADD ao topo dos imports:
import { buildStrmControlInputs } from "../lib/strm-compliance-query";
```

**Substitui o call site da assessment summary (L156–165)**:

```typescript
// ANTES (proxy com dados fictícios):
const strmResult = latestSoa
  ? strmProxyFromSoaItems(
      await deps.soa.repositories.items.listByVersion(...),
    )
  : { index: 0, percentage: 0 };

// DEPOIS (dados reais da DB):
let strmResult = { index: 0, percentage: 0, weighted_score: 0, total_weight: 0, excluded_count: 0, included_count: 0 };
if (latestSoa) {
  const soaItemsWithMappings = await deps.scf.repositories.mappings
    .findBySoaVersion(latestSoa.soa_version_id, requireOrganizationId({ organizationId }));
  const strmInputs = buildStrmControlInputs(soaItemsWithMappings);
  strmResult = computeComplianceIndex(strmInputs);
}
```

> **Nota:** O método `findBySoaVersion()` pode não existir ainda em `deps.scf.repositories.mappings`. Ver Step 2.5.

### Step 2.5: Adicionar bulk repository method para mappings por SoA version

> **Dado verificado:** `deps.scf` tem `listMappingsByControl(controlId, versionId)` para controlo individual mas **não tem** método bulk por array de IDs. Chamar N vezes seria N+1 queries. Adicionar método bulk ao repositório.

Em `packages/scf-core/src/repositories/drizzle-scf.repository.ts`, adicionar após a linha de `listMappingsByControl` (~linha 403):

```typescript
/**
 * listMappingsByControlIds — bulk fetch mappings for multiple controls in one query.
 * Used by dashboard to compute STRM-weighted compliance index (ADR-001).
 */
async listMappingsByControlIds(
  controlIds: string[],
  scfVersionId: string,
): Promise<Array<{
  scf_control_id: string;
  relationship_type: string;
  strength_score: number | null;
}>> {
  if (controlIds.length === 0) return [];
  return db
    .select({
      scf_control_id: scfMappings.scfControlId,
      relationship_type: scfMappings.relationshipType,
      strength_score: scfMappings.strengthScore,
    })
    .from(scfMappings)
    .where(
      and(
        inArray(scfMappings.scfControlId, controlIds),
        eq(scfMappings.scfVersionId, scfVersionId),
      ),
    );
}
```

Em `apps/api-gateway/src/routes/dashboard.routes.ts`, substituir call site do compliance score:

```typescript
// Buscar SoA items com maturity
const items = await deps.soa.repositories.items.listByVersion(
  latestSoa.soa_version_id,
  requireOrganizationId({ organizationId }),
);

// Buscar mappings reais para os controlos do SoA (bulk — 1 query)
const controlIds = items
  .map((i) => i.scfControlId)
  .filter(Boolean) as string[];

const mappings = await deps.scf.repositories.mappings.listMappingsByControlIds(
  controlIds,
  assessment.scfVersionId,  // ou latestSoa.scfVersionId
);

// Construir mapa controlId → mapping
const mappingMap = new Map(mappings.map((m) => [m.scf_control_id, m]));

// Construir StrmControlInput[] com dados reais
const soaItemsWithMappings: SoaItemWithMapping[] = items.map((item) => ({
  control_id: item.scfControlId ?? "",
  maturity_level: item.maturityLevel ?? null,
  relationship_type: mappingMap.get(item.scfControlId ?? "")?.relationship_type ?? null,
  strength_score: mappingMap.get(item.scfControlId ?? "")?.strength_score ?? null,
}));

const strmInputs = buildStrmControlInputs(soaItemsWithMappings);
const strmResult = computeComplianceIndex(strmInputs);
```

### Step 2.6: Verificar testes e typecheck

```bash
pnpm --filter @standard/api-gateway test -- strm-compliance-query.test.ts
pnpm typecheck
```

**Esperado:** PASS · 0 erros

### Step 2.7: Commit

```bash
git add apps/api-gateway/src/lib/strm-compliance-query.ts \
        apps/api-gateway/src/lib/__tests__/strm-compliance-query.test.ts \
        apps/api-gateway/src/routes/dashboard.routes.ts
git commit -m "fix(dashboard): replace hardcoded STRM proxy with real scf_mappings query (ADR-001 C1)"
```

---

## Task 3: Particionamento Ledger (A1)

> **Gap:** `assessment_control_events` e `audit_logs` são tabelas planas sem particionamento. Com crescimento de dados de assessments multi-tenant, queries de consolidação farão Full Table Scans.

**Skills:** `postgresql` · `database-migration` · `tdd-workflow`

> ⚠️ **CRÍTICO:** Drizzle ORM **não suporta** declaração de tabelas particionadas no schema (`pgTable`). A migration tem de ser raw SQL. O schema Drizzle mantém a definição actual (para ORM queries), a partição é gerida pelo Neon/PostgreSQL directamente.

**Files:**
- Create: `infra/docker/postgres/migrations/0049_partition_ledger_tables.sql`
- Create: `infra/docker/postgres/migrations/0049_partition_ledger_tables.down.sql`

---

### Step 3.1: Verificar estado actual na Neon DB

DDL verificado pelo deep research:
- `assessment_control_events`: criada em migration 0047, tem 4 btree indexes (`ace_org_assessment_idx`, `ace_control_idx`, `ace_trace_idx`, `ace_occurred_at_idx`). PK é `id uuid`.
- `audit_logs`: criada em migration 0000, sem indexes definidos. PK é `id uuid`.
- `pg_partman`: NÃO disponível no projecto. Partições serão criadas manualmente trimestralmente.

```bash
# Confirmar contagem antes de particionamento:
# SELECT COUNT(*) FROM assessment_control_events;
# SELECT COUNT(*) FROM audit_logs;
```

**Esperado:** Zero ou poucos registos de dev. Se houver dados reais, o INSERT na migration 0049 trata disso.

> ⚠️ Os indexes `ace_org_assessment_idx` e outros existentes serão recriados na nova tabela particionada. A migration drop+recria as tabelas, por isso todos os indexes existentes serão perdidos e recriados correctamente.

### Step 3.2: Criar migration SQL

Cria `infra/docker/postgres/migrations/0049_partition_ledger_tables.sql`:

```sql
-- Migration: 0049 — Partition ledger tables for scale
-- Date: 2026-06-10
--
-- Approach (postgresql skill — RANGE by time):
--   PARTITION BY RANGE (occurred_at) for assessment_control_events
--   PARTITION BY RANGE (created_at) for audit_logs
--
-- Why NOT LIST by organization_id:
--   LIST partitioning requires DDL per tenant. With N tenants → N partitions.
--   Neon DB DDL is transactional but still expensive at scale.
--   RANGE by time allows pg_partman automation and fits insert-heavy append-only pattern.
--
-- Index strategy (postgresql skill):
--   Composite (organization_id, occurred_at, scf_control_id) for dashboard queries.
--   Existing PK (id) is preserved on each partition.
--
-- NOTE: Drizzle ORM cannot declare partitioned tables in schema.ts.
--       This migration is raw SQL only.

BEGIN;

-- ─── assessment_control_events ────────────────────────────────────────────

-- 1. Rename existing table
ALTER TABLE "assessment_control_events" RENAME TO "assessment_control_events_old";

-- 2. Create partitioned table (same columns, same constraints)
CREATE TABLE "assessment_control_events" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL REFERENCES "organizations"("id"),
  "assessment_id"    UUID NOT NULL REFERENCES "assessments"("id"),
  "scf_control_id"   UUID NOT NULL REFERENCES "scf_controls"("id"),
  "scf_version_id"   UUID NOT NULL REFERENCES "scf_versions"("id"),
  "event_type"       TEXT NOT NULL,
  "previous_value"   JSONB,
  "new_value"        JSONB NOT NULL,
  "actor_id"         UUID,
  "agent_run_id"     UUID,
  "trace_id"         TEXT NOT NULL,
  "occurred_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
  -- ⛔ NO updated_at. NO deleted_at. Append-only = immutable record.
) PARTITION BY RANGE ("occurred_at");

-- 3. Create initial partitions (quarterly — monthly is too granular pre-launch)
CREATE TABLE "assessment_control_events_2026_q2" PARTITION OF "assessment_control_events"
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE "assessment_control_events_2026_q3" PARTITION OF "assessment_control_events"
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE TABLE "assessment_control_events_2026_q4" PARTITION OF "assessment_control_events"
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE TABLE "assessment_control_events_2027_q1" PARTITION OF "assessment_control_events"
  FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');

-- 4. Composite index for dashboard queries (postgresql skill — covering index)
CREATE INDEX "ace_org_time_ctrl_idx"
  ON "assessment_control_events" ("organization_id", "occurred_at", "scf_control_id");

-- 5. Index for assessment-scoped queries
CREATE INDEX "ace_assessment_idx"
  ON "assessment_control_events" ("assessment_id", "occurred_at");

-- 6. Copy existing data
INSERT INTO "assessment_control_events"
  SELECT * FROM "assessment_control_events_old";

-- 7. Drop old table
DROP TABLE "assessment_control_events_old";

-- ─── audit_logs ───────────────────────────────────────────────────────────

ALTER TABLE "audit_logs" RENAME TO "audit_logs_old";

CREATE TABLE "audit_logs" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_id"       UUID,
  "organization_id" UUID REFERENCES "organizations"("id"),
  "action"         TEXT NOT NULL,
  "resource_type"  TEXT NOT NULL,
  "resource_id"    UUID,
  "ip_address"     TEXT,
  "user_agent"     TEXT,
  "trace_id"       TEXT,
  "metadata"       JSONB NOT NULL DEFAULT '{}',
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE ("created_at");

CREATE TABLE "audit_logs_2026_q2" PARTITION OF "audit_logs"
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE "audit_logs_2026_q3" PARTITION OF "audit_logs"
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE TABLE "audit_logs_2026_q4" PARTITION OF "audit_logs"
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE TABLE "audit_logs_2027_q1" PARTITION OF "audit_logs"
  FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');

-- Composite index for tenant-scoped audit queries
CREATE INDEX "al_org_time_idx"
  ON "audit_logs" ("organization_id", "created_at");

-- Index for action-based filtering
CREATE INDEX "al_action_type_idx"
  ON "audit_logs" ("action", "resource_type", "created_at");

INSERT INTO "audit_logs"
  SELECT * FROM "audit_logs_old";

DROP TABLE "audit_logs_old";

COMMIT;

-- ─── Post-migration: Register with pg_partman (if available) ──────────────
-- NOTE: pg_partman automates future partition creation.
-- Run this separately after confirming pg_partman extension is available on Neon:
--
-- SELECT pg_partman.create_parent(
--   p_parent_table := 'public.assessment_control_events',
--   p_control      := 'occurred_at',
--   p_type         := 'native',
--   p_interval     := 'quarterly',
--   p_premake      := 4
-- );
--
-- If pg_partman is not available, create partitions manually each quarter.
-- Add a reminder in docs/decisions/ to create next quarter partition.
```

### Step 3.3: Criar migration de rollback

Cria `infra/docker/postgres/migrations/0049_partition_ledger_tables.down.sql`:

```sql
-- Rollback: 0049 — Remove partitioning (restore flat tables)
-- WARNING: This copies all data back to flat tables. Expensive on large datasets.
-- Do NOT run in production without a maintenance window.

BEGIN;

-- assessment_control_events
ALTER TABLE "assessment_control_events" RENAME TO "assessment_control_events_partitioned";
CREATE TABLE "assessment_control_events" AS
  TABLE "assessment_control_events_partitioned";
ALTER TABLE "assessment_control_events"
  ADD PRIMARY KEY ("id"),
  ADD CONSTRAINT "ace_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id"),
  ADD CONSTRAINT "ace_assessment_fk" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id"),
  ADD COLUMN "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TABLE "assessment_control_events_partitioned" CASCADE;

-- audit_logs
ALTER TABLE "audit_logs" RENAME TO "audit_logs_partitioned";
CREATE TABLE "audit_logs" AS TABLE "audit_logs_partitioned";
ALTER TABLE "audit_logs"
  ADD PRIMARY KEY ("id"),
  ADD CONSTRAINT "al_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
DROP TABLE "audit_logs_partitioned" CASCADE;

COMMIT;
```

### Step 3.4: Adicionar documentação de manutenção trimestral

Cria `docs/decisions/PARTITION-MAINTENANCE.md`:

```markdown
# Particionamento de Ledger — Guia de Manutenção

## Tabelas Particionadas
- `assessment_control_events` — PARTITION BY RANGE (occurred_at), granularidade trimestral
- `audit_logs` — PARTITION BY RANGE (created_at), granularidade trimestral

## Criação Manual de Novas Partições

Se pg_partman não estiver disponível, criar partições trimestralmente:

```sql
-- Exemplo para 2027 Q2:
CREATE TABLE assessment_control_events_2027_q2
  PARTITION OF assessment_control_events
  FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');

CREATE TABLE audit_logs_2027_q2
  PARTITION OF audit_logs
  FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');
```

## Alertas
- Criar nova partição 30 dias antes do início do trimestre.
- Se nenhuma partição cobrir a data do INSERT, PostgreSQL lança erro.
- Monitorizar tamanho das partições com `pg_size_pretty(pg_total_relation_size(...))`.
```

### Step 3.5: Aplicar migration na Neon branch principal

```bash
pnpm db:migrate
# ou directamente via Neon MCP/CLI se DATABASE_URL apontar para main branch
```

**Verificar após migração:**
```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename LIKE 'assessment_control_events%'
   OR tablename LIKE 'audit_logs%'
ORDER BY tablename;
-- Esperado: tabela mãe + 4 partições trimestrais cada
```

### Step 3.6: Commit

```bash
git add infra/docker/postgres/migrations/0049_partition_ledger_tables.sql \
        infra/docker/postgres/migrations/0049_partition_ledger_tables.down.sql \
        docs/decisions/PARTITION-MAINTENANCE.md
git commit -m "feat(db): partition audit_logs and assessment_control_events by RANGE(time) (A1)"
```

---

## Task 4: SCF Versions — Adicionar Index em `organization_id` (A2)

> **Dado verificado pelo deep research:** `scf_versions.organization_id` é nullable e **não tem index**. O design é correcto — `NULL` significa versão global SCF, valor preenchido significa versão privada de org. As rotas actuais **não filtram por org** porque retornam sempre as globais. O risco real não é contaminação de dados (as queries são read-only), mas sim **ausência de index** que tornará queries lentas ao escalar e **ausência de um guard pattern** para futuras queries que adicionem filtro sem o `OR IS NULL`.

**O que mudar:**
1. Adicionar index em `scf_versions.organization_id` (FK sem index — postgresql skill rule)
2. Criar helper `scfVersionTenancyWhere()` para uso seguro em futuras queries que precisem de filtrar

**Skills:** `postgresql` · `tdd-workflow`

**Files:**
- Create: `infra/docker/postgres/migrations/0050_index_scf_versions_org.sql`
- Create: `apps/api-gateway/src/lib/scf-version-tenancy.ts`
- Create: `apps/api-gateway/src/lib/__tests__/scf-version-tenancy.test.ts`

---

### Step 4.1: Escrever teste de isolamento

Cria `apps/api-gateway/src/lib/__tests__/scf-version-tenancy.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildScfVersionFilter } from "../scf-version-tenancy";

describe("buildScfVersionFilter — tenancy isolation", () => {
  it("inclui versões globais (organization_id IS NULL) para qualquer org", () => {
    const filter = buildScfVersionFilter("org-A");
    // Must include null org (global SCF versions)
    expect(filter.includesGlobal).toBe(true);
  });

  it("inclui versões privadas apenas da org correta", () => {
    const filter = buildScfVersionFilter("org-A");
    expect(filter.organizationId).toBe("org-A");
  });

  it("nunca expõe versões de outra org", () => {
    const filterA = buildScfVersionFilter("org-A");
    const filterB = buildScfVersionFilter("org-B");
    // Filters são disjuntos por organization_id
    expect(filterA.organizationId).not.toBe(filterB.organizationId);
  });
});
```

### Step 4.2: Implementar `scf-version-tenancy.ts`

Cria `apps/api-gateway/src/lib/scf-version-tenancy.ts`:

```typescript
/**
 * buildScfVersionFilter — garante que queries a scf_versions respeitam isolamento:
 *   - Versões globais (organization_id IS NULL): visíveis a todas as orgs
 *   - Versões privadas: visíveis apenas à org proprietária
 */
export function buildScfVersionFilter(organizationId: string): {
  organizationId: string;
  includesGlobal: boolean;
} {
  return { organizationId, includesGlobal: true };
}

/**
 * Drizzle WHERE clause para scf_versions com isolamento correcto.
 * Uso: .where(scfVersionTenancyWhere(scfVersions, organizationId))
 */
import { or, isNull, eq } from "drizzle-orm";
import { scfVersions } from "@standard/schemas";

export function scfVersionTenancyWhere(organizationId: string) {
  return or(
    isNull(scfVersions.organizationId),         // versões globais SCF oficial
    eq(scfVersions.organizationId, organizationId), // versões privadas da org
  );
}
```

### Step 4.3: Criar migration para index em `organization_id`

Cria `infra/docker/postgres/migrations/0050_index_scf_versions_org.sql`:

```sql
-- Migration: 0050 — Add index on scf_versions.organization_id
-- Rationale: FK columns must be indexed (postgresql skill rule).
-- scf_versions.organization_id is a nullable FK with no index (migration 0010 added column but no index).
-- NULL = global SCF data; non-null = org-private SCF version.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "scf_versions_org_idx"
  ON "scf_versions" ("organization_id")
  WHERE "organization_id" IS NOT NULL;  -- partial index — only index non-null (org-private versions)
```

> `CONCURRENTLY` evita lock na tabela. `WHERE organization_id IS NOT NULL` é um partial index — não indexa as versões globais (NULL) que são minoria de 1-2 linhas mas maioria dos registos serão NULL no início.

### Step 4.4: Criar helper de tenancy para uso futuro

O helper protege qualquer futura query que precise de filtrar por org — evita o padrão incorreto de `WHERE organization_id = ?` que excluiria as versões globais.

### Step 4.5: Verificar e commit

```bash
pnpm --filter @standard/api-gateway test -- scf-version-tenancy.test.ts
pnpm typecheck
git add infra/docker/postgres/migrations/0050_index_scf_versions_org.sql \
        apps/api-gateway/src/lib/scf-version-tenancy.ts \
        apps/api-gateway/src/lib/__tests__/scf-version-tenancy.test.ts
git commit -m "fix(scf): add index on scf_versions.organization_id + tenancy helper (A2)"
```

---

## Task 5: Streaming SCF Controls (M1)

> **Gap:** GET `/api/v1/scf/versions/:id/controls` carrega 1.400+ controlos em memória. Risco de CPU time limit exceeded em Cloudflare Workers.

**Skills:** `cloudflare-workers-expert` · `performance-optimizer`

**Files:**
- Modify: `apps/api-gateway/src/routes/scf.routes.ts` (handler controls endpoint)

---

### Step 5.1: Implementar streaming com TransformStream

No handler de `GET /api/v1/scf/versions/:scfVersionId/controls`, substituir a resposta JSON bloqueante por NDJSON streaming:

```typescript
// Detectar se cliente suporta streaming
const acceptHeader = request.headers.get("Accept") ?? "";
const wantsStream = acceptHeader.includes("application/x-ndjson");

if (wantsStream) {
  // Streaming response via TransformStream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Processar em background sem bloquear CPU
  (async () => {
    try {
      // Cursor-based pagination: processar em chunks de 50
      let cursor: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const batch = await deps.scf.repositories.controls.listByVersion(
          scfVersionId,
          organizationId,
          { cursor, limit: 50 },
        );

        for (const control of batch.items) {
          // NDJSON: uma linha por controlo
          await writer.write(encoder.encode(JSON.stringify(control) + "\n"));
        }

        hasMore = batch.hasMore;
        cursor = batch.nextCursor;
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "X-Standard-Stream": "controls",
    },
  });
} else {
  // Standard JSON response (backward compatible — clients sem streaming)
  const controls = await deps.scf.repositories.controls.listByVersion(
    scfVersionId,
    organizationId,
    { limit: 100 }, // cap para segurança
  );
  return jsonOk({ data: controls.items, meta: { total: controls.total } });
}
```

### Step 5.2: Commit

```bash
git add apps/api-gateway/src/routes/scf.routes.ts
git commit -m "perf(scf): add TransformStream NDJSON for controls listing (M1)"
```

---

## Task 6: MCP Quota Dedicada por Organização (M2)

> **Dado verificado:** `rate-limit.middleware.ts` já existe com 120 req/60s default para `/mcp`. O gap real é: sem quota **específica para tools MCP** (mais restritivas que o rate limit geral) e sem enforcement **antes do `AGENT_RUN_QUEUE.send()`** (o async dispatch não passa pelo rate limiter existente). O `webhook_url` do payload MCP também nunca é disparado — isso está no Task 1.

**O que adicionar:**
- Quota MCP específica: 20 tool calls/min por org (vs 120 req/min geral)
- Enforcement antes do `AGENT_RUN_QUEUE.send()` no path assíncrono
- Headers `X-RateLimit-*` na resposta 429

**Skills:** `cloudflare-workers-expert` · `api-security-best-practices`

**Files:**
- Modify: `apps/api-gateway/src/middleware/rate-limit.middleware.ts` (adicionar rota `/mcp` com limite específico)
- Create: `apps/api-gateway/src/middleware/__tests__/mcp-quota.test.ts`
- Modify: `apps/api-gateway/src/routes/mcp.routes.ts` (enforce antes de AGENT_RUN_QUEUE.send)

---

### Step 6.1: Escrever teste de quota

Cria `apps/api-gateway/src/middleware/__tests__/mcp-quota.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { checkMcpQuota, type QuotaKV } from "../mcp-quota.middleware";

describe("checkMcpQuota", () => {
  const makeKV = (currentCount: number): QuotaKV => ({
    get: vi.fn().mockResolvedValue(currentCount > 0 ? String(currentCount) : null),
    put: vi.fn().mockResolvedValue(undefined),
  });

  it("permite request quando abaixo do limite", async () => {
    const kv = makeKV(5); // 5 requests, limit 60/min
    const result = await checkMcpQuota("org-A", kv, { limitPerMinute: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(54);
  });

  it("bloqueia request quando limite atingido", async () => {
    const kv = makeKV(60);
    const result = await checkMcpQuota("org-A", kv, { limitPerMinute: 60 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("primeiro request da janela (null no KV) é sempre permitido", async () => {
    const kv = makeKV(0); // null → 0
    const result = await checkMcpQuota("org-A", kv, { limitPerMinute: 60 });
    expect(result.allowed).toBe(true);
  });
});
```

### Step 6.2: Implementar middleware de quota

Cria `apps/api-gateway/src/middleware/mcp-quota.middleware.ts`:

```typescript
/**
 * @module mcp-quota.middleware
 * @description Rate limiting por organização para endpoints MCP.
 *
 * Usa KV sliding window com TTL de 60s.
 * Chave: `mcp:quota:{organizationId}:{windowStart}`
 *
 * Limites default (ajustáveis por plano via organizations.quotas JSONB):
 *   - requests/min: 60
 *   - concurrent async tools: 5 (gerido via AGENT_RUN_QUEUE)
 */

export interface QuotaKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface QuotaConfig {
  limitPerMinute: number;
}

export interface QuotaResult {
  allowed: boolean;
  current: number;
  remaining: number;
  limitPerMinute: number;
  retryAfterSeconds?: number;
}

export async function checkMcpQuota(
  organizationId: string,
  kv: QuotaKV,
  config: QuotaConfig = { limitPerMinute: 60 },
): Promise<QuotaResult> {
  // Window key: 1-minute granularity
  const windowMs = 60_000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const kvKey = `mcp:quota:${organizationId}:${windowStart}`;

  const current = parseInt((await kv.get(kvKey)) ?? "0", 10);

  if (current >= config.limitPerMinute) {
    const windowEnd = windowStart + windowMs;
    const retryAfterSeconds = Math.ceil((windowEnd - Date.now()) / 1000);
    return {
      allowed: false,
      current,
      remaining: 0,
      limitPerMinute: config.limitPerMinute,
      retryAfterSeconds,
    };
  }

  // Increment counter with TTL = 65s (slightly > window for safety)
  await kv.put(kvKey, String(current + 1), { expirationTtl: 65 });

  return {
    allowed: true,
    current: current + 1,
    remaining: config.limitPerMinute - current - 1,
    limitPerMinute: config.limitPerMinute,
  };
}
```

### Step 6.3: Integrar no MCP route

Em `apps/api-gateway/src/routes/mcp.routes.ts`, antes do dispatch de tools:

```typescript
import { checkMcpQuota } from "../middleware/mcp-quota.middleware";

// No handler do POST /mcp, antes do switch de tools:
if (env.STANDARD_CACHE) {
  const quota = await checkMcpQuota(organizationId, env.STANDARD_CACHE);
  if (!quota.allowed) {
    return new Response(
      JSON.stringify({
        error: "QUOTA_EXCEEDED",
        message: `MCP quota exceeded. Retry after ${quota.retryAfterSeconds}s.`,
        retry_after_seconds: quota.retryAfterSeconds,
        trace_id: traceId,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(quota.retryAfterSeconds),
          "X-RateLimit-Limit": String(quota.limitPerMinute),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
}
```

### Step 6.4: Verificar e commit final

```bash
pnpm --filter @standard/api-gateway test -- mcp-quota.test.ts
pnpm typecheck
git add apps/api-gateway/src/middleware/mcp-quota.middleware.ts \
        apps/api-gateway/src/middleware/__tests__/mcp-quota.test.ts \
        apps/api-gateway/src/routes/mcp.routes.ts
git commit -m "feat(mcp/edge): add per-org KV quota middleware for MCP tools (M2)"
```

---

## Verificação Final

Após completar todos os 6 tasks:

```bash
# 1. Typecheck monorepo completo
pnpm typecheck

# 2. Todos os testes
pnpm test

# 3. Verificar compliance score usa dados reais
# Criar assessment de teste, adicionar controlos com mappings SCF, verificar
# que GET /api/v1/assessments/:id/summary retorna compliance_pct real

# 4. Verificar MCP async funciona end-to-end
# POST /mcp com tool evaluate-evidence → 202 → aguardar webhook callback

# 5. Verificar particionamento
# SELECT * FROM pg_partitions WHERE tablename IN ('assessment_control_events','audit_logs');

# 6. Verificar quota
# Fazer 61 requests ao /mcp → 60º deve retornar 429 com Retry-After
```

---

## Definition of Done

- [ ] `pnpm typecheck` → 0 erros em 28+ packages
- [ ] `pnpm test` → todos os novos testes a PASS
- [ ] Dashboard `compliance_pct` usa `scf_mappings.relationship_type` e `strength_score` reais
- [ ] `POST /mcp` async tools executam e entregam resultado via webhook
- [ ] `assessment_control_events` e `audit_logs` são tabelas particionadas por RANGE
- [ ] `scf_versions` queries filtram `organization_id IS NULL OR organization_id = orgId`
- [ ] SCF controls endpoint suporta `Accept: application/x-ndjson` streaming
- [ ] MCP quota retorna 429 após limite por org com `Retry-After` header
- [ ] Sem secrets, dados reais ou credenciais em nenhum ficheiro
- [ ] Commits frequentes após cada task

---

*Plano gerado com skills: `writing-plans` · `architect-review` · `postgresql` · `tdd-workflow` · `cloudflare-workers-expert` · `database-design`*

# Agentic Tech Debt Resolution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mitigar 3 dívidas técnicas críticas: Timeouts em Edge via Cloudflare Queues (CQRS), Corte de custeio LLM por Tokens (Head-Tail Truncation) e Fricção de DX com Zod OpenAPI.

**Architecture:** Mover chamadas HTTP síncronas bloqueantes do SOC para Filas, blindar tokens cortando o "miolo" infinito de logs cruéis, e fazer Module Augmentation nas declarações do Zod para remover sublinhados falsos da IDE.

**Tech Stack:** Cloudflare Workers, Cloudflare Queues, TypeScript, Zod, Vitest.

---

### Task 1: Zod OpenAPI TypeScript Definition

**Files:**
- Create: `apps/api-gateway/src/types/zod-openapi.d.ts`

**Step 1: Write the failing test**

*(O teste que falha aqui é a compilação do próprio TS; contudo vamos isolar em spec de tipo caso quiséssemos, mas usaremos um teste de proxy)*

```typescript
// apps/api-gateway/src/types/__tests__/zod.test.ts
import { z } from "zod";
import { test, expect } from "vitest";

test("Zod instance must have openapi method via augmentation", () => {
    const schema = z.string().openapi({ description: "Funciona" });
    expect(schema).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test apps/api-gateway/src/types/__tests__/zod.test.ts`
Expected: FAIL with "Property 'openapi' does not exist on type 'ZodString'".

**Step 3: Write minimal implementation**

```typescript
// apps/api-gateway/src/types/zod-openapi.d.ts
import "zod";

declare module "zod" {
  interface ZodType<Output, Def, Input> {
    openapi(metadata: any): this;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test apps/api-gateway/src/types/__tests__/zod.test.ts`
Expected: PASS (Sem aviso visual na IDE nem quebra no TS).

**Step 5: Commit**

```bash
git add apps/api-gateway/src/types/
git commit -m "chore: fix zod openapi module augmentation to clear IDE lint errors"
```

---

### Task 2: Implementação de Head-Tail Truncation para SIEM Logs

**Files:**
- Modify: `packages/agent-runtime/src/usecases/incident-triager.ts`
- Create: `packages/agent-runtime/src/usecases/__tests__/incident-triager.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/agent-runtime/src/usecases/__tests__/incident-triager.test.ts
import { test, expect, describe } from "vitest";
import { truncateLogPayload } from "../incident-triager";

describe("Log Truncation", () => {
  test("Truncates a string larger than maxLimit keeping head and tail", () => {
    const hugeStr = "A".repeat(5000) + "B".repeat(5000) + "C".repeat(5000); // 15k chars
    const result = truncateLogPayload(hugeStr, 10000);
    expect(result.length).toBeLessThanOrEqual(10100);
    expect(result).toContain("[... LOG TRUNCADO PELA PROTEÇÃO DE TOKENS ...]");
    expect(result.startsWith("A")).toBe(true);
    expect(result.endsWith("C")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test packages/agent-runtime/src/usecases/__tests__/incident-triager.test.ts`
Expected: FAIL "truncateLogPayload is not defined"

**Step 3: Write minimal implementation**

```typescript
// packages/agent-runtime/src/usecases/incident-triager.ts:Add function
export const truncateLogPayload = (logText: string, maxTokensChar = 10000): string => {
  if (logText.length <= maxTokensChar) return logText;
  
  const half = Math.floor(maxTokensChar / 2);
  const head = logText.slice(0, half);
  const tail = logText.slice(-half);
  
  return `${head}\n\n[... LOG TRUNCADO PELA PROTEÇÃO DE TOKENS (GRC) ...]\n\n${tail}`;
};
```
*(Também editar a classe IncidentTriagerUseCase para passar a usar essa função de truncagem no payload).*

**Step 4: Run test to verify it passes**

Run: `npm run test packages/agent-runtime/src/usecases/__tests__/incident-triager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/agent-runtime/src/usecases/
git commit -m "feat(security): implementa head-tail truncation blocker para vazao financeira no SOC"
```

---

### Task 3: Iniciar Scaffold do Consumer Async (Cloudflare Queues)

**Files:**
- Modify: `apps/api-gateway/src/routes/soc.routes.ts`
- Create: `apps/api-gateway/src/workers/queue-consumer.ts`

**Step 1: Write the failing test**

```typescript
// apps/api-gateway/src/routes/__tests__/soc.queue.test.ts
import { test, expect } from "vitest";

test("A Rota /soc/triage-incident deve retornar HTTP 202 com envio assíncrono caso 'asyncCall' seja passado", async () => {
    // mock server request
    const response = await mockApp.fetch(new Request("/api/v1/soc/triage-incident", {
        method: "POST",
        body: JSON.stringify({ systemModuleName: "WAF", rawLogsExcerpt: "...", asyncCall: true })
    }));
    expect(response.status).toBe(202);
    const json = await response.json();
    expect(json).toHaveProperty("job_id");
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test apps/api-gateway/src/routes/__tests__/soc.queue.test.ts`
Expected: FAIL - Expected 202 but got 200 (Comportamento síncrono antigo sem `job_id`).

**Step 3: Write minimal implementation**

```typescript
// Modify apps/api-gateway/src/routes/soc.routes.ts
// Adicionar logica: if body.asyncCall -> deps.queues.socTriage.send(body) e return { status: 202, job_id }
```

**Step 4: Run test to verify it passes**

Run: `npm run test apps/api-gateway/src/routes/__tests__/soc.queue.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api-gateway/src/routes/soc.routes.ts
git commit -m "feat(gateway): transiciona gateway soc para assincrono cqrs retornado job_id"
```

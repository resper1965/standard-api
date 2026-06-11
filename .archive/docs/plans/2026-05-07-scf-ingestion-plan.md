> [!WARNING]
> **[ARCHIVED/LEGACY PLAN]** Este é um plano de execução legado e histórico de fases anteriores do desenvolvimento da plataforma. Ele pode não refletir a arquitetura atenuada atual.

# Data-as-Code SCF Ingestion Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a CLI ingestion pipeline that allows the development team to update the official SCF Catalog using raw Excel workbooks, storing it as versioned normative data in PostgreSQL.

**Architecture:** We will create a CLI tool (`pnpm run db:ingest-scf`) inside `packages/scf-core`. It will use an XLSX parser to read the source documents, generate Drizzle ORM inserts tagged with the `scf_version` (e.g., `2026.1.1`), and execute them within a single atomic database transaction.

**Tech Stack:** Node.js, `xlsx` (or `exceljs`), Drizzle ORM, Zod, PostgreSQL

---

### Task 1: Scaffolding the Ingestion CLI

**Files:**
- Create: `packages/scf-core/src/cli/ingest.ts`
- Modify: `packages/scf-core/package.json:10-15`
- Test: `packages/scf-core/tests/cli.test.ts`

**Step 1: Write the failing test**

```typescript
import { expect, test } from "vitest";

test("CLI rejects execution without valid file path", async () => {
    // Mock the CLI runner and pass null file
    const result = await runCLI([]);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain("Missing required argument: file");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm ---filter scf-core test cli.test.ts`
Expected: FAIL 

**Step 3: Write minimal implementation**

```typescript
// packages/scf-core/src/cli/ingest.ts
export async function runCLI(args: string[]) {
    if (!args[0]) {
        return { exitCode: 1, error: "Missing required argument: file" };
    }
    return { exitCode: 0, error: null };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter scf-core test cli.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/scf-core/src/cli/ingest.ts packages/scf-core/tests/cli.test.ts
git commit -m "feat(scf-core): add cli base for spreadsheet ingestion"
```

### Task 2: Parsing the Workbook
(This and subsequent tasks will involve importing the `xlsx` library, extracting domains, frameworks, and controls, and mapping them to our unified Zod schemas over Drizzle).

**Status:** Deferred to Next Release Version!

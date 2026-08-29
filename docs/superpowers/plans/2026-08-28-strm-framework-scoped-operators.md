# Framework-Scoped STRM Operators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an STRM operator belong to the framework that stated it, so two frameworks sharing a requirement code against the same SCF control no longer share one row and one operator.

**Architecture:** `scf_strm_relationships` gains the focal document it came from (`focal_document`, the bundle filename — always known) and the framework that focal document resolves to (`scf_framework_id`, nullable — resolution can fail and must say so). The unique key widens from `(scf_control_id, fde_code)` to `(scf_control_id, fde_code, focal_document)`, the seeder keys its dedupe and upsert by the same triple, and the backfill joins mappings to bundle rows on the framework as well as the code — grading a mapping only when the matching rows agree on exactly one operator.

**Tech Stack:** PostgreSQL 16 (production) / PGlite 0.5.1 (tests), Drizzle ORM 0.45.2, TypeScript, vitest, hand-written SQL migrations under `infra/docker/postgres/migrations` with a `meta/_journal.json` manifest.

**Spec:** `.superpowers/sdd/2026-08-28-strm-reimport/progress.md` — the ruling under "Final whole-branch review", reproduced verbatim here because that ledger is local and does not travel with the branch:

> the unique index on scf_strm_relationships is (scf_control_id, fde_code) with NO framework column, the seeder dedupes globally on that key with last-entry-wins, and the backfill joins on bare fde_code. Two frameworks that both use a requirement code like 1.1.1 or AC-1 against the same SCF control share ONE row, and whichever of the 183 files was parsed last decides the operator BOTH frameworks are graded with.

Parent plan: `docs/superpowers/plans/2026-08-28-strm-reimport.md`. This plan is the blocker on that plan's Task 7 (the dry run the customer asked for). Task 7 must not run until this one lands.

## Global Constraints

- ADR-001: the only canonical STRM operators are `equal`, `subset`, `intersects`, `superset`, `no_relation`. Never write `direct`, `related`, `intersecting`, `no_relationship` or `source_defined`.
- Absence is representable and must stay representable. `NULL` means "the source did not state an operator we could read". Never default, coerce, or infer one — that fabrication is the entire reason this plan and its parent exist.
- The only source that grades a mapping is the literal `scf_official_strm_bundle_2026.1`, held in the existing `OFFICIAL_SOURCE` constant. Never inline the literal a second time; `packages/schemas/src/__tests__/strm-provenance.test.ts` asserts it appears exactly once in the backfill.
- Every `.sql` file added under `infra/docker/postgres/migrations/` MUST get a `meta/_journal.json` entry in the same commit, or `pnpm check:migrations` fails the build. `.down.sql` files never go in the journal.
- Migrations are hand-written in this repo. Do NOT run `drizzle-kit generate`; write the SQL, then hand-edit `packages/schemas/src/db/scf.schema.ts` to match. The two drifting apart is a known past defect (see migration 0059 vs the schema file, caught in review).
- Verification gate for every task: `pnpm check:migrations && pnpm typecheck && pnpm test:unit` from the repo root.

---

## Context an implementer needs before Task 1

**What a "focal document" is.** The SCF ships the STRM bundle as 183 XLSX files. One file = one focal document = one framework (NIST 800-53, ISO 27001, PCI DSS, …). Inside a file, column "FDE #" holds that framework's own requirement code — `AC-1`, `A.5.1`, `1.1.1`. Those codes are namespaced by the framework and nothing else: `1.1.1` is a real requirement code in CIS, in PCI DSS and in several others. Column "SCF #" holds the SCF control the row maps to.

**Why the current key breaks.** `scf_strm_relationships` is unique on `(scf_control_id, fde_code)`. `(GOV-01, "1.1.1")` from CIS and `(GOV-01, "1.1.1")` from PCI DSS are the same key, so the seeder's dedupe `Map` keeps whichever file `readdir` returned last, and the single surviving row's operator is then handed to both frameworks by the backfill, which joins on bare `fde_code`.

**Where each piece lives.**
- Table + indexes: `packages/schemas/src/db/scf.schema.ts:251-284`
- Seeder: `packages/schemas/src/seed-strm-bundle.ts` (dedupe at :227-263, upsert at :316-355)
- Backfill: `packages/schemas/src/backfill-mapping-strm-operators.ts` (coverage query :93-113, UPDATE :161-172)
- Bundle parser: `packages/scf-core/src/importers/strm-bundle-importer.ts` — `StrmBundleFileResult` (:75-92) already carries `filename` and `framework_name` per file; only `entries` is currently consumed.

**Why `focal_document` is the filename and not the framework name.** The filename is unique per file by construction. `framework_name` is the XLSX sheet name, capped at 31 characters by Excel, and may collide across files. A unique key built on a value that can collide is the defect this plan is fixing, so the key uses the filename. `framework_name` is still used — at seed time only, to resolve the framework — but never stored as the key.

**Why `scf_framework_id` is nullable.** Resolving 183 focal documents onto rows in `scf_frameworks` will not be perfect, and the bundle is not in this repo, so the resolution rate cannot be measured until it arrives. An unresolved row keeps `NULL` and grades nothing. That loses coverage; it never misattributes. Resolution is exact-match only — no fuzzy matching, no "closest name", because a near-match that is wrong reintroduces exactly the cross-framework misattribution being removed.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `infra/docker/postgres/migrations/0060_strm_relationships_focal_document.sql` | Add the two columns, swap the unique key | 1 |
| `infra/docker/postgres/migrations/meta/_journal.json` | Register 0060 so the runner applies it | 1 |
| `packages/schemas/src/db/scf.schema.ts` | Drizzle declaration kept byte-for-byte in step with 0060 | 1 |
| `packages/schemas/src/__tests__/pglite-harness.ts` | Boot a PGlite DB with the real migration chain applied | 1 |
| `packages/schemas/src/__tests__/strm-framework-scope.test.ts` | Prove the key separates frameworks and that the backfill grades per framework | 1, 3 |
| `packages/schemas/src/strm-focal-document.ts` | Pure helpers: dedupe key, framework resolution, unambiguous mapping pick | 2 |
| `packages/schemas/src/__tests__/strm-focal-document.test.ts` | Unit tests for those helpers | 2 |
| `packages/schemas/src/seed-strm-bundle.ts` | Write `focal_document` + resolved `scf_framework_id`; key by the triple | 2 |
| `packages/schemas/src/backfill-mapping-strm-operators.ts` | Framework-scoped join; refuse to grade on disagreement | 3 |

---

### Task 1: The table can hold a framework-scoped operator

**Files:**
- Create: `infra/docker/postgres/migrations/0060_strm_relationships_focal_document.sql`
- Modify: `infra/docker/postgres/migrations/meta/_journal.json` (append one entry)
- Modify: `packages/schemas/src/db/scf.schema.ts:1-12` (imports), `:251-284` (table)
- Modify: `packages/schemas/package.json` (add one devDependency)
- Create: `packages/schemas/src/__tests__/pglite-harness.ts`
- Test: `packages/schemas/src/__tests__/strm-framework-scope.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: two columns on `scf_strm_relationships` — `focal_document text` (nullable) and `scf_framework_id uuid` (nullable, FK to `scf_frameworks.id`); the constraint `scf_strm_control_fde_focal_uidx UNIQUE NULLS NOT DISTINCT (scf_control_id, fde_code, focal_document)`. Drizzle properties: `focalDocument`, `scfFrameworkId`. Exports `makeTestDb(): Promise<{ db, client }>` from `pglite-harness.ts`, used again by Task 3.

- [ ] **Step 1: Add the PGlite devDependency**

`packages/schemas` has no DB-backed test today. It needs one, because the only honest proof that a unique constraint behaves is inserting rows against it.

```bash
cd packages/schemas && pnpm add -D @electric-sql/pglite@0.5.1 && cd ../..
```

The version is pinned in the root `package.json` `pnpm.overrides` at `0.5.1`; do not float it.

- [ ] **Step 2: Write the PGlite harness**

Create `packages/schemas/src/__tests__/pglite-harness.ts`:

```ts
/**
 * Boots an in-memory PGlite database with the real migration chain applied,
 * so a test asserts against the SQL that production actually runs — not against
 * a hand-rolled CREATE TABLE that can drift from it.
 *
 * Mirrors the runner in apps/api-gateway/tests/helpers.ts. Duplicated rather
 * than shared because packages/schemas must not depend on an app.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../db/schema.js";

const migrationsDir = () => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (path.dirname(dir) !== dir) {
    const candidate = path.resolve(dir, "infra/docker/postgres/migrations");
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error("migrations directory not found");
};

export const makeTestDb = async () => {
  const client = new PGlite();
  const dir = migrationsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    // Production-only migrations (pg_partman etc.) opt out with this marker.
    if (sql.includes("-- pglite-skip")) continue;
    for (const chunk of sql.split("--> statement-breakpoint")) {
      if (chunk.trim()) await client.exec(chunk.trim());
    }
  }

  // Drizzle's relational config extractor crashes on non-table exports (the
  // re-exported `z`), so hand it only real objects.
  const filtered = Object.fromEntries(
    Object.entries(schema).filter(
      ([key, value]) =>
        value !== null &&
        typeof value === "object" &&
        Object.getPrototypeOf(value) !== null &&
        key !== "z",
    ),
  );

  return { client, db: drizzle(client, { schema: filtered }) };
};
```

- [ ] **Step 3: Write the failing test**

Create `packages/schemas/src/__tests__/strm-framework-scope.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { makeTestDb } from "./pglite-harness.js";

let ctx: Awaited<ReturnType<typeof makeTestDb>>;

beforeAll(async () => {
  ctx = await makeTestDb();
});
afterAll(async () => {
  await ctx.client.close();
});

describe("scf_strm_relationships is keyed by focal document", () => {
  it("keeps one row per focal document for the same control and FDE code", async () => {
    // Two frameworks really do both use "1.1.1", and both really do map it to
    // the same SCF control. Before this key, the second insert overwrote the
    // first and one operator was served to both.
    const control = "30000000-0000-4000-8000-000000000001";
    // scf_controls.scf_domain_id is NOT NULL, so a domain comes first.
    await ctx.client.exec(`
      INSERT INTO scf_versions (id, version)
        VALUES ('30000000-0000-4000-8000-0000000000ff', '2026.1.1')
        ON CONFLICT DO NOTHING;
      INSERT INTO scf_domains (id, scf_version_id, domain_code, name)
        VALUES ('30000000-0000-4000-8000-0000000000fe', '30000000-0000-4000-8000-0000000000ff', 'GOV', 'Governance')
        ON CONFLICT DO NOTHING;
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${control}', '30000000-0000-4000-8000-0000000000ff', '30000000-0000-4000-8000-0000000000fe', 'GOV-01', 'Synthetic control')
        ON CONFLICT DO NOTHING;
    `);

    await ctx.db.execute(sql`
      INSERT INTO scf_strm_relationships
        (scf_control_id, fde_code, focal_document, relationship_type, source)
      VALUES
        (${control}, '1.1.1', 'cis-v8.xlsx',  'equal',  'scf_official_strm_bundle_2026.1'),
        (${control}, '1.1.1', 'pci-dss.xlsx', 'subset', 'scf_official_strm_bundle_2026.1')
    `);

    const rows = (await ctx.db.execute(sql`
      SELECT focal_document, relationship_type
        FROM scf_strm_relationships
       WHERE scf_control_id = ${control} AND fde_code = '1.1.1'
       ORDER BY focal_document
    `)) as unknown as Array<{
      focal_document: string;
      relationship_type: string;
    }>;

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      focal_document: "cis-v8.xlsx",
      relationship_type: "equal",
    });
    expect(rows[1]).toMatchObject({
      focal_document: "pci-dss.xlsx",
      relationship_type: "subset",
    });
  });

  it("still collapses two rows from the same focal document", async () => {
    const control = "30000000-0000-4000-8000-000000000002";
    await ctx.client.exec(`
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${control}', '30000000-0000-4000-8000-0000000000ff', '30000000-0000-4000-8000-0000000000fe', 'GOV-02', 'Synthetic control 2')
        ON CONFLICT DO NOTHING;
    `);

    await ctx.db.execute(sql`
      INSERT INTO scf_strm_relationships
        (scf_control_id, fde_code, focal_document, relationship_type, source)
      VALUES (${control}, 'AC-1', 'nist-800-53.xlsx', 'equal', 'scf_official_strm_bundle_2026.1')
    `);
    await ctx.db.execute(sql`
      INSERT INTO scf_strm_relationships
        (scf_control_id, fde_code, focal_document, relationship_type, source)
      VALUES (${control}, 'AC-1', 'nist-800-53.xlsx', 'subset', 'scf_official_strm_bundle_2026.1')
      ON CONFLICT (scf_control_id, fde_code, focal_document)
      DO UPDATE SET relationship_type = EXCLUDED.relationship_type
    `);

    const rows = (await ctx.db.execute(sql`
      SELECT relationship_type FROM scf_strm_relationships
       WHERE scf_control_id = ${control} AND fde_code = 'AC-1'
    `)) as unknown as Array<{ relationship_type: string }>;

    expect(rows).toHaveLength(1);
    expect(rows[0]?.relationship_type).toBe("subset");
  });

  it("treats two NULL focal documents as the same row", async () => {
    // Rows predating this migration have no focal document. NULLS NOT DISTINCT
    // keeps their behaviour exactly as it was rather than letting them multiply.
    const control = "30000000-0000-4000-8000-000000000003";
    await ctx.client.exec(`
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${control}', '30000000-0000-4000-8000-0000000000ff', '30000000-0000-4000-8000-0000000000fe', 'GOV-03', 'Synthetic control 3')
        ON CONFLICT DO NOTHING;
    `);

    await ctx.db.execute(sql`
      INSERT INTO scf_strm_relationships (scf_control_id, fde_code, relationship_type, source)
      VALUES (${control}, 'X-1', 'equal', 'inferred_structural_analysis')
    `);

    await expect(
      ctx.db.execute(sql`
        INSERT INTO scf_strm_relationships (scf_control_id, fde_code, relationship_type, source)
        VALUES (${control}, 'X-1', 'subset', 'inferred_structural_analysis')
      `),
    ).rejects.toThrow(/unique|duplicate/i);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @standard/schemas test strm-framework-scope`
Expected: FAIL — `column "focal_document" of relation "scf_strm_relationships" does not exist`.

- [ ] **Step 5: Write migration 0060**

Create `infra/docker/postgres/migrations/0060_strm_relationships_focal_document.sql`:

```sql
-- Migration: 0060 — scf_strm_relationships is keyed by focal document
-- Date: 2026-08-29
--
-- Rationale:
--   The unique key was (scf_control_id, fde_code). An FDE code is a requirement
--   code inside ONE focal document and is namespaced by nothing else: "1.1.1"
--   is a real code in CIS, in PCI DSS and in several more. Two frameworks
--   mapping their own "1.1.1" to the same SCF control therefore collided on one
--   row, and whichever of the 183 bundle files was parsed last decided the
--   operator that BOTH frameworks were then graded with.
--
--   focal_document records which bundle file the row came from — the filename,
--   which is unique per framework by construction. The sheet name is not used:
--   Excel caps it at 31 characters, so it can collide, and a key that can
--   collide is the defect being fixed.
--
--   scf_framework_id is the framework that focal document resolves to. It is
--   nullable on purpose: resolution is exact-match only and will not cover
--   every file. An unresolved row grades nothing, which loses coverage and
--   misattributes nothing. A fuzzy match would do the reverse.
--
--   NULLS NOT DISTINCT keeps pre-existing rows — which have no focal document —
--   behaving exactly as they did under the old two-column key, instead of
--   letting them multiply once the third column is nullable.
--
-- Reversibility:
--   Reversible only by choosing which framework's operator to discard for every
--   collided pair, which is the fabrication this migration exists to end.
--   Down is deliberately absent.

ALTER TABLE scf_strm_relationships
  ADD COLUMN focal_document  text,
  ADD COLUMN scf_framework_id uuid REFERENCES scf_frameworks(id);

--> statement-breakpoint

DROP INDEX IF EXISTS scf_strm_control_fde_uidx;

--> statement-breakpoint

ALTER TABLE scf_strm_relationships
  ADD CONSTRAINT scf_strm_control_fde_focal_uidx
  UNIQUE NULLS NOT DISTINCT (scf_control_id, fde_code, focal_document);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS scf_strm_framework_idx
  ON scf_strm_relationships (scf_framework_id);

--> statement-breakpoint

COMMENT ON COLUMN scf_strm_relationships.focal_document IS
  'Bundle file this row was parsed from — one file per framework. Part of the unique key: an FDE code is only unique within its focal document. NULL means the row predates the STRM bundle seeder.';

COMMENT ON COLUMN scf_strm_relationships.scf_framework_id IS
  'Framework the focal document resolved to, exact-match only. NULL means unresolved; an unresolved row grades no mapping. Never guessed.';
```

- [ ] **Step 6: Register 0060 in the journal**

In `infra/docker/postgres/migrations/meta/_journal.json`, append after the `idx: 50` entry:

```json
    {
      "idx": 51,
      "version": "7",
      "when": 1788048000000,
      "tag": "0060_strm_relationships_focal_document",
      "breakpoints": true
    }
```

`when` must exceed the previous entry's `1787961600000`; the value above is exactly one day later. Mind the comma after the `idx: 50` object's closing brace.

- [ ] **Step 7: Verify the journal**

Run: `pnpm check:migrations`
Expected: PASS, reporting 52 journal entries / 9 exceptions / 61 on disk (one more than the previous 51/9/60).

- [ ] **Step 8: Bring the Drizzle schema in step with 0060**

Migration 0059 shipped without its schema-file half and the next task's typecheck caught it. Do not repeat that.

In `packages/schemas/src/db/scf.schema.ts`, add `unique` to the `drizzle-orm/pg-core` import list (alphabetical, after `text`):

```ts
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
```

Then, in the `scfStrmRelationships` table, add the two columns after `fdeName` (`:264`):

```ts
    /** Human-readable name of the FDE requirement. */
    fdeName: text("fde_name"),
    /** Bundle file this row came from — one file per framework. Part of the
     *  unique key: an FDE code is only unique inside its focal document.
     *  NULL means the row predates the STRM bundle seeder (0060). */
    focalDocument: text("focal_document"),
    /** Framework the focal document resolved to, exact-match only. NULL means
     *  unresolved, and an unresolved row grades no mapping (0060). */
    scfFrameworkId: uuid("scf_framework_id").references(() => scfFrameworks.id),
```

and replace the `uniqueIndex` in the table's index list (`:279-282`) with:

```ts
    index("scf_strm_framework_idx").on(table.scfFrameworkId),
    // 0060: UNIQUE NULLS NOT DISTINCT — pre-0060 rows have no focal document
    // and must keep collapsing on (control, fde) as they did before.
    // `.nullsNotDistinct()` exists on unique() and NOT on uniqueIndex(), which
    // is why this is a constraint rather than an index.
    unique("scf_strm_control_fde_focal_uidx")
      .on(table.scfControlId, table.fdeCode, table.focalDocument)
      .nullsNotDistinct(),
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm --filter @standard/schemas test strm-framework-scope`
Expected: PASS, 3 tests.

- [ ] **Step 10: Run the full gate**

Run: `pnpm check:migrations && pnpm typecheck && pnpm test:unit`
Expected: all PASS.

- [ ] **Step 11: Commit**

```bash
git add infra/docker/postgres/migrations/0060_strm_relationships_focal_document.sql \
        infra/docker/postgres/migrations/meta/_journal.json \
        packages/schemas/src/db/scf.schema.ts \
        packages/schemas/src/__tests__/pglite-harness.ts \
        packages/schemas/src/__tests__/strm-framework-scope.test.ts \
        packages/schemas/package.json pnpm-lock.yaml
git commit -m "feat(schemas): 0060 — STRM rows are keyed by focal document

An FDE code is unique only inside its focal document. Keyed on
(scf_control_id, fde_code) alone, two frameworks using the same requirement
code against the same SCF control shared one row, and the last bundle file
parsed decided the operator both were graded with."
```

If `pnpm-lock.yaml` is unchanged, drop it from the command.

---

### Task 2: The seeder records which focal document each row came from

**Files:**
- Create: `packages/schemas/src/strm-focal-document.ts`
- Modify: `packages/schemas/src/seed-strm-bundle.ts:1-36` (imports/docblock), `:211-263` (row build), `:316-355` (upsert), `:272-292` (reporting)
- Test: `packages/schemas/src/__tests__/strm-focal-document.test.ts`

**Interfaces:**
- Consumes: Task 1's `focalDocument` / `scfFrameworkId` columns and the three-column conflict target.
- Produces, from `packages/schemas/src/strm-focal-document.ts`:
  - `strmDedupeKey(controlId: string, fdeCode: string, focalDocument: string): string`
  - `normaliseFrameworkKey(raw: string): string`
  - `resolveFrameworkId(frameworkName: string, byName: Map<string, string>): string | null`
  - `pickUnambiguousMappingId(mappingIds: readonly string[] | undefined): string | null`

- [ ] **Step 1: Write the failing test**

Create `packages/schemas/src/__tests__/strm-focal-document.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  strmDedupeKey,
  normaliseFrameworkKey,
  resolveFrameworkId,
  pickUnambiguousMappingId,
} from "../strm-focal-document.js";

describe("strmDedupeKey", () => {
  it("separates the same code in two focal documents", () => {
    expect(strmDedupeKey("ctrl-1", "1.1.1", "cis-v8.xlsx")).not.toBe(
      strmDedupeKey("ctrl-1", "1.1.1", "pci-dss.xlsx"),
    );
  });

  it("collapses the same code in the same focal document, case and space insensitively", () => {
    expect(strmDedupeKey("ctrl-1", " AC-1 ", "nist.xlsx")).toBe(
      strmDedupeKey("ctrl-1", "ac-1", "nist.xlsx"),
    );
  });
});

describe("resolveFrameworkId", () => {
  const byName = new Map([
    [normaliseFrameworkKey("ISO 27001:2022"), "fw-iso"],
    [normaliseFrameworkKey("NIST SP 800-53 R5"), "fw-nist"],
  ]);

  it("resolves an exact name, ignoring case and surrounding space", () => {
    expect(resolveFrameworkId("  iso 27001:2022 ", byName)).toBe("fw-iso");
  });

  it("returns null rather than guessing at a near miss", () => {
    // "NIST SP 800-53" is a prefix of a real entry. A fuzzy matcher would
    // return fw-nist and reintroduce exactly the misattribution 0060 removed.
    expect(resolveFrameworkId("NIST SP 800-53", byName)).toBe(null);
    expect(resolveFrameworkId("", byName)).toBe(null);
  });
});

describe("pickUnambiguousMappingId", () => {
  it("returns the id when exactly one mapping exists", () => {
    expect(pickUnambiguousMappingId(["m1"])).toBe("m1");
  });

  it("returns null when several exist", () => {
    // The seeder used to take [0] here — an arbitrary requirement's mapping
    // attached to a different requirement's STRM row.
    expect(pickUnambiguousMappingId(["m1", "m2"])).toBe(null);
    expect(pickUnambiguousMappingId([])).toBe(null);
    expect(pickUnambiguousMappingId(undefined)).toBe(null);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @standard/schemas test strm-focal-document`
Expected: FAIL — `Cannot find module '../strm-focal-document.js'`.

- [ ] **Step 3: Write the helpers**

Create `packages/schemas/src/strm-focal-document.ts`:

```ts
/**
 * Focal-document helpers for the STRM bundle seeder.
 *
 * Extracted from seed-strm-bundle.ts so the keying and resolution rules can be
 * tested without a 40MB bundle and a seeded catalogue behind them.
 */

/**
 * The dedupe/upsert key, matching migration 0060's unique constraint:
 * (scf_control_id, fde_code, focal_document). fde_code is normalised the way
 * the seeder always normalised it; focal_document is a filename and is
 * compared as-is apart from case, because the filesystem gave it to us.
 */
export const strmDedupeKey = (
  controlId: string,
  fdeCode: string,
  focalDocument: string,
): string =>
  `${controlId}||${fdeCode.trim().toLowerCase()}||${focalDocument.trim().toLowerCase()}`;

/** Collapses case and whitespace runs so "ISO  27001" and "iso 27001" agree. */
export const normaliseFrameworkKey = (raw: string): string =>
  raw.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Exact match only. A focal document that does not name a framework we hold
 * resolves to null, and a null-framework row grades no mapping.
 *
 * ⛔ Do not add prefix, substring or edit-distance matching here. "NIST SP
 * 800-53" is a prefix of "NIST SP 800-53 R5" and of "NIST SP 800-53 R4"; a
 * matcher that picks one is guessing which framework a customer is graded
 * against, which is the failure migration 0060 exists to end.
 */
export const resolveFrameworkId = (
  frameworkName: string,
  byName: Map<string, string>,
): string | null => {
  const key = normaliseFrameworkKey(frameworkName);
  if (!key) return null;
  return byName.get(key) ?? null;
};

/**
 * scf_mapping_id is a backward-compat convenience, not the join the backfill
 * uses. It used to be set to `list[0]` — an arbitrary pick among every mapping
 * sharing the control, which attaches one requirement's mapping to another
 * requirement's STRM row. One candidate or nothing.
 */
export const pickUnambiguousMappingId = (
  mappingIds: readonly string[] | undefined,
): string | null => (mappingIds?.length === 1 ? mappingIds[0]! : null);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @standard/schemas test strm-focal-document`
Expected: PASS, 6 tests.

- [ ] **Step 5: Load the framework lookup in the seeder**

In `packages/schemas/src/seed-strm-bundle.ts`, add to the imports at `:32-35`:

```ts
import {
  strmDedupeKey,
  normaliseFrameworkKey,
  resolveFrameworkId,
  pickUnambiguousMappingId,
} from "./strm-focal-document.js";
```

Then, immediately after the mapping lookup block ends at `:205` (`console.log(\`     Mappings loaded: ...\`)`), insert:

```ts
    // ── 4b. Framework lookup, for resolving each file's focal document ──
    const frameworkRows = await db
      .select({
        id: schema.scfFrameworks.id,
        name: schema.scfFrameworks.name,
      })
      .from(schema.scfFrameworks);

    const frameworkByName = new Map<string, string>(
      frameworkRows.map((f) => [normaliseFrameworkKey(f.name), f.id]),
    );
    console.log(`     Frameworks loaded: ${frameworkByName.size}`);
```

- [ ] **Step 6: Key the dedupe by the focal document**

Replace the `UpsertRow` type and the dedupe loop (`:211-263`) with:

```ts
    type UpsertRow = {
      scf_control_id: string;
      fde_code: string;
      fde_name: string;
      /** Bundle file this row came from — part of the 0060 unique key. */
      focal_document: string;
      /** Framework the focal document resolved to; null = unresolved. */
      scf_framework_id: string | null;
      /** null = source operator unreadable; kept, not coerced to intersects */
      relationship_type: string | null;
      /** Computed once here, reused at the insert site instead of recomputed. */
      relationship_type_canonical: StrmOperator | null;
      /** Set when the source operator could not be canonicalised. */
      operator_unrecognised: boolean;
      strength_raw: number;
      rationale: string | null;
      source: string;
      scf_mapping_id: string | null;
    };

    // Deduplicate by (scf_control_id, fde_code, focal_document) — 0060's key.
    // An FDE code is unique only inside its focal document, so keying without
    // it made the last file parsed overwrite every earlier framework's operator.
    const deduped = new Map<string, UpsertRow>();
    let noControl = 0;
    const unknownControls = new Set<string>();
    const unresolvedFocalDocuments = new Set<string>();

    for (const file of summary.files) {
      const frameworkId = resolveFrameworkId(
        file.framework_name,
        frameworkByName,
      );
      if (!frameworkId) unresolvedFocalDocuments.add(file.filename);

      for (const entry of file.entries) {
        const controlId = controlCodeToId.get(
          entry.scf_code.trim().toUpperCase(),
        );
        if (!controlId) {
          noControl++;
          unknownControls.add(entry.scf_code);
          continue;
        }

        const canonical = toCanonicalOperator(entry.relationship_type);

        deduped.set(strmDedupeKey(controlId, entry.fde_code, file.filename), {
          scf_control_id: controlId,
          fde_code: entry.fde_code.trim(),
          fde_name: entry.fde_name.trim(),
          focal_document: file.filename,
          scf_framework_id: frameworkId,
          relationship_type: entry.relationship_type,
          relationship_type_canonical: canonical,
          operator_unrecognised: canonical === null,
          strength_raw: entry.strength_raw,
          rationale: entry.strm_rationale || null,
          source: SOURCE_LABEL,
          scf_mapping_id: pickUnambiguousMappingId(
            ctrlToMappingIds.get(controlId),
          ),
        });
      }
    }
```

- [ ] **Step 7: Report the resolution rate**

After the `Unrecognised op:` block ends at `:292`, insert:

```ts
    const resolvedRows = rows.filter((r) => r.scf_framework_id !== null).length;
    console.log(
      `     Framework resolved: ${resolvedRows.toLocaleString()} of ${rows.length.toLocaleString()} rows`,
    );
    if (unresolvedFocalDocuments.size > 0) {
      console.log(
        `     Unresolved files:   ${unresolvedFocalDocuments.size} — these grade NO mapping.`,
      );
      for (const f of [...unresolvedFocalDocuments].slice(0, 15)) {
        console.log(`       ${f}`);
      }
      console.log(
        "     Resolution is exact-match on scf_frameworks.name. Fix the name in",
      );
      console.log(
        "     the catalogue; never widen the matcher to close the gap.",
      );
    }
```

- [ ] **Step 8: Write the new columns and widen the conflict target**

In the batch insert (`:321-339`), add two properties after `fdeName`:

```ts
            fdeName: row.fde_name,
            focalDocument: row.focal_document,
            scfFrameworkId: row.scf_framework_id,
```

and replace the `onConflictDoUpdate` block (`:341-355`) with:

```ts
        .onConflictDoUpdate({
          // 0060: the key includes the focal document. Without it this upsert
          // was the write half of the cross-framework overwrite.
          target: [
            schema.scfStrmRelationships.scfControlId,
            schema.scfStrmRelationships.fdeCode,
            schema.scfStrmRelationships.focalDocument,
          ],
          set: {
            fdeName: sql`EXCLUDED.fde_name`,
            scfFrameworkId: sql`EXCLUDED.scf_framework_id`,
            scfMappingId: sql`EXCLUDED.scf_mapping_id`,
            relationshipType: sql`EXCLUDED.relationship_type`,
            strengthScore: sql`EXCLUDED.strength_score`,
            rationale: sql`EXCLUDED.rationale`,
            source: sql`EXCLUDED.source`,
            updatedAt: new Date(),
          },
        });
```

- [ ] **Step 9: Update the seeder's docblock**

Replace lines 8-16 of `packages/schemas/src/seed-strm-bundle.ts` with:

```
 * Estratégia (sem dependência de scf_framework_requirements):
 *   Para cada entry do bundle (fde_code, scf_code, relationship_type):
 *     1. Resolve scf_control_id via control_code ILIKE scf_code
 *     2. Registra o focal document (nome do arquivo XLSX — um por framework) e
 *        resolve o framework por nome exato; não resolvido fica NULL
 *     3. Upsert em (scf_control_id, fde_code, focal_document) — a chave da 0060
 *
 * Um FDE code só é único dentro do seu focal document: "1.1.1" existe no CIS e
 * no PCI DSS. Sem o focal document na chave, o último dos 183 arquivos lido
 * sobrescrevia o operador de todos os frameworks anteriores.
```

- [ ] **Step 10: Verify**

Run: `pnpm --filter @standard/schemas typecheck && pnpm --filter @standard/schemas test`
Expected: PASS. (The seeder itself needs `DATABASE_URL` and the bundle, so it is not executed here — Task 3's integration test covers the write path's shape, and the parent plan's Task 7 runs it for real.)

- [ ] **Step 11: Commit**

```bash
git add packages/schemas/src/strm-focal-document.ts \
        packages/schemas/src/__tests__/strm-focal-document.test.ts \
        packages/schemas/src/seed-strm-bundle.ts
git commit -m "fix(schemas): seeder keys STRM rows by focal document

Dedupe and upsert now use (control, fde_code, focal_document), so the last of
the 183 bundle files parsed no longer overwrites every earlier framework's
operator. scf_mapping_id is set only when exactly one mapping matches the
control, instead of an arbitrary first."
```

---

### Task 3: The backfill grades a mapping with its own framework's operator

**Files:**
- Modify: `packages/schemas/src/backfill-mapping-strm-operators.ts:18-38` (docblock), `:63-73` (CoverageRow), `:93-113` (coverage query), `:124-154` (report), `:161-176` (UPDATE)
- Test: `packages/schemas/src/__tests__/strm-framework-scope.test.ts` (append a describe block)
- Modify: `docs/superpowers/plans/2026-08-28-strm-reimport.md` (Task 7 gate)

**Interfaces:**
- Consumes: Task 1's `scf_framework_id` column, Task 2's population of it.
- Produces: no new exports. `CoverageRow` gains `ambiguous: number` and `unresolved: number`.

- [ ] **Step 1: Write the failing test**

Append to `packages/schemas/src/__tests__/strm-framework-scope.test.ts`:

```ts
describe("the backfill grades per framework", () => {
  it("gives each framework the operator its own focal document stated", async () => {
    // Two frameworks, both with a requirement coded "1.1.1", both mapped to the
    // same SCF control, and the bundle states a DIFFERENT operator for each.
    // Before 0060 this was one row and both frameworks got one operator.
    const v = "40000000-0000-4000-8000-0000000000ff";
    const ctrl = "40000000-0000-4000-8000-000000000001";
    const fwA = "40000000-0000-4000-8000-00000000000a";
    const fwB = "40000000-0000-4000-8000-00000000000b";
    const reqA = "40000000-0000-4000-8000-0000000000a1";
    const reqB = "40000000-0000-4000-8000-0000000000b1";
    const mapA = "40000000-0000-4000-8000-0000000000a2";
    const mapB = "40000000-0000-4000-8000-0000000000b2";

    const dom = "40000000-0000-4000-8000-0000000000fe";

    // scf_mappings has NO framework column — the framework reaches it through
    // scf_framework_requirements, which is exactly why the backfill has to join
    // through r to know which framework a mapping belongs to.
    await ctx.client.exec(`
      INSERT INTO scf_versions (id, version) VALUES ('${v}', '2026.1.2');
      INSERT INTO scf_domains (id, scf_version_id, domain_code, name)
        VALUES ('${dom}', '${v}', 'GOV', 'Governance');
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${ctrl}', '${v}', '${dom}', 'GOV-10', 'Shared control');
      INSERT INTO scf_frameworks (id, scf_version_id, framework_id, name)
        VALUES ('${fwA}', '${v}', 'cis-v8', 'CIS Controls v8'),
               ('${fwB}', '${v}', 'pci-dss-4', 'PCI DSS 4.0');
      INSERT INTO scf_framework_requirements
        (id, scf_version_id, scf_framework_id, requirement_code, fde_code, title)
        VALUES ('${reqA}', '${v}', '${fwA}', '1.1.1', '1.1.1', 'CIS 1.1.1'),
               ('${reqB}', '${v}', '${fwB}', '1.1.1', '1.1.1', 'PCI 1.1.1');
      INSERT INTO scf_mappings
        (id, scf_version_id, scf_framework_requirement_id, scf_control_id)
        VALUES ('${mapA}', '${v}', '${reqA}', '${ctrl}'),
               ('${mapB}', '${v}', '${reqB}', '${ctrl}');
      INSERT INTO scf_strm_relationships
        (scf_control_id, scf_framework_id, fde_code, focal_document, relationship_type, source)
        VALUES ('${ctrl}', '${fwA}', '1.1.1', 'cis-v8.xlsx',  'equal',
                'scf_official_strm_bundle_2026.1'),
               ('${ctrl}', '${fwB}', '1.1.1', 'pci-dss.xlsx', 'superset',
                'scf_official_strm_bundle_2026.1');
    `);

    await ctx.db.execute(sql`
      WITH graded AS (
        SELECT m.id AS mapping_id,
               MIN(s.relationship_type::text) AS op
          FROM scf_mappings m
          JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
          JOIN scf_strm_relationships s
            ON s.scf_control_id   = m.scf_control_id
           AND s.fde_code         = r.fde_code
           AND s.scf_framework_id = r.scf_framework_id
           AND s.source           = 'scf_official_strm_bundle_2026.1'
           AND s.relationship_type IS NOT NULL
         GROUP BY m.id
        HAVING COUNT(DISTINCT s.relationship_type) = 1
      )
      UPDATE scf_mappings m
         SET relationship_type = g.op::strm_operator
        FROM graded g
       WHERE m.id = g.mapping_id
    `);

    const rows = (await ctx.db.execute(sql`
      SELECT id, relationship_type FROM scf_mappings
       WHERE id IN (${mapA}, ${mapB}) ORDER BY id
    `)) as unknown as Array<{ id: string; relationship_type: string }>;

    const byId = new Map(rows.map((r) => [r.id, r.relationship_type]));
    expect(byId.get(mapA)).toBe("equal");
    expect(byId.get(mapB)).toBe("superset");
  });

  it("refuses to grade when two bundle rows disagree for one framework", async () => {
    // Two focal documents can resolve to the SAME framework (two editions of
    // one file). If they disagree, picking either is a coin flip presented as
    // a measurement, so the mapping stays NULL.
    const v = "50000000-0000-4000-8000-0000000000ff";
    const ctrl = "50000000-0000-4000-8000-000000000001";
    const fw = "50000000-0000-4000-8000-00000000000a";
    const req = "50000000-0000-4000-8000-0000000000a1";
    const map = "50000000-0000-4000-8000-0000000000a2";

    const dom = "50000000-0000-4000-8000-0000000000fe";

    await ctx.client.exec(`
      INSERT INTO scf_versions (id, version) VALUES ('${v}', '2026.1.3');
      INSERT INTO scf_domains (id, scf_version_id, domain_code, name)
        VALUES ('${dom}', '${v}', 'GOV', 'Governance');
      INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title)
        VALUES ('${ctrl}', '${v}', '${dom}', 'GOV-20', 'Ambiguous control');
      INSERT INTO scf_frameworks (id, scf_version_id, framework_id, name)
        VALUES ('${fw}', '${v}', 'dupe', 'Duplicated Framework');
      INSERT INTO scf_framework_requirements
        (id, scf_version_id, scf_framework_id, requirement_code, fde_code, title)
        VALUES ('${req}', '${v}', '${fw}', 'AC-1', 'AC-1', 'AC-1');
      INSERT INTO scf_mappings
        (id, scf_version_id, scf_framework_requirement_id, scf_control_id)
        VALUES ('${map}', '${v}', '${req}', '${ctrl}');
      INSERT INTO scf_strm_relationships
        (scf_control_id, scf_framework_id, fde_code, focal_document, relationship_type, source)
        VALUES ('${ctrl}', '${fw}', 'AC-1', 'dupe-2025.xlsx', 'equal',
                'scf_official_strm_bundle_2026.1'),
               ('${ctrl}', '${fw}', 'AC-1', 'dupe-2026.xlsx', 'subset',
                'scf_official_strm_bundle_2026.1');
    `);

    await ctx.db.execute(sql`
      WITH graded AS (
        SELECT m.id AS mapping_id, MIN(s.relationship_type::text) AS op
          FROM scf_mappings m
          JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
          JOIN scf_strm_relationships s
            ON s.scf_control_id   = m.scf_control_id
           AND s.fde_code         = r.fde_code
           AND s.scf_framework_id = r.scf_framework_id
           AND s.source           = 'scf_official_strm_bundle_2026.1'
           AND s.relationship_type IS NOT NULL
         GROUP BY m.id
        HAVING COUNT(DISTINCT s.relationship_type) = 1
      )
      UPDATE scf_mappings m
         SET relationship_type = g.op::strm_operator
        FROM graded g
       WHERE m.id = g.mapping_id
    `);

    const rows = (await ctx.db.execute(sql`
      SELECT relationship_type FROM scf_mappings WHERE id = ${map}
    `)) as unknown as Array<{ relationship_type: string | null }>;

    expect(rows[0]?.relationship_type).toBe(null);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @standard/schemas test strm-framework-scope`
Expected: the first new test FAILS — with no `scf_framework_id` written by these inserts the join finds nothing, so both mappings stay `null` rather than `equal`/`superset`. If it passes at this point, the inserts are wrong; the test must exercise the new column.

(The SQL in the test is deliberately the same statement Step 4 puts in the backfill. It is repeated rather than imported because the backfill is a CLI script with a `main()`; extracting the query into a module for one test is the abstraction this codebase does not need. Keep the two in step by hand — Step 5 adds the guard that catches drift.)

- [ ] **Step 3: Scope the coverage query to the framework**

In `packages/schemas/src/backfill-mapping-strm-operators.ts`, extend the `CoverageRow` type (`:63-73`):

```ts
type CoverageRow = {
  framework_id: string;
  framework_name: string;
  total: number;
  graded: number;
  /** Mappings whose bundle rows disagree — deliberately left ungraded. */
  ambiguous: number;
  /** Bundle rows matching on code but whose focal document never resolved. */
  unresolved: number;
  equal: number;
  subset: number;
  superset: number;
  intersects: number;
  no_relation: number;
};
```

and replace the coverage query (`:93-113`) with:

```ts
    const coverage = (await db.execute(sql`
      WITH matched AS (
        SELECT m.id AS mapping_id,
               f.framework_id,
               f.name AS framework_name,
               COUNT(s.relationship_type)          AS hits,
               COUNT(DISTINCT s.relationship_type) AS variants,
               MIN(s.relationship_type::text)      AS op,
               COUNT(u.id)                         AS unresolved_hits
          FROM scf_mappings m
          JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
          JOIN scf_frameworks f             ON r.scf_framework_id = f.id
          LEFT JOIN scf_strm_relationships s
            ON s.scf_control_id   = m.scf_control_id
           AND s.fde_code         = r.fde_code
           AND s.scf_framework_id = r.scf_framework_id
           AND s.source           = ${OFFICIAL_SOURCE}
          LEFT JOIN scf_strm_relationships u
            ON u.scf_control_id   = m.scf_control_id
           AND u.fde_code         = r.fde_code
           AND u.scf_framework_id IS NULL
           AND u.source           = ${OFFICIAL_SOURCE}
         GROUP BY m.id, f.framework_id, f.name
      )
      SELECT
        framework_id,
        framework_name,
        COUNT(*)::int                                              AS total,
        COUNT(*) FILTER (WHERE variants = 1)::int                  AS graded,
        COUNT(*) FILTER (WHERE variants > 1)::int                  AS ambiguous,
        COUNT(*) FILTER (WHERE hits = 0 AND unresolved_hits > 0)::int AS unresolved,
        COUNT(*) FILTER (WHERE variants = 1 AND op = 'equal')::int       AS equal,
        COUNT(*) FILTER (WHERE variants = 1 AND op = 'subset')::int      AS subset,
        COUNT(*) FILTER (WHERE variants = 1 AND op = 'superset')::int    AS superset,
        COUNT(*) FILTER (WHERE variants = 1 AND op = 'intersects')::int  AS intersects,
        COUNT(*) FILTER (WHERE variants = 1 AND op = 'no_relation')::int AS no_relation
      FROM matched
      GROUP BY framework_id, framework_name
      ORDER BY COUNT(*) FILTER (WHERE variants = 1) DESC, COUNT(*) DESC
    `)) as unknown as CoverageRow[];
```

- [ ] **Step 4: Scope the UPDATE the same way**

Replace the UPDATE (`:161-172`) with:

```ts
    const updated = await db.execute(sql`
      WITH graded AS (
        SELECT m.id AS mapping_id,
               MIN(s.relationship_type::text) AS op
          FROM scf_mappings m
          JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
          JOIN scf_strm_relationships s
            ON s.scf_control_id   = m.scf_control_id
           AND s.fde_code         = r.fde_code
           AND s.scf_framework_id = r.scf_framework_id
           AND s.source           = ${OFFICIAL_SOURCE}
           AND s.relationship_type IS NOT NULL
         GROUP BY m.id
        HAVING COUNT(DISTINCT s.relationship_type) = 1
      )
      UPDATE scf_mappings m
         SET relationship_type = g.op::strm_operator,
             updated_at = now()
        FROM graded g
       WHERE m.id = g.mapping_id
         AND m.relationship_type IS DISTINCT FROM g.op::strm_operator
    `);
```

- [ ] **Step 5: Report ambiguity and unresolved coverage**

Replace the report block (`:124-154`) with:

```ts
    const totals = coverage.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        graded: acc.graded + r.graded,
        ambiguous: acc.ambiguous + r.ambiguous,
        unresolved: acc.unresolved + r.unresolved,
        satisfying: acc.satisfying + r.equal + r.subset,
      }),
      { total: 0, graded: 0, ambiguous: 0, unresolved: 0, satisfying: 0 },
    );

    console.log("Coverage by framework (frameworks with any graded mapping):");
    console.log(
      "  framework".padEnd(44) +
        "total".padStart(9) +
        "graded".padStart(9) +
        "ambig".padStart(8) +
        "unres".padStart(8) +
        "equal".padStart(8) +
        "subset".padStart(8) +
        "superset".padStart(10),
    );
    for (const r of coverage.filter((row) => row.graded > 0)) {
      console.log(
        `  ${r.framework_id} ${r.framework_name}`.slice(0, 43).padEnd(44) +
          String(r.total).padStart(9) +
          String(r.graded).padStart(9) +
          String(r.ambiguous).padStart(8) +
          String(r.unresolved).padStart(8) +
          String(r.equal).padStart(8) +
          String(r.subset).padStart(8) +
          String(r.superset).padStart(10),
      );
    }

    const ungraded = coverage.filter((r) => r.graded === 0).length;
    const pct = totals.total ? (totals.graded / totals.total) * 100 : 0;
    console.log(
      `\n  ${totals.graded} of ${totals.total} mappings graded (${pct.toFixed(1)}%).` +
        ` ${totals.satisfying} reach equal or subset.` +
        ` ${ungraded} frameworks get nothing.`,
    );
    console.log(
      `  ${totals.ambiguous} mappings had bundle rows that disagree and stay ungraded.`,
    );
    console.log(
      `  ${totals.unresolved} mappings match a bundle row whose focal document did not` +
        " resolve to a framework — re-run the seeder after fixing the name in the catalogue.",
    );
    console.log(
      "  Frameworks with 0 graded mappings can produce no coverage figure —" +
        " that is the number to read before promising one.\n",
    );
```

- [ ] **Step 6: Update the backfill docblock**

Replace the "The join" section (`:18-31`) with:

```
 * The join
 * --------
 * Exact, on the three columns both sides key by — including the framework:
 *
 *   scf_mappings m
 *     JOIN scf_framework_requirements r ON m.scf_framework_requirement_id = r.id
 *     JOIN scf_strm_relationships   s ON s.scf_control_id   = m.scf_control_id
 *                                    AND s.fde_code         = r.fde_code
 *                                    AND s.scf_framework_id = r.scf_framework_id
 *
 * The framework predicate is load-bearing. An FDE code is unique only inside
 * its focal document: joined on bare fde_code, PCI DSS's "1.1.1" graded CIS's
 * "1.1.1" whenever both mapped the same SCF control (migration 0060).
 *
 * Where several bundle rows still match one mapping — two editions of a file
 * resolving to one framework — the mapping is graded only if they agree on one
 * operator. Disagreement leaves NULL: picking a side is a coin flip presented
 * as a measurement.
 *
 * Deliberately NOT joined on `scf_strm_relationships.scf_mapping_id`: it is a
 * backward-compat convenience, not a key.
```

- [ ] **Step 7: Run the tests**

Run: `pnpm --filter @standard/schemas test`
Expected: PASS — 5 tests in `strm-framework-scope`, plus the existing `strm-provenance` suite still green (it asserts `OFFICIAL_SOURCE` appears as a literal exactly once and is interpolated in both statements; the rewritten queries keep both properties — check this, do not assume it).

- [ ] **Step 8: Lift the Task 7 block in the parent plan**

In `docs/superpowers/plans/2026-08-28-strm-reimport.md`, at the head of `### Task 7`, add:

```markdown
**Prerequisite (was a blocker):** `docs/superpowers/plans/2026-08-28-strm-framework-scoped-operators.md`
must be complete. Until it is, `scf_strm_relationships` is keyed without a
framework and the per-framework coverage this task measures silently
misattributes operators between frameworks sharing a requirement code.

**Read before trusting the numbers:** the seeder now prints "Framework
resolved: N of M rows" and lists unresolved files. The backfill's coverage
table gains `ambig` and `unres` columns. A framework whose focal document did
not resolve reports 0 graded — that is an unresolved NAME, not an uncovered
framework, and it is fixed in the catalogue, never by widening the matcher.
```

- [ ] **Step 9: Run the full gate**

Run: `pnpm check:migrations && pnpm typecheck && pnpm test:unit && pnpm lint`
Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/schemas/src/backfill-mapping-strm-operators.ts \
        packages/schemas/src/__tests__/strm-framework-scope.test.ts \
        docs/superpowers/plans/2026-08-28-strm-reimport.md
git commit -m "fix(schemas): backfill grades a mapping with its own framework's operator

The join now includes scf_framework_id, so PCI DSS's 1.1.1 no longer grades
CIS's 1.1.1 when both map the same SCF control. Where several bundle rows
still match one mapping, it is graded only if they agree; disagreement stays
NULL. Coverage reports ambiguous and unresolved counts."
```

---

## Self-Review

**Spec coverage.** The ruling names three defects: the index without a framework column (Task 1), the seeder deduping globally with last-entry-wins (Task 2), and the backfill joining on bare `fde_code` (Task 3). It also requires the fix be settled before the re-import — Task 3 Step 8 wires that into the parent plan's Task 7. Covered.

**Placeholder scan.** Every step carries the literal SQL, TypeScript or JSON to write, and every command has an expected result. The one judgement call left to the implementer is the `git add` in Task 1 Step 11, which is flagged inline.

**Type consistency.** `focalDocument`/`focal_document` and `scfFrameworkId`/`scf_framework_id` are used with the same spelling in the migration, the Drizzle schema, the seeder's `UpsertRow`, and both SQL statements in the backfill. The four helpers exported by `strm-focal-document.ts` in Task 2 are the four imported by the seeder in the same task. `CoverageRow`'s new `ambiguous`/`unresolved` fields match the `AS ambiguous`/`AS unresolved` aliases in the query and the `r.ambiguous`/`r.unresolved` reads in the report.

**Known gap, deliberate.** The framework resolution rate cannot be measured until the bundle is in `assets/strm/`. If it is poor, coverage falls rather than misattributing — the safe direction — and the seeder's unresolved list says which names to fix. That measurement belongs to the parent plan's Task 7.

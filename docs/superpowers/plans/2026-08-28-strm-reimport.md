# STRM Re-import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `scf_mappings.relationship_type` carry only STRM operators the SCF actually states, so a framework coverage figure is computed from recorded relationships or not computed at all.

**Architecture:** Three sources currently write that column: the XLSX crosswalk importer (which infers an operator from mapping cardinality), the STRM bundle seeder (which coerces unknown operators to `intersects`), and the backfill (which copies from `scf_strm_relationships`). This plan reduces that to one: the backfill, reading only rows the official STRM bundle produced. The importer stops writing the column at all, and absence becomes representable end to end.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL, ExcelJS, vitest, pnpm workspaces.

**Spec:** The customer correspondence this answers, in `ihOS`:
- `docs/standard-api/VENDOR_QUESTIONS_2026-08-28.md` — Q11 (re-import date), Q12 (per-framework dry run)
- `docs/standard-api/CONTRACT_AUDIT.md` §I — Q10 resolution, including the two fallbacks we told them were removed
- `docs/decisions/ADR-001-strm-weights-algorithm.md` (this repo) — the weight table this data feeds

## Global Constraints

- **Operators are requirement-relative.** Read `requirement <operator> control`. `equal` and `subset` satisfy; `superset` is partial, capped at 0.5; `intersects` routes to human review. Source: ADR-001, confirmed to the customer in `CONTRACT_AUDIT.md` §I.
- **The five-value vocabulary is exactly** `equal | subset | intersects | superset | no_relation`. Anything else from a source is unknown, never coerced.
- **NULL means "the source states no operator".** It is never a default, never inferred, and contributes nothing to any compliance index.
- **No migration may be added to `meta/_journal.json` without `pnpm check:migrations` passing.** Snapshots in `meta/` stop at `0047` (audit B-05), so `drizzle-kit generate` will diff against a stale baseline — hand-write migration SQL and hand-add the journal entry, following the `0058` precedent.
- **`assets/strm/` is not in the repository.** Every task that needs the bundle says so explicitly.
- Commit format: conventional commits, header ≤100 chars, `Co-Authored-By:` on AI commits.

---

## Context an implementer needs before Task 1

The customer walked the full crosswalk on 2026-08-28 and measured 79,133 mappings, of which 79,127 are `intersects` and 79,126 also carry `relationship_strength = 0.500`. Their policy routes `intersects` to human review at any strength, so the crosswalk yields no framework score at all — an organisation implementing every one of the 1,473 SCF controls would still receive no ISO 27001 figure.

Two fixes already landed and are **not** part of this plan:
- `infra/docker/postgres/migrations/0058_scf_mappings_relationship_type_nullable.sql` — the column accepts NULL.
- `packages/scf-core/src/importers/xlsx-importer.ts:357` — the crosswalk parser sets `relationship_type: null`.

Three defects remain. Verify each before changing it; the line numbers are from `main` at `c4b3510`.

**Defect A — the importer overwrites its own null with an inferred operator.**
`packages/scf-core/src/importers/xlsx-importer.ts:1473-1478` walks every mapping and replaces `relationship_type` with the output of `inferStrmRelationships()`, which derives an operator from cardinality: 1 requirement → 1 control becomes `equal`. `equal` means "satisfies" in the customer's policy. So the null at line 357 never reaches the database, and a fabricated satisfaction can. This is the defect that keeps the column untrustworthy.

**Defect B — the seeder coerces unknown operators to `intersects`.**
`packages/schemas/src/seed-strm-bundle.ts:300-321` ends its operator mapping with `: "intersects") as` and the comment `// safe fallback for unknown values`. `CONTRACT_AUDIT.md` §I records that we told the customer both fallbacks of this kind were removed. This one was not.

**Defect C — the backfill does not filter by source (latent, not live).**
`packages/schemas/src/backfill-mapping-strm-operators.ts:99-101` and `152-162` join `scf_strm_relationships` without restricting `source`. It cannot leak inferred rows *today*, because inferred rows are written with `scf_mapping_id` only — their `scf_control_id` and `fde_code` are NULL, and NULL never matches the join. Treat it as a guard to add, not a bug to panic about, and do not describe it to the customer as a live leak.

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/scf-core/src/importers/strm-operator.ts` | **new.** Pure canonicalisation: one raw source string in, a valid operator or `null` out. No I/O, no DB. The single place any source string becomes an operator. |
| `packages/scf-core/src/__tests__/strm-operator.test.ts` | **new.** Unit tests for the above, including every legacy alias and the unknown case. |
| `packages/scf-core/src/importers/xlsx-importer.ts` | **modify.** Stop overwriting `relationship_type` with inference (Defect A). Inference rows keep being produced for `scf_strm_relationships`, clearly sourced. |
| `packages/scf-core/src/__tests__/xlsx-importer-no-inferred-operators.test.ts` | **new.** Regression: parsed mappings leave the importer with `relationship_type === null`. |
| `infra/docker/postgres/migrations/0059_strm_relationships_relationship_type_nullable.sql` | **new.** Mirrors `0058` for `scf_strm_relationships`, so an unrecognised bundle operator is recorded as unknown rather than dropped. |
| `infra/docker/postgres/migrations/meta/_journal.json` | **modify.** One entry for `0059`. |
| `packages/schemas/src/seed-strm-bundle.ts` | **modify.** Use `toCanonicalOperator`; unknown becomes NULL and is counted in the run summary (Defect B). |
| `packages/schemas/src/backfill-mapping-strm-operators.ts` | **modify.** Restrict both queries to the official bundle source (Defect C). |
| `packages/schemas/src/__tests__/strm-provenance.test.ts` | **new.** Asserts the backfill SQL names the official source in both statements. |
| `docs/runbooks/strm-reimport.md` | **new.** Bundle provenance, checksum manifest, dry-run and apply procedure, verification queries. |

---

### Task 1: Canonical operator function

The one place a raw source string becomes an operator. Unknown input yields `null`, never a value.

**Files:**
- Create: `packages/scf-core/src/importers/strm-operator.ts`
- Test: `packages/scf-core/src/__tests__/strm-operator.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type StrmOperator = "equal" | "subset" | "intersects" | "superset" | "no_relation"` and `toCanonicalOperator(raw: string | null | undefined): StrmOperator | null`. Tasks 3 and 4 import both from `@standard/scf-core`.

- [ ] **Step 1: Write the failing test**

Create `packages/scf-core/src/__tests__/strm-operator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { toCanonicalOperator } from "../importers/strm-operator.js";

describe("toCanonicalOperator", () => {
  it("passes the five canonical operators through unchanged", () => {
    expect(toCanonicalOperator("equal")).toBe("equal");
    expect(toCanonicalOperator("subset")).toBe("subset");
    expect(toCanonicalOperator("intersects")).toBe("intersects");
    expect(toCanonicalOperator("superset")).toBe("superset");
    expect(toCanonicalOperator("no_relation")).toBe("no_relation");
  });

  it("translates the legacy bundle aliases", () => {
    expect(toCanonicalOperator("direct")).toBe("equal");
    expect(toCanonicalOperator("related")).toBe("intersects");
    expect(toCanonicalOperator("intersecting")).toBe("intersects");
    expect(toCanonicalOperator("no_relationship")).toBe("no_relation");
  });

  it("is tolerant of surrounding whitespace and case", () => {
    expect(toCanonicalOperator("  Equal ")).toBe("equal");
    expect(toCanonicalOperator("NO_RELATIONSHIP")).toBe("no_relation");
  });

  // The point of the whole exercise: an operator we do not recognise is
  // unknown. It must not become intersects, which asserts scope overlap.
  it("returns null for an unrecognised operator", () => {
    expect(toCanonicalOperator("source_defined")).toBeNull();
    expect(toCanonicalOperator("partially_related")).toBeNull();
    expect(toCanonicalOperator("")).toBeNull();
    expect(toCanonicalOperator(null)).toBeNull();
    expect(toCanonicalOperator(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @standard/scf-core exec vitest run src/__tests__/strm-operator.test.ts`
Expected: FAIL — cannot resolve `../importers/strm-operator.js`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/scf-core/src/importers/strm-operator.ts`:

```typescript
/**
 * Canonicalisation of STRM operators (ADR-001).
 *
 * Read requirement-relative: `requirement <operator> control`. `subset` means
 * the requirement fits inside the control.
 *
 * An operator this function does not recognise returns null. It is deliberately
 * not coerced to `intersects`: `intersects` asserts that two scopes overlap,
 * which is a claim about the source material, and a value we failed to parse
 * makes no such claim. Coercing it is how 79.127 of 79.133 crosswalk rows came
 * to carry an operator nobody recorded.
 */
export type StrmOperator =
  | "equal"
  | "subset"
  | "intersects"
  | "superset"
  | "no_relation";

const CANONICAL: ReadonlySet<string> = new Set([
  "equal",
  "subset",
  "intersects",
  "superset",
  "no_relation",
]);

/** Aliases the STRM bundle has used across editions. */
const ALIASES: Readonly<Record<string, StrmOperator>> = {
  direct: "equal",
  related: "intersects",
  intersecting: "intersects",
  no_relationship: "no_relation",
};

export const toCanonicalOperator = (
  raw: string | null | undefined,
): StrmOperator | null => {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  if (key === "") return null;
  if (CANONICAL.has(key)) return key as StrmOperator;
  return ALIASES[key] ?? null;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @standard/scf-core exec vitest run src/__tests__/strm-operator.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Export it from the package**

Add to `packages/scf-core/src/index.ts`, next to the other importer exports:

```typescript
export * from "./importers/strm-operator";
```

- [ ] **Step 6: Typecheck and commit**

```bash
pnpm --filter @standard/scf-core typecheck
git add packages/scf-core/src/importers/strm-operator.ts packages/scf-core/src/__tests__/strm-operator.test.ts packages/scf-core/src/index.ts
git commit -m "feat(scf-core): canonical STRM operator, unknown resolves to null"
```

---

### Task 2: The importer stops writing an inferred operator (Defect A)

**Files:**
- Modify: `packages/scf-core/src/importers/xlsx-importer.ts:1467-1478`
- Test: `packages/scf-core/src/__tests__/xlsx-importer-no-inferred-operators.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (this is a deletion).
- Produces: every `ScfMapping` the importer emits has `relationship_type === null`. Task 5's backfill is the only writer of that column from here on.

**Do not delete `inferStrmRelationships()` itself.** It still populates `scf_strm_relationships` rows carrying `source: "inferred_structural_analysis_v1"`, which are legitimately labelled and served separately. Only its leak into `scf_mappings` is being removed.

- [ ] **Step 1: Write the failing test**

Create `packages/scf-core/src/__tests__/xlsx-importer-no-inferred-operators.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const IMPORTER = resolve(
  __dirname,
  "../importers/xlsx-importer.ts",
);

describe("xlsx importer does not infer scf_mappings.relationship_type", () => {
  it("has no assignment of relationship_type on a parsed mapping", () => {
    const src = readFileSync(IMPORTER, "utf8");
    // The removed block did:
    //   (m as { relationship_type: string }).relationship_type = inferredType;
    expect(src).not.toMatch(/\.relationship_type\s*=\s*inferredType/);
    expect(src).not.toMatch(/mappingIdToStrmType/);
  });

  it("still sets relationship_type to null when building a mapping", () => {
    const src = readFileSync(IMPORTER, "utf8");
    expect(src).toMatch(/relationship_type:\s*null/);
  });

  it("keeps the inference engine for scf_strm_relationships", () => {
    const src = readFileSync(IMPORTER, "utf8");
    expect(src).toMatch(/inferStrmRelationships\(allMappings\)/);
    expect(src).toMatch(/inferred_structural_analysis_v1/);
  });
});
```

This is a source-level assertion rather than a behavioural one because driving the importer end to end needs the 40MB workbook and a seeded catalogue. Task 8's dry run is the behavioural check.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @standard/scf-core exec vitest run src/__tests__/xlsx-importer-no-inferred-operators.test.ts`
Expected: FAIL — first test finds `.relationship_type = inferredType`.

- [ ] **Step 3: Delete the overwrite block**

In `packages/scf-core/src/importers/xlsx-importer.ts`, delete lines 1467-1478 in full:

```typescript
    // Also update allMappings relationship_type to the inferred STRM type
    // so scf_mappings.relationship_type reflects actual STRM (not hardcoded "related")
    const mappingIdToStrmType = new Map<string, string>();
    for (const e of strmInferred) {
      mappingIdToStrmType.set(e.mapping_id, e.relationship_type);
    }
    for (const m of allMappings) {
      const inferredType = mappingIdToStrmType.get(m.id);
      if (inferredType) {
        (m as { relationship_type: string }).relationship_type = inferredType;
      }
    }
```

Replace it with:

```typescript
    // Deliberately NOT copied onto allMappings. These operators are inferred
    // from mapping cardinality, not stated by the SCF: a requirement mapping to
    // exactly one control becomes `equal`, which the consumer's policy reads as
    // "satisfies". Writing that into scf_mappings.relationship_type would make
    // a structural coincidence indistinguishable from a recorded relationship.
    // They stay in scf_strm_relationships under their own source label, where a
    // reader can tell what produced them.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @standard/scf-core exec vitest run src/__tests__/xlsx-importer-no-inferred-operators.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Run the whole scf-core suite for fallout**

Run: `pnpm --filter @standard/scf-core test`
Expected: PASS. If a fixture test asserted an inferred operator on a mapping, update the fixture to expect `null` — that assertion was encoding the defect.

- [ ] **Step 6: Commit**

```bash
git add packages/scf-core/src/importers/xlsx-importer.ts packages/scf-core/src/__tests__/xlsx-importer-no-inferred-operators.test.ts
git commit -m "fix(scf-core): stop inferring scf_mappings.relationship_type from cardinality"
```

---

### Task 3: Migration 0059 — unknown bundle operators are representable

`scf_strm_relationships.relationship_type` is `strm_operator NOT NULL` (created in `0000`, retyped in `0047`). With Task 4 returning `null` for an unrecognised operator, the seeder needs somewhere to put it. Skipping the row instead would discard the fact that the bundle recorded a relationship at all.

**Files:**
- Create: `infra/docker/postgres/migrations/0059_strm_relationships_relationship_type_nullable.sql`
- Modify: `infra/docker/postgres/migrations/meta/_journal.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `scf_strm_relationships.relationship_type` accepts NULL. Task 4 depends on this.

- [ ] **Step 1: Write the migration**

Create `infra/docker/postgres/migrations/0059_strm_relationships_relationship_type_nullable.sql`:

```sql
-- Migration: 0059 — scf_strm_relationships.relationship_type becomes nullable
-- Date: 2026-08-28
--
-- Rationale:
--   Mirrors 0058, one table upstream. The STRM bundle seeder mapped any
--   operator it did not recognise onto 'intersects' under a comment calling it
--   a "safe fallback". It is not safe: 'intersects' asserts that two scopes
--   overlap, so an unparsed value became a claim about the source material.
--
--   The seeder now records NULL for an operator it cannot canonicalise. That
--   keeps the bundle entry — the pair exists, someone recorded a relationship —
--   while stating plainly that we could not read which relationship it is.
--   Dropping the row instead would lose both facts.
--
--   Consistent with 0058: absence is representable, and a NULL operator
--   contributes nothing to the compliance index.
--
-- Reversibility:
--   Reversible only by choosing a value for every null, which is the
--   fabrication this migration exists to end. Down is deliberately absent.

ALTER TABLE scf_strm_relationships
  ALTER COLUMN relationship_type DROP NOT NULL;

COMMENT ON COLUMN scf_strm_relationships.relationship_type IS
  'Canonical STRM operator (ADR-001), read requirement-relative. NULL means the bundle stated an operator we could not canonicalise — never a default.';
```

- [ ] **Step 2: Add the journal entry**

`meta/_journal.json` currently ends at `idx: 49`, tag `0058_scf_mappings_relationship_type_nullable`, `when: 1787875200000`. Append inside `entries`:

```json
    {
      "idx": 50,
      "version": "7",
      "when": 1787961600000,
      "tag": "0059_strm_relationships_relationship_type_nullable",
      "breakpoints": true
    }
```

`when` must exceed the previous entry's — the Drizzle migrator decides what to apply by comparing `folderMillis` against the last recorded `created_at`, never by content hash.

- [ ] **Step 3: Verify the journal is consistent**

Run: `pnpm check:migrations`
Expected: `✓ Migration journal consistent: 51 applied, 9 excused, 60 on disk.`

- [ ] **Step 4: Apply against a clean local database**

```bash
docker compose -f infra/docker/docker-compose.yml down -v
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate
```

Expected: `Migração concluída com sucesso!`

- [ ] **Step 5: Verify the column is nullable**

```bash
docker exec standard-postgres psql -U standard -d standard -tAc \
  "SELECT is_nullable FROM information_schema.columns
    WHERE table_name='scf_strm_relationships' AND column_name='relationship_type'"
```

Expected: `YES`

- [ ] **Step 6: Commit**

```bash
git add infra/docker/postgres/migrations/0059_strm_relationships_relationship_type_nullable.sql infra/docker/postgres/migrations/meta/_journal.json
git commit -m "feat(db): 0059 allow null STRM operator on scf_strm_relationships"
```

---

### Task 4: The seeder stops coercing unknown operators (Defect B)

**Files:**
- Modify: `packages/schemas/src/seed-strm-bundle.ts:206-215` (the `UpsertRow` type), `:294-331` (the insert), and the run summary near `:382-389`
- Modify: `packages/schemas/package.json` (add `@standard/scf-core` dependency if absent)

**Interfaces:**
- Consumes: `toCanonicalOperator`, `StrmOperator` from Task 1; the nullable column from Task 3.
- Produces: `scf_strm_relationships` rows whose `relationship_type` is either a canonical operator or NULL. Task 5 reads these.

- [ ] **Step 1: Confirm the dependency exists**

```bash
node -e "console.log(require('./packages/schemas/package.json').dependencies)"
```

If `@standard/scf-core` is absent, add `"@standard/scf-core": "workspace:*"` to `dependencies` and run `pnpm install`. The seeder already imports from `../../scf-core/src/importers/strm-bundle-importer.js` by relative path, so a workspace edge may already be implied but unrecorded.

- [ ] **Step 2: Replace the inline operator mapping**

At the top of `packages/schemas/src/seed-strm-bundle.ts`, add:

```typescript
import { toCanonicalOperator } from "../../scf-core/src/importers/strm-operator.js";
```

In the `UpsertRow` type (around line 210), change:

```typescript
      relationship_type: string;
```

to:

```typescript
      relationship_type: string;
      /** Set when the source operator could not be canonicalised. */
      operator_unrecognised: boolean;
```

In the dedupe loop (around line 238), replace the `deduped.set(...)` object's construction so the raw value is preserved and the canonical form computed once:

```typescript
        const canonical = toCanonicalOperator(entry.relationship_type);

        deduped.set(dedupeKey, {
          scf_control_id: controlId,
          fde_code: entry.fde_code.trim(),
          fde_name: entry.fde_name.trim(),
          relationship_type: entry.relationship_type,
          operator_unrecognised: canonical === null,
          strength_raw: entry.strength_raw,
          rationale: entry.strm_rationale || null,
          source: SOURCE_LABEL,
          scf_mapping_id: mappingId,
        });
```

- [ ] **Step 3: Replace the coercion in the insert**

Delete the whole nested ternary at lines 299-321 — the block beginning `// ADR-001: map legacy relationship_type strings to canonical STRM operators` and ending `| "no_relation",`. Replace with:

```typescript
            // Unknown operators become NULL (0059). They are not coerced to
            // `intersects`: that asserts scope overlap, which a value we could
            // not read does not support. The count is reported below so an
            // unrecognised vocabulary shows up as a number, not as silence.
            relationshipType: toCanonicalOperator(row.relationship_type),
```

- [ ] **Step 4: Report the unrecognised count**

In the pre-write summary, after the `Join time` line (around line 265), add:

```typescript
    const unrecognised = rows.filter((r) => r.operator_unrecognised);
    console.log(`     Unrecognised op: ${unrecognised.length}`);
    if (unrecognised.length > 0) {
      const vocab = [...new Set(unrecognised.map((r) => r.relationship_type))];
      console.log(`     Values seen:     ${vocab.slice(0, 10).join(", ")}`);
      console.log(
        "     These are stored as NULL. A new source vocabulary belongs in",
      );
      console.log(
        "     toCanonicalOperator, not in a fallback at the write site.",
      );
    }
```

- [ ] **Step 5: Verify the fallback is gone**

```bash
grep -n "safe fallback" packages/schemas/src/seed-strm-bundle.ts
```

Expected: no output.

- [ ] **Step 6: Typecheck and commit**

```bash
pnpm --filter @standard/schemas typecheck
git add packages/schemas/src/seed-strm-bundle.ts packages/schemas/package.json
git commit -m "fix(schemas): unknown STRM operator becomes null, not intersects"
```

---

### Task 5: The backfill reads only the official bundle (Defect C)

A guard, not a live fix — inferred rows carry NULL `scf_control_id` and `fde_code`, so they cannot match the join today. Naming the source makes that structural accident into a stated rule, and keeps a future inference writer that does populate those columns from silently qualifying as evidence.

**Files:**
- Modify: `packages/schemas/src/backfill-mapping-strm-operators.ts:85-104` (coverage) and `:152-162` (update)
- Test: `packages/schemas/src/__tests__/strm-provenance.test.ts`

**Interfaces:**
- Consumes: `scf_strm_relationships` rows from Task 4.
- Produces: `scf_mappings.relationship_type` populated only from `source = 'scf_official_strm_bundle_2026.1'`.

- [ ] **Step 1: Write the failing test**

Create `packages/schemas/src/__tests__/strm-provenance.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BACKFILL = resolve(__dirname, "../backfill-mapping-strm-operators.ts");
const OFFICIAL = "scf_official_strm_bundle_2026.1";

describe("backfill provenance", () => {
  const src = readFileSync(BACKFILL, "utf8");

  it("names the official source in both statements", () => {
    // One occurrence in the coverage query, one in the UPDATE.
    const hits = src.split(OFFICIAL).length - 1;
    expect(hits).toBeGreaterThanOrEqual(2);
  });

  it("never writes an operator sourced from structural inference", () => {
    expect(src).not.toMatch(/inferred_structural_analysis/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @standard/schemas exec vitest run src/__tests__/strm-provenance.test.ts`
Expected: FAIL — the source label appears zero times.

- [ ] **Step 3: Add the source constant and filter both queries**

Near the top of `packages/schemas/src/backfill-mapping-strm-operators.ts`, after the imports:

```typescript
/**
 * Only the official bundle grades a mapping. `scf_strm_relationships` also
 * holds rows sourced from structural inference; those describe how a crosswalk
 * happens to be shaped, not what the SCF states, and must never become an
 * operator the API serves as recorded.
 */
const OFFICIAL_SOURCE = "scf_official_strm_bundle_2026.1";
```

In the coverage query, change the LEFT JOIN's ON clause to:

```sql
      LEFT JOIN scf_strm_relationships s
        ON s.scf_control_id = m.scf_control_id
       AND s.fde_code       = r.fde_code
       AND s.source         = ${OFFICIAL_SOURCE}
```

In the UPDATE, add the same predicate to the WHERE:

```sql
      UPDATE scf_mappings m
         SET relationship_type = s.relationship_type,
             updated_at = now()
        FROM scf_framework_requirements r, scf_strm_relationships s
       WHERE m.scf_framework_requirement_id = r.id
         AND s.scf_control_id = m.scf_control_id
         AND s.fde_code       = r.fde_code
         AND s.source         = ${OFFICIAL_SOURCE}
         AND s.relationship_type IS NOT NULL
         AND m.relationship_type IS DISTINCT FROM s.relationship_type
    `);
```

Note the filter belongs in the LEFT JOIN's `ON`, not a `WHERE` — in a `WHERE` it would discard the unmatched rows the coverage report exists to count.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @standard/schemas exec vitest run src/__tests__/strm-provenance.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm --filter @standard/schemas typecheck
git add packages/schemas/src/backfill-mapping-strm-operators.ts packages/schemas/src/__tests__/strm-provenance.test.ts
git commit -m "fix(schemas): backfill grades mappings only from the official STRM bundle"
```

---

### Task 6: Bundle acquisition runbook

The seeder reads `assets/strm/` and expects 183 XLSX files. That directory does not exist in the repository, which is why the re-import has not run. Nothing downstream works until this is settled, and the customer's Q11 is asking for exactly this date.

**Files:**
- Create: `docs/runbooks/strm-reimport.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `assets/strm/` populated locally, and a checksum manifest committed so a later run can prove it read the same bundle.

- [ ] **Step 1: Decide whether the bundle is committed**

Measure it first:

```bash
du -sh assets/strm 2>/dev/null || echo "not present"
```

If the total exceeds ~50MB, do not commit it: add `assets/strm/` to `.gitignore` and commit only the manifest from Step 2. If it is smaller and licensing permits redistribution, committing it makes the import reproducible. Record the decision and its reason in the runbook — a future reader needs to know why the directory is or is not in git.

- [ ] **Step 2: Generate a checksum manifest**

```bash
find assets/strm -name '*.xlsx' -print0 | sort -z | xargs -0 sha256sum > assets/strm.manifest.sha256
wc -l < assets/strm.manifest.sha256
```

Expected: 183. If the count differs, stop — the bundle is not the edition this plan was written against, and the operator distribution in Task 7 will not be comparable.

- [ ] **Step 3: Write the runbook**

Create `docs/runbooks/strm-reimport.md` covering, in this order: where the bundle came from (URL, edition, date obtained), the manifest and how to re-verify it, the dry run command from Task 7, the apply command and verification queries from Task 8, and the answer sent to the customer. State plainly that a mapping the bundle does not cover keeps `relationship_type = NULL` and produces no coverage figure — that is the intended outcome, not a gap to close later.

- [ ] **Step 4: Verify the manifest reproduces**

```bash
sha256sum -c assets/strm.manifest.sha256 | grep -c ': OK$'
```

Expected: 183.

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks/strm-reimport.md assets/strm.manifest.sha256 .gitignore
git commit -m "docs(runbooks): STRM bundle provenance and re-import procedure"
```

---

### Task 7: Dry run — the measurement the customer asked for

**Prerequisite (was a blocker):** `docs/superpowers/plans/2026-08-28-strm-framework-scoped-operators.md`
must be complete. Until it is, `scf_strm_relationships` is keyed without a
framework and the per-framework coverage this task measures silently
misattributes operators between frameworks sharing a requirement code.

**Read before trusting the numbers:** the seeder now prints "Framework
resolved: N of M rows" and lists unresolved files. The backfill's coverage
table gains `ambig` and `unres` columns. A framework whose focal document did
not resolve reports 0 graded — that is an unresolved NAME, not an uncovered
framework, and it is fixed in the catalogue, never by widening the matcher.

This produces the Q12 deliverable: per framework, total mappings, how many the bundle grades, how many reach `equal` or `subset`.

**Files:** none modified. This task produces a recorded measurement.

**Interfaces:**
- Consumes: Tasks 1-6.
- Produces: a per-framework coverage table, saved for the customer reply.

- [ ] **Step 1: Bring up a clean database with the catalogue seeded**

```bash
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate
pnpm db:seed:scf
```

Expected: the SCF catalogue loads. Confirm the control count:

```bash
docker exec standard-postgres psql -U standard -d standard -tAc "SELECT count(*) FROM scf_controls"
```

Expected: 1473. A different number means the catalogue seed did not complete, and every denominator below would be wrong.

- [ ] **Step 2: Parse the bundle without writing**

```bash
pnpm db:seed:strm:dry-run 2>&1 | tee /tmp/strm-parse.txt
```

Expected: a relationship-type breakdown. **This is the first real signal.** If the breakdown is overwhelmingly `intersects`, the bundle itself carries no distinctions and the rest of this plan will not produce graded coverage — stop and report that to the customer rather than proceeding, because it changes the answer to Q11 from a date into a "not from this source".

- [ ] **Step 3: Load the bundle**

```bash
pnpm db:seed:strm 2>&1 | tail -30
```

Expected: the post-import verification prints counts by type, and `Unrecognised op:` from Task 4 Step 4.

- [ ] **Step 4: Measure coverage per framework**

```bash
pnpm --filter @standard/schemas db:backfill:strm-operators:dry-run 2>&1 | tee /tmp/strm-coverage.txt
```

Expected: the per-framework table, and a closing line of the form `N of M mappings graded (X%). K reach equal or subset. J frameworks get nothing.`

- [ ] **Step 5: Record the ISO 27001 row specifically**

The customer's blocking example is ISO 27001 2022, which they measure at 316 mappings, all `intersects`. Find that row in `/tmp/strm-coverage.txt` and record `total`, `graded`, `equal`, `subset`, `superset`. If `graded` is 0, ISO 27001 still produces no figure after the re-import, and Q11's answer must say so explicitly.

- [ ] **Step 6: Commit the measurement**

```bash
mkdir -p docs/measurements
cp /tmp/strm-coverage.txt docs/measurements/2026-08-28-strm-coverage-by-framework.txt
git add docs/measurements/2026-08-28-strm-coverage-by-framework.txt
git commit -m "docs(measurements): STRM coverage by framework, dry run"
```

---

### Task 8: Apply, verify, and close the loop with the customer

**Files:**
- Modify: `docs/runbooks/strm-reimport.md` (fill in the results section)

**Interfaces:**
- Consumes: Task 7's measurement.
- Produces: `scf_mappings.relationship_type` populated from the bundle in the target environment.

- [ ] **Step 1: Apply the backfill locally**

```bash
pnpm --filter @standard/schemas db:backfill:strm-operators
```

Expected: `Updated N rows.`

- [ ] **Step 2: Verify no operator survives without provenance**

```bash
docker exec standard-postgres psql -U standard -d standard -tAc "
  SELECT count(*) FROM scf_mappings m
  WHERE m.relationship_type IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM scf_framework_requirements r
      JOIN scf_strm_relationships s
        ON s.scf_control_id = m.scf_control_id AND s.fde_code = r.fde_code
      WHERE r.id = m.scf_framework_requirement_id
        AND s.source = 'scf_official_strm_bundle_2026.1'
        AND s.relationship_type = m.relationship_type)"
```

Expected: `0`. Any other number means a writer this plan did not find is still setting the column — do not proceed to production until it is identified.

- [ ] **Step 3: Verify the distribution actually changed**

```bash
docker exec standard-postgres psql -U standard -d standard -c "
  SELECT coalesce(relationship_type::text,'(null)') AS op, count(*)
  FROM scf_mappings GROUP BY 1 ORDER BY 2 DESC"
```

Expected: no longer a single `intersects` bucket. Record this table — it is the direct before/after against the customer's measured 79,127.

- [ ] **Step 4: Confirm the API serves null correctly**

```bash
pnpm build && pnpm dev:api
```

Then, against a control the bundle does not cover, confirm `relationship_type` serialises as `null` rather than being omitted or defaulted, and that the OpenAPI schema marks it nullable:

```bash
pnpm check:openapi
```

Expected: `OpenAPI spec is current`. If the generated schema changed because the column became nullable, run `pnpm generate:openapi` and commit the result — the customer generates their types from this document.

- [ ] **Step 5: Apply to staging, then production**

Follow `docs/runbooks/apply-orphaned-migrations.md` Step 1 for establishing real state first. Migration `0059` is journalled, so `pnpm db:migrate` carries it; the seed and backfill are manual steps run in the same window. Record the row counts from Steps 2 and 3 for each environment in the runbook.

- [ ] **Step 6: Answer Q11 and Q12**

Send the customer: the date this applied, whether it was an in-place correction of the current SCF version or a new version (UUIDs rotate on a new version — they key on `control_code` + version precisely because of this), and `docs/measurements/2026-08-28-strm-coverage-by-framework.txt` as the Q12 dry-run output.

Include a correction they are owed: `CONTRACT_AUDIT.md` §I records that both `intersects` fallbacks were removed. One of them — the seeder's, Defect B — was still present until Task 4. They built their `strength_is_trustworthy` column on the strength of our account of what had been fixed.

- [ ] **Step 7: Commit**

```bash
git add docs/runbooks/strm-reimport.md docs/api/openapi.json docs/api/openapi.yaml
git commit -m "docs(runbooks): record STRM re-import results and customer reply"
```

---

## Self-Review

**Spec coverage.** Q11 (date, and in-place vs new version) → Task 8 Step 6. Q12 (per-framework dry run) → Task 7 Steps 4-6. §I's claim that both fallbacks were removed → Task 4 removes the surviving one, Task 8 Step 6 discloses it. ADR-001's weights finally being exercised → Task 8 Step 3 shows the distribution. Q13 and Q14 are catalogue-identity questions with no code change and are deliberately out of scope; they are answered from measurement, not from this plan.

**Type consistency.** `toCanonicalOperator(raw: string | null | undefined): StrmOperator | null` is defined in Task 1 and used with that exact signature in Task 4. `OFFICIAL_SOURCE` in Task 5 matches `SOURCE_LABEL` in `seed-strm-bundle.ts` byte for byte (`scf_official_strm_bundle_2026.1`). Migration `0059` is referenced by number in Tasks 3, 4 and 8.

**Known gap, stated rather than papered over.** Task 7 Step 2 can fail the whole premise: if the bundle's own operator distribution is as flat as the crosswalk's, no amount of plumbing produces graded coverage. That branch is explicit rather than discovered at Task 8.

---

## Amendments made during execution

Two tasks were added after execution began. Both close defects of the same
class the plan already targets, found by review rather than by the plan.

---

### Task 10: The bundle importer stops coercing unknown operators (Defect D)

**Found during Task 5.** `packages/scf-core/src/importers/strm-bundle-importer.ts`
runs UPSTREAM of the seeder. Its `normalizeRelationshipType` ends with a
`return "intersects";` under the comment "Unknown — conservative fallback to
intersects (partial overlap)".

So the value Task 4's `toCanonicalOperator` receives has already been coerced,
and Task 4's null path can never fire for an unknown bundle operator. **Task 4
is decorative until this is fixed.**

Two further problems in the same function:

- It maps `related` and `source_defined` to `intersects`, which its own header
  comment forbids in capitals ("NEVER return ... related, or source_defined").
  Neither value appears in the recorded scan of the 183 files.
- The bundle's 295 rows spelled `"Instersects With"` (a typo in the source) do
  NOT match `v.startsWith("intersect")` — `instersects` begins `i-n-s-t`. They
  reach `intersects` only by falling through to the very fallback being removed.
  Removing it without an explicit alias silently loses 295 real operators.

The function must also distinguish two cases it currently collapses into `null`:
a leaked header row is not data and must be dropped, while an unrecognised
operator is a real bundle entry whose operator we cannot read and must be kept
with a null operator. Collapsing them discards real rows.

**Files:**
- Modify: `packages/scf-core/src/importers/strm-bundle-importer.ts` — the
  `StrmBundleEntry.relationship_type` field (line 62), `normalizeRelationshipType`
  (lines 120-135), its caller (lines 252-260), and the summary type (line 95)
- Test: `packages/scf-core/src/__tests__/strm-bundle-operator.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `StrmBundleEntry.relationship_type` becomes
  `StrmRelationshipType | null`, and the directory summary gains
  `total_unknown_operator: number`. Task 4's seeder already tolerates a null
  here, because `toCanonicalOperator` accepts `string | null | undefined`.

- [ ] **Step 1: Write the failing test**

Create `packages/scf-core/src/__tests__/strm-bundle-operator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseStrmOperatorCell } from "../importers/strm-bundle-importer.js";

describe("parseStrmOperatorCell", () => {
  it("reads the vocabulary the 183 bundle files actually contain", () => {
    expect(parseStrmOperatorCell("Intersects With")).toEqual({ kind: "operator", value: "intersects" });
    expect(parseStrmOperatorCell("Subset Of")).toEqual({ kind: "operator", value: "subset" });
    expect(parseStrmOperatorCell("Subset of")).toEqual({ kind: "operator", value: "subset" });
    expect(parseStrmOperatorCell("Equal")).toEqual({ kind: "operator", value: "equal" });
    expect(parseStrmOperatorCell("Superset Of")).toEqual({ kind: "operator", value: "superset" });
    expect(parseStrmOperatorCell("superset of")).toEqual({ kind: "operator", value: "superset" });
    expect(parseStrmOperatorCell("intersects")).toEqual({ kind: "operator", value: "intersects" });
  });

  // 295 rows in the bundle are spelled this way. They do not start with
  // "intersect" and previously reached `intersects` only via the fallback
  // this task removes, so they need an alias of their own.
  it("reads the bundle's Instersects typo", () => {
    expect(parseStrmOperatorCell("Instersects With")).toEqual({ kind: "operator", value: "intersects" });
  });

  it("drops leaked header rows as non-data", () => {
    expect(parseStrmOperatorCell("Functional")).toEqual({ kind: "skip" });
    expect(parseStrmOperatorCell("STRM\nRelationship")).toEqual({ kind: "skip" });
    expect(parseStrmOperatorCell("")).toEqual({ kind: "skip" });
    expect(parseStrmOperatorCell("   ")).toEqual({ kind: "skip" });
  });

  // The point of the task: an operator we cannot read is kept as a row with an
  // unknown operator. It is neither coerced to intersects nor silently dropped.
  it("keeps an unrecognised operator as unknown, never as intersects", () => {
    expect(parseStrmOperatorCell("Partially Related")).toEqual({ kind: "unknown", raw: "Partially Related" });
    expect(parseStrmOperatorCell("related")).toEqual({ kind: "unknown", raw: "related" });
    expect(parseStrmOperatorCell("source_defined")).toEqual({ kind: "unknown", raw: "source_defined" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @standard/scf-core exec vitest run src/__tests__/strm-bundle-operator.test.ts`
Expected: FAIL — `parseStrmOperatorCell` is not exported.

- [ ] **Step 3: Replace the normaliser**

In `packages/scf-core/src/importers/strm-bundle-importer.ts`, replace the whole
of `normalizeRelationshipType` with:

```typescript
/**
 * Reads the XLSX "STRM Relationship" cell.
 *
 * Three outcomes, deliberately distinguished:
 *   operator — the cell states one of the five canonical STRM operators
 *   skip     — a leaked header row; not data, drop the row entirely
 *   unknown  — a real row whose operator we cannot read; keep the row, and
 *              record no operator for it
 *
 * `unknown` used to return "intersects" under a comment calling it a
 * conservative fallback. It is not conservative: `intersects` asserts that two
 * scopes overlap, which is a claim the unreadable cell does not support. That
 * fallback is upstream of every other guard in this codebase, so it silently
 * defeated them.
 */
export type StrmOperatorCell =
  | { kind: "operator"; value: StrmRelationshipType }
  | { kind: "skip" }
  | { kind: "unknown"; raw: string };

export function parseStrmOperatorCell(raw: string): StrmOperatorCell {
  const v = raw.trim().toLowerCase();

  if (v === "") return { kind: "skip" };
  // Leaked header rows — the sheet's own headings, not data.
  if (v === "functional" || v.startsWith("strm")) return { kind: "skip" };

  if (v === "equal") return { kind: "operator", value: "equal" };
  if (v === "subset" || v === "subset of")
    return { kind: "operator", value: "subset" };
  if (v === "superset" || v === "superset of")
    return { kind: "operator", value: "superset" };
  if (v === "no relationship" || v === "no relation")
    return { kind: "operator", value: "no_relation" };
  // "instersect" is a misspelling present on 295 rows of the bundle.
  if (v.startsWith("intersect") || v.startsWith("instersect"))
    return { kind: "operator", value: "intersects" };

  return { kind: "unknown", raw };
}
```

Note what is deliberately absent: `direct`, `related`, `source_defined` and
`no_relationship`. None appears in the recorded scan of the 183 files, and the
function's own header forbade emitting the middle two. They now read as unknown.

- [ ] **Step 4: Widen the entry type and the summary**

At line 62, `StrmBundleEntry.relationship_type` becomes:

```typescript
  /** Operador STRM normalizado; null = a origem nao declara um que saibamos ler */
  relationship_type: StrmRelationshipType | null;
```

In the summary type near line 95, add beside `total_skipped`:

```typescript
  /** Rows kept with no operator because the source cell was unreadable */
  total_unknown_operator: number;
```

- [ ] **Step 5: Rewrite the caller**

Replace lines 252-260 (`const relationship_type = normalizeRelationshipType(...)`
through the leaked-header `continue`) with:

```typescript
    const cell = parseStrmOperatorCell(strm_relationship_raw);

    if (cell.kind === "skip") {
      skipped++;
      continue;
    }

    const relationship_type = cell.kind === "operator" ? cell.value : null;

    if (cell.kind === "unknown") {
      unknownOperator++;
      warnings.push(
        `Row ${i + 5}: unreadable STRM operator "${cell.raw}" (SCF: ${scf_code}) - kept with no operator`,
      );
    }
```

Declare `let unknownOperator = 0;` beside the existing `skipped` counter, return
it from the per-file result, and sum it into `total_unknown_operator` in the
directory summary the same way `total_skipped` is summed at line 342.

The `no_relation` skip branch that follows must keep working — it now tests
`relationship_type === "no_relation"`, which is still reachable.

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @standard/scf-core exec vitest run src/__tests__/strm-bundle-operator.test.ts`
Expected: PASS, 4 tests.

Run: `pnpm --filter @standard/scf-core test`
Expected: PASS. Then `pnpm --filter @standard/schemas typecheck` — the seeder
consumes `entry.relationship_type`, now nullable, and must still compile.

- [ ] **Step 7: Commit**

```bash
git add packages/scf-core/src/importers/strm-bundle-importer.ts packages/scf-core/src/__tests__/strm-bundle-operator.test.ts
git commit -m "fix(scf-core): unreadable bundle operator is unknown, not intersects"
```

---

### Task 9: Retire the duplicate alias map

**Found during Task 1.** `packages/assessment-engine/src/strm-normaliser.ts`
carries a second alias map, `LEGACY_MAP`, including
`source_defined: "intersects"` with the comment "fallback conservador". Its only
consumer is `apps/api-gateway/src/routes/scf.routes.ts:131`, which normalises the
`?relationship_type` query parameter and throws 400 on anything it cannot map —
so this one never writes data. It is a duplication of Task 1's function, not a
fabrication, and it is fixed last for that reason.

**Files:**
- Modify: `packages/assessment-engine/src/strm-normaliser.ts`
- Test: `packages/assessment-engine/src/__tests__/strm-normaliser.test.ts`

**Interfaces:**
- Consumes: `toCanonicalOperator` from Task 1.
- Produces: no signature change — `normaliseRelationshipType(raw: string):
  StrmOperator | null` keeps its shape, so `scf.routes.ts` needs no edit.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { normaliseRelationshipType } from "../strm-normaliser.js";

describe("normaliseRelationshipType", () => {
  it("still accepts the canonical five and the legacy DB aliases", () => {
    expect(normaliseRelationshipType("equal")).toBe("equal");
    expect(normaliseRelationshipType("no_relation")).toBe("no_relation");
    expect(normaliseRelationshipType("direct")).toBe("equal");
    expect(normaliseRelationshipType("related")).toBe("intersects");
    expect(normaliseRelationshipType("intersecting")).toBe("intersects");
    expect(normaliseRelationshipType("no_relationship")).toBe("no_relation");
  });

  // A caller filtering ?relationship_type=source_defined was silently served
  // `intersects` rows. It is not one of the five, so it is a 400.
  it("rejects source_defined instead of aliasing it to intersects", () => {
    expect(normaliseRelationshipType("source_defined")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch the second case fail**

Run: `pnpm --filter @standard/assessment-engine exec vitest run src/__tests__/strm-normaliser.test.ts`
Expected: FAIL — `source_defined` currently returns `"intersects"`.

- [ ] **Step 3: Delegate to Task 1's function**

Replace `LEGACY_MAP` and the body of `normaliseRelationshipType` with a call to
`toCanonicalOperator` from `@standard/scf-core`, which already covers `direct`,
`related`, `intersecting` and `no_relationship` and returns null for everything
else. Delete `LEGACY_MAP` entirely. Keep `STRENGTH_MAP` and the rest of the file
untouched.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @standard/assessment-engine test` and
`pnpm --filter @standard/api-gateway typecheck`
Expected: PASS both.

- [ ] **Step 5: Commit**

```bash
git add packages/assessment-engine/src/strm-normaliser.ts packages/assessment-engine/src/__tests__/strm-normaliser.test.ts
git commit -m "refactor(assessment-engine): one canonicaliser, and source_defined is a 400"
```

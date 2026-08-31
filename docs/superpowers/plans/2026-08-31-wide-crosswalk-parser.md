# Wide Crosswalk Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load the SCF crosswalk — 250 frameworks, 67,248 requirement codes — from the 2026.1.1 catalogue workbook, so the STRM backfill has mappings to grade.

**Architecture:** The catalogue importer looks for crosswalk *tabs*, one per framework. Edition 2026.1.1 has none: the crosswalk is 250 *columns* inside the `SCF 2026.1` sheet, and the `Authoritative Sources` sheet is the index that says which column is which framework. This plan adds a parser for that layout, driven by `Authoritative Sources`, and switches the STRM seeder's framework resolution from name-matching to the Focal Document Identifier the same sheet supplies.

**Tech Stack:** TypeScript, ExcelJS 4.4.0 (streaming reader only — see Global Constraints), vitest, Drizzle ORM, PostgreSQL 16.

**Spec:** measured directly from `assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx` and `assets/strm/` on 2026-08-31. Neither file is in git (both are purchased material; the repository is public). The measurements below ARE the spec — every number was read out of the files, not assumed.

## What the data actually looks like

`Authoritative Sources` sheet, 8 columns, 250 framework rows:

| Column | Example | Use |
|---|---|---|
| `Geography` | `General` | `scf_frameworks.jurisdiction` |
| `SCF Column Header` | `AICPA TSC 2017:2022 (used for SOC 2)` | **Joins to the column header in `SCF 2026.1`** |
| `Focal Document Identifier (FDI)` | `general-aicpa-tsc-2017` | **`scf_frameworks.framework_id`, and the bundle filename key** |
| `Source` | `AICPA` | `scf_frameworks.publisher` |
| `Focal Document Name (FDN)` | `Trust Services Criteria (TSC) (2017)` | `scf_frameworks.name` |
| `Focal Document Title (FDT)` | `American Institute of…` | ignored |
| `Focal Document Source (FDS)` | `https://…` | `scf_frameworks.source_reference` |
| `Set Theory Relationship Mapping (STRM)` | `https://content.securecontrolsframework.com/…` | ignored |

Measured facts, all verified against the files:

- **250/250** `SCF Column Header` values match a real column header in `SCF 2026.1` after whitespace normalisation. Zero misses. The join is exact — do not build a fuzzy fallback.
- **180/250** FDIs have a matching `assets/strm/scf-strm-<FDI>.xlsx`. The other 70 frameworks have no STRM bundle file and will grade nothing; that is expected, not a defect.
- `SCF 2026.1` has **369 columns** and **1468 data rows** (one per control). Column `SCF #` holds the control code.
- **30,749** crosswalk cells are non-empty, holding **67,248** requirement codes. **10,390** cells hold more than one code, newline-separated. Real examples: `"CC1.1\nCC1.1-POF1\nCC1.2\nCC2.3-POF5"`, `"4.1.2\n7.1\n8.1"`, `"EDM01.02\nAPO01.09\nAPO13.01"`.

## Global Constraints

- **ADR-001: the crosswalk states no STRM operator.** Every mapping this parser creates gets `relationship_type = NULL`. The whole branch exists because a previous importer inferred `intersects` here. Never write an operator, a strength score, or any default in this parser.
- Canonical operators are exactly `equal`, `subset`, `intersects`, `superset`, `no_relation`, and none of them belong in this code path.
- **Use `ExcelJS.stream.xlsx.WorkbookReader` fed from a Buffer via `Readable.from`.** `Workbook.xlsx.load()` throws `Cannot read properties of undefined (reading 'comments')` on most files in this bundle edition, and the path-based API hits a Unicode bug on Windows. `packages/scf-core/src/importers/strm-bundle-importer.ts` already does it correctly — copy that call shape.
- The streaming reader yields blank rows that `eachRow({ includeEmpty: false })` dropped. Filter rows whose cells are all empty after trimming, or every row index below shifts.
- Do NOT run `pnpm add`. It re-resolves caret ranges repo-wide and drags unrelated major bumps into the lockfile.
- Nothing under `assets/` is ever committed.
- Gate: `pnpm --filter @standard/scf-core test && pnpm typecheck && pnpm lint`.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `packages/scf-core/src/importers/authoritative-sources.ts` | Parse the index sheet into framework descriptors | 1 |
| `packages/scf-core/src/importers/wide-crosswalk.ts` | Turn framework columns into requirements + mappings | 1 |
| `packages/scf-core/src/__tests__/wide-crosswalk.test.ts` | Tests for both, on hand-built fixtures | 1 |
| `packages/scf-core/src/importers/xlsx-importer.ts` | Call the new parser when no crosswalk tab is found | 1 |
| `packages/schemas/src/strm-focal-document.ts` | FDI-from-filename resolution replaces name matching | 2 |
| `packages/schemas/src/seed-strm-bundle.ts` | Use it | 2 |

---

### Task 1: Parse the wide crosswalk

**Files:**
- Create: `packages/scf-core/src/importers/authoritative-sources.ts`, `packages/scf-core/src/importers/wide-crosswalk.ts`
- Modify: `packages/scf-core/src/importers/xlsx-importer.ts` (Phase 2, around line 1287)
- Test: `packages/scf-core/src/__tests__/wide-crosswalk.test.ts`

**Interfaces:**
- Consumes: the `ParsedRow`/`ScfFramework`/`ScfFrameworkRequirement`/`ScfMapping` types already in `scf-core`.
- Produces:
  - `parseAuthoritativeSources(rows: string[][]): { sources: AuthoritativeSource[]; warnings: string[] }` where `AuthoritativeSource = { fdi: string; columnHeader: string; name: string; geography: string; source: string; sourceUrl: string }`
  - `parseWideCrosswalk(args: { headerRow: string[]; dataRows: string[][]; sources: AuthoritativeSource[]; versionId: string; controlByCode: Map<string, string>; controlCodeColumn: number }): { frameworks: ScfFramework[]; requirements: ScfFrameworkRequirement[]; mappings: ScfMapping[]; warnings: string[] }`

- [ ] **Step 1: Write the failing tests**

`packages/scf-core/src/__tests__/wide-crosswalk.test.ts`. Build the fixtures as plain arrays — no workbook needed, both functions take rows.

Cover exactly these behaviours, and no more:

1. `parseAuthoritativeSources` maps the eight columns onto the descriptor, skipping rows with a blank FDI, and warns once per skipped row.
2. `parseWideCrosswalk` matches a source's `columnHeader` to the header row after collapsing whitespace runs and lowercasing — assert that a header differing only by a newline and doubled spaces still matches, since real headers contain `\n`.
3. A source whose `columnHeader` matches no column produces a warning and no framework. **Assert it does NOT fall back to a partial match** — this is the guard against reintroducing framework misattribution.
4. A cell with `"CC1.1\nCC1.1-POF1\nCC1.2"` produces three requirements and three mappings for that control.
5. Two controls citing the same requirement code produce ONE requirement and TWO mappings.
6. **Every mapping has `relationship_type` null or absent.** Assert it explicitly — this is the invariant the branch exists to protect.
7. A cell referencing a control code absent from `controlByCode` produces a warning and no mapping.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter @standard/scf-core test wide-crosswalk`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `authoritative-sources.ts`**

The header row names the columns; locate them by normalised header text rather than by fixed index, so a column insertion upstream does not silently shift the data. Normalise with `s.toLowerCase().replace(/\s+/g, " ").trim()`. Required headers: `geography`, `scf column header`, `focal document identifier (fdi)`, `source`, `focal document name (fdn)`, `focal document source (fds)`. A missing required header is a warning plus an empty result, never a guess at position.

- [ ] **Step 4: Implement `wide-crosswalk.ts`**

For each source, find its column index by normalised header equality. For each data row: read the control code from `controlCodeColumn`, resolve it through `controlByCode`, then for each source column split the cell on `/[\n;]+/`, trim, drop empties, and emit a requirement (deduped per framework+code) and a mapping.

Set on each requirement: `requirement_code` and `fde_code` both to the code as written — `fde_code` is what the STRM backfill joins on. Set `mapping_source` to the value the codebase already uses for official catalogue data, and `relationship_type` to null.

Expect ~250 frameworks, ~67,248 mappings from the real file. Build the maps once, outside the row loop; a naive nested scan over 1468 × 250 with per-cell lookups is fine, but re-deriving the column indices per row is not.

- [ ] **Step 5: Wire it into the importer**

In `xlsx-importer.ts` Phase 2 (around line 1287), the existing loop only handles `classification.type === "crosswalk"`. Add: after that loop, if `allFrameworks.length === 0`, look for the `Authoritative Sources` sheet and the controls sheet, and run the new parser. Push its results into `allFrameworks`/`allRequirements`/`allMappings` and its warnings into `allWarnings`.

Keep the tab-based path working — older editions still use it, and this is a fallback, not a replacement. If neither path yields a framework, add a warning saying both were tried.

- [ ] **Step 6: Verify tests pass**

Run: `pnpm --filter @standard/scf-core test`
Expected: all pass, including the 78 existing.

- [ ] **Step 7: Prove it against the real workbook**

Write a temporary script (delete before committing — it depends on git-ignored `assets/`) that runs the full catalogue parse and prints frameworks, requirements, mappings, and the count of mappings with a non-null `relationship_type`.

Expected: ~250 frameworks, ~67,248 mappings, and **0 with a non-null operator**. Report the actual numbers; a non-zero operator count is a stop-the-line defect.

- [ ] **Step 8: Commit**

```bash
git add packages/scf-core/src/importers/authoritative-sources.ts \
        packages/scf-core/src/importers/wide-crosswalk.ts \
        packages/scf-core/src/importers/xlsx-importer.ts \
        packages/scf-core/src/__tests__/wide-crosswalk.test.ts
git commit -m "feat(scf-core): parse the column-per-framework crosswalk

Edition 2026.1.1 has no crosswalk tabs — 250 frameworks are columns in the
SCF 2026.1 sheet, indexed by the Authoritative Sources sheet. The tab-based
parser found none, so the catalogue seeded 1468 controls and no crosswalk at
all, leaving the STRM backfill nothing to grade."
```

---

### Task 2: Resolve the framework by identifier, not by name

**Files:**
- Modify: `packages/schemas/src/strm-focal-document.ts`, `packages/schemas/src/seed-strm-bundle.ts`
- Test: `packages/schemas/src/__tests__/strm-focal-document.test.ts`

**Interfaces:**
- Consumes: Task 1's `scf_frameworks.framework_id` now holding the FDI.
- Produces: `fdiFromBundleFilename(filename: string): string | null`.

**Why this replaces what is there.** The seeder currently resolves a framework by exact-matching the bundle's `framework_name` against `scf_frameworks.name`, with collision detection dropping ambiguous names. That was the best available when the only identity the bundle exposed was a name. It is not: bundle files are named `scf-strm-<FDI>.xlsx`, and `Authoritative Sources` supplies the same FDI as `framework_id`. **180 of 250 frameworks match exactly by that key.** An identifier cannot collide the way a display name can, so this removes the guessing entirely rather than guarding against it.

- [ ] **Step 1: Write the failing test**

In `strm-focal-document.test.ts`:

```ts
describe("fdiFromBundleFilename", () => {
  it("extracts the identifier from a bundle filename", () => {
    expect(fdiFromBundleFilename("scf-strm-general-aicpa-tsc-2017.xlsx"))
      .toBe("general-aicpa-tsc-2017");
  });

  it("is case- and path-insensitive", () => {
    expect(fdiFromBundleFilename("SCF-STRM-Emea-Eu-Gdpr-2016.XLSX"))
      .toBe("emea-eu-gdpr-2016");
  });

  it("returns null for anything not shaped like a bundle file", () => {
    // Not a guess-and-hope: a file we cannot identify resolves to no
    // framework and grades nothing, which is the safe direction.
    expect(fdiFromBundleFilename("notes.xlsx")).toBe(null);
    expect(fdiFromBundleFilename("scf-strm-.xlsx")).toBe(null);
    expect(fdiFromBundleFilename("")).toBe(null);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @standard/schemas test strm-focal-document`
Expected: FAIL, `fdiFromBundleFilename is not a function`.

- [ ] **Step 3: Implement it**

```ts
/**
 * The Focal Document Identifier a bundle file is named for.
 *
 * Bundle files are `scf-strm-<FDI>.xlsx`, and `Authoritative Sources` gives
 * the same FDI as the framework's `framework_id`. Resolving on it replaces
 * matching on the focal document's display name, which could collide — an
 * identifier cannot, so the ambiguity this used to guard against cannot arise.
 */
export const fdiFromBundleFilename = (filename: string): string | null => {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const m = base.toLowerCase().match(/^scf-strm-(.+)\.xlsx$/);
  const fdi = m?.[1]?.trim();
  return fdi ? fdi : null;
};
```

- [ ] **Step 4: Verify it passes**

Run: `pnpm --filter @standard/schemas test strm-focal-document`
Expected: PASS.

- [ ] **Step 5: Switch the seeder to it**

In `seed-strm-bundle.ts`, replace the framework lookup: select `id` and `frameworkId` from `scfFrameworks`, key the map by `frameworkId`, and resolve each file with `fdiFromBundleFilename(file.filename)`.

Delete `buildFrameworkByName`, `normaliseFrameworkKey` and `resolveFrameworkId` along with their tests **only if nothing else imports them** — grep first and report what you found. Keep the reporting: files whose FDI resolves to no framework still land in `unresolvedFocalDocuments` and are printed, because a framework in the bundle but not in the catalogue is a real finding.

The `Framework resolved: N of M rows` line stays. It is the go/no-go signal for the re-import.

- [ ] **Step 6: Gate and commit**

Run: `pnpm --filter @standard/schemas test && pnpm typecheck && pnpm lint`

```bash
git commit -am "fix(schemas): resolve the STRM framework by identifier, not by name

Bundle files are scf-strm-<FDI>.xlsx and Authoritative Sources supplies the
same FDI as framework_id, so the focal document's display name — which could
collide, and which the importer used to read as the literal string Sheet1 —
is no longer load-bearing."
```

---

### Task 3: Run it end to end and record the measurement

Not an implementation task. Run in order against the local database, recording each number:

- [ ] `pnpm db:seed:scf` — expect ~250 frameworks, ~67,248 mappings, 1468 controls
- [ ] `pnpm db:seed:strm` — expect `Framework resolved:` to be a large fraction of 53,099 rows, with roughly 3 bundle files unresolved (183 files against 180 matching FDIs)
- [ ] `pnpm --filter @standard/schemas db:backfill:strm-operators:dry-run` — the per-framework coverage table
- [ ] Record the ISO 27001 2022 row specifically: `total`, `graded`, `equal`, `subset`, `superset`. The customer measured 316 mappings, all `intersects`. If `graded` is 0, say so plainly.
- [ ] Commit the table to `docs/measurements/2026-08-31-strm-coverage-by-framework.txt`

## Self-Review

**Spec coverage.** Every measured fact drives a task: the Authoritative Sources layout and the 250/250 column match are Task 1 Steps 3-4; the multi-code cells are Task 1 Step 1 case 4; the FDI↔filename key is Task 2; the 180/250 gap is handled by reporting rather than guessing.

**Placeholders.** None — every step carries the code or the command and its expected result.

**Type consistency.** `AuthoritativeSource.fdi` feeds `ScfFramework.framework_code`, which the repository writes to `scf_frameworks.framework_id`, which Task 2's map is keyed by, which `fdiFromBundleFilename` returns. One value, four names, checked end to end.

**Known risk.** Task 2 assumes Task 1 writes the FDI to `framework_id`. If Task 1 puts the display name there instead, Task 2 resolves nothing — and it will show as `Framework resolved: 0`, which Task 3 reads before anything is trusted.

# Runbook — STRM bundle provenance and re-import

**Status:** applied locally; staging and production not yet run
**Origin:** customer questions Q11 and Q12, and `CONTRACT_AUDIT.md` §I
**Owner:** platform engineering
**Risk:** medium (rewrites `scf_mappings.relationship_type` for ~46k rows; no schema change beyond migrations 0059/0060, which are journalled)

## Why this exists

The customer measured 79,127 of 79,133 `scf_mappings` carrying `intersects`, which
meant ADR-001's STRM weights were never exercised: every mapping scored the same.
Six separate places fabricated that operator — the XLSX importer, the CSV importer,
the STRM seeder, the bundle importer, and two dashboard/intelligence proxies. All
six are gone. This runbook is how the real operators get loaded in their place.

**The outcome to expect, stated plainly:** a mapping the bundle does not cover keeps
`relationship_type = NULL` and produces **no** coverage figure. That is the intended
result, not a gap to close later. 30% of mappings end up NULL, and 73 of 250
frameworks grade nothing at all. A framework with no graded mapping cannot be given a
compliance percentage, and the API now returns `null` with a `*_reason` rather than
inventing one.

## Step 1 — The bundle, and why it is not in git

| | |
|---|---|
| Product | SCF Set Theory Relationship Mapping (STRM) bundle, edition **2026.1** |
| Vendor | Secure Controls Framework — purchased material, published under `content.securecontrolsframework.com` |
| Files | **183** `.xlsx`, one per focal document, **10.2 MB** total |
| Local path | `assets/strm/scf-strm-<FDI>.xlsx` |
| Obtained | file timestamps read 2026-08-31 13:38–13:39 |
| Catalogue | `assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx`, 5,093,539 bytes, 2026-08-28 |

**Decision: the bundle is NOT committed.** `.gitignore` excludes `assets/strm/` and
`assets/*.xlsx`. The reason is licensing, not size — at 10.2 MB it would fit
comfortably, but it is purchased material and this repository is public. Only the
checksum manifest is committed, so a later run can prove it read the same bytes.

## Step 2 — Verify the manifest before trusting any number

```bash
sha256sum -c assets/strm.manifest.sha256 | grep -c ': OK$'
```

Expected: **183**. Last verified 2026-09-04, 183/183 OK, 0 mismatches.

If the count differs, stop: the bundle is not the edition these measurements were
taken against, and nothing below is comparable.

## Step 3 — Bring up a database with the catalogue seeded

```bash
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:migrate
pnpm db:seed:scf
```

Expected, and confirmed on 2026-09-04:

| | |
|---|---|
| `scf_controls` | 1,468 |
| `scf_frameworks` | 250 |
| `scf_framework_requirements` | 34,262 |
| `scf_mappings` | 67,248 |

A control count under 1,400 means the catalogue seed did not complete and every
denominator below is wrong.

## Step 4 — Prove the importer writes no operator

Before the bundle is loaded, the crosswalk must carry no operator at all:

```bash
docker exec standard-postgres psql -U standard -d standard -tAc \
  "SELECT count(*) FROM scf_mappings WHERE relationship_type IS NOT NULL"
```

Expected: **0**. This is the behavioural proof that the catalogue importer no longer
infers `intersects`; the unit test for it can only assert at source level. Any other
number means a writer is still setting the column and the re-import must not proceed.

## Step 5 — Load the bundle

```bash
pnpm db:seed:strm:dry-run   # parse only, no writes
pnpm db:seed:strm
```

Measured 2026-09-04:

| | |
|---|---|
| Files processed | 183 |
| Entries parsed | 54,220 |
| Rows upserted | 53,664 (99.0% of parsed) |
| Framework resolved | **48,044 of 53,664 (89.5%)** |
| Focal documents unresolved | 3 |

`Framework resolved` is the go/no-go signal. A low rate is fixed by correcting the
name in the **catalogue** — never by widening the matcher, which is how operators got
misattributed between frameworks in the first place.

The three unresolved files, and why (their filename FDI has no match in
`Authoritative Sources`; they account for 5,589 ungraded mappings):

- `scf-strm-general-general-mitre-att_ck-16-1.xlsx` — doubled `general-general-` prefix
- `scf-strm-general-general-mpa-csbp-5-3-1.xlsx` — doubled `general-general-` prefix
- `scf-strm-scf-dpmp-2025.xlsx` — no corresponding FDI in the catalogue

These are vendor filename defects, and they are reported, not worked around.

## Step 6 — Backfill the operators

```bash
pnpm --filter @standard/schemas db:backfill:strm-operators:dry-run  # coverage table
pnpm --filter @standard/schemas db:backfill:strm-operators          # apply
```

The dry run prints coverage per framework, committed as
`docs/measurements/2026-08-31-strm-coverage-by-framework.txt`. Read the
closing lines before anything else:

```
46844 of 67248 mappings graded (69.7%). 13157 reach equal or subset. 73 frameworks get nothing.
0 mappings had bundle rows that disagree and stay ungraded.
0 mappings matched a bundle row for their own framework whose operator was NULL.
5589 mappings match a bundle row whose focal document did not resolve to a framework.
```

## Step 7 — Verify

**No operator without provenance.** Every operator must trace to a bundle row for
*its own framework* stating that same operator:

```bash
docker exec standard-postgres psql -U standard -d standard -tAc "
  SELECT count(*) FROM scf_mappings m
  WHERE m.relationship_type IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM scf_framework_requirements r
      JOIN scf_strm_relationships s
        ON s.scf_control_id   = m.scf_control_id
       AND s.fde_code         = r.fde_code
       AND s.scf_framework_id = r.scf_framework_id
      WHERE r.id = m.scf_framework_requirement_id
        AND s.source = 'scf_official_strm_bundle_2026.1'
        AND s.relationship_type = m.relationship_type)"
```

Expected: **0**. Measured 2026-09-04: 0.

The framework predicate matters. Before migration 0060 the join was on
`(scf_control_id, fde_code)` alone, so two frameworks using a requirement code like
`AC-1` against the same control shared one row and whichever bundle file was parsed
last decided the operator both were graded with.

**The distribution actually changed.** This is the direct before/after against the
customer's measurement:

```bash
docker exec standard-postgres psql -U standard -d standard -c "
  SELECT coalesce(relationship_type::text,'(null)') AS op, count(*)
  FROM scf_mappings GROUP BY 1 ORDER BY 2 DESC"
```

| Operator | Before (customer, 2026-08) | After (2026-09-04) |
|---|---|---|
| `intersects` | 79,127 of 79,133 (99.99%) | 33,644 (50.0%) |
| `(null)` | — | 20,404 (30.3%) |
| `subset` | — | 8,361 (12.4%) |
| `equal` | — | 4,796 (7.1%) |
| `superset` | — | 43 (0.1%) |

**The API serves null.** `pnpm check:openapi` must report the spec is current
(`366 paths, 407 operations` as of 2026-09-04). `relationship_type` is nullable in
the published schema, and the dashboard and intelligence endpoints return
`null` plus a `*_reason` of `nothing_assessable` rather than a fabricated percentage.

## Step 8 — Staging and production

**Not yet run.** Everything above was measured against the local Docker database.

Follow `docs/runbooks/apply-orphaned-migrations.md` Step 1 first to establish real
state. Migrations `0059` and `0060` are journalled, so `pnpm db:migrate` carries
them; the seed and the backfill are manual steps run in the same window. Record the
Step 7 numbers for each environment here as they are applied.

| Environment | Date applied | Rows graded | Provenance check |
|---|---|---|---|
| local | 2026-09-04 | 46,844 | 0 |
| staging | — | — | — |
| production | — | — | — |

## Step 9 — What the customer is owed

**Q11 (when).** Not yet applied to a customer-facing environment; local verification
completed 2026-09-04. It is an in-place correction of the existing SCF version, not a
new version — control UUIDs do not rotate, which matters because the customer keys on
`control_code` + version precisely to survive that.

**Q12 (per-framework coverage).** `docs/measurements/2026-08-31-strm-coverage-by-framework.txt`.

**ISO 27001 (2022), their blocking example.** They measured 316 mappings, all
`intersects`. After the re-import: **316 total, 316 graded, 0 equal, 59 subset, 0
superset** — so 257 remain `intersects`, but now because the bundle says so.

**Two corrections they are owed.**

1. `CONTRACT_AUDIT.md` §I records that both `intersects` fallbacks were removed. One
   of them — the seeder's — was still present until this work. They built their
   `strength_is_trustworthy` column on our account of what had been fixed.

2. §I also reports "746 leaked header rows discarded on import". **567 of those 746
   were not leaked headers.** `scf-strm-usa-federal-doe-c2m2-2-1.xlsx` duplicates its
   first column, shifting every later column right by one; read at fixed offsets its
   STRM Relationship column landed on STRM Rationale, whose value is the literal
   `Functional`, which the parser classifies as a leaked header. The entire DOE C2M2
   v2.1 framework — 565 gradeable mappings — was discarded in silence. Columns are now
   located by header text, and C2M2 grades 565 of 565.

## Known limitations

- **`projection.routes.ts:198`** computes its own `compliance_percentage` from status
  counts and counts unmapped requirements in the denominator. It is not STRM-weighted
  and fabricates no operator, so it was deliberately left alone — but as NULL
  operators become normal it reports "0%" for frameworks the dashboard correctly
  declines to score. Two routes will disagree in front of the same customer.
- **`packages/scf-core/src/__tests__/strm-bundle-file-parsing.test.ts` is flaky**, at
  roughly 1 run in 8. ExcelJS's streaming reader intermittently fails to read the
  archive ExcelJS itself just wrote (`Cannot read properties of undefined (reading
  'sheets')` — the worksheet entry arrives before `workbook.xml`). It predates this
  work at ~2 in 8 and was halved by writing the fixture synchronously from a buffer.
  Removing it entirely means either committing frozen `.xlsx` fixtures or dropping the
  file round-trip; the real bundle files are written by Excel and are unaffected.

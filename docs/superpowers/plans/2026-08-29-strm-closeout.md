# STRM Re-import — Closeout Plan

**Purpose:** get the `strm-reimport` branch from "Task 1 of 3 nearly done" to merged, and state precisely what remains blocked on the SCF bundle afterwards.

This is a sequencing plan, not an implementation plan. The code-level detail already lives in:
- `docs/superpowers/plans/2026-08-28-strm-reimport.md` (parent — Tasks 1-5, 9, 10 done; 6-8 open)
- `docs/superpowers/plans/2026-08-28-strm-framework-scoped-operators.md` (in execution — Task 1 of 3)

Ledgers: `.superpowers/sdd/2026-08-28-strm-reimport/progress.md` and `.superpowers/sdd/2026-08-28-strm-framework-scoped-operators/progress.md`. Both are git-ignored and die with their workspace; anything in them that must outlive the branch is copied into this file or into a commit message.

## The fork

"Finalizar" has two possible endpoints, and only one is reachable today:

| Endpoint | Reachable? |
|---|---|
| **A. Branch closed and merged** — the fabrication is out of the code, the schema and the tooling are correct, everything is verified | Yes. Nothing below depends on the bundle. |
| **B. The customer has their coverage measurement** | No. Needs the 183 XLSX in `assets/strm/`, which are not in this repo and cannot be reconstructed from it. |

This plan drives to **A**. Phase 4 states what B needs, so that when the bundle lands the work is a runbook and not a rediscovery.

---

## Phase 1 — Finish the framework-scoped plan

Three dispatches remain, in this order. Each is a fresh implementer + a task review; the existing SDD loop applies unchanged.

- [ ] **1.1 — Re-review Task 1's fix round.** Scope: `b2fbdbc..8dfde5d` (the lockfile pruning only). Task 1 is not `complete` in its ledger until this returns. If the package cannot be built over that range — `b2fbdbc` is dangling after the amend, reachable only via reflog — review `0c86c2e..8dfde5d` and say so in the dispatch.
- [ ] **1.2 — Task 2: the seeder records the focal document.** `packages/schemas/src/seed-strm-bundle.ts` plus a new `strm-focal-document.ts` of four pure helpers. Carry into the dispatch the two PGlite/drizzle runtime facts Task 1 discovered: `db.execute()` results need `.rows` unwrapped, and a unique-violation surfaces on `.cause.message`, not `.message`.
- [ ] **1.3 — Task 3: the backfill grades per framework.** `packages/schemas/src/backfill-mapping-strm-operators.ts`, and it appends to the test file Task 1 created rather than recreating it. Its Step 8 edits the parent plan's Task 7 to record that this blocker is lifted.

**Gate:** `pnpm check:migrations && pnpm lint && pnpm typecheck && pnpm test:unit` green, plus `pnpm --filter @standard/api-gateway test` (161 tests — it is in `test:ci` via `test:security` and is not covered by `test:unit`).

## Phase 2 — Recover the lost findings, then triage

The parent plan's final whole-branch review returned 2 Critical, 3 Important, 6 Minor. The 2 Critical are fixed (commit `cdaaf57`) and Important #3 is what Phase 1 exists to close. **The other 2 Important and 6 Minor exist only in the transcript of the session that produced them — they are not written down anywhere.**

- [ ] **2.1 — Regenerate the list.** `/code-review` over `0065eb7..HEAD` at high effort. This re-derives the residual findings and simultaneously reviews everything Phase 1 added, so it replaces rather than duplicates the closeout review.
- [ ] **2.2 — Triage against the deferred minors** already recorded:
  - double space in `0060_strm_relationships_focal_document.sql:54` — cosmetic
  - unused `existsSync` import in `xlsx-importer-no-inferred-operators.test.ts:2` — eslint warns, does not fail
  - pnpm dependency cycle `@standard/scf-core` ↔ `@standard/schemas` — benign while both ship source via `main: src/index.ts`; breaks if either moves to build-then-publish
  - `projection.routes.ts:198` computes its own `compliance_percentage` from status counts and returns `0` where `null` would be more honest. Not STRM-weighted, fabricates no operator — deliberately left alone, and worth a decision now rather than a rediscovery later.
- [ ] **2.3 — One fix wave** for whatever triage says blocks merge, then one scoped re-review. Not one dispatch per finding.

## Phase 3 — Integrate the branch

**Decision required from Ricardo — nothing below happens without it.** Everything so far is local; no remote has been touched.

- [ ] **3.1 — Decide what happens to the base.** `strm-reimport` sits on `fix/local-dev-bring-up`, which carries three commits (`f58265b`, `84f505b`, `0065eb7`) that were pre-existing uncommitted local work, committed so that `pnpm db:migrate` and `docker compose up` would work for this plan's tasks. Options: keep as its own PR first, fold into this branch, or drop.
- [ ] **3.2 — Decide the shape.** One PR off `main`, or two (local-dev fixes, then STRM). The STRM work is ~12 commits with a coherent story; squashing loses the migration-by-migration reasoning that the commit messages carry.
- [ ] **3.3 — Push and open the PR.** Requires explicit go-ahead: this is the first outward-facing action in the whole effort.
- [ ] **3.4 — Delete both SDD workspaces.** Only after the PR exists — git history becomes the record. Everything in the ledgers that outlives the branch is already in this file.

## Phase 4 — Blocked on the bundle (parent plan Tasks 6-8)

Not part of closing the branch. Recorded so the work is a runbook when `assets/strm/` is populated:

- **Task 6** — acquire the bundle and place the 183 XLSX in `assets/strm/`.
- **Task 7** — dry run. Read in this order, and stop at the first number that is implausible:
  1. `pnpm db:seed:strm:dry-run` — the operator breakdown. The parent ledger already recorded the raw scan: equal 4,850 / subset 8,856+116 / superset 42+1 / intersects 39,373+295+120, plus 746 leaked header rows discarded. The bundle is not flat, so the plan's kill-switch will not trip.
  2. **"Framework resolved: N of M rows"** and the unresolved-file list — new, from Phase 1's Task 2. This is the number that decides whether per-framework coverage means anything. A low rate is fixed by correcting the name in the catalogue, **never** by widening the matcher.
  3. `pnpm db:backfill:strm-operators:dry-run` — coverage per framework, now with `ambig` and `unres` columns.
- **Task 8** — apply, verify, and close the loop with the customer. Before the backfill runs, assert `SELECT count(*) FROM scf_mappings WHERE relationship_type IS NOT NULL` returns 0 — that is the behavioural proof the importer no longer writes an operator, which the parent plan's Task 2 could only assert at source level.

## Rulings made during execution

Decisions taken on Ricardo's behalf while the plans ran, so they can be reworked if any is wrong. The SDD ledgers they came from are git-ignored and die with their workspaces; this is the durable copy.

### Parent plan (2026-08-28-strm-reimport)

1. **Committed pre-existing uncommitted local-dev work** to a new branch `fix/local-dev-bring-up` (`f58265b`, `84f505b`, `0065eb7`) and based the STRM branch on it. Task 3 and Task 7 both need a from-scratch `pnpm db:migrate` and a working `docker compose up`, neither of which worked on `c4b3510`. *Cost if wrong:* three commits on a local branch, reorderable, squashable or droppable; no shared branch touched.
2. **Worktree placed at `C:/Users/resper/worktrees/`** rather than beside the project, because the project lives in a OneDrive-synced folder and a second `node_modules` there would sync continuously. *Cost if wrong:* work sits outside the folder originally named; one `git worktree remove` to relocate.
3. **Task 4 stores the canonical operator on the row** instead of calling `toCanonicalOperator` twice as the plan's text had it. *Cost if wrong:* none, a readability choice inside one function.
4. **Task 7's "Expected: 1473" controls is the customer's measurement, not something this repo asserts.** The implementer records the actual count and continues, stopping only under 1400. *Cost if wrong:* a partially seeded catalogue skews the coverage denominators, which the per-framework totals would surface as implausible.
5. **A reviewer's ⚠️ on `strm-normaliser.ts:56` (`source_defined → intersects`) was real but not a Task 1 gap**, so it became Task 9 rather than entering Task 1's fix loop. *Cost if wrong:* a caller filtering `?relationship_type=source_defined` silently receives `intersects` rows — a wart, not a fabrication, since that path never writes.
6. **Task 2's source-level regression test was accepted rather than replaced** with a behavioural one, because a behavioural test needs the 40MB workbook and a seeded catalogue. Mitigation carried into Task 8: assert `SELECT count(*) FROM scf_mappings WHERE relationship_type IS NOT NULL` returns 0 before the backfill. *Cost if wrong:* if Task 8 drops that query, the invariant is protected only against a byte-identical regression.
7. **Task 3 was not reopened** for the missing schema half of migration 0059; the one-line fix was carried into Task 4's dispatch as a prerequisite instead. *Cost if wrong:* Task 4 fails its typecheck gate and the fix lands one round later.
8. **Task 10 was added mid-execution** after finding a fourth `intersects` fallback in the bundle importer's `normalizeRelationshipType`, upstream of everything Task 4 fixed and therefore making Task 4 decorative without it.
9. **The framework-less unique index was PARKED as a blocker on Task 7** rather than fixed in a fix wave — it needed a migration, a seeder rework and validation against a bundle not in the repo. That park is what the framework-scoped plan then closed.
10. **`projection.routes.ts:198` was left alone** during the Critical fix wave: it computes its own percentage from status counts, is not STRM-weighted, and fabricates no operator. Confirmed sound by the final review, with one consequence worth recording: it still counts unmapped requirements in its denominator, so as NULL operators become normal it will report "Critical compliance gaps (0%)" for frameworks the dashboard now correctly declines to score. **Two routes will disagree in front of the same customer.** Not fixed.

### Framework-scoped plan (2026-08-28-strm-framework-scoped-operators)

11. **Two defects in my own plan's test fixtures were fixed pre-flight**, before dispatching: `scf_controls.scf_domain_id` is NOT NULL and had no domain row, and `scf_mappings` has no framework column. *Cost if wrong:* none; both verified against the schema.
12. **Task 1's deviations from the plan's test code were accepted** — unwrapping `.rows` from `db.execute()` and asserting on `.cause.message` — after the reviewer verified against the installed drizzle source that the test still fails if `NULLS NOT DISTINCT` were absent. The plan's snippet was wrong about the runtime, not the implementation.
13. **Task 3's two plan-mandated Important findings were fixed rather than parked.** The plan exists to end a fabrication class; shipping it with no guard against that class returning is the same failure one level up. *Cost if wrong:* two tests a future refactor must keep in step by hand.
14. **Task 3's unrequested edit to `strm-provenance.test.ts` was accepted**, after the reviewer rebuilt the regex by hand and confirmed it still fails when the source filter is dropped — a tightening, not a loosening.
15. **The version-blind framework lookup was fixed by collision detection only, not by adding version scoping.** The seeder has no `scf_version` parameter, and `controlCodeToId` and `ctrlToMappingIds` are version-blind the same way (pre-existing). *Cost if wrong:* on a multi-version database every framework name collides and coverage drops to zero — loudly, in the number Phase 4 tells the operator to read, rather than silently misgrading.
16. **A Minor was promoted into the final fix wave**: the coverage report's unlabelled remainder, because "the bundle covers this mapping but stated an operator we could not read" is the state this branch introduces and it was invisible in the instrument Phase 4 makes the go/no-go signal.
17. **The re-review's one residual is PARKED**: the new coverage test's comment claims the four buckets "sum to total with nothing left over", which holds only for its fixtures — a mapping the bundle mentions nowhere lands in `total` and in no bucket. The buckets themselves were verified non-overlapping and correctly counted. **This is the one thing worth a two-line follow-up before merge** — either scope the comment to "of mappings the bundle mentions", or add a fifth "not in the bundle" bucket.

### Found late, worth naming

18. The final whole-branch review found a **sixth fabrication site both plans missed**: `csv-importer.ts` coerced an unreadable operator to `intersects` into `scf_mappings`, through a live admin route, using the same "safe fallback" comment migration 0059's rationale quotes as the thing being ended. Fixed in `f3bbf3f`. The lesson for any future audit of this kind: enumerate the importers from the factory registration, not from the ones a plan happens to name.

## What "done" looks like

The customer's original complaint was that 79,127 of 79,133 mappings carried `intersects`, so ADR-001's weights were never exercised. At the end of Phase 3 the codebase can no longer produce that state — four separate fabrication sites are gone (importer, seeder, bundle importer, dashboard/intelligence proxies), absence is representable end to end, and an operator belongs to the framework that stated it. What the codebase cannot do without the bundle is prove the real numbers are better. That proof is Phase 4, and it is one seeding run away once the files arrive.

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

## What "done" looks like

The customer's original complaint was that 79,127 of 79,133 mappings carried `intersects`, so ADR-001's weights were never exercised. At the end of Phase 3 the codebase can no longer produce that state — four separate fabrication sites are gone (importer, seeder, bundle importer, dashboard/intelligence proxies), absence is representable end to end, and an operator belongs to the framework that stated it. What the codebase cannot do without the bundle is prove the real numbers are better. That proof is Phase 4, and it is one seeding run away once the files arrive.

# Remediation Plan — Closing the Audit Findings

**Date:** 2026-08-26
**Base:** PR #127 at `5d4ea44`
**Horizon:** ~6 weeks with one dedicated person
**Hard deadline:** July 2027 (see Phase 3)
**Rendered:** https://claude.ai/code/artifact/a232a9e5-2e8a-4b6c-9e8c-ec193c220cd0
**Companions:** `docs/audit/2026-08-26-platform-security-audit.md`,
`docs/operations/github-hygiene-and-maturity.md`

## Why this is a plan and not a checklist

The findings are not independent and cannot be attacked in the order that looks
most urgent. Applying RLS before preparing the workers blinds the API; applying
partitioning without validating the data destroys the ledger. Three things the
findings list does not show decide the sequence.

### 1. Nobody knows the real state of the production database

The audit proved nine migrations never ran *through the runner*. It did not prove
what exists in the database — someone may have applied SQL by hand, partially, at
any point in the last three months. Every database item here depends on that
truth, and it is not established. Phase 0 exists to end the guessing.

### 2. The RLS bypass is still there — a criticism of my own work in #127

PR #127 added `FORCE ROW LEVEL SECURITY` and `WITH CHECK` to `0053`, closing two
of A-01's three defects. **The third remains:** the policies keep 136 bypass
clauses.

```sql
ALTER TABLE ... FORCE ROW LEVEL SECURITY;           -- added
CREATE POLICY ... USING (organization_id = ...)
  OR NULLIF(current_setting('app.current_org_id', true),'') IS NULL   -- still there
  WITH CHECK (organization_id = ...);               -- added
```

With that `OR`, any connection that does not set the variable sees *every* tenant.
Workers, queue consumers and jobs do not go through the gateway's transactional
envelope, so today they depend on exactly this bypass. Removing it without
preparing those paths takes down ingestion, queues and retention at once. Keeping
it means RLS is a suggestion, not a guarantee. This is the most delicate decision
in the plan — Phase 4.

### 3. A deadline nobody set

`0049` creates static ledger partitions ending `2027-07-01`, and the `pg_partman`
from `0057` manages only `security_events` — **not `assessment_control_events`,
not `audit_logs`**.

```
ledger partitions   2026-04-01 -> 2027-07-01   (static)
partman manages     security_events            (only)
```

If `0049` is applied as written, from July 2027 every `INSERT` into the ledger and
audit log fails. The audit trail — the product — stops recording. That is a date,
not a risk.

---

## Phase 0 — Establish real production state

**Half a day. Blocks everything.**

Run against production and the auth branch:

```sql
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;

SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r';

SELECT tgname, tgrelid::regclass FROM pg_trigger
WHERE tgname LIKE 'trg_ace_%' OR tgname LIKE 'trg_al_%';

SELECT relname, relkind FROM pg_class WHERE relname LIKE 'assessment_control_events%';

-- DECISIVE for Phase 3: any rows outside the partition range?
SELECT min(occurred_at), max(occurred_at), count(*) FROM assessment_control_events;
SELECT min(created_at),  max(created_at),  count(*) FROM audit_logs;

SELECT current_user, session_user,
       pg_has_role(current_user,'pg_read_all_data','member');

SELECT * FROM pg_available_extensions WHERE name='pg_partman';
```

The last query is eliminating: if Neon does not offer `pg_partman`, migrations
`0056` and `0057` fail to apply and must be rewritten with cron-based rotation
first.

**Gate:** a dated runbook in `docs/runbooks/` with the answers. Without it,
Phases 3 and 4 do not start.

## Phase 1 — Ship what is ready, lock the regression

**1 hour. No risk.**

1. Confirm `main` protection survived going private (needs a paid plan; on Free
   it silently stops applying).
2. Merge #127 — closes C-02, C-03, A-02, A-03, M-01, M-06, M-07 and three CI bugs.
3. Make `Lint & Typecheck`, `Unit & Contract Tests`, `Regression, Ev & E2E`
   **required checks**.
4. Close #118 and #101; review #120–126 as a batch.
5. Restore `NEON_API_KEY` / `NEON_PROJECT_ID` to bring Deploy Preview back.

Item 3 is the highest-return action in the plan. Item 5 restores the environment
where every PR proves its own migrations — the control that would have caught C-01.

**Gate:** a test PR cannot merge with red CI. Verified, not assumed.

## Phase 2 — Prepare the workers to live without the bypass

**3–5 days. Prerequisite for Phase 4.**

Closes no finding by itself. It exists so Phase 4 becomes possible — and it is the
phase usually skipped, with the result that RLS never leaves paper.

- Extract `withRlsTenantContext` from the gateway into a shared package.
- Wrap each consumer in the tenant context of the message it processes (messages
  already carry `organization_id`).
- For legitimately cross-tenant work (retention, platform jobs), create a
  **separate database role** with `BYPASSRLS`, used only by those processes and by
  migrations. That is the correct replacement for `OR ... IS NULL`: the bypass
  stops being a hole in the policy and becomes a distinct, auditable credential.

**Criticism:** the hidden cost lives here. It is not hard, it is *scattered* —
each consumer obtains context its own way, and three share divergent copies of the
agent-runtime repository. Estimating 3 days and spending 8 is the common outcome.
Consolidate the copies first rather than fixing the same thing three times.

**Gate:** no write path depends on a missing `app.current_org_id`, proved by a test
running the consumers against Postgres with RLS on and no bypass.

## Phase 3 — Apply the nine orphaned migrations

**Maintenance window. Highest operational risk.**

| Migration | Nature | Risk |
| --- | --- | --- |
| 0050 | index | Low — use `CONCURRENTLY` |
| 0051, 0055 | enums | Low — validate existing values first |
| 0052 | new TPRA tables | Low — additive |
| 0054 | ledger triggers | Medium — only after 0049 |
| 0056, 0057 | pg_partman | Medium — depends on the extension existing |
| 0053 | 53 RLS policies | **High** — see Phase 4 |
| 0049 | partitions the ledger | **Critical** — below |

### 0049 is destructive and has two design faults

```sql
ALTER TABLE assessment_control_events RENAME TO ..._old;
CREATE TABLE assessment_control_events (...) PARTITION BY RANGE (occurred_at);
INSERT INTO assessment_control_events SELECT * FROM ..._old;
DROP TABLE assessment_control_events_old;   -- burns the boat
```

**Fault 1 — fixed range.** Partitions cover `2026-04-01` to `2027-07-01`. Any row
with `occurred_at` outside that aborts the `INSERT` mid-migration. Phase 0's date
query exists to know this beforehand.

**Fault 2 — the `DROP` removes the rollback.** After it there is no way back: a
defect found an hour later means restoring a backup. Change to
`RENAME TO ..._archived` and drop in a separate migration weeks later.

**And the deadline:** add `partman.create_parent` for both ledger tables, or July
2027 is when the platform stops recording audit data.

### Sequence

1. Verified backup — restored into a Neon branch and queried. An untested backup
   is not a backup.
2. Rehearse the whole sequence on that branch with real data. Time it.
3. Fix `0049` before applying: no `DROP`, partman for the ledger, range covering
   real data.
4. Apply in the window: `0049` → `0050–0052` → `0054` → `0055–0057`.
   `0053` stays out — that is Phase 4.
5. Verify triggers using the test inside `0054` itself: an `UPDATE` must be rejected.

**Gate:** `UPDATE` on the ledger rejected in production; identical row counts before
and after; future partitions being created automatically.

## Phase 4 — Turn RLS on for real

**1 week. Reversible, but loud.**

Only after Phases 2 and 3.

1. Remove the 136 `OR ... IS NULL` clauses from `0053`.
2. Create the application role without `BYPASSRLS`; migrations and cross-tenant
   jobs use the separate administrative role from Phase 2.
3. Apply on a Neon branch with a production copy and run the full suite against it.
4. Apply to production with rollback ready: `ALTER TABLE ... NO FORCE ROW LEVEL
   SECURITY` restores previous behaviour in seconds, no migration needed.

**The failure mode that matters:** under strict RLS, a query with no tenant context
does not error — **it returns empty**. The symptom is not an exception in the log,
it is a customer seeing an empty list, and it goes unnoticed for hours. Instrument
first: count rows returned per route and alert on a sharp drop. Without that you
trade a silent breach for a silent outage.

**Gate:** an integration test where the application connection, without
`app.current_org_id`, reads zero rows from every tenant table.

## Phase 5 — Close the authorization gap on 128 routes

**2 weeks, in batches. Parallel to Phases 2–4.**

Not the mechanical work it appears to be. The split matters:

| Group | Routes | Nature |
| --- | --- | --- |
| **A — permission exists** (privacy 32, intelligence 9, scf 5) | ~50 | Declare what the enum already defines. Mechanical, batch-reviewable. |
| **B — permission does not exist** (risk, ropa, regulations, tpra, risk-register, governance-ref, risk-catalog, reference-data) | ~78 | Requires *designing* authorization: which verbs, what read/write split, what an org_admin may do. Product design, not form-filling. |

**Two traps.**

*Declaring `permissions` changes API-key reach.* After #127, scopes derive from
permissions — so every route that gains a permission automatically becomes
reachable by keys holding the matching scope. Intended, but it is a change in
exposed surface with every batch. Extend `m2m-scope-coverage` in the same PR,
never afterwards.

*The two-role model may not fit group B.* With only `platform_admin` and
`org_admin`, granting `risk:write` to org_admin grants it to every user in the
organization. If the product needs an analyst who reads risk but cannot approve,
that is a third role — a product decision better made before writing 78
declarations that might need redoing.

**Gate:** a test that fails if any protected route declares no `permissions`,
making the debt impossible to reintroduce.

## Phase 6 — Contract, pending decision, hygiene

**2 weeks. Parallel.**

- **OpenAPI (14% coverage).** A test requiring an `openapi` block on every new
  route, plus a per-domain sweep. In an API-first product, a contract describing
  52 of 407 paths is a product defect, not a documentation one.
- **ADR for the retention × ledger conflict (M-02).** Blocks LGPD compliance and
  has no obvious technical answer: partition-drop purge, anonymisation, or formal
  ledger exemption. Needs a legal decision before a technical one — and Phase 3
  makes the conflict real, so it cannot wait until after it.
- **Consolidate the 16 test-kits** — all 16 signatures differ; no two copies are
  alike. It already cost a test that sat outside the runner.
- **Encoding** — 306 BOM files and 184 with mojibake, in one mechanical PR, last,
  so it does not conflict with everything else.
- **release-please** — anchor with a manifest at `1.2.2` and resume releases.

**Gate:** M-02 ADR approved; OpenAPI coverage above 80%; one release published.

---

## What this plan does not solve

- **The 20 transitive advisories will not reach zero.** They come from
  `brace-expansion`, `fast-uri`, `react-router`, `sharp` — dependencies of
  dependencies, not all with a fixed version available. The realistic path is
  case-by-case review with versioned suppressions for what is not reachable.
  Chasing absolute zero here spends weeks on noise.
- **None of this proves production is clean today.** While C-02/C-03 were exposed,
  there is no way to know without log analysis whether anyone exploited them. If
  that question matters, it is separate forensic work — and the platform has
  `security_events` to start from.
- **Six weeks assumes one dedicated person.** Split across other delivery, it
  becomes a quarter. And Phase 3 needs a maintenance window that depends on
  customer agreement, not engineering.

## If there were time for only one thing

The required checks in Phase 1. Five minutes, and the only change that stops the
repository returning to the state this audit found it in — three workflows broken
for months, migrations silently diverging, an account-takeover advisory waiting
thirty days. Everything else here fixes the past; that one protects the future.

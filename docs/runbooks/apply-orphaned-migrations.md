# Runbook — Applying migrations 0049–0057

**Status:** open
**Origin:** 2026-08-26 platform audit, finding C-01
**Owner:** platform engineering
**Risk:** high (0049 rewrites the ledger tables and moves data)

## Why this exists

`packages/schemas/migrate.ts` — the runner `deploy-production.yml` invokes — applies
only what is listed in `infra/docker/postgres/migrations/meta/_journal.json`. The
journal has 49 entries and stops at `0048`; the directory holds 58 `.sql` files.

Nine migrations have therefore never been applied in any environment:

| Tag | Risk | Note |
| --- | --- | --- |
| `0049_partition_ledger_tables` | high | Partitions `assessment_control_events` and `audit_logs`, migrates existing rows |
| `0050_index_scf_versions_org` | low | Index only |
| `0051_strm_canonical_enums` | medium | Enum widening on existing columns |
| `0052_tpra_persistence` | medium | Creates TPRA tables |
| `0053_rls_complete` | medium | 53 RLS policies |
| `0054_ledger_immutability_triggers` | medium | ADR-002 append-only triggers |
| `0055_soa_items_strm_enum` | medium | Enum widening on `soa_items` |
| `0056_tpra_vendor_controls_and_partman` | medium | Depends on 0052 |
| `0057_partman_security_events` | medium | Requires `pg_partman` and 0049 |

Two of these carry guarantees the product publicly claims: `0053` is the tenant
isolation that `llms.txt` describes as strict, and `0054` is the append-only ledger
that `docs/legal/CONFIDENTIALITY_TERMS.md` calls forensically immutable. Until they
are applied, both are enforced by application convention only.

While they remain unapplied they are recorded in `meta/_journal-exceptions.json`,
which `scripts/check-migration-journal.mjs` reads so **new** drift fails CI without
this known backlog blocking every PR.

## Step 1 — Establish what production actually looks like

Do not assume. Run against the production branch, read-only:

```sql
-- Which tables have RLS enabled, and is it FORCEd?
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- Are the ADR-002 triggers present?
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname LIKE 'trg_ace_%' OR tgname LIKE 'trg_al_%';

-- Are the ledger tables partitioned?
SELECT relname, relkind FROM pg_class
WHERE relname IN ('assessment_control_events', 'audit_logs');
-- relkind 'p' = partitioned, 'r' = plain table

-- Do the TPRA tables exist?
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'tpra%';

-- What does the journal think has been applied?
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;

-- Which role does the application connect as, and does it own the tables?
SELECT current_user, session_user;
SELECT tableowner FROM pg_tables WHERE schemaname='public' LIMIT 5;
```

Record the output in the incident/issue before changing anything.

## Step 2 — Resolve the two blockers

**M-02 — retention vs. append-only ledger.** Once `0054` is applied, the
data-retention purge in `workers/queues/src/data-retention.consumer.ts` cannot
delete assessments: the trigger rejects the cascading delete of
`assessment_control_events`. Decide and record an ADR before applying `0054`:

- purge by dropping partitions (`0049` provides the partitioning), or
- anonymise instead of delete, or
- formally exempt the ledger from the retention policy.

**A-01 — who bypasses RLS.** `0053` now carries `FORCE ROW LEVEL SECURITY`, which
removes the table-owner exemption. Confirm that background jobs, queue consumers
and the seed scripts either set `app.current_org_id` or run as a role that is
allowed to see everything. The policies still bypass when the setting is unset, so
they will not break today — but plan the dedicated application role before relying
on RLS as a real barrier.

## Step 3 — Apply, in dependency order

`0053` and `0054` were made idempotent on 2026-08-26 (`DROP POLICY IF EXISTS`,
`DROP TRIGGER IF EXISTS`), so they can be re-run safely. The others were not.

Apply in a Neon branch first — `neon-branches.yml` already provisions one — and run
the full test suite against it:

1. `0050` (index, safe on its own)
2. `0051`, `0055` (enum widening — verify no out-of-range values first)
3. `0052`, then `0056` (TPRA tables)
4. `0053` (RLS), then `0054` (ledger triggers), only after Step 2
5. `0049` (partitioning) — **maintenance window, validated backup**
6. `0057` (depends on 0049 and `pg_partman`)

## Step 4 — Reconcile the journal

After each migration is confirmed applied, move its tag from
`meta/_journal-exceptions.json` into `meta/_journal.json` and insert the matching
row into `drizzle.__drizzle_migrations` so the runner does not attempt it again.
`scripts/check-migration-journal.mjs` fails if a tag is in both files, which keeps
the two from drifting apart.

The snapshots in `meta/` also stop at `0047` while the journal is at `0048`
(audit B-05); regenerate them before the next `db:generate`, or that diff will be
computed against the wrong baseline.

## Step 5 — Verify

```sql
-- RLS forced on the tenant tables
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relforcerowsecurity;   -- expect 53+

-- Ledger rejects mutation
DO $$ BEGIN
  UPDATE assessment_control_events SET event_type = 'tampered' WHERE false;
  RAISE EXCEPTION 'FAIL: update was not blocked';
EXCEPTION WHEN restrict_violation THEN
  RAISE NOTICE 'PASS: UPDATE correctly blocked';
END $$;
```

Then add the integration suite described in audit finding A-04 — the gateway
currently skips the RLS envelope entirely when `STANDARD_ENV=test`, so no existing
test can confirm any of this.

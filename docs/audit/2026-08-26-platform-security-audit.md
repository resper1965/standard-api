# Platform Security & Architecture Audit

**Date:** 2026-08-26
**Scope:** Full monorepo — 30 packages, ~130k LOC, 407 endpoints
**Baseline commit:** `33d4f98`
**Method:** Static analysis + local execution of the complete CI battery
**Report (rendered):** https://claude.ai/code/artifact/a605aba6-ebaa-4a43-b7e9-2a29bf9cc999

## Executive Summary

The platform has above-average engineering discipline: 390 of 407 routes require
authentication, there is a single `TODO` in the entire codebase, no secrets are
versioned, and lint/typecheck/tests all pass clean.

The problem is not the code that was written — it is the distance between what the
documentation promises and what the production database actually enforces. Two
declared guarantees (strict `organization_id` isolation and an unbreakable
append-only ledger) are implemented as SQL migrations that **never run in
production**.

| Severity | Count |
| --- | --- |
| Critical | 3 |
| High | 4 |
| Medium | 7 |
| Low | 7 |

All 414 tests pass, including contracts, regression, agent evaluations and
synthetic E2E. None of the critical findings are detectable by the current suite.

---

## Critical

### C-01 — Nine migrations outside the Drizzle journal

`packages/schemas/migrate.ts` applies only what is listed in `meta/_journal.json`.
The journal has 49 entries and stops at `0048`; the directory holds 58 SQL files.

Migrations on disk with no journal entry:

```
0049_partition_ledger_tables
0050_index_scf_versions_org
0051_strm_canonical_enums
0052_tpra_persistence
0053_rls_complete                   <- 53 RLS policies
0054_ledger_immutability_triggers   <- ADR-002
0055_soa_items_strm_enum
0056_tpra_vendor_controls_and_partman
0057_partman_security_events
```

`deploy-production.yml` runs exactly this runner. The workflow already
acknowledges the pattern for the auth DB ("hand-written SQL is NOT in the
drizzle-kit journal, so migrate.ts never touches it") but no equivalent step
exists for the domain DB.

**Impact**

- `assessment_control_events` accepts `UPDATE`/`DELETE`. ADR-002 immutability is
  application convention only, which undermines the forensic-immutability claim in
  `docs/legal/CONFIDENTIALITY_TERMS.md`.
- No table has RLS enabled. The `SET LOCAL app.current_org_id` the gateway emits
  on every request filters nothing.
- TPRA persistence tables (`0052`, `0056`) may not exist in production.

**Fix** — Verify actual state (`SELECT tablename, rowsecurity FROM pg_tables WHERE
schemaname='public'`; `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_ace_%'`),
then either rebuild the journal with the nine entries or add an idempotent
`migrate-domain-raw.ts` deploy step mirroring the auth path. Add a CI check that
fails when a `.sql` file has no journal entry.

### C-02 — API keys can read any organization via `x-standard-tenant-id`

`tenant.middleware.ts` was hardened against IDOR for interactive sessions
(Issue #71), but the M2M branch kept the original behaviour:

```ts
} else {
  // M2M API key or unauthenticated: original behavior
  rawTenantId = headerTenantId ?? pathTenantId ?? context.organizationId;
}
```

`auth.middleware.ts` had already set `context.organizationId` from the API key —
a trusted value. It is overwritten here by a client-controlled header with no
membership check. The consistency checks below it only fire when a path param is
also present, which is not the case for most endpoints.

```
curl https://standard-api.bekaa.eu/api/v1/assessments \
  -H "Authorization: Bearer standard_live_<org_A_key>" \
  -H "x-standard-tenant-id: <org_B_uuid>"
```

The RLS envelope receives the same overwritten value, so even with `0053` applied
it would enforce the forged organization rather than block it.

**Fix** — For `m2m:` actors, treat the key's organization as the sole source of
truth: ignore the header, or accept it only when identical and return 403 +
`cross_tenant_access_blocked` otherwise.

### C-03 — Any authenticated actor can write into any organization

`POST /api/v1/assessments` requires `organization_id` in the body and prefers it
over the actor's context, with no membership check:

```ts
// routes/assessments.routes.ts:74
const standardAuthOrgId =
  body.organization_id ?? requireOrganizationId({ organizationId });
```

None of the 53 policies in `0053` carry `WITH CHECK`, so even with RLS applied
cross-tenant writes would not be blocked — `USING`-only policies filter reads,
they do not validate inserted rows.

Because the ledger is fed from the assessment, this contaminates another tenant's
audit trail with events they did not originate — and append-only means they cannot
be removed.

**Fix** — Drop `organization_id` from the request schema and always derive it from
the authenticated context; where explicit selection is legitimate (platform admin
acting on behalf of a client), require `platformAdmin === true`. Add `WITH CHECK`
to every tenant-writable policy.

---

## High

### A-01 — RLS policies fail open for three independent reasons

- **No `FORCE ROW LEVEL SECURITY`.** In PostgreSQL the table owner bypasses RLS by
  default. On Neon the application typically connects as `neondb_owner`. Without
  `FORCE`, every policy is inert even once applied.
- **Explicit bypass when unset.** Every policy includes
  `OR NULLIF(current_setting('app.current_org_id', true),'') IS NULL`. Any path not
  going through the transactional envelope (workers, queue consumers, jobs) sees
  all organizations.
- **No `WITH CHECK`.** See C-03.

### A-02 — Known account-takeover CVE in better-auth, pinned by override

`pnpm audit --prod --audit-level=high` returns **42 vulnerabilities, 23 high**, and
exits 1. The CI *Security Audit* step has no `continue-on-error`, so the next PR
will be blocked by it.

```
better-auth  >=1.1.3 <1.6.22  HIGH
  Account takeover via pre-account hijacking on magic-link and email flows
```

`better-auth` is pinned to `1.6.14` in both `dependencies` and `pnpm.overrides`,
preventing automatic resolution. Other production highlights: `undici`
(cross-user information disclosure), `react-router` (unauthenticated DoS, RSC CSRF
bypass), `hono` (CORS ReDoS), `sharp` (libvips CVEs).

The last commit on `main` is dated 2026-07-05 and CI was green then — advisories
accumulated over the following seven weeks.

**Fix** — Raise the `better-auth` pin to ≥ 1.6.22 in both places and validate
session flows; update `undici`, `react-router`, `hono`, `sharp`; enable Dependabot
or Renovate.

### A-03 — Two different organizations coexist in one request

`attachTenantDb()` is called from inside `resolveAuth()`, i.e. *before*
`resolveOrganizationContext()`:

```
await resolveAuth(ctx, ...)            -> attachTenantDb() uses org #1
await resolveOrganizationContext(...)  -> rewrites ctx.organizationId -> org #2
withRlsTenantContext(db, ctx.organizationId, ...) -> uses org #2
```

They diverge whenever resolution changes the identifier: platform-admin org
switch, slug→UUID resolution, or the C-02 header. Handlers using `scopeWhere()`
filter by one organization; handlers using `deps._db` operate under another.

**Fix** — Move the `attachTenantDb()` call after `resolveOrganizationContext()` in
`app.ts`.

### A-04 — Tenant-isolation tests never exercise RLS

```ts
// app.ts:345
const response = await (ctx.organizationId && ctx.deps._db &&
  env?.STANDARD_ENV !== "test"      // <- never in tests
    ? withRlsTenantContext(...)
    : handler(ctx));
```

Good isolation tests exist (`critical.test.ts` is explicitly adversarial; `poam`
validates tenant isolation) and all pass without touching the database in RLS
mode. This is why C-01 and A-01 survived — no existing test could have caught them.

**Fix** — Add an integration suite against real PostgreSQL (`infra/docker` already
provides it) with full migrations applied, asserting: RLS enabled on expected
tables, ledger triggers present, ledger `UPDATE` rejected, cross-tenant read
blocked at the database layer.

---

## Medium

| ID | Finding | Detail |
| --- | --- | --- |
| M-01 | Data-retention purge is broken twice over | `workers/queues/src/data-retention.consumer.ts:203` runs `DELETE FROM tenants` — table dropped in `0032`. Line 250's comment claims `ON DELETE CASCADE`, but the `0047` FKs are all `ON DELETE no action`, so the delete fails on FK violation. The LGPD retention pipeline purges nothing. |
| M-02 | Retention and append-only ledger are mutually incompatible | Once `0054` is applied, purging an assessment requires deleting its `assessment_control_events`, which `prevent_ledger_mutation()` rejects. Fixing M-01 alone just swaps one error for another. Needs an ADR: partition-drop purge (`0049` already partitions), anonymisation, or formal ledger exemption. |
| M-03 | Tests that exist but never run | `workers/queues` (3 files) and `workers/ingestion` (1) have tests but no `test` script — `pnpm -r --if-present test` skips them silently. `apps/web` (12.8k LOC) has none. `test:unit` filters only `./packages/*`, so no worker enters the fast CI stage. |
| M-04 | Orphaned gateway test | `run-tests.ts` imports 27 suites explicitly; `provenance-validation.test.ts` is not among them and never runs. A glob-based runner would remove this class of omission. |
| M-05 | Recovery endpoints exposed on the public internet | `/api/v1/admin/recovery/reset-password` and `/bootstrap-admin` are unauthenticated, guarded by a static secret. Implementation is careful (constant-time compare, 16-char minimum, 501 when unset, 3 req/min) but they reset any user's password and mint platform admins. Recommend Cloudflare Access (already anticipated in `AGENTS.md §6`) or `workflow_dispatch`-only. The length comparison before the XOR also leaks secret length — HMAC both sides before comparing. |
| M-06 | Tenant resolution fails open | `tenant.middleware.ts` catches resolution errors, logs to `console.error`, and proceeds with the unresolved client-supplied identifier. Occurs three times in the same file. Should return 503. |
| M-07 | Connection pool created per request, never closed | `recovery.routes.ts` calls `createDb()` inside the handler; `createDb()` instantiates `new Pool()` with no `pool.end()`. Leaks Neon connections per request. |

---

## Low

| ID | Finding | Detail |
| --- | --- | --- |
| B-01 | Encoding corruption at scale | 306 files carry a UTF-8 BOM; 188 contain mojibake (`Ã§`, `â”€`). The recovery code already works around a BOM in the database URL. |
| B-02 | `llms.txt` drift | Declares better-auth `1.6.11` (actual `1.6.14`) and migrations `0001→0045` (actual `0057`). This is the anti-hallucination compass for AI agents — inaccuracy propagates. |
| B-03 | Contradictory RLS comments | `tenant-db.middleware.ts` says `SET LOCAL` "does NOT work"; `tenant-db.ts` says it does; `db.ts` describes `poolQueryViaFetch = true` while the code sets `false`. |
| B-04 | 556 explicit `any` | Outside tests, in a codebase that declares strict TypeScript. Concentrated in bindings access (`context.env as any`) and adapters. |
| B-05 | Stale Drizzle snapshots | Stop at `0047` with the journal at `0048`. A future `db:generate` will produce an incorrect diff. |
| B-06 | `pnpm test` fails from the repo root | Requires `pnpm --filter @standard/sdk build` first, as CI does. Neither README nor CONTRIBUTING mentions it; without it the entire gateway suite (133 tests) aborts on module resolution. |
| B-07 | Rate limit degrades per isolate | Without a KV binding the counter falls back to an in-memory `Map`. Each Workers isolate has its own, multiplying the effective limit. |

---

## Conformance with declared invariants

| Declared rule | Status | Note |
| --- | --- | --- |
| `tenant_id` does not exist; isolation via `organization_id` only | Partial | Schema is clean, but 41 residual code references and a live `DELETE FROM tenants` (M-01) |
| Append-only ledger, no `UPDATE`/`DELETE` (ADR-002) | **Not enforced** | Triggers written correctly, migration never executed (C-01) |
| Strict organization isolation on every endpoint | **Violated** | C-02 and C-03; RLS inactive as second barrier |
| No Clerk, Supabase or Auth0 | Conforms | No external provider references |
| No Vercel; Cloudflare Pages only | Conforms | No `vercel.json`; wrangler is the only deploy target |
| Secrets and real data never versioned | Conforms | No sensitive artifacts tracked; gitleaks blocking in CI |
| Critical logic outside `apps/web` | Conforms | Console is an API consumer; engine lives in `packages/` |
| Critical modules require tests | Partial | Engine, SCF and approvals well covered; queues, ingestion and web effectively uncovered (M-03) |
| Structural changes require a migration | Partial | Migrations exist, but the application path is broken (C-01) |

---

## What is solid

- **Auth coverage** — 390/407 routes authenticated. The 17 exceptions are health,
  public docs, `.well-known` and the two recovery endpoints, all deliberate.
- **Fail-closed scopes** — A key with no scopes has zero permissions; a protected
  route with no mapped scope denies M2M access.
- **Fail-closed mock auth** — Requires `ALLOW_MOCK_AUTH=true` *and* a non-production
  environment. Omitting the variable disables it even in dev.
- **CSRF with session rotation** — Double-submit with an HMAC-SHA256 token derived
  from the session ID; rotates with the session, stateless server-side.
- **Security headers** — Full OWASP set, restrictive CSP outside docs routes, CORS
  origin list validated against wildcards.
- **Code hygiene** — One TODO in 130k lines; clean typecheck and lint; no secrets.
- **Suite depth** — Contracts, golden regression, agent evaluations and synthetic
  E2E; layers most projects this size lack.
- **CI supply chain** — All actions SHA-pinned, gitleaks blocking on PR and nightly,
  Semgrep with DefectDojo upload.

---

## Remediation plan

Order matters: C-01 precedes A-01, and A-04 precedes considering anything resolved.

**Immediate — stop cross-organization access**

1. Ignore `x-standard-tenant-id` for M2M actors (C-02)
2. Remove `organization_id` from the `POST /assessments` body (C-03)
3. Raise `better-auth` to ≥ 1.6.22 at both pin sites (A-02)
4. Move `attachTenantDb()` after organization resolution (A-03)

**This week — restore database guarantees**

1. Audit real production state: RLS enabled, triggers present, TPRA tables exist
2. Apply migrations 0049–0057 and fix the application path (C-01)
3. Add `FORCE ROW LEVEL SECURITY` and `WITH CHECK`; replace the bypass with a
   dedicated application role (A-01)
4. CI check: fail when a `.sql` file has no journal entry

**This month — close the gaps that allowed this**

1. Integration suite against real PostgreSQL with RLS active (A-04)
2. Fix the retention consumer and settle the ledger conflict via ADR (M-01, M-02)
3. Add `test` scripts to workers, include them in `test:unit`, glob runner for the
   gateway (M-03, M-04)
4. Recovery behind Cloudflare Access; fail-closed tenant resolution (M-05, M-06)
5. Enable Dependabot or Renovate

**Ongoing — hygiene**

1. Normalise encoding: strip BOMs, fix mojibake (B-01)
2. Sync `llms.txt` with reality and reconcile the RLS comments (B-02, B-03)
3. Document the SDK build step before tests (B-06)

---

## Method and limitations

Audit performed by static analysis and local execution of the full CI battery:
`lint`, `typecheck`, `test`, `test:contracts`, `test:regression`,
`test:evaluations`, `test:synthetic-e2e` and `pnpm audit`.

No penetration testing was performed against production. C-02 and C-03 were
confirmed by control-flow reading, not active exploitation, and should be
reproduced in staging before the fixes are closed out.

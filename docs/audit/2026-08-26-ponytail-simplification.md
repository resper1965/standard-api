# Ponytail Simplification Analysis

**Date:** 2026-08-26
**Scope:** Full monorepo — 30 packages, ~130k LOC, 42 external production dependencies
**Ruler:** Ponytail Decision Ladder (AGENTS.md §19)
**Report (rendered):** https://claude.ai/code/artifact/7d0af485-b4c2-4d6a-987c-d052c6b82e8e
**Companion:** `2026-08-26-platform-security-audit.md`

## Summary

The codebase is leaner than it looks: 42 external dependencies, one `TODO` in 130k
lines, no versioned secrets. The waste is not in what was installed — it is in
four things written sixteen times.

Essentially all of the simplification debt lands on **rung 2 of the ladder
(reuse)**, not rung 7 (minimal code). The problem is not verbosity, it is
duplicated sources of truth.

---

## The direct question: can we drop `better-auth`?

**Verdict: keep for now, re-evaluate in ~6 months.** Replacing it is viable and
the hidden cost is real, but this is not where the return is today.

### Surface actually used

Five imports across the entire codebase, and **two API calls**:

```
betterAuth            // better-auth
drizzleAdapter        // better-auth/adapters/drizzle
admin()               // better-auth/plugins
createAuthMiddleware  // better-auth/api
createAuthClient      // better-auth/react

auth.api.getSession
auth.api.signUpEmail
```

No social login, no magic link, no 2FA, no passkeys. Email and password only,
four tables (`user`, `session`, `account`, `verification`), and a 1 user = 1
organization model with manual approval.

Note that API keys — which `llms.txt` describes as coming from the
`@standard-native-auth/api-key` plugin — are **already a local implementation**:
259 lines across `api-key-crypto.ts` and `api-keys.repository.ts`. The most
security-sensitive part of the M2M path does not depend on the library at all.
The `llms.txt` claim is wrong and should be corrected; that inaccuracy is what
makes `better-auth` look more central than it is.

### The hidden cost

`drizzleAdapter` is the only adapter used, but the package ships the Prisma,
Kysely and memory adapters too — and through them, all of Prisma:

```
better-auth 1.6.30
├─┬ @better-auth/drizzle-adapter 1.6.30
│ └─┬ drizzle-orm 0.45.2 peer
│   └─┬ @prisma/client 7.8.0 peer
│     └── prisma 7.8.0 peer
├─┬ @better-auth/prisma-adapter 1.6.30   <- unused
├── @better-auth/kysely-adapter 1.6.30   <- unused
└── @better-auth/memory-adapter 1.6.30   <- unused
```

Much of the 20 remaining high-severity advisories after the 1.6.30 bump enters
this way (`fast-uri`, `ajv` via `@prisma/dev`). These are peer dependencies so
they may not reach the bundle — but they do reach the audit report and the CI
gate. This is the one clear breach of ladder rung 5 (limit yourself to what is
already installed and needed).

### Why keep it anyway

Authentication is the classic case where hand-rolling is cheaper to estimate than
to sustain. What would need rewriting is not the hashing — `crypto.subtle`
covers that — but the surrounding machinery: session rotation, `verification`
tokens, the reset flow, `SameSite`/`Secure`/`__Host-` cookie semantics, and above
all the timing of invalidations.

The security audit just established that a documented guarantee (RLS, ledger
immutability) had never actually been applied. Swapping the auth provider in the
same quarter concentrates risk. AGENTS.md §19 is explicit that simplification is
not a pretext for removing security, and rewriting auth is the most direct
version of that trap.

### Do this instead, now

1. Check whether `prisma` actually reaches the production bundle
   (`wrangler deploy --dry-run --outdir`). If it does not, this is a reporting
   problem solved by a documented `pnpm audit` ignore, not a rewrite.
2. Fix the `llms.txt` claim about the API-key plugin.
3. Re-evaluate on a real trigger — another high CVE on the 1.6 line, or a flow
   the library cannot cover. A two-call surface makes the exit cheap when the
   time comes.

---

## Where the real return is

### 1. Sixteen test-kits, all different — and an unused `@standard/test-kit`

`packages/test-kit` exists (96 lines) for exactly this purpose. Beside it sit
fifteen more copies of the same runner, and **no two share a hash**:

```
packages/test-kit/src/index.ts            96   <- the official package
apps/api-gateway/tests/test-kit.ts       107
workers/workflows/tests/test-kit.ts       46
packages/security/tests/test-kit.ts       44
packages/reporting/tests/test-kit.ts      43
packages/soa/tests/test-kit.ts            40
... 10 more, every one a distinct hash — 697 lines total
```

The cost is not the size, it is the divergence. During this audit two tests were
missing from the gateway runner because *that* copy lacked `toThrow` and
`toBeUndefined` — matchers other copies already had. A real provenance-validation
test had gone unrun for a long time as a result.

Already tagged `ponytail-debt` in the repo. Time to collect.

### 2. The same agent-runtime repository written three times

```
apps/api-gateway/src/adapters/agent-runtime.repository.ts    114  ] byte-identical
workers/workflows/src/adapters/agent-runtime.repository.ts   114  ]
packages/agent-runtime/src/repositories/drizzle.repository.ts 170  <- canonical
```

Two byte-identical copies plus the package implementation that should be the only
one. `@standard/agent-runtime` is already a dependency of both consumers — there
is no technical obstacle, only inertia.

Same pattern for `env.d.ts` (identical across four workers) and `schemas.ts`
(identical between `gap-analysis` and `poam`).

### 3. Declared dependencies nothing imports

```
jose                  0 importing files   (packages/security)
zod-to-json-schema    0 importing files   (packages/mcp-server)
```

`jose` is likely left over from a pre-`better-auth` JWT implementation;
`zod-to-json-schema` was superseded by `@asteasolutions/zod-to-openapi`, which is
what the generator actually uses. **Removed in this change.**

The same sweep applies to `docs/fallow-report.txt`, already in the repo, which
lists **118 files unreachable from any entry point**. That is the largest
measured pocket of dead code in the codebase and the report already exists — it
is simply not being acted on.

### 4. Two PostgreSQL drivers

`@neondatabase/serverless` is the runtime driver, correct for Workers.
`postgres` (postgres.js) appears in 10 files, nearly all scripts and seeds
running under Node — including `migrate.ts`. Legitimate use, but worth confirming
whether the Neon driver covers those non-edge cases too. If it does, one
dependency goes and so does the chance of the two diverging on transaction
semantics — exactly the kind of divergence that produced the contradictory RLS
comments flagged as B-03 in the security audit.

### 5. Archived directories in the working tree

`.archive/`, `_reversa_sdd/`, `.reversa/` and `scratch/` total 75 tracked files.
None of it is executable, but all of it is read by AI agents scanning the repo —
and `CONTEXT.md` opens by warning against exactly this "semantic pollution" from
old plans. The files contradict the rule the repository wrote for itself. Git
history preserves the content; the working tree does not need to.

---

## The simplification already applied

A customer hit `403 INSUFFICIENT_SCOPE` on
`GET /api/v1/scf/versions/{id}/controls`. The cause was `ROUTE_SCOPE_MAP`: a
hand-maintained map covering **39 of 390 protected routes**. Since the middleware
fails closed, 90% of the API was unreachable by API keys — in an API-first
product.

The obvious fix was to write the 351 missing entries. The right fix was to
**delete the second source of truth**: every route already declares its
`permissions`, so scopes are now derived from them through a small table.
Reachable routes: 39 → 191, and a new route is covered automatically.

That is rung 2 outranking rung 7: the win was not "write less code", it was *stop
maintaining two lists that describe the same thing*. Everything above is the same
idea applied elsewhere.

---

## What NOT to simplify

AGENTS.md §19 closes with the caveat that matters: simplification is not a
pretext for removing validation, security, auditability or tests.

| Looks redundant | Verdict | Why |
| --- | --- | --- |
| RLS in the database *and* `scopeWhere()` in the app | Keep both | Defence in depth, not duplication. The audit showed the cost of relying on one layer: with RLS never applied, two IDORs had nothing to stop them. |
| Scope middleware *and* RBAC | Keep both | Different questions: scope says what *the key* may do; RBAC says what *the actor* may do. Merging them would reopen the path for keys to reach approval gates. |
| Append-only ledger with a database trigger | Keep | It is the guarantee ADR-002 and the contractual terms sell. It is not even active today — the path is to apply the migration, not relax the rule. |
| Four test layers (contracts, regression, evals, E2E) | Keep | They run in ~3 minutes and cover what typecheck cannot. The problem is not too many tests — it is tests that never run. |
| 556 uses of `any` | Reduce gradually | Concentrated in bindings access (`context.env as any`). A properly typed Cloudflare `Env` resolves most of it without a large refactor. |

---

## The ladder, applied

| Rung | Standing |
| --- | --- |
| 1. YAGNI | Good. One TODO in 130k lines. Excess comes from copies, not speculation. |
| 2. Reuse | **All of it is here.** 16 test-kits, 3 agent-runtime repositories, 4 `env.d.ts`, the parallel `ROUTE_SCOPE_MAP`. |
| 3. Stdlib | Good. Hashing and HMAC via `crypto.subtle`; no `bcrypt`, no `jsonwebtoken`. |
| 4. Platform natives | Good. Workers, Queues, KV, R2, Vectorize used as bindings with no abstraction layer on top. |
| 5. Existing dependencies | 42 external for 30 packages is lean. Two unused (now removed) and the `better-auth` adapter tree are the only deviations. |
| 6. Extreme simplicity | Good in the domain modules: dispatch maps, declarative prerequisite tables. |
| 7. Minimal code | Not the bottleneck. See rung 2. |

---

## Suggested order

Highest return first, assuming the security-audit queue comes before this.

| Action | Gain | Risk |
| --- | --- | --- |
| Remove `jose` and `zod-to-json-schema` | 2 deps | None — **done** |
| Act on the 118 files in `fallow-report.txt` | High | Low |
| Consolidate the 16 test-kits into `@standard/test-kit` | ~600 lines | Low |
| Unify the 3 agent-runtime repositories | ~230 lines | Low |
| Take `.archive/` and friends out of the working tree | 75 files | None |
| Type `Env` and drop the bindings `as any` | ~100 `any` | Medium |
| Evaluate unifying the PostgreSQL drivers | 1 dep | Medium |
| Re-evaluate `better-auth` | 1 dep + tree | High — defer |

---

## Method

Static analysis of the working tree on 2026-08-26: content hashes for exact
duplication, import scanning for real dependency usage, and `pnpm why` for the
transitive tree. The cited `docs/fallow-report.txt` is the repository's own and
was not regenerated for this analysis.

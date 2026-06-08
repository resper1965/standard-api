# ADR: Auth Module — Accepted Security Risks

- **Date:** 2026-06-08
- **Status:** Accepted
- **Authors:** Security Audit Team
- **Scope:** `packages/security`, `apps/api-gateway`, auth subsystem

---

## Overview

This document records seven security-related items identified during the auth module audit that were evaluated, discussed, and formally accepted as manageable risks. Each item includes the rationale for acceptance, the tradeoffs involved, and any planned mitigations or future actions.

---

## ADR-AR-01: KV Cache 60s Staleness Window (M5)

### Status

**Accepted Risk**

### Context

The auth middleware uses Cloudflare KV to cache session-enrichment data (organization membership, roles, active organization) with a TTL of 60 seconds. During this window, changes to a user's permissions or organization membership will not be reflected in cached responses.

KV was chosen over per-request database lookups to reduce latency at the edge and avoid overloading the PostgreSQL transactional layer on every authenticated request.

### Decision

Accept the 60-second staleness window for session enrichment data. The TTL of 60s provides an acceptable balance between performance and freshness for the following reasons:

- Session enrichment is **non-authoritative** — critical write operations (approvals, state transitions) re-validate permissions at the service layer.
- Permission changes (role revocations, organization removals) are **infrequent** relative to read traffic.
- A 60s window is **well within industry norms** for edge-cached session data.

### Consequences

- **Positive:** Reduced P99 latency on authenticated endpoints; lower database connection pressure.
- **Negative:** A revoked user could retain access for up to 60 seconds after revocation.
- **Mitigation:** Critical mutation endpoints MUST perform fresh permission checks, bypassing the cache. An explicit cache-bust mechanism (`DELETE /v1/auth/cache/{userId}`) can be added if real-time revocation becomes a requirement.
- **Review trigger:** If the platform introduces real-time compliance-critical access control, revisit this decision and consider KV `metadata` expiry or Durable Objects for session state.

---

## ADR-AR-02: Per-Isolate In-Memory Rate Limits (M6)

### Status

**Accepted Risk**

### Context

Rate limiting in the API gateway is implemented using in-memory counters within each Cloudflare Worker isolate. Cloudflare Workers run on a shared-nothing architecture where each isolate has its own memory space. This means rate limit counters are **not shared** across isolates, and a determined attacker distributing requests across multiple edge locations could exceed the intended global rate limit.

Centralizing rate limits via Durable Objects would provide globally consistent counters but would introduce:

- Additional latency per request (Durable Object lookup).
- Significantly higher cost at scale (billed per request + duration).
- Architectural complexity for a non-critical-path concern.

### Decision

Accept per-isolate rate limiting as sufficient for the current threat model. The in-memory approach provides:

- **Best-effort** rate limiting that stops casual abuse and accidental floods.
- **Zero additional latency** on the hot path.
- **No additional infrastructure cost.**

### Consequences

- **Positive:** Simple implementation; no external dependencies; no latency overhead.
- **Negative:** Rate limits are approximate, not globally enforced. A sophisticated attacker could bypass limits by distributing requests across edge nodes.
- **Mitigation:** Cloudflare's built-in DDoS protection and WAF rules provide a complementary layer. If abuse patterns emerge, migrate critical endpoints to Durable Objects-backed rate limiting selectively.
- **Review trigger:** If the platform experiences targeted API abuse that per-isolate limits cannot contain, or if Cloudflare introduces a native distributed rate-limiting primitive at acceptable cost.

---

## ADR-AR-03: Dual API Key Tables — `baApikey` vs `apiKeys` (M7)

### Status

**Accepted Risk — Pending Design Decision**

### Context

The system currently maintains two separate tables for API key storage:

1. **`baApikey`** — Managed by Better Auth's built-in API key plugin. Used for framework-level key issuance and validation.
2. **`apiKeys`** — A custom table designed for organization-scoped, assessment-bound API keys with richer metadata (scopes, expiration policies, audit fields).

This dual-table situation arose from adopting Better Auth's plugin system while simultaneously needing API key semantics that exceed what the plugin provides (organization isolation, granular scopes, assessment-level binding).

### Decision

Accept the dual-table state as a **transitional architecture**. A consolidation or migration strategy is required but must be designed carefully to avoid breaking existing API key consumers. The options under evaluation are:

1. **Consolidate into `apiKeys`** — Extend the custom table to cover all use cases; disable or wrap the Better Auth plugin.
2. **Consolidate into `baApikey`** — Extend Better Auth's schema (if plugin allows) to include organization/assessment metadata.
3. **Bridge pattern** — Keep both tables but introduce a unified service layer that abstracts the underlying storage.

### Consequences

- **Positive:** Both tables are functional today; no immediate data integrity risk.
- **Negative:** Dual tables increase cognitive load, risk inconsistent key lifecycle management, and complicate audit queries.
- **Mitigation:** All new API key operations MUST go through a unified service layer (`packages/security/api-keys`) that abstracts the underlying table. Direct table access is prohibited outside this module.
- **Action required:** File a design decision issue to evaluate consolidation options with impact analysis on existing consumers. Target resolution before v1 GA.
- **Review trigger:** Before any public API release or when onboarding the first external organization.

---

## ADR-AR-04: Dual `snake_case` / `camelCase` Naming Convention (M8)

### Status

**Accepted Risk**

### Context

The codebase contains a mix of `snake_case` and `camelCase` naming in API payloads, database columns, and internal objects. This originated from:

- **Better Auth** using `camelCase` for its schema and API surface.
- **PostgreSQL conventions** and the SCF data layer favoring `snake_case`.
- **Domain models** in `packages/domain` using `camelCase` per TypeScript conventions.

The code is already **defensively written** — input parsers check both naming conventions, and Zod schemas accept either form via `.transform()` or dual-key parsing.

### Decision

Accept the dual naming convention as a pragmatic reality. Full standardization would require:

- A database migration renaming columns (high risk, affects all queries).
- Updating all Better Auth plugin configurations and overrides.
- Coordinating API contract changes with any existing consumers.

The defensive parsing approach is sufficient and does not introduce correctness issues.

### Consequences

- **Positive:** No breaking changes required; existing consumers continue to work; defensive parsing prevents runtime errors.
- **Negative:** Increased cognitive load for developers; potential confusion in documentation; slightly larger Zod schemas.
- **Mitigation:** Establish a **canonical convention per layer**: `snake_case` for database/PostgreSQL, `camelCase` for TypeScript domain models and API responses. Document this convention in `docs/architecture/naming-conventions.md`. New code MUST follow the canonical convention; legacy dual-parsing is tolerated but not extended.
- **Review trigger:** If a major API version bump (v2) is planned, use it as an opportunity to standardize the external API surface.

---

## ADR-AR-05: Preview Deploy CORS Wildcard — `*.standard-web.pages.dev` (M11)

### Status

**Accepted Risk**

### Context

Cloudflare Pages generates unique preview URLs for each deployment in the format `<hash>.standard-web.pages.dev`. To allow frontend preview deployments to communicate with the API gateway, the CORS configuration includes a wildcard origin pattern: `*.standard-web.pages.dev`.

This means any subdomain under `standard-web.pages.dev` is allowed as a CORS origin, including preview deployments from any branch or pull request.

### Decision

Accept the wildcard CORS pattern for the `pages.dev` subdomain. The risk is low because:

- **`*.standard-web.pages.dev`** is controlled by the team's Cloudflare account — only authorized deployments can create subdomains under this domain.
- The wildcard does **not** apply to production domains; production CORS is restricted to explicit origins.
- Preview environments use **non-production data** and are typically short-lived.
- Cloudflare Pages access policies can further restrict who can view preview deployments.

### Consequences

- **Positive:** Seamless DX for preview deployments; no manual CORS configuration per PR.
- **Negative:** If an attacker gains access to the Cloudflare Pages project, they could deploy a malicious page under the wildcard domain. This is mitigated by Cloudflare account security (MFA, access controls).
- **Mitigation:** Enable Cloudflare Access policies on preview deployments to require authentication. Ensure preview environments do not have access to production data or secrets.
- **Review trigger:** If the `pages.dev` domain is shared with untrusted parties or if preview deployments gain access to production-grade secrets.

---

## ADR-AR-06: `activeOrganizationId` Without Foreign Key Constraint (M12)

### Status

**Accepted Risk**

### Context

The `activeOrganizationId` field is stored in the Better Auth session object as an `additionalField`. It represents the user's currently selected organization context and is used for request scoping and UI state.

Better Auth's `additionalFields` mechanism does **not support foreign key constraints** — fields are stored as flexible columns in the session table without relational integrity enforcement at the database level.

### Decision

Accept the absence of a database-level foreign key on `activeOrganizationId`. Integrity is enforced at the application layer:

- **Input validation:** The field is validated using `isUuid()` before storage.
- **Membership verification:** When `activeOrganizationId` is set, the middleware verifies that the user is an active member of the referenced organization.
- **Orphan tolerance:** If the referenced organization is deleted, the session enrichment layer detects the invalid reference and clears the field (or returns a "select organization" state).

### Consequences

- **Positive:** Compatible with Better Auth's plugin architecture; no schema hacks or framework forks required.
- **Negative:** No database-level referential integrity; orphaned references are possible if organization deletion does not trigger session cleanup.
- **Mitigation:** The session enrichment middleware MUST validate `activeOrganizationId` against the user's current memberships on every cache miss. Organization deletion workflows MUST include a step to invalidate sessions referencing the deleted organization (via KV cache-bust or session table update).
- **Review trigger:** If Better Auth adds native FK support for `additionalFields`, or if the session model is migrated to a custom implementation.

---

## ADR-AR-07: Dual User System — `baUser` + `users` (H6)

### Status

**Accepted Risk — Migration In Progress**

### Context

The system maintains two user representations:

1. **`baUser`** (aka `user` in Better Auth) — The canonical user record managed by Better Auth. Handles authentication, sessions, email verification, and account linking.
2. **`users`** — A domain-level user record in the Standard schema. Contains assessment-related metadata, organization-specific profiles, audit fields, and domain-specific attributes not supported by Better Auth's schema.

This dual-user architecture exists because Better Auth's user model is intentionally minimal and extensibility via `additionalFields` is insufficient for the domain's requirements (multi-organization profiles, assessment history, compliance metadata).

### Decision

Accept the dual-user system as a **managed architectural state** with an active migration strategy:

1. **`baUser` is authoritative for identity and authentication.** All auth flows (login, registration, session management, password reset) operate exclusively on `baUser`.
2. **`users` is authoritative for domain data.** All assessment, organization, and compliance data references the `users` table.
3. **Sync is maintained via an async queue** — user creation/update events in Better Auth trigger a queue message that upserts the corresponding `users` record.
4. **Metric tracking** monitors sync health: lag, failures, orphaned records, and drift between the two tables.

### Consequences

- **Positive:** Clean separation of concerns; Better Auth upgrades do not risk domain data; domain schema evolves independently.
- **Negative:** Two sources of truth for user data; sync lag means brief windows where `users` may not reflect recent auth changes; debugging requires checking both tables.
- **Mitigation:**
  - The sync queue uses **at-least-once delivery** with idempotent upserts to prevent data loss.
  - A **reconciliation job** runs periodically to detect and repair drift between `baUser` and `users`.
  - **Metric dashboards** track sync lag P50/P99, failure rates, and orphan counts.
  - All domain queries MUST reference `users`, never `baUser` directly (except in the auth module).
- **Long-term strategy:** Evaluate consolidation when Better Auth's schema extensibility matures or if the project migrates to a custom auth implementation. The sync infrastructure is designed to be removable.
- **Review trigger:** If sync lag exceeds 5 seconds P99 sustained, if orphan rate exceeds 0.1%, or if Better Auth releases a major version with schema extensibility improvements.

---

## Summary Table

| ID | Item | Risk Level | Status | Review Trigger |
|---|---|---|---|---|
| AR-01 | KV cache 60s staleness | Medium | Accepted | Real-time access control requirement |
| AR-02 | Per-isolate rate limits | Medium | Accepted | Targeted API abuse incidents |
| AR-03 | Dual API key tables | Medium | Accepted — Pending Decision | Pre-v1 GA consolidation |
| AR-04 | Dual naming convention | Low | Accepted | Major API version bump |
| AR-05 | Preview CORS wildcard | Low | Accepted | Untrusted `pages.dev` access |
| AR-06 | `activeOrganizationId` no FK | Low | Accepted | Better Auth FK support |
| AR-07 | Dual user system | High | Accepted — Migrating | Sync lag or orphan thresholds |

---

## References

- [AGENTS.md — Security Rules](file:///c:/Users/resper/OneDrive/Área%20de%20Trabalho/aegis-api/AGENTS.md) §13
- [AGENTS.md — Data and Tenancy Rules](file:///c:/Users/resper/OneDrive/Área%20de%20Trabalho/aegis-api/AGENTS.md) §7
- [AGENTS.md — Cloudflare Architecture Guidelines](file:///c:/Users/resper/OneDrive/Área%20de%20Trabalho/aegis-api/AGENTS.md) §6

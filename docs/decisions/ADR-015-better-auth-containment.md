# ADR-015 — Better Auth Containment via AuthRepository

**Status**: Accepted  
**Date**: 2026-06-10  
**Deciders**: Platform Team  
**Refs**: [adr-auth-accepted-risks.md](./adr-auth-accepted-risks.md), [ADR-005](./0005-standard-native-auth-identity-provider.md)

---

## Context

Better Auth internal tables (`ba_user`, `ba_session`, `ba_account`, `ba_verification`) were being accessed directly via the raw Drizzle client (`deps._db`) from multiple route handlers across the API Gateway. This created:

- **R2 — Acoplamento estrutural**: Route handlers directly imported and queried BA tables, coupling business logic to Better Auth's internal schema. Any BA upgrade or schema change would require changes across all route files.
- **R3 — Cascata sem transação**: Delete operations (user rejection, deletion, ban) performed sequential `DELETE` statements without wrapping them in a database transaction. A failure midway left the database in a partially-deleted state.
- **R4 — Falta de controle centralizado**: No single point of control for auth table access made it impossible to audit, throttle, or add hooks around auth state changes.
- **R6 — Ausência de barreira de domínio**: The `_db` escape hatch was documented as for domain tables only, but was being used for BA-internal tables as well.

## Decision

Introduce `AuthRepository` as the **single point of access** to Better Auth internal tables.

### Architecture

```
apps/api-gateway/src/routes/
  ├── admin-users.routes.ts   → context.deps.authRepo.*
  ├── user-orgs.routes.ts     → context.deps.authRepo.*
  └── ...                     → context.deps._db (domain tables only)

packages/auth/src/
  └── auth-repository.ts      → sole owner of baUser, baSession, baAccount, baVerification
```

### `AuthRepository` Interface (createAuthRepository)

| Method | Description |
|--------|-------------|
| `getUserById(id)` | Fetch user summary by BA user ID |
| `listUsers(opts?)` | List users with limit/offset |
| `listUsersWithSearch(opts?)` | List + search + count for pagination |
| `getPendingCount()` | Count unapproved users |
| `updateUser(id, data)` | Patch user fields (always sets `updatedAt`) |
| `setSessionOrg(sessionId, orgId\|null)` | Set/clear activeOrganizationId on session |
| `revokeSession(sessionId)` | Delete a specific session |
| `revokeAllUserSessions(userId)` | Delete all sessions for a user |
| `deleteUserCascade(userId)` | **Atomic transaction**: accounts → sessions → verification → user |
| `banUser(userId, opts)` | **Atomic transaction**: banned=true + revoke all sessions |
| `unbanUser(userId)` | Clear ban flags |
| `approveUser(userId)` | **Atomic transaction**: approved=true + revoke pre-approval sessions |

### Injection

`AuthRepository` is injected via `AppDependencies`:

```typescript
// apps/api-gateway/src/http.ts
interface AppDependencies {
  authRepo: AuthRepository;   // NEW — sole gateway to BA tables
  _db?: DbClient;             // @deprecated for BA tables; domain tables only
  // ...
}
```

Production instantiation in `createDrizzleRepositories` uses `createAuthRepository(db)`.  
Test/mock instantiation in `createMockRepositories` uses a no-op stub.

## Consequences

### Positive

- **Containment**: BA tables are accessed from exactly one module — `packages/auth/src/auth-repository.ts`.
- **Atomicity**: Critical multi-step BA operations (ban, approve, delete) are now wrapped in `db.transaction()`, fixing R3.
- **Testability**: `AuthRepository` is a plain object with async methods — trivially mockable. 8 unit tests added.
- **Upgrade safety**: BA schema changes require updating only `auth-repository.ts`, not every route file.
- **Auditability**: All BA write paths flow through named, documented methods.

### Negative / Trade-offs

- `(db as any)` remains inside `auth-repository.ts` due to Drizzle's union type not exposing `.transaction()` directly on `PostgresJsDatabase | NeonHttpDatabase`. This is an accepted internal cast, contained to one module.
- `_db` for domain tables in routes (`organizations`, `memberships`, `users`, etc.) remains — removing it is out of scope for this ADR.
- `customSession` in `packages/auth/src/auth.ts` queries domain tables (`organizations`, `memberships`) via `(db as any)` — acceptable as it is also within `packages/auth/`.

## Risks Addressed

| Risk | Status |
|------|--------|
| R2 — Direct BA table access from routes | ✅ Resolved |
| R3 — Cascade delete without transaction | ✅ Resolved |
| R4 — No central control point | ✅ Resolved (AuthRepository) |
| R6 — No domain barrier | ✅ Resolved |

## Risks Not Addressed (separate ADRs)

| Risk | Status |
|------|--------|
| R1 — getCachedAuth singleton lifecycle | Tracked in `adr-auth-accepted-risks.md` |
| R5 — `@better-auth/api-key` unused | See Task 8 in containment plan |
| R7 — No rate limiting on auth endpoints | Product backlog |
| R8 — Missing MFA | Product backlog |

## Files Changed

| File | Change |
|------|--------|
| `packages/auth/src/auth-repository.ts` | [NEW] AuthRepository implementation |
| `packages/auth/src/auth-repository.test.ts` | [NEW] 8 unit tests |
| `packages/auth/src/index.ts` | Re-export AuthRepository |
| `packages/auth/vitest.config.ts` | [NEW] Vitest configuration |
| `apps/api-gateway/src/http.ts` | Added `authRepo` to AppDependencies |
| `apps/api-gateway/src/adapters/index.ts` | Instantiation in factories |
| `apps/api-gateway/src/routes/admin-users.routes.ts` | Migrated to authRepo |
| `apps/api-gateway/src/routes/user-orgs.routes.ts` | Migrated to authRepo |

## Commits

- `adfa567` — feat(auth): implement AuthRepository + unit tests
- `a49db8e` — feat(api-gateway): inject AuthRepository into AppDependencies  
- `afbfb5f` — refactor(admin-users): migrate to AuthRepository
- `cbbdc24` — refactor(user-orgs): migrate to AuthRepository

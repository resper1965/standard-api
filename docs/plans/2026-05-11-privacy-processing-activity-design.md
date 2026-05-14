# Privacy Processing Activity — Phase 1 Design

## Goal

Add a ROPA (Record of Processing Activities) module to the Standard platform, following existing architectural patterns for routes, tenant isolation, auth, audit, and Drizzle ORM.

## Scope

Phase 1 only — base entity CRUD, tenant isolation, audit events, completeness analysis. No SCF applicability, DPIA screening, evidence management, agent runtime, or reports.

## Architecture Decisions

### 1. New Package: `packages/privacy`
Follows the same structure as `packages/soa`:
- `src/types.ts` — Repository interfaces + `PrivacyDependencies`
- `src/errors.ts` — `PrivacyWorkflowError`
- `src/factory.ts` — `createInMemoryPrivacyDependencies()`
- `src/services/processing-activity.service.ts` — CRUD + status transitions
- `src/services/completeness.service.ts` — Generic `CompletenessAnalyzer<T>` + Privacy-specific implementation
- `src/repositories/inmemory.ts` — InMemory repo for tests

### 2. Schema: Add to existing `packages/schemas`
- Add 6 enums + 4 tables to `packages/schemas/src/db/schema.ts`
- Add Zod validation schemas to `packages/schemas/src/privacy.ts`
- Export from `packages/schemas/src/index.ts`

### 3. API Routes: `apps/api-gateway/src/routes/privacy.routes.ts`
11 endpoints under `/api/v1/privacy/processing-activities/*`

### 4. Adapter: `apps/api-gateway/src/adapters/privacy.repository.ts`
Drizzle-backed repositories, same pattern as `soa.repository.ts`.

### 5. Wiring: Update `AppDependencies` + `createDrizzleRepositories`

## Data Model

### Tables
1. `privacy_processing_activities` — Main ROPA entity (40+ fields)
2. `privacy_processing_activity_data_subjects` — Data subject categories
3. `privacy_processing_activity_data_categories` — Data types processed
4. `privacy_processing_activity_events` — Audit trail

### Enums
- `privacy_controller_role`: controller, processor, joint_controller, independent_controller, unknown
- `privacy_activity_status`: draft, needs_information, under_review, approved, rejected, archived
- `privacy_legal_basis_confidence`: stated, inferred, suggested, unknown
- `privacy_validation_status`: not_reviewed, requires_legal_review, approved, rejected, needs_information
- `privacy_dpia_screening_status`: not_started, incomplete, not_required, required, under_review, approved
- `privacy_source_type`: stated, inferred, suggested, manual
- `privacy_confidence_level`: high, medium, low, unknown
- `privacy_actor_type`: user, agent, system, api_key
- `privacy_risk_level`: low, medium, high, critical, undetermined

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/privacy/processing-activities` | Create activity |
| GET | `/api/v1/privacy/processing-activities` | List activities |
| GET | `/api/v1/privacy/processing-activities/:id` | Get activity |
| PATCH | `/api/v1/privacy/processing-activities/:id` | Update activity |
| POST | `/api/v1/privacy/processing-activities/:id/archive` | Soft-delete |
| POST | `/api/v1/privacy/processing-activities/:id/data-subjects` | Add data subject |
| POST | `/api/v1/privacy/processing-activities/:id/data-categories` | Add data category |
| POST | `/api/v1/privacy/processing-activities/:id/completeness/analyze` | Completeness check |
| POST | `/api/v1/privacy/processing-activities/:id/submit-for-review` | Submit for review |
| POST | `/api/v1/privacy/processing-activities/:id/approve` | Approve |
| POST | `/api/v1/privacy/processing-activities/:id/reject` | Reject |

## Business Rules

1. All queries filter by `tenant_id`.
2. Cross-tenant access blocked.
3. No physical deletes — use `archived_at`.
4. Audit event on: create, update, archive, submit, approve, reject.
5. Cannot approve if critical fields are missing (name, purpose, data_subjects, data_categories, legal_basis, international_transfer, third_party_sharing, automated_decision, profiling).
6. Absence of information ≠ high risk.
7. No automatic compliance assertions.

## Completeness Analyzer

Generic contract reusable by future modules:
```typescript
interface CompletenessResult {
  completeness_score: number; // 0-100
  missing_required_fields: string[];
  missing_recommended_fields: string[];
  blocking_issues: string[];
  can_be_submitted_for_review: boolean;
}

interface CompletenessAnalyzer<T> {
  analyze(entity: T, relations: Record<string, unknown[]>): CompletenessResult;
}
```

## Out of Scope (Phase 1)

- SCF applicability mapping
- DPIA/LIA/TIA/DPA screening logic
- Evidence management
- Field-level review
- Agent runtime integration
- Reports/exports

## Verification

- `pnpm typecheck` passes
- `pnpm test` passes (new unit tests)
- Migration applies cleanly
- Endpoints work via curl/httpie against local dev

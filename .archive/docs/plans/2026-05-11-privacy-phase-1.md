> [!WARNING]
> **[ARCHIVED/LEGACY PLAN]** Este é um plano de execução legado e histórico de fases anteriores do desenvolvimento da plataforma. Ele pode não refletir a arquitetura atenuada atual.

# Privacy Processing Activity — Phase 1 Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Create the base entity for processing activities (ROPA), with CRUD, organization isolation, audit events, and CompletenessAnalyzer integration.

**Architecture:** New `packages/privacy/` package following the existing SoA pattern (types → repos → services → factory → routes). The package owns 3 Drizzle tables, exposes `PrivacyDependencies`, and consumes `@standard/domain` for `CompletenessAnalyzer<T>`. Routes are registered in `apps/api-gateway/`.

**Tech Stack:** TypeScript (strict), Drizzle ORM, Zod validation, `@standard/domain` CompletenessAnalyzer, existing auth/organization/error middleware.

---

## File Map

| Category | Action | Path |
|----------|--------|------|
| Schema | Create | `packages/schemas/src/db/privacy.schema.ts` |
| Schema | Modify | `packages/schemas/src/db/schema.ts` (re-export) |
| Zod | Create | `packages/schemas/src/privacy.ts` |
| Zod | Modify | `packages/schemas/src/index.ts` (re-export) |
| Package | Create | `packages/privacy/package.json` |
| Package | Create | `packages/privacy/tsconfig.json` |
| Types | Create | `packages/privacy/src/types.ts` |
| Errors | Create | `packages/privacy/src/errors.ts` |
| InMemory | Create | `packages/privacy/src/repositories/privacy.repositories.ts` |
| Services | Create | `packages/privacy/src/services/privacy-crud.service.ts` |
| Services | Create | `packages/privacy/src/services/privacy-completeness.service.ts` |
| Services | Create | `packages/privacy/src/services/privacy-status.service.ts` |
| Factory | Create | `packages/privacy/src/factory.ts` |
| Barrel | Create | `packages/privacy/src/index.ts` |
| Routes | Create | `apps/api-gateway/src/routes/privacy.routes.ts` |
| Wiring | Modify | `apps/api-gateway/src/http.ts` (AppDependencies) |
| Wiring | Modify | `apps/api-gateway/src/adapters/index.ts` (mock + drizzle) |
| Wiring | Modify | `apps/api-gateway/src/app.ts` (route registration) |
| Tests | Create | `packages/privacy/tests/run-tests.ts` |
| Tests | Create | `packages/privacy/tests/privacy-crud.test.ts` |
| Tests | Create | `packages/privacy/tests/privacy-completeness.test.ts` |

---

## Task 1: Drizzle Schema — Enums + Tables

**Files:**
- Create: `packages/schemas/src/db/privacy.schema.ts`
- Modify: `packages/schemas/src/db/schema.ts` (add re-export at end of file)

**Step 1: Create the privacy schema file**

```typescript
// packages/schemas/src/db/privacy.schema.ts
import { boolean, index, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const auditMetadata = () => jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull();
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

// ─── Enums ──────────────────────────────────────────────────────────

export const privacyControllerRoleEnum = pgEnum("privacy_controller_role", [
  "controller", "processor", "joint_controller", "independent_controller", "unknown"
]);

export const privacyActivityStatusEnum = pgEnum("privacy_activity_status", [
  "draft", "needs_information", "under_review", "approved", "rejected", "archived"
]);

export const privacyLegalBasisLgpdEnum = pgEnum("privacy_legal_basis_lgpd", [
  "consent",
  "legal_obligation",
  "public_administration",
  "research",
  "contract",
  "legitimate_interest",
  "credit_protection",
  "life_protection",
  "health_protection",
  "judicial_process",
  "not_determined"
]);

export const privacySensitivityEnum = pgEnum("privacy_data_sensitivity", [
  "personal", "sensitive", "anonymized", "pseudonymized", "children", "financial", "health", "biometric", "genetic", "political", "religious", "sexual", "criminal", "other"
]);

export const privacyDataSubjectCategoryEnum = pgEnum("privacy_data_subject_category", [
  "employees", "customers", "prospects", "partners", "suppliers", "minors", "patients", "students", "citizens", "visitors", "contractors", "other"
]);

// ─── Tables ─────────────────────────────────────────────────────────

export const privacyProcessingActivities = pgTable("privacy_processing_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  assessmentId: uuid("assessment_id"),
  name: text("name").notNull(),
  description: text("description"),
  businessProcess: text("business_process"),
  departmentId: uuid("department_id"),
  ownerPersonId: uuid("owner_person_id"),
  controllerRole: privacyControllerRoleEnum("controller_role").default("unknown").notNull(),
  status: privacyActivityStatusEnum("status").default("draft").notNull(),
  purpose: text("purpose"),
  legalBasisLgpd: privacyLegalBasisLgpdEnum("legal_basis_lgpd"),
  legalBasisDetail: text("legal_basis_detail"),
  retentionPeriod: text("retention_period"),
  retentionJustification: text("retention_justification"),
  thirdPartySharing: boolean("third_party_sharing").default(false).notNull(),
  internationalTransfer: boolean("international_transfer").default(false).notNull(),
  automatedDecisionMaking: boolean("automated_decision_making").default(false).notNull(),
  largeScopeProcessing: boolean("large_scope_processing").default(false).notNull(),
  vulnerableSubjects: boolean("vulnerable_subjects").default(false).notNull(),
  systematicMonitoring: boolean("systematic_monitoring").default(false).notNull(),
  securityMeasuresSummary: text("security_measures_summary"),
  dpiaRequired: boolean("dpia_required"),
  liaRequired: boolean("lia_required"),
  tiaRequired: boolean("tia_required"),
  riskLevel: text("risk_level"),
  createdBy: uuid("created_by"),
  ...auditMetadata(),
  ...timestamps(),
}, (table) => [
  index("idx_privacy_activities_tenant").on(table.organizationId),
  index("idx_privacy_activities_assessment").on(table.assessmentId),
  index("idx_privacy_activities_status").on(table.status),
  index("idx_privacy_activities_tenant_status").on(table.organizationId, table.status),
]);

export const privacyProcessingActivityDataSubjects = pgTable("privacy_processing_activity_data_subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  activityId: uuid("activity_id").notNull(),
  category: privacyDataSubjectCategoryEnum("category").notNull(),
  description: text("description"),
  estimatedCount: text("estimated_count"),
  vulnerableGroup: boolean("vulnerable_group").default(false).notNull(),
  ageRestrictions: text("age_restrictions"),
  ...timestamps(),
}, (table) => [
  index("idx_privacy_data_subjects_activity").on(table.activityId),
  index("idx_privacy_data_subjects_tenant").on(table.organizationId),
]);

export const privacyProcessingActivityDataCategories = pgTable("privacy_processing_activity_data_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  activityId: uuid("activity_id").notNull(),
  categoryName: text("category_name").notNull(),
  sensitivity: privacySensitivityEnum("sensitivity").default("personal").notNull(),
  specificDataElements: jsonb("specific_data_elements").$type<string[]>().default([]).notNull(),
  sourceOfData: text("source_of_data"),
  retentionPeriod: text("retention_period"),
  ...timestamps(),
}, (table) => [
  index("idx_privacy_data_categories_activity").on(table.activityId),
  index("idx_privacy_data_categories_tenant").on(table.organizationId),
]);
```

**Step 2: Re-export from main schema**

Add to end of `packages/schemas/src/db/schema.ts`:

```typescript
// ─── Privacy Processing Activity ─────────────────────────────────
export * from "./privacy.schema";
```

**Step 3: Generate migration**

Run: `pnpm db:generate`
Expected: New SQL migration file in `drizzle/` with CREATE TABLE and CREATE TYPE statements.

**Step 4: Commit**

```bash
git add packages/schemas/src/db/privacy.schema.ts packages/schemas/src/db/schema.ts
git commit -m "feat(schemas): add privacy processing activity tables and enums"
```

---

## Task 2: Zod Validation Schemas

**Files:**
- Create: `packages/schemas/src/privacy.ts`
- Modify: `packages/schemas/src/index.ts` (add export)

**Step 1: Create Zod schemas**

```typescript
// packages/schemas/src/privacy.ts
import { z } from "zod";
import { UuidSchema, TraceIdSchema } from "./common";

// ─── Enums ──────────────────────────────────────────────────────────

export const PrivacyControllerRoleSchema = z.enum([
  "controller", "processor", "joint_controller", "independent_controller", "unknown"
]);

export const PrivacyActivityStatusSchema = z.enum([
  "draft", "needs_information", "under_review", "approved", "rejected", "archived"
]);

export const PrivacyLegalBasisLgpdSchema = z.enum([
  "consent", "legal_obligation", "public_administration", "research",
  "contract", "legitimate_interest", "credit_protection", "life_protection",
  "health_protection", "judicial_process", "not_determined"
]);

export const PrivacyDataSensitivitySchema = z.enum([
  "personal", "sensitive", "anonymized", "pseudonymized", "children",
  "financial", "health", "biometric", "genetic", "political",
  "religious", "sexual", "criminal", "other"
]);

export const PrivacyDataSubjectCategorySchema = z.enum([
  "employees", "customers", "prospects", "partners", "suppliers",
  "minors", "patients", "students", "citizens", "visitors", "contractors", "other"
]);

// ─── Create/Update Requests ─────────────────────────────────────────

export const CreatePrivacyActivityRequestSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  assessment_id: UuidSchema.optional(),
  business_process: z.string().max(500).optional(),
  department_id: UuidSchema.optional(),
  owner_person_id: UuidSchema.optional(),
  controller_role: PrivacyControllerRoleSchema.default("unknown"),
  purpose: z.string().max(5000).optional(),
  legal_basis_lgpd: PrivacyLegalBasisLgpdSchema.optional(),
  legal_basis_detail: z.string().max(5000).optional(),
  retention_period: z.string().max(500).optional(),
  retention_justification: z.string().max(5000).optional(),
  third_party_sharing: z.boolean().default(false),
  international_transfer: z.boolean().default(false),
  automated_decision_making: z.boolean().default(false),
  large_scope_processing: z.boolean().default(false),
  vulnerable_subjects: z.boolean().default(false),
  systematic_monitoring: z.boolean().default(false),
  security_measures_summary: z.string().max(10000).optional(),
  dpia_required: z.boolean().optional(),
  lia_required: z.boolean().optional(),
  tia_required: z.boolean().optional(),
  risk_level: z.string().max(100).optional(),
});

export const UpdatePrivacyActivityRequestSchema = CreatePrivacyActivityRequestSchema.partial().omit({ assessment_id: true });

export const UpdatePrivacyActivityStatusRequestSchema = z.object({
  status: PrivacyActivityStatusSchema,
  reason: z.string().max(2000).optional(),
});

// ─── Data Subjects ──────────────────────────────────────────────────

export const CreatePrivacyDataSubjectRequestSchema = z.object({
  category: PrivacyDataSubjectCategorySchema,
  description: z.string().max(2000).optional(),
  estimated_count: z.string().max(200).optional(),
  vulnerable_group: z.boolean().default(false),
  age_restrictions: z.string().max(500).optional(),
});

// ─── Data Categories ────────────────────────────────────────────────

export const CreatePrivacyDataCategoryRequestSchema = z.object({
  category_name: z.string().min(1).max(500),
  sensitivity: PrivacyDataSensitivitySchema.default("personal"),
  specific_data_elements: z.array(z.string().max(200)).default([]),
  source_of_data: z.string().max(1000).optional(),
  retention_period: z.string().max(500).optional(),
});

// ─── Responses ──────────────────────────────────────────────────────

export const PrivacyActivityResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  assessment_id: UuidSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  business_process: z.string().nullable(),
  department_id: UuidSchema.nullable(),
  owner_person_id: UuidSchema.nullable(),
  controller_role: PrivacyControllerRoleSchema,
  status: PrivacyActivityStatusSchema,
  purpose: z.string().nullable(),
  legal_basis_lgpd: PrivacyLegalBasisLgpdSchema.nullable(),
  legal_basis_detail: z.string().nullable(),
  retention_period: z.string().nullable(),
  retention_justification: z.string().nullable(),
  third_party_sharing: z.boolean(),
  international_transfer: z.boolean(),
  automated_decision_making: z.boolean(),
  large_scope_processing: z.boolean(),
  vulnerable_subjects: z.boolean(),
  systematic_monitoring: z.boolean(),
  security_measures_summary: z.string().nullable(),
  dpia_required: z.boolean().nullable(),
  lia_required: z.boolean().nullable(),
  tia_required: z.boolean().nullable(),
  risk_level: z.string().nullable(),
  created_by: UuidSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PrivacyDataSubjectResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  activity_id: UuidSchema,
  category: PrivacyDataSubjectCategorySchema,
  description: z.string().nullable(),
  estimated_count: z.string().nullable(),
  vulnerable_group: z.boolean(),
  age_restrictions: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PrivacyDataCategoryResponseSchema = z.object({
  id: UuidSchema,
  organization_id: UuidSchema,
  activity_id: UuidSchema,
  category_name: z.string(),
  sensitivity: PrivacyDataSensitivitySchema,
  specific_data_elements: z.array(z.string()),
  source_of_data: z.string().nullable(),
  retention_period: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ─── Types ──────────────────────────────────────────────────────────

export type PrivacyControllerRole = z.infer<typeof PrivacyControllerRoleSchema>;
export type PrivacyActivityStatus = z.infer<typeof PrivacyActivityStatusSchema>;
export type PrivacyLegalBasisLgpd = z.infer<typeof PrivacyLegalBasisLgpdSchema>;
export type PrivacyDataSensitivity = z.infer<typeof PrivacyDataSensitivitySchema>;
export type PrivacyDataSubjectCategory = z.infer<typeof PrivacyDataSubjectCategorySchema>;
export type CreatePrivacyActivityRequest = z.input<typeof CreatePrivacyActivityRequestSchema>;
export type UpdatePrivacyActivityRequest = z.input<typeof UpdatePrivacyActivityRequestSchema>;
export type UpdatePrivacyActivityStatusRequest = z.infer<typeof UpdatePrivacyActivityStatusRequestSchema>;
export type CreatePrivacyDataSubjectRequest = z.input<typeof CreatePrivacyDataSubjectRequestSchema>;
export type CreatePrivacyDataCategoryRequest = z.input<typeof CreatePrivacyDataCategoryRequestSchema>;
export type PrivacyActivityResponse = z.infer<typeof PrivacyActivityResponseSchema>;
export type PrivacyDataSubjectResponse = z.infer<typeof PrivacyDataSubjectResponseSchema>;
export type PrivacyDataCategoryResponse = z.infer<typeof PrivacyDataCategoryResponseSchema>;
```

**Step 2: Add export to `packages/schemas/src/index.ts`**

Add: `export * from "./privacy";`

**Step 3: Run typecheck**

Run: `pnpm --filter @standard/schemas typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/schemas/src/privacy.ts packages/schemas/src/index.ts
git commit -m "feat(schemas): add privacy Zod validation schemas"
```

---

## Task 3: Privacy Package — Types, Errors, Repository Interface

**Files:**
- Create: `packages/privacy/package.json`
- Create: `packages/privacy/tsconfig.json`
- Create: `packages/privacy/src/types.ts`
- Create: `packages/privacy/src/errors.ts`

**Step 1: Create package.json** (same pattern as `@standard/soa`)

```json
{
  "name": "@standard/privacy",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "tsx tests/run-tests.ts"
  },
  "dependencies": {
    "@standard/domain": "workspace:*",
    "@standard/schemas": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.21.0",
    "typescript": "latest"
  }
}
```

**Step 2: Create tsconfig.json** (same as `@standard/domain`)

**Step 3: Create `packages/privacy/src/types.ts`**

Repository interfaces + PrivacyDependencies + PrivacyContext. Follow the SoA pattern in `packages/soa/src/types.ts`:

- `PrivacyContext` = `{ organizationId, actorId?, traceId }`
- `PrivacyActivityRepository` = `{ save, get, list, update, delete }`
- `PrivacyDataSubjectRepository` = `{ saveMany, listByActivity, deleteByActivity }`
- `PrivacyDataCategoryRepository` = `{ saveMany, listByActivity, deleteByActivity }`
- `PrivacyRepositories` = `{ activities, dataSubjects, dataCategories }`
- `PrivacyDependencies` = `{ repositories }`

**Step 4: Create `packages/privacy/src/errors.ts`**

Follow `packages/soa/src/errors.ts` pattern:

- `PrivacyError` extends `Error` with `code`, `details`
- `assertPrivacyContext()` validates `organizationId` + `traceId`
- `assertPrivacyActor()` validates `actorId`

**Step 5: Commit**

```bash
git add packages/privacy/
git commit -m "feat(privacy): scaffold package with types, errors, and repository interfaces"
```

---

## Task 4: InMemory Repositories

**Files:**
- Create: `packages/privacy/src/repositories/privacy.repositories.ts`

**Step 1: Implement InMemory repos**

Follow `packages/soa/src/repositories/soa.repositories.ts` pattern. Three InMemory repositories backed by `Map<string, T>`:

- `createInMemoryPrivacyActivityRepository()`
- `createInMemoryPrivacyDataSubjectRepository()`
- `createInMemoryPrivacyDataCategoryRepository()`
- `createInMemoryPrivacyRepositories()` — combines all three.

All methods must filter by `organization_id`.

**Step 2: Commit**

```bash
git add packages/privacy/src/repositories/
git commit -m "feat(privacy): add in-memory repositories"
```

---

## Task 5: CRUD Service + Tests (TDD)

**Files:**
- Create: `packages/privacy/src/services/privacy-crud.service.ts`
- Create: `packages/privacy/tests/privacy-crud.test.ts`
- Create: `packages/privacy/tests/run-tests.ts`

**Step 1: Write failing tests for CRUD service**

Test file: `packages/privacy/tests/privacy-crud.test.ts`

Tests to write:
1. `create activity returns valid response with id`
2. `create activity sets defaults (status=draft, controller_role=unknown)`
3. `get activity returns null for wrong organization`
4. `list activities filters by organization_id`
5. `update activity merges partial patch`
6. `update activity rejects archived status`
7. `delete (soft) sets deletedAt`
8. `create data subject links to activity`
9. `list data subjects filters by activity_id and organization_id`
10. `create data category links to activity`
11. `list data categories filters by activity_id and organization_id`
12. `CRUD rejects operations on non-existent activity`

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @standard/privacy test`
Expected: FAIL (service not implemented)

**Step 3: Implement `PrivacyCrudService`**

```typescript
// packages/privacy/src/services/privacy-crud.service.ts
export class PrivacyCrudService {
  constructor(private readonly deps: PrivacyDependencies) {}

  async createActivity(request, context): Promise<PrivacyActivityResponse> { ... }
  async getActivity(id, organizationId): Promise<PrivacyActivityResponse | null> { ... }
  async listActivities(organizationId, filters?): Promise<PrivacyActivityResponse[]> { ... }
  async updateActivity(id, patch, context): Promise<PrivacyActivityResponse> { ... }
  async deleteActivity(id, context): Promise<void> { ... }

  async addDataSubjects(activityId, subjects, context): Promise<PrivacyDataSubjectResponse[]> { ... }
  async listDataSubjects(activityId, organizationId): Promise<PrivacyDataSubjectResponse[]> { ... }
  async removeDataSubject(subjectId, organizationId): Promise<void> { ... }

  async addDataCategories(activityId, categories, context): Promise<PrivacyDataCategoryResponse[]> { ... }
  async listDataCategories(activityId, organizationId): Promise<PrivacyDataCategoryResponse[]> { ... }
  async removeDataCategory(categoryId, organizationId): Promise<void> { ... }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @standard/privacy test`
Expected: PASS (12/12)

**Step 5: Commit**

```bash
git add packages/privacy/
git commit -m "feat(privacy): add CRUD service with tests"
```

---

## Task 6: Completeness Service + Tests (TDD)

**Files:**
- Create: `packages/privacy/src/services/privacy-completeness.service.ts`
- Create: `packages/privacy/tests/privacy-completeness.test.ts`

**Step 1: Write failing tests**

Tests:
1. `empty activity has low score and many blocking issues`
2. `filled activity with relations has higher score`
3. `missing purpose is a blocking issue`
4. `third_party_sharing=true without third_parties is coherence error`
5. `can_be_submitted_for_review=false when required fields missing`
6. `can_be_submitted_for_review=true when all required + relations present`
7. `draft_report_allowed is always true`

**Step 2: Run tests to verify they fail**

**Step 3: Implement `PrivacyCompletenessService`**

```typescript
import { createCompletenessAnalyzer, requireRelation, requireCoherence } from "@standard/domain";

const privacyCompletenessAnalyzer = createCompletenessAnalyzer<PrivacyActivityResponse>({
  required_fields: ["name", "purpose", "legal_basis_lgpd", "retention_period"],
  recommended_fields: ["description", "security_measures_summary", "business_process", "risk_level"],
  critical_fields: ["legal_basis_lgpd", "dpia_required", "lia_required", "tia_required", "retention_period", "risk_level"],
  rules: [
    requireRelation("data_subjects"),
    requireRelation("data_categories"),
    requireCoherence<PrivacyActivityResponse>({
      condition: (e) => e.third_party_sharing === true,
      relation: "third_parties",
      code: "SHARING_WITHOUT_THIRD_PARTIES",
      message: "third_party_sharing is true but no third parties registered.",
      severity: "critical",
    }),
  ],
});

export class PrivacyCompletenessService {
  constructor(private readonly deps: PrivacyDependencies) {}

  async analyze(activityId: string, organizationId: string): Promise<CompletenessResult> {
    const activity = await this.deps.repositories.activities.get(activityId, organizationId);
    if (!activity) throw new PrivacyError("ACTIVITY_NOT_FOUND", "Activity not found.");
    const dataSubjects = await this.deps.repositories.dataSubjects.listByActivity(activityId, organizationId);
    const dataCategories = await this.deps.repositories.dataCategories.listByActivity(activityId, organizationId);
    return privacyCompletenessAnalyzer.analyze({
      entity: activity,
      relations: { data_subjects: dataSubjects, data_categories: dataCategories },
      evidence: [],
      field_reviews: [],
      screenings: [],
      scf_controls: [],
      ai_suggestions: [],
    });
  }
}
```

**Step 4: Run tests to verify they pass**

**Step 5: Commit**

```bash
git add packages/privacy/
git commit -m "feat(privacy): add CompletenessAnalyzer integration with tests"
```

---

## Task 7: Status Transition Service

**Files:**
- Create: `packages/privacy/src/services/privacy-status.service.ts`

**Step 1: Implement status transitions**

Valid transitions:
- `draft` → `needs_information`, `under_review`, `archived`
- `needs_information` → `draft`, `under_review`, `archived`
- `under_review` → `approved`, `rejected`, `needs_information`
- `rejected` → `draft`, `needs_information`, `archived`
- `approved` → `archived`
- `archived` → `draft`

Transition to `under_review` must call `PrivacyCompletenessService.analyze()` and check `can_be_submitted_for_review`.

**Step 2: Commit**

```bash
git add packages/privacy/src/services/
git commit -m "feat(privacy): add status transition service"
```

---

## Task 8: Factory + Barrel Exports

**Files:**
- Create: `packages/privacy/src/factory.ts`
- Create: `packages/privacy/src/index.ts`

**Step 1: Create factory** (same pattern as `packages/soa/src/factory.ts`)

```typescript
export const createInMemoryPrivacyDependencies = (): PrivacyDependencies => ({
  repositories: createInMemoryPrivacyRepositories()
});
```

**Step 2: Create barrel export** (same pattern as `packages/soa/src/index.ts`)

**Step 3: Run typecheck**

Run: `pnpm --filter @standard/privacy typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/privacy/
git commit -m "feat(privacy): add factory and barrel exports"
```

---

## Task 9: API Routes

**Files:**
- Create: `apps/api-gateway/src/routes/privacy.routes.ts`

**Step 1: Create route definitions**

Follow `apps/api-gateway/src/routes/soa.routes.ts` pattern exactly. All routes require `tenantRequired: true`, `authRequired: true`.

Endpoints:

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/v1/privacy/processing-activities` | create |
| GET | `/api/v1/privacy/processing-activities` | list |
| GET | `/api/v1/privacy/processing-activities/:id` | get |
| PUT | `/api/v1/privacy/processing-activities/:id` | update |
| DELETE | `/api/v1/privacy/processing-activities/:id` | soft delete |
| POST | `/api/v1/privacy/processing-activities/:id/status` | transition |
| GET | `/api/v1/privacy/processing-activities/:id/completeness` | analyze |
| POST | `/api/v1/privacy/processing-activities/:id/data-subjects` | add subjects |
| GET | `/api/v1/privacy/processing-activities/:id/data-subjects` | list subjects |
| DELETE | `/api/v1/privacy/processing-activities/:id/data-subjects/:subjectId` | remove |
| POST | `/api/v1/privacy/processing-activities/:id/data-categories` | add categories |
| GET | `/api/v1/privacy/processing-activities/:id/data-categories` | list categories |
| DELETE | `/api/v1/privacy/processing-activities/:id/data-categories/:categoryId` | remove |

Each handler:
1. Extracts `organizationId`, `traceId`, `actorId` from context
2. Validates request body with Zod
3. Calls service method
4. Returns JSON response
5. Catches `PrivacyError` via `toApiError()`
6. Calls `deps.audit.record()` for mutations

**Step 2: Commit**

```bash
git add apps/api-gateway/src/routes/privacy.routes.ts
git commit -m "feat(api): add privacy processing activity routes"
```

---

## Task 10: Wire Into API Gateway

**Files:**
- Modify: `apps/api-gateway/src/http.ts` (add `privacy: PrivacyDependencies` to `AppDependencies`)
- Modify: `apps/api-gateway/src/adapters/index.ts` (add mock + drizzle wiring)
- Modify: `apps/api-gateway/src/app.ts` (import and spread `privacyRoutes`)

**Step 1: Add to `AppDependencies`**

In `apps/api-gateway/src/http.ts`, add to `AppDependencies`:

```typescript
privacy: PrivacyDependencies;
```

And the import for `PrivacyDependencies` from `@standard/privacy`.

**Step 2: Wire mock repositories**

In `apps/api-gateway/src/adapters/index.ts`:

```typescript
import { createInMemoryPrivacyDependencies } from "@standard/privacy";
// In createMockRepositories():
privacy: createInMemoryPrivacyDependencies(),
// In createDrizzleRepositories():
privacy: createInMemoryPrivacyDependencies(), // Drizzle adapter in future Task
```

**Step 3: Register routes**

In `apps/api-gateway/src/app.ts`:

```typescript
import { privacyRoutes } from "./routes/privacy.routes";
// In routes array:
...privacyRoutes,
```

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: api-gateway, privacy, schemas, domain all PASS

**Step 5: Commit**

```bash
git add apps/api-gateway/
git commit -m "feat(api): wire privacy module into api-gateway"
```

---

## Task 11: Install Dependencies + Full Validation

**Step 1: Install**

Run: `pnpm install`

**Step 2: Typecheck entire monorepo**

Run: `pnpm typecheck`
Expected: All packages PASS (except pre-existing workflows issue)

**Step 3: Run privacy tests**

Run: `pnpm --filter @standard/privacy test`
Expected: All tests PASS

**Step 4: Run domain tests**

Run: `pnpm --filter @standard/domain test`
Expected: 57/57 PASS

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(privacy): complete Phase 1 — base ROPA entity with CRUD, organization isolation, audit events, and CompletenessAnalyzer integration

Co-Authored-By: Google Antigravity (Gemini)"
```

---

## Verification Checklist

- [ ] 3 Drizzle tables created with proper indexes
- [ ] All tables have `organization_id` column + index
- [ ] Zod schemas cover create, update, and response for all entities
- [ ] InMemory repos filter by `organization_id` in every query
- [ ] CRUD service handles create, get, list, update, soft-delete
- [ ] CompletenessAnalyzer configured with Privacy-specific rules
- [ ] Status transitions validated (cannot advance to `under_review` without passing completeness)
- [ ] All routes have `authRequired` and `tenantRequired`
- [ ] Audit events recorded on all mutations
- [ ] 19+ tests passing
- [ ] Full monorepo typecheck clean
- [ ] No secrets, tokens, or real data
- [ ] No logic in frontend — all in `packages/privacy/`

Plan complete and saved to `docs/plans/2026-05-11-privacy-phase-1.md`.

**Next step: run `.agent/workflows/execute-plan.md` to execute this plan task-by-task in single-flow mode.**

# SCR-RMM Integration — Implementation Plan

**Date:** 2026-06-09  
**Author:** Antigravity (Senior Architect Mode)  
**Repo:** `standard-api-standard`  
**Status:** Draft — awaiting architectural review  

---

## Goal

Integrate the **SCR-RMM (Secure, Compliant & Resilient Risk Management Model)** as a first-class module inside the Standard platform. The SCR-RMM maps the 17-step risk management lifecycle (identification → assessment → scoring → treatment → reporting → monitoring) onto the existing SCF-based assessment engine.

The integration must:
- Preserve all existing approval gates and multi-tenancy invariants (AGENTS.md §11, §7)
- Deliver a formal `roc_determination` per gap finding (the core ROC linkage)
- Expose the existing `scf_risks` and `scf_threats` tables via versioned API routes
- Add a quantitative Risk Score Engine using the IE × OL formula
- Introduce a persistent Risk Register as the central SCR-RMM artefact per assessment
- Produce a ROC Summary endpoint that aggregates formal conformity at assessment level
- Allow organizations to declare their Risk Appetite / Tolerance for treatment gate validation

---

## Architecture

```
gap_findings  ──── roc_determination (Task 1)
      │
      └──► assessment_risk_register (Task 5) ◄── scf_risks (Task 3 API)
                     │                             scf_threats (Task 3 API)
                     │
                     └──► risk_score (Task 4 engine)
                                   │
                                   └──► ROC Summary (Task 6 endpoint)
                                                    │
                                                    └── risk_appetite (Task 7)
```

**Key invariants:**
- `assessment_risk_register` rows are scoped by `organization_id` + `assessment_id` (multi-tenancy)
- Risk Register entries require schema validation before persistence (AGENTS.md §10)
- `roc_determination` on `gap_findings` is derived (not LLM-originated), based on `severity + assessment_status`
- ROC Summary treats the worst single `roc_determination` as the `overall_conformity`
- MCR gaps with `material_weakness` are compliance blockers regardless of risk score
- Risk Score Engine is a **pure function** — stateless, deterministic, fully testable

---

## Tech Stack

| Layer | Technology |
|---|---|
| DB ORM | Drizzle ORM + PostgreSQL (Neon) |
| Schema validation | Zod (packages/schemas) |
| API | Cloudflare Workers + Hono (apps/api-gateway) |
| Types | TypeScript strict |
| Testing | Vitest unit tests |
| Migrations | `pnpm db:generate` → `pnpm db:migrate` |

---

## Task Tracker

| # | Task | Effort | Status |
|---|---|---|---|
| 1 | ROC Determination on gap_findings | S (2h) | ☐ |
| 2 | Assessment Assurance Level | XS (1h) | ☐ |
| 3 | Risk & Threat Catalog API | M (3h) | ☐ |
| 4 | Risk Score Engine | M (3h) | ☐ |
| 5 | Risk Register table + service + endpoints | L (6h) | ☐ |
| 6 | ROC Summary endpoint | M (3h) | ☐ |
| 7 | Risk Tolerance per Organization | M (3h) | ☐ |

---

---

# Task 1 — ROC Determination on `gap_findings`

**Effort:** S (≈ 2h)  
**Rationale:** High value, zero new tables. Adds formal ROC semantics to existing gap findings with an automatic derivation rule. Unlocks Tasks 5 and 6.

**Files touched:**
- `packages/schemas/src/db/schema.ts`
- `packages/schemas/src/gap-analysis.ts`
- `packages/gap-analysis/src/services/gap-draft.service.ts` (or wherever gap findings are written)
- New migration SQL

---

## Step 1.1 — Add `roc_determination` enum + column to Drizzle schema

Open `packages/schemas/src/db/schema.ts`.

**After the `controlImplementationStatusEnum`**, add the new enum:

```typescript
// ── SCR-RMM: Report on Conformity determination ───────────────────────────────
export const rocDeterminationEnum = pgEnum("roc_determination", [
  "strictly_conforms",     // No gaps; all evidence strong
  "conforms",              // Minor gaps; evidence adequate; no material risk
  "significant_deficiency",// Notable control weaknesses; not yet material
  "material_weakness",     // Critical/high gap or MCR blocker; immediate action required
]);
```

**In the `gapFindings` table**, add the new column after `responsibilityType` (before `...timestamps()`):

```typescript
    /**
     * SCR-RMM ROC Determination — formal conclusion per finding.
     * Derived automatically from severity + assessment_status at write time.
     * Immutable once the parent gap_analysis_version is approved.
     * Rule:
     *   severity=critical|high         → material_weakness
     *   severity=medium, not_met       → significant_deficiency
     *   severity=medium, partially_met → significant_deficiency
     *   severity=low,   not_met        → significant_deficiency
     *   severity=low,   met/partially  → conforms
     *   severity=informational, met    → strictly_conforms
     *   assessment_status=not_applicable_justified → strictly_conforms
     *   is_mcr_gap=true + not fully met → material_weakness (override)
     */
    rocDetermination: rocDeterminationEnum("roc_determination"),
```

**Add index** after `gap_findings_requirement_idx`:

```typescript
    index("gap_findings_roc_idx").on(table.rocDetermination),
```

---

## Step 1.2 — Generate and apply migration

```bash
pnpm db:generate
# Review generated migration in packages/schemas/drizzle/
pnpm db:migrate
```

The generated SQL should include:

```sql
-- Migration: add roc_determination to gap_findings
CREATE TYPE "roc_determination" AS ENUM (
  'strictly_conforms',
  'conforms',
  'significant_deficiency',
  'material_weakness'
);

ALTER TABLE "gap_findings"
  ADD COLUMN "roc_determination" "roc_determination";

CREATE INDEX "gap_findings_roc_idx"
  ON "gap_findings" ("roc_determination");
```

> **Note:** The column is nullable initially so existing rows are unaffected. A backfill job (see Step 1.4) will populate existing rows.

---

## Step 1.3 — Add Zod schema + types in `packages/schemas/src/gap-analysis.ts`

```typescript
// After GapSeveritySchema

export const RocDeterminationSchema = z.enum([
  "strictly_conforms",
  "conforms",
  "significant_deficiency",
  "material_weakness",
]);

export type RocDetermination = z.infer<typeof RocDeterminationSchema>;
```

Update `GapFindingResponseSchema` to include `roc_determination`:

```typescript
// In GapFindingResponseSchema, add:
roc_determination: RocDeterminationSchema.optional(),
```

---

## Step 1.4 — Pure derivation function

Create `packages/schemas/src/roc-derivation.ts` (pure utility, no I/O):

```typescript
import type { RocDetermination } from "./gap-analysis";

export type RocInput = {
  severity: "informational" | "low" | "medium" | "high" | "critical";
  assessment_status:
    | "met"
    | "partially_met"
    | "not_met"
    | "not_evidenced"
    | "not_applicable_justified"
    | "not_applicable_not_justified"
    | "requires_validation";
  is_mcr_gap: boolean;
};

/**
 * Derive the ROC determination for a single gap finding.
 *
 * Rules (applied in priority order):
 * 1. MCR gap that is not fully met → always material_weakness
 * 2. severity=critical or severity=high → material_weakness
 * 3. severity=medium + (not_met | not_evidenced | partially_met) → significant_deficiency
 * 4. severity=low + not_met → significant_deficiency
 * 5. assessment_status=not_applicable_justified → strictly_conforms
 * 6. severity=informational + met → strictly_conforms
 * 7. severity=low + met → conforms
 * 8. severity=medium + met → conforms
 * 9. Default → significant_deficiency (safe fallback for ambiguous states)
 */
export function deriveRocDetermination(input: RocInput): RocDetermination {
  const { severity, assessment_status, is_mcr_gap } = input;

  // Rule 1: MCR blocker override
  if (
    is_mcr_gap &&
    assessment_status !== "met" &&
    assessment_status !== "not_applicable_justified"
  ) {
    return "material_weakness";
  }

  // Rule 2: critical / high severity
  if (severity === "critical" || severity === "high") {
    return "material_weakness";
  }

  // Rule 3: medium with non-conformance
  if (
    severity === "medium" &&
    (assessment_status === "not_met" ||
      assessment_status === "not_evidenced" ||
      assessment_status === "partially_met" ||
      assessment_status === "requires_validation")
  ) {
    return "significant_deficiency";
  }

  // Rule 4: low + not_met
  if (severity === "low" && assessment_status === "not_met") {
    return "significant_deficiency";
  }

  // Rule 5: justified N/A
  if (assessment_status === "not_applicable_justified") {
    return "strictly_conforms";
  }

  // Rule 6: informational + met
  if (severity === "informational" && assessment_status === "met") {
    return "strictly_conforms";
  }

  // Rule 7: low + met
  if (severity === "low" && assessment_status === "met") {
    return "conforms";
  }

  // Rule 8: medium + met
  if (severity === "medium" && assessment_status === "met") {
    return "conforms";
  }

  // Rule 9: safe fallback
  return "significant_deficiency";
}
```

Export from `packages/schemas/src/index.ts`:

```typescript
export { deriveRocDetermination } from "./roc-derivation";
export type { RocInput } from "./roc-derivation";
```

---

## Step 1.5 — Unit tests for derivation function

Create `packages/schemas/src/__tests__/roc-derivation.test.ts` with 9 test cases covering:
- MCR gap not fully met → `material_weakness`
- `critical` severity + `met` → `material_weakness` (severity wins)
- `high` severity → `material_weakness`
- `medium` + `not_met` → `significant_deficiency`
- `low` + `not_met` → `significant_deficiency`
- `not_applicable_justified` → `strictly_conforms`
- `informational` + `met` → `strictly_conforms`
- `low` + `met` → `conforms`
- MCR gap + `not_applicable_justified` → `strictly_conforms` (not a blocker)

---

## Step 1.6 — Integrate derivation into gap finding write path

Locate where `gapFindings` rows are inserted. Before persistence, call:

```typescript
import { deriveRocDetermination } from "@standard/schemas";

const roc_determination = deriveRocDetermination({
  severity: finding.severity,
  assessment_status: finding.assessment_status,
  is_mcr_gap: finding.is_mcr_gap ?? false,
});
```

The repository adapter persists `roc_determination` since the Zod schema and Drizzle column both exist.

---

## Step 1.7 — Verify

```bash
pnpm typecheck
pnpm test --filter @standard/schemas
pnpm test --filter @standard/gap-analysis
```

**Commit message:**
```
feat(gap-analysis): add roc_determination to gap_findings (SCR-RMM Task 1)

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)
```

---

---

# Task 2 — Assessment Assurance Level (`assurance_level`)

**Effort:** XS (≈ 1h)  
**Rationale:** Lowest effort, zero risk. Adds SCR-RMM rigor classification to assessments (L1/L2/L3). Used by Gap Analyst agent and ROC Summary to contextualise scoring.

**Files touched:**
- `packages/schemas/src/db/schema.ts`
- `packages/schemas/src/assessments.ts`
- Migration SQL

---

## Step 2.1 — Add `assurance_level` enum to Drizzle schema

```typescript
// ── SCR-RMM: Assessment Assurance Level (Assessment Rigor) ────────────────────
export const assuranceLevelEnum = pgEnum("assurance_level", [
  "l1_standard",       // L1 Low/Standard — desktop review, policy check
  "l2_enhanced",       // L2 Moderate/Enhanced — interviews, config review
  "l3_comprehensive",  // L3 High/Comprehensive — full technical testing, sampling
]);
```

In the `assessments` table, add the column:

```typescript
    /**
     * SCR-RMM Assessment Rigor Level.
     * Determines depth of evidence testing required.
     * Default: l1_standard
     */
    assuranceLevel: assuranceLevelEnum("assurance_level").default("l1_standard"),
```

---

## Step 2.2 — Generate and apply migration

```bash
pnpm db:generate
pnpm db:migrate
```

Expected SQL:

```sql
CREATE TYPE "assurance_level" AS ENUM (
  'l1_standard',
  'l2_enhanced',
  'l3_comprehensive'
);

ALTER TABLE "assessments"
  ADD COLUMN "assurance_level" "assurance_level" DEFAULT 'l1_standard';
```

---

## Step 2.3 — Update Zod schemas

```typescript
export const AssuranceLevelSchema = z.enum([
  "l1_standard",
  "l2_enhanced",
  "l3_comprehensive",
]);
export type AssuranceLevel = z.infer<typeof AssuranceLevelSchema>;
```

Add `assurance_level: AssuranceLevelSchema.optional().default("l1_standard")` to:
- `CreateAssessmentRequestSchema`
- `AssessmentResponseSchema`
- `AssessmentRecord` type in `apps/api-gateway/src/http.ts`

---

## Step 2.4 — Verify

```bash
pnpm typecheck
```

**Commit:**
```
feat(assessments): add assurance_level (SCR-RMM Assessment Rigor, Task 2)

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)
```

---

---

# Task 3 — Risk & Threat Catalog API

**Effort:** M (≈ 3h)  
**Rationale:** `scf_risks`, `scf_risk_control_mappings`, `scf_threats`, and `scf_threat_control_mappings` already exist in the DB (populated by the XLSX importer). This task exposes them via versioned, read-only API endpoints.

> **Important distinction:** The existing `risk.routes.ts` handles the **business/operational risk taxonomy** (ransomware, phishing, qualitative matrices). The new routes expose the **normative SCF Risk Catalog** from the DB. These are distinct and co-located in the same file for consistency.

**Files touched:**
- `apps/api-gateway/src/routes/risk.routes.ts` (extend, not replace)
- `packages/schemas/src/risk-catalog.ts` (new Zod schemas)

---

## Step 3.1 — Create Zod response schemas

Create `packages/schemas/src/risk-catalog.ts`:

```typescript
import { z } from "zod";
import { UuidSchema, TraceIdSchema } from "./common";

export const ScfRiskResponseSchema = z.object({
  scf_risk_id: UuidSchema,
  scf_version_id: UuidSchema,
  risk_code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  mitigating_control_ids: z.array(UuidSchema).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ScfRiskResponse = z.infer<typeof ScfRiskResponseSchema>;

export const ScfThreatResponseSchema = z.object({
  scf_threat_id: UuidSchema,
  scf_version_id: UuidSchema,
  threat_code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  mitigating_control_ids: z.array(UuidSchema).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ScfThreatResponse = z.infer<typeof ScfThreatResponseSchema>;
```

---

## Step 3.2 — Add SCF catalog endpoints

**New endpoints in `risk.routes.ts`:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/risk-catalog` | List SCF risks; `?scf_version_id=` and `?category=` filters |
| `GET` | `/api/v1/risk-catalog/:riskId` | Get single SCF risk with control mappings |
| `GET` | `/api/v1/threat-catalog` | List SCF threats; same filters |
| `GET` | `/api/v1/threat-catalog/:threatId` | Get single SCF threat with control mappings |

Each list endpoint:
1. Queries `scfRisks` / `scfThreats` with optional filters
2. Joins `scfRiskControlMappings` / `scfThreatControlMappings` to get `mitigating_control_ids`
3. Returns JSON with `{ data, total, trace_id }`

No `organization_id` scope needed — SCF catalog is shared (normative reference data).

---

## Step 3.3 — Verify

```bash
pnpm typecheck
pnpm dev:api
# GET /api/v1/risk-catalog
# GET /api/v1/threat-catalog
```

**Commit:**
```
feat(risk): SCF Risk & Threat Catalog API endpoints (SCR-RMM Task 3)

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)
```

---

---

# Task 4 — Risk Score Engine

**Effort:** M (≈ 3h)  
**Rationale:** Pure function service. No DB. Implements the SCR-RMM IE × OL formula with residual risk reduction by control weight × maturity factor. Stateless, deterministic, fully testable.

**Files touched:**
- `packages/gap-analysis/src/services/risk-score.service.ts` (new)
- `packages/gap-analysis/src/__tests__/risk-score.service.test.ts` (new)
- `packages/gap-analysis/src/index.ts` (export)

---

## Step 4.1 — Formula specification

```
inherent_risk    = IE_value × OL_value
reduction_factor = clamp(control_weight × (maturity_level / 5), 0, 0.90)
residual_risk    = inherent_risk × (1 - reduction_factor)
risk_category    = categorise(residual_risk)
```

**IE values:** `insignificant=1, minor=2, moderate=3, major=4, critical=5, catastrophic=6`  
**OL values:** `remote=1, highly_unlikely=2, unlikely=3, possible=4, likely=5, almost_certain=6`

**Risk category thresholds:**

| Score range | Category |
|-------------|----------|
| ≤ 4 | low |
| ≤ 9 | moderate |
| ≤ 16 | high |
| ≤ 25 | severe |
| > 25 | extreme |

**Maximum reduction is capped at 90%** — controls cannot mathematically eliminate risk.

---

## Step 4.2 — Service structure

Create `packages/gap-analysis/src/services/risk-score.service.ts` with:

```typescript
export type ImpactEffect = "insignificant" | "minor" | "moderate" | "major" | "critical" | "catastrophic";
export type OccurrenceLikelihood = "remote" | "highly_unlikely" | "unlikely" | "possible" | "likely" | "almost_certain";
export type RiskCategory = "low" | "moderate" | "high" | "severe" | "extreme";

export type RiskScoreInput = {
  impact_effect: ImpactEffect;
  occurrence_likelihood: OccurrenceLikelihood;
  control_weight: number;    // 0.0 – 1.0
  maturity_level: number;    // 0 – 5 integer
};

export type RiskScoreOutput = {
  ie_value: number;
  ol_value: number;
  inherent_risk: number;
  reduction_factor: number;
  residual_risk: number;
  risk_category: RiskCategory;
};

export function calculateRiskScore(input: RiskScoreInput): RiskScoreOutput { ... }

/**
 * Map gap finding severity to Impact Effect (for automatic derivation).
 */
export function severityToImpactEffect(
  severity: "informational" | "low" | "medium" | "high" | "critical",
): ImpactEffect { ... }
```

---

## Step 4.3 — Unit tests (9 cases)

Test file: `packages/gap-analysis/src/__tests__/risk-score.service.test.ts`

Covers:
- Inherent risk = IE × OL with zero controls
- Max maturity (level 5 + weight 1.0) → reduction capped at 0.9 → residual = 2.5 on score 25
- Partial maturity reduces proportionally
- All 5 risk category boundaries
- `RangeError` for `control_weight > 1`
- `RangeError` for `maturity_level > 5`
- All 5 `severityToImpactEffect` mappings

---

## Step 4.4 — Verify

```bash
pnpm typecheck
pnpm test --filter @standard/gap-analysis
```

**Commit:**
```
feat(gap-analysis): Risk Score Engine — IE × OL formula (SCR-RMM Task 4)

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)
```

---

---

# Task 5 — Risk Register

**Effort:** L (≈ 6h)  
**Rationale:** The central SCR-RMM artefact. Links gap findings → risk scores → ROC determinations → treatment decisions under approval controls.

**Files touched:**
- `packages/schemas/src/db/schema.ts` (new table + enum)
- `packages/schemas/src/risk-register.ts` (new Zod schemas)
- `packages/gap-analysis/src/services/risk-register.service.ts` (new)
- `packages/gap-analysis/src/types.ts` (extend GapAnalysisDependencies)
- `apps/api-gateway/src/routes/risk.routes.ts` (new endpoints)
- Migration SQL

---

## Step 5.1 — New Drizzle enum and table

**Enum:**

```typescript
export const riskTreatmentEnum = pgEnum("risk_treatment", [
  "reduce",    // Mitigate via controls
  "avoid",     // Eliminate the activity
  "transfer",  // Insurance / contract
  "accept",    // Formal acceptance within risk appetite (requires approval)
]);
```

**Table `assessment_risk_register`:**

Key columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID FK → organizations | Multi-tenancy |
| `assessment_id` | UUID FK → assessments | |
| `gap_finding_id` | UUID FK → gap_findings | Unique (1:1 with gap finding) |
| `scf_risk_id` | UUID FK → scf_risks (nullable) | Optional SCF catalog link |
| `ie_value` | integer | 1–6 |
| `ol_value` | integer | 1–6 |
| `inherent_risk_score` | numeric(8,2) | IE × OL |
| `residual_risk_score` | numeric(8,2) | After reduction |
| `risk_category` | text | low/moderate/high/severe/extreme |
| `roc_determination` | roc_determination enum | Copied from gap finding |
| `risk_treatment` | risk_treatment enum (nullable) | Treatment decision |
| `treatment_rationale` | text | Required for 'accept' |
| `treatment_approved_by` | UUID FK → users (nullable) | Set for 'accept' |
| `treatment_approved_at` | timestamptz (nullable) | Set for 'accept' |
| `lob_owner_id` | UUID FK → users (nullable) | LOB risk owner |
| `trace_id` | text | |
| timestamps | | |

Indexes: `(organization_id, assessment_id)`, `(gap_finding_id)`, `(roc_determination)`, `(risk_category)`, UNIQUE `(gap_finding_id)`.

---

## Step 5.2 — Generate and apply migration

```bash
pnpm db:generate
pnpm db:migrate
```

---

## Step 5.3 — Zod schemas (`packages/schemas/src/risk-register.ts`)

```typescript
export const RiskTreatmentSchema = z.enum(["reduce", "avoid", "transfer", "accept"]);
export const RiskCategorySchema = z.enum(["low", "moderate", "high", "severe", "extreme"]);

export const RiskRegisterEntryResponseSchema = z.object({ ... });
export const CreateRiskRegisterEntryRequestSchema = z.strictObject({
  gap_finding_id: UuidSchema,
  scf_risk_id: UuidSchema.optional(),
  impact_effect: z.enum([...]).optional(), // derived from severity if absent
  occurrence_likelihood: z.enum([...]),
  control_weight: z.number().min(0).max(1).optional().default(0),
  maturity_level: z.number().int().min(0).max(5).optional().default(0),
  lob_owner_id: UuidSchema.optional(),
});
export const UpdateRiskTreatmentRequestSchema = z.strictObject({
  risk_treatment: RiskTreatmentSchema,
  treatment_rationale: z.string().min(10),
  lob_owner_id: UuidSchema.optional(),
});
```

---

## Step 5.4 — `RiskRegisterService` (`packages/gap-analysis/src/services/risk-register.service.ts`)

Methods:

```typescript
class RiskRegisterService {
  async createEntry(assessmentId, gapFinding, input, ctx): Promise<RiskRegisterEntryResponse>
  async updateTreatment(entryId, input, approvedBy, ctx): Promise<RiskRegisterEntryResponse>
  async listByAssessment(assessmentId, ctx): Promise<RiskRegisterEntryResponse[]>
}
```

**`createEntry` logic:**
1. Derive `impact_effect` from `gapFinding.severity` if not in `input`
2. Call `calculateRiskScore()` from Task 4
3. Copy `roc_determination` from gap finding (re-derive if absent)
4. Write row via `riskRegisterRepo.withOrganization(orgId).create(entry)`
5. Return the full `RiskRegisterEntryResponse`

**`updateTreatment` logic:**
1. Fetch existing row
2. Merge treatment fields
3. For `accept`: set `treatment_approved_by = approvedBy`, `treatment_approved_at = now()`
4. Write update
5. Return updated entry

---

## Step 5.5 — API endpoints

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| `GET` | `/api/v1/assessments/:id/risk-register` | Yes | `gap:read` |
| `POST` | `/api/v1/assessments/:id/risk-register` | Yes + actor | `gap:create` |
| `PATCH` | `/api/v1/assessments/:id/risk-register/:entryId` | Yes + actor | `gap:update` |

**POST** creates a new entry from a gap finding.  
**PATCH** updates only the treatment decision.  
`accept` treatment requires an authenticated actor ID (soft approval gate).

Both write operations generate audit log entries.

---

## Step 5.6 — Verify

```bash
pnpm typecheck
pnpm test --filter @standard/gap-analysis
pnpm dev:api
```

**Commit:**
```
feat(risk-register): Risk Register table, service, and API endpoints (SCR-RMM Task 5)

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)
```

---

---

# Task 6 — Report on Conformity (ROC) Summary Endpoint

**Effort:** M (≈ 3h)  
**Rationale:** Aggregates all gap findings and risk register entries for an assessment into a formal ROC document.

**Files touched:**
- `apps/api-gateway/src/routes/risk.routes.ts` (new endpoint)
- `packages/schemas/src/roc-summary.ts` (new Zod schema)
- `docs/decisions/ADR-014-scr-rmm-roc-summary.md` (new ADR)

---

## Step 6.1 — ROC Summary schema (`packages/schemas/src/roc-summary.ts`)

```typescript
export const RocSummaryResponseSchema = z.object({
  assessment_id: UuidSchema,
  assurance_level: z.enum(["l1_standard", "l2_enhanced", "l3_comprehensive"]).optional(),
  total_findings: z.number().int().nonnegative(),
  by_roc_determination: z.object({
    strictly_conforms: z.number().int().nonnegative(),
    conforms: z.number().int().nonnegative(),
    significant_deficiency: z.number().int().nonnegative(),
    material_weakness: z.number().int().nonnegative(),
  }),
  mcr_material_weakness_count: z.number().int().nonnegative(),
  avg_residual_risk_score: z.number().nonnegative().optional(),
  by_risk_category: z.object({
    low: z.number().int().nonnegative(),
    moderate: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    severe: z.number().int().nonnegative(),
    extreme: z.number().int().nonnegative(),
  }).optional(),
  overall_conformity: RocDeterminationSchema,
  has_mcr_blocker: z.boolean(),
  trace_id: TraceIdSchema,
  generated_at: z.string(),
});
```

---

## Step 6.2 — Endpoint `GET /api/v1/assessments/:id/roc-summary`

**Aggregation logic:**
1. Fetch gap findings from the **approved** gap analysis version (or most recent draft)
2. Count findings by `roc_determination`
3. Count MCR findings with `material_weakness`
4. Apply **worst-wins** rule for `overall_conformity`:
   - Any `material_weakness` → `material_weakness`
   - Any `significant_deficiency` → `significant_deficiency`
   - All `conforms` → `conforms`
   - All `strictly_conforms` → `strictly_conforms`
5. If Risk Register entries exist: compute `avg_residual_risk_score` and category distribution
6. Return assembled response

**Empty assessment:** returns `strictly_conforms` with `total_findings: 0` (safe default).

---

## Step 6.3 — ADR-014

Create `docs/decisions/ADR-014-scr-rmm-roc-summary.md` documenting:
- Worst-wins aggregation rule rationale
- MCR blocker flag semantics
- Live query vs versioned artefact tradeoff (live now, versioned in future)
- Preference for approved gap analysis version

---

## Step 6.4 — Verify

```bash
pnpm typecheck
pnpm dev:api
# GET /api/v1/assessments/:id/roc-summary
```

**Commit:**
```
feat(roc): ROC Summary endpoint + ADR-014 (SCR-RMM Task 6)

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)
```

---

---

# Task 7 — Risk Tolerance per Organization

**Effort:** M (≈ 3h)  
**Rationale:** Allows each organization to declare its risk appetite and tolerance thresholds.

**Files touched:**
- `packages/schemas/src/db/schema.ts` (alter `organizations` table)
- `packages/schemas/src/organizations.ts` (update Zod schemas)
- `apps/api-gateway/src/routes/organizations.routes.ts` (new endpoint)
- Migration SQL

---

## Step 7.1 — New enum and columns on `organizations`

**Enum:**

```typescript
export const riskAppetiteEnum = pgEnum("risk_appetite", [
  "low",
  "moderate",
  "high",
  "severe",
  "extreme",
]);
```

**New columns on `organizations` table:**

```typescript
    /** SCR-RMM Corporate Risk Appetite — used to gate 'accept' risk treatments */
    riskAppetite: riskAppetiteEnum("risk_appetite").default("moderate"),
    /**
     * SCR-RMM Risk Tolerance Configuration (JSONB).
     * {
     *   lob_tolerances: { [lob: string]: { max_risk_category, max_residual_score } };
     *   thresholds: { treatment_required_above, escalation_required_above };
     * }
     */
    riskToleranceConfig: jsonb("risk_tolerance_config")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
```

---

## Step 7.2 — Generate and apply migration

```bash
pnpm db:generate
pnpm db:migrate
```

Expected SQL:

```sql
CREATE TYPE "risk_appetite" AS ENUM ('low', 'moderate', 'high', 'severe', 'extreme');

ALTER TABLE "organizations"
  ADD COLUMN "risk_appetite" "risk_appetite" DEFAULT 'moderate',
  ADD COLUMN "risk_tolerance_config" jsonb DEFAULT '{}' NOT NULL;
```

---

## Step 7.3 — Zod schemas (`packages/schemas/src/organizations.ts`)

```typescript
export const RiskAppetiteSchema = z.enum(["low", "moderate", "high", "severe", "extreme"]);

export const RiskToleranceConfigSchema = z.object({
  lob_tolerances: z.record(z.string(), z.object({
    max_risk_category: z.enum(["low", "moderate", "high", "severe", "extreme"]),
    max_residual_score: z.number().nonnegative(),
  })).optional().default({}),
  thresholds: z.object({
    treatment_required_above: z.enum(["low", "moderate", "high", "severe", "extreme"]),
    escalation_required_above: z.enum(["low", "moderate", "high", "severe", "extreme"]),
  }).optional(),
});

export const UpdateRiskProfileRequestSchema = z.strictObject({
  risk_appetite: RiskAppetiteSchema.optional(),
  risk_tolerance_config: RiskToleranceConfigSchema.optional(),
});
```

---

## Step 7.4 — Endpoint `PUT /api/v1/organizations/:id/risk-profile`

**Logic:**
1. Verify actor belongs to the target organization (or is a platform admin)
2. Validate `risk_tolerance_config` via Zod parse before DB write
3. `PATCH organizations SET risk_appetite = ..., risk_tolerance_config = ...`
4. Write audit log `org.risk_profile.updated`
5. Return `{ organization_id, risk_appetite, risk_tolerance_config, updated_at, trace_id }`

---

## Step 7.5 — Verify

```bash
pnpm typecheck
pnpm dev:api
# PUT /api/v1/organizations/:id/risk-profile
```

**Commit:**
```
feat(orgs): Risk Appetite + Risk Tolerance config per organization (SCR-RMM Task 7)

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)
```

---

---

# Architectural Decisions & Open Questions

## Open Questions

| # | Question | Recommended Decision |
|---|---|---|
| A | Should `roc_determination` be recalculated on `PATCH gap-finding`? | **Yes** — recalculate on severity/status change. Add to `GapReviewService.updateGapFinding()`. |
| B | Auto-create Risk Register entries on gap draft creation or on-demand? | **On-demand** initially. Bulk creation as a background job on `gap_analysis_approved`. |
| C | Should `accept` risk treatments require a formal approval gate? | **Yes for accept + extreme/severe risks**. Add `risk_treatment` to `approvalGateEnum`. |
| D | Is there a `scf_version_id` requirement on `assessment_risk_register`? | **Yes** — add in migration for full traceability (AGENTS.md §8). |
| E | Should ROC Summary be a versioned, immutable artefact or a live query? | **Live query initially**. Wrap in a `roc_reports` versioned table if formal issuance is required. |
| F | Are `risk_appetite` thresholds enforced at the PATCH risk-register treatment gate? | **Not yet enforced**. Phase 2: reject `accept` if `residual_risk_category > org.risk_appetite`. |

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `roc_determination` on existing gap findings is NULL | Run a one-time migration script using `deriveRocDetermination()` to backfill existing rows |
| `deps._db` escape hatch in Task 3 bypasses repository abstractions | Acceptable for read-only SCF catalog; add proper `scfRisks` repository adapter in future sprint |
| `assurance_level` not surfaced in Gap Analyst agent prompts yet | Add to agent context injection when `agent-runtime` is updated |
| Task 5 PATCH allows `accept` without a formal approval event | Phase 2: gate `accept` on `approvalGateEnum.risk_treatment` approval event |

## Execution Order

Tasks **must** be executed in order: **1 → 2 → 3 → 4 → 5 → 6 → 7**

- Task 5 depends on Task 1 (`roc_determination`) and Task 4 (Risk Score Engine)
- Task 6 depends on Task 1 and Task 5 (optional Risk Register aggregation)
- Tasks 3 and 7 are independent of each other but should follow 2

## Effort Summary

| Task | Name | Estimated Effort |
|---|---|---|
| 1 | ROC Determination on gap_findings | S — 2h |
| 2 | Assessment Assurance Level | XS — 1h |
| 3 | Risk & Threat Catalog API | M — 3h |
| 4 | Risk Score Engine | M — 3h |
| 5 | Risk Register | L — 6h |
| 6 | ROC Summary | M — 3h |
| 7 | Risk Tolerance | M — 3h |
| **Total** | | **≈ 21h** |

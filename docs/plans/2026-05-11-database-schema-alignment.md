> [!WARNING]
> **[ARCHIVED/LEGACY PLAN]** Este é um plano de execução legado e histórico de fases anteriores do desenvolvimento da plataforma. Ele pode não refletir a arquitetura atenuada atual.

# Database Schema Alignment — Enterprise-Grade Remediation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fully align the Neon PostgreSQL production database with the Drizzle ORM schema, fix enum drift, create missing tables, bridge the dual identity system, and establish CI/CD guards against future schema drift.

**Architecture:** The Drizzle schema in `packages/schemas/src/db/schema.ts` is the **source of truth**. Production must converge to match it exactly. Migrations are applied via Neon SQL HTTP API using idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `ALTER TYPE ... ADD VALUE IF NOT EXISTS` statements. Each phase is atomic, reversible, and tested independently.

**Tech Stack:** Drizzle ORM 0.45.2 · Neon PostgreSQL (Serverless) · @neondatabase/serverless 0.10.4 · TypeScript · Wrangler

---

## Phase 1: Schema Foundation — Enums & Missing Tables
> **Epic: Prevent runtime INSERT failures from missing enum values and tables**
> **Risk: CRITICAL — Agents will crash on first write operation without this**

### Task 1.1: Fix All Enum Drift

**Files:**
- Create: `scripts/migrations/001-fix-enums.mjs`
- Reference: `packages/schemas/src/db/schema.ts:54-149` (all pgEnum definitions)

**Step 1: Write the migration script**

```javascript
// scripts/migrations/001-fix-enums.mjs
const H = 'ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_REDACTED@' + H + '/neondb?sslmode=require';

async function sql(text) {
  const r = await fetch('https://' + H + '/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': CS },
    body: JSON.stringify({ query: text }),
  });
  const d = await r.json();
  if (d.message) throw new Error(d.message);
  return d;
}

const enumFixes = [
  // evidence_strength: add not_checked
  "ALTER TYPE evidence_strength ADD VALUE IF NOT EXISTS 'not_checked'",
  // evidence_status: ENUM DOES NOT EXIST in DB — must CREATE
  // (production uses text columns, Drizzle wants enum)
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_status') THEN CREATE TYPE evidence_status AS ENUM ('candidate','accepted','rejected','insufficient','conflicting','not_evidenced'); END IF; END $$",
  // gap_type: add no_gap, not_applicable
  "ALTER TYPE gap_type ADD VALUE IF NOT EXISTS 'no_gap'",
  "ALTER TYPE gap_type ADD VALUE IF NOT EXISTS 'not_applicable'",
  // poam_status: add deferred
  "ALTER TYPE poam_status ADD VALUE IF NOT EXISTS 'deferred'",
  // priority: add urgent
  "ALTER TYPE priority ADD VALUE IF NOT EXISTS 'urgent'",
  // severity: add informational
  "ALTER TYPE severity ADD VALUE IF NOT EXISTS 'informational'",
  // storage_provider: add r2_compatible_mock
  "ALTER TYPE storage_provider ADD VALUE IF NOT EXISTS 'r2_compatible_mock'",
  // approval_gate: add report
  "ALTER TYPE approval_gate ADD VALUE IF NOT EXISTS 'report'",
  // poam_action_type: CREATE if missing
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poam_action_type') THEN CREATE TYPE poam_action_type AS ENUM ('policy_update','procedure_creation','technical_implementation','evidence_collection','governance_improvement','monitoring_improvement','training','third_party_action','risk_acceptance','validation_required','other'); END IF; END $$",
  // poam_effort_estimate: CREATE if missing
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poam_effort_estimate') THEN CREATE TYPE poam_effort_estimate AS ENUM ('small','medium','large','extra_large','unknown'); END IF; END $$",
  // poam_dependency_type: CREATE if missing
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poam_dependency_type') THEN CREATE TYPE poam_dependency_type AS ENUM ('blocks','related_to','prerequisite','duplicates','depends_on_external_party'); END IF; END $$",
  // report_type: CREATE if missing
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN CREATE TYPE report_type AS ENUM ('full_assessment_report','executive_summary','soa_export','gap_analysis_report','maturity_report','poam_report','audit_package','machine_readable_export'); END IF; END $$",
  // report_artifact_type: CREATE if missing
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_artifact_type') THEN CREATE TYPE report_artifact_type AS ENUM ('report','export','evidence_index','audit_package','appendix','summary'); END IF; END $$",
  // report_format: CREATE if missing
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_format') THEN CREATE TYPE report_format AS ENUM ('json','markdown','html','docx','pdf','csv','xlsx','zip'); END IF; END $$",
  // export_job_status: CREATE if missing
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_job_status') THEN CREATE TYPE export_job_status AS ENUM ('queued','running','succeeded','failed','skipped','cancelled','retrying'); END IF; END $$",
  // workflow_run_status: CREATE if missing
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_run_status') THEN CREATE TYPE workflow_run_status AS ENUM ('pending','running','waiting_for_input','waiting_for_approval','blocked','failed','cancelled','completed'); END IF; END $$",
  // webhook_delivery_status: CREATE if missing
  "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_delivery_status') THEN CREATE TYPE webhook_delivery_status AS ENUM ('pending','delivered','failed','retrying'); END IF; END $$",
];

async function main() {
  for (const stmt of enumFixes) {
    try {
      await sql(stmt);
      console.log('[ok]', stmt.substring(0, 70) + '...');
    } catch (e) {
      // ALTER TYPE ADD VALUE IF NOT EXISTS may fail on already-existing values
      if (e.message.includes('already exists')) {
        console.log('[skip]', stmt.substring(0, 70));
      } else {
        console.error('[FAIL]', e.message, '\n  SQL:', stmt.substring(0, 100));
      }
    }
  }
}

main();
```

**Step 2: Run migration**
```
Run: node scripts/migrations/001-fix-enums.mjs
Expected: All [ok] or [skip] — no [FAIL]
```

**Step 3: Verify**
```sql
SELECT typname, array_agg(enumlabel ORDER BY enumsortorder)
FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
GROUP BY typname ORDER BY typname;
```

**Step 4: Commit**
```bash
git add scripts/migrations/001-fix-enums.mjs
git commit -m "fix(db): align all PostgreSQL enum types with Drizzle schema"
```

---

### Task 1.2: Create Missing Tables

**Files:**
- Create: `scripts/migrations/002-create-missing-tables.mjs`
- Reference: `packages/schemas/src/db/schema.ts:206,544,569,716,942,961,976,1030,1084,1101,1297,1313`

The following tables exist in Drizzle but NOT in production:

| Table | Schema Line | Purpose |
|-------|-------------|---------|
| `api_keys` | L206 | M2M API keys (scoped, hashed) |
| `kb_embedding_jobs` | L544 | KB embedding job queue |
| `kb_search_logs` | L569 | Search audit trail |
| `agent_tool_calls` | L716 | Agent tool call tracing |
| `poam_milestones` | L942 | POA&M milestone tracking |
| `poam_dependencies` | L961 | POA&M dependency graph |
| `export_jobs` | L1030 | Report export job queue |
| `workflow_runs` | L1084 | Workflow execution state |
| `workflow_audit_events` | L1101 | Workflow audit trail |
| `webhook_endpoints` | L1297 | Webhook registration |
| `webhook_deliveries` | L1313 | Webhook delivery tracking |

**Step 1: Write the migration script**

Create `scripts/migrations/002-create-missing-tables.mjs` with `CREATE TABLE IF NOT EXISTS` for each. Include all columns, defaults, constraints, and indexes exactly matching the Drizzle schema. Include foreign keys.

**Step 2: Run migration**
```
Run: node scripts/migrations/002-create-missing-tables.mjs
Expected: All [ok] — no errors
```

**Step 3: Verify**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```
Expected: 66 tables total.

**Step 4: Commit**
```bash
git add scripts/migrations/002-create-missing-tables.mjs
git commit -m "feat(db): create 11 missing tables from Drizzle schema"
```

---

## Phase 2: Assessment Lifecycle Tables — Column Alignment
> **Epic: Bring SoA, Evidence, Gap Analysis, POA&M tables into full compliance**
> **Risk: CRITICAL — Core assessment lifecycle will crash without these columns**

### Task 2.1: Align `soa_versions` Table

**Files:**
- Create: `scripts/migrations/003-align-soa-tables.mjs`
- Reference: `packages/schemas/src/db/schema.ts:615-672`

**Missing columns in production `soa_versions`:**
- `source_framework_id` (uuid, FK → scf_frameworks.id)
- `scf_version_id` (uuid, FK → scf_versions.id)
- `source_scope_id` (uuid, FK → assessment_scope.id)
- `created_by` (uuid, FK → users.id)
- `submitted_for_review_at` (timestamptz)
- `approved_by` (uuid, FK → users.id)
- `approved_at` (timestamptz)
- `superseded_by` (uuid)
- `trace_id` (text)
- `metadata` (jsonb, default {})

**Missing columns in production `soa_items`:**
- `framework_id` (uuid, FK → scf_frameworks.id)
- `framework_requirement_id` (uuid, FK → scf_framework_requirements.id)
- `scf_version_id` (uuid, FK → scf_versions.id)
- `applicability_status` (text, default 'requires_validation')
- `implementation_status` (text, default 'not_assessed')
- `applicability_rationale` (text)
- `non_applicability_rationale` (text)
- `scope_rationale` (text)
- `evidence_summary` (text)
- `evidence_coverage` (text, default 'not_checked')
- `confidence_score` (numeric(5,4))
- `requires_user_validation` (boolean, default true)
- `validation_notes` (text)
- `source_mapping_id` (uuid, FK → scf_mappings.id)
- `mapping_status` (text, default 'official_mapping')
- `relationship_type` (text)
- `relationship_strength` (text)

**Step 1:** Write migration with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for both tables.
**Step 2:** Run and verify column counts match Drizzle schema.
**Step 3:** Commit: `fix(db): align soa_versions and soa_items with Drizzle schema`

---

### Task 2.2: Align `evidence_findings` and `evidence_sources`

**Files:**
- Create: `scripts/migrations/004-align-evidence-tables.mjs`
- Reference: `packages/schemas/src/db/schema.ts:736-783`

**`evidence_findings`** — Production uses a simplified schema. Drizzle defines a richer model. Strategy: **add missing columns** while preserving existing data.

| Production Column | Drizzle Column | Action |
|-------------------|----------------|--------|
| `soa_item_id` | `soa_item_id` | Keep — compatible |
| `strength` | `evidence_strength` | **RENAME** or add alias |
| `status` | `evidence_status` | **RENAME** or add alias |
| `summary` | `evidence_summary` | **RENAME** or add alias |
| `rationale` | — | Keep (extra column is fine) |
| — | `soa_version_id` | ADD |
| — | `framework_id` | ADD |
| — | `framework_requirement_id` | ADD |
| — | `scf_version_id` | ADD |
| — | `evidence_limitations` | ADD (jsonb, default []) |
| — | `generated_by_agent_run_id` | ADD |
| — | `trace_id` | ADD |

> **Decision Required:** Should we **rename** `strength → evidence_strength` etc. (breaking but canonical) OR **add new columns** and deprecate old ones (safe but duplicated)?
> **Recommendation:** Add new columns + deprecate. Data in `strength`/`status`/`summary` can be migrated in a separate backfill step with zero downtime.

**`evidence_sources`** — Complete column replacement needed:

| Production Column | Status |
|-------------------|--------|
| `document_chunk_id` | RENAME to `chunk_id` or add alias |
| `soa_item_id` | Not in Drizzle — keep as extra |
| `source_hash` | Not in Drizzle — deprecate |
| `excerpt_hash` | Not in Drizzle — deprecate |
| — Add: | `document_id`, `vector_reference_id`, `source_title`, `source_location`, `snippet`, `retrieval_score`, `retrieval_method`, `candidate_evidence` |

**Step 1:** Write migration adding new canonical columns.
**Step 2:** Run and verify.
**Step 3:** Commit: `fix(db): align evidence_findings and evidence_sources with Drizzle schema`

---

### Task 2.3: Align `gap_analysis_versions` and `gap_findings`

**Files:**
- Create: `scripts/migrations/005-align-gap-tables.mjs`
- Reference: `packages/schemas/src/db/schema.ts:785-840`

**`gap_analysis_versions`** — Add missing columns:
- `source_soa_version_id` (uuid NOT NULL, FK → soa_versions.id)
- `framework_id` (uuid NOT NULL, FK → scf_frameworks.id)
- `scf_version_id` (uuid NOT NULL, FK → scf_versions.id)
- `generated_by_agent_run_id` (uuid, FK → agent_runs.id)
- `created_by` (uuid, FK → users.id)
- `submitted_for_review_at` (timestamptz)
- `approved_by` (uuid, FK → users.id)
- `approved_at` (timestamptz)
- `superseded_by` (uuid)
- `trace_id` (text)
- `metadata` (jsonb, default {})

> **Note:** Drizzle declares `source_soa_version_id` as NOT NULL, but since existing rows have no value, add as NULLABLE first, then add NOT NULL constraint after backfill.

**`gap_findings`** — Significant column differences:

| Production | Drizzle | Action |
|------------|---------|--------|
| `finding_code` | `gap_code` | **Conflicting names** — add `gap_code` alias |
| `status` (gap_status) | `assessment_status` (gap_status) | Add `assessment_status` |
| `summary` | `gap_summary` | Add `gap_summary` |
| `rationale` | `gap_rationale` | Add `gap_rationale` |
| — | `soa_version_id`, `soa_item_id`, `framework_id`, `scf_version_id` | ADD |
| — | `severity`, `impact`, `likelihood` | ADD |
| — | `recommendation_summary`, `requires_user_validation` | ADD |

**Step 1:** Write migration.
**Step 2:** Run and verify.
**Step 3:** Commit: `fix(db): align gap_analysis_versions and gap_findings with Drizzle schema`

---

### Task 2.4: Align `assessment_scope`

**Files:**
- Create: `scripts/migrations/006-align-scope.mjs`
- Reference: `packages/schemas/src/db/schema.ts:587-613`

**Missing columns:**
- `scope_version` (integer, default 1)
- `title` (text)
- `description` (text)
- `business_units` (jsonb, default [])
- `processes` (jsonb, default [])
- `systems` (jsonb, default [])
- `locations` (jsonb, default [])
- `legal_entities` (jsonb, default [])
- `data_types` (jsonb, default [])
- `third_parties` (jsonb, default [])
- `constraints` (jsonb, default [])
- `created_by` (uuid, FK → users.id)

**Step 1-4:** Same pattern as above.

---

### Task 2.5: Align `poam_versions` and `poam_items`

**Files:**
- Create: `scripts/migrations/007-align-poam-tables.mjs`
- Reference: `packages/schemas/src/db/schema.ts:875-940`

**`poam_versions`** — Add missing columns:
- `source_gap_analysis_version_id`, `source_maturity_assessment_version_id`, `framework_id`, `scf_version_id`
- `generated_by_agent_run_id`, `created_by`, `submitted_for_review_at`, `approved_by`, `approved_at`
- `superseded_by`, `trace_id`, `metadata`

**`poam_items`** — Major structural differences:

| Production | Drizzle | Action |
|------------|---------|--------|
| `item_code` | `poam_code` | Add `poam_code` alias |
| `related_gap_id` | `related_gap_finding_id` | Add alias |
| `corrective_action` | same | Keep |
| `dependencies` (jsonb) | `dependencies_summary` (text) | Add text col |
| `expected_evidence` (text) | `expected_evidence` (jsonb) | **Type conflict** — add `expected_evidence_json` |
| `acceptance_criteria` (text) | `acceptance_criteria` (jsonb) | **Type conflict** — same approach |
| — | `action_type`, `risk_rating`, `effort_estimate` | ADD |
| — | `owner_role`, `target_maturity_score` | ADD |
| — | `source_maturity_score_id`, `soa_item_id` | ADD |
| — | `framework_id`, `scf_version_id`, `scf_domain_id` | ADD |
| — | `rationale`, `confidence_score`, `requires_user_validation` | ADD |

**Step 1-4:** Same pattern.

---

### Task 2.6: Align `report_versions` and `report_artifacts`

**Files:**
- Create: `scripts/migrations/008-align-report-tables.mjs`
- Reference: `packages/schemas/src/db/schema.ts:976-1028`

**`report_versions`** — Add missing columns:
- `title`, `report_type` (change from text to enum), `source_scope_id`, `source_soa_version_id`
- `source_gap_analysis_version_id`, `source_maturity_assessment_version_id`, `source_poam_version_id`
- `framework_id`, `scf_version_id`, `generated_by_agent_run_id`, `created_by`
- `submitted_for_review_at`, `approved_by`, `approved_at`, `superseded_by`, `trace_id`, `metadata`

**`report_artifacts`** — Add missing columns:
- `artifact_type`, `format`, `storage_bucket`, `generated_at`, `metadata`

**Step 1-4:** Same pattern.

---

## Phase 3: Identity Bridge
> **Epic: Connect Standard Native Auth identity with domain users**
> **Risk: HIGH — Audit trails and RBAC depend on this linkage**

### Task 3.1: Create Identity Bridge

**Files:**
- Create: `scripts/migrations/009-identity-bridge.mjs`
- Modify: `packages/schemas/src/db/schema.ts:172-181`

**Step 1: Add `ba_user_id` to the `users` table**

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS ba_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_ba_user_id_uidx ON users(ba_user_id);
```

**Step 2: Backfill existing data**

```sql
UPDATE users u SET ba_user_id = ba.id
FROM "user" ba WHERE ba.email = u.email;
```

**Step 3: Verify linkage**

```sql
SELECT u.id, u.email, u.ba_user_id, ba.id, ba.name
FROM users u LEFT JOIN "user" ba ON u.ba_user_id = ba.id;
```

**Step 4: Update Drizzle schema**

Add `baUserId: text("ba_user_id")` to the `users` table definition.

**Step 5: Commit**
```bash
git commit -m "feat(db): bridge Standard Native Auth identity with domain users table"
```

---

## Phase 4: Missing Indexes & Performance
> **Epic: Add indexes for known query patterns**
> **Risk: LOW — Performance optimization, not functional blocker**

### Task 4.1: Add Missing Indexes

**Files:**
- Create: `scripts/migrations/010-add-indexes.mjs`

```sql
-- Audit query by actor
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON audit_logs(actor_id);

-- Filter active/inactive controls
CREATE INDEX IF NOT EXISTS scf_controls_status_idx ON scf_controls(status);

-- Filter official vs derived mappings
CREATE INDEX IF NOT EXISTS scf_mappings_source_idx ON scf_mappings(scf_version_id, mapping_source);

-- Session cleanup
CREATE INDEX IF NOT EXISTS session_expires_at_idx ON session(expires_at);

-- Document type filter per tenant
CREATE INDEX IF NOT EXISTS documents_type_idx ON documents(tenant_id, document_type);

-- SCF framework search (text pattern match)
CREATE INDEX IF NOT EXISTS scf_frameworks_name_trgm_idx ON scf_frameworks USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS scf_controls_title_trgm_idx ON scf_controls USING gin (title gin_trgm_ops);
```

> **Note:** Trigram indexes require `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

**Step 1-3:** Write migration, run, verify with `EXPLAIN ANALYZE`.
**Step 4:** Commit: `perf(db): add missing indexes for common query patterns`

---

## Phase 5: Formalize & Guard
> **Epic: Prevent this from ever happening again**
> **Risk: MEDIUM — Process debt, not runtime risk**

### Task 5.1: Generate Drizzle Migration Snapshot

**Step 1:** Run `pnpm db:generate` to create a Drizzle migration snapshot
**Step 2:** Verify the generated migration matches current production state
**Step 3:** Commit migration files to source control

### Task 5.2: Create Schema Drift CI Check

**Files:**
- Create: `scripts/check-schema-drift.mjs`

This script:
1. Connects to the production DB
2. Introspects all tables, columns, indexes, enums, and FKs
3. Compares against the Drizzle schema definition exports
4. Reports differences as JSON
5. Exits with non-zero code if drift detected

> Integrate into CI pipeline or run as a pre-deploy step.

### Task 5.3: Add `drizzle-kit` Push Guard

**Files:**
- Modify: `package.json` (root)

Add a `db:check` script:
```json
"db:check": "drizzle-kit check"
```

Run as part of `pnpm lint` to detect schema drift at dev time.

---

## Phase 6: SCF Data Quality Enrichment
> **Epic: Make framework names human-readable + add SCF metadata**
> **Risk: LOW — Data quality improvement, not functional blocker**

### Task 6.1: Enrich Framework Names from Official SCF XLSX

The SCF 2026.1.1 XLSX contains the full framework names (e.g., "ISO/SAE 21434:2021 - Cybersecurity Engineering"). The ingest pipeline only stored the abbreviated code.

**Step 1:** Write a name-enrichment script that:
- Parses the official SCF XLSX
- Extracts `framework_id → full_name` mapping
- Updates `scf_frameworks.name` with the full descriptive name
- Updates `scf_frameworks.publisher` with the actual publisher (ISO, NIST, PCI SSC, etc.)

### Task 6.2: Populate `scf_control_metadata`

**Step 1:** Extract risk weights and threat tags from the SCF XLSX meta sheets
**Step 2:** INSERT into `scf_control_metadata` table (currently 0 rows)

### Task 6.3: Populate `sort_order` from XLSX Row Order

**Step 1:** Re-read XLSX and assign `sort_order = row_index` for domains, controls, frameworks
**Step 2:** UPDATE all SCF tables with correct sort order values

---

## Verification Plan

### Automated Tests
1. After each migration: `node scripts/db-introspect.mjs` → compare table counts, column counts, enum values
2. `pnpm typecheck` — Ensure Drizzle schema compiles
3. `pnpm test` — Run existing tests
4. Hit all SCF endpoints: `GET /api/v1/scf/versions/latest`, `/domains`, `/controls`, `/frameworks`

### Manual Verification
1. Open https://standard-web.pages.dev/dashboard/scf-catalog — verify all 1,468 controls load
2. Test the Frameworks tab — verify framework names are human-readable after Task 6.1
3. Create a test assessment to verify SoA/Gap/Maturity/POA&M column alignment

---

## Priority Execution Order

| Order | Phase | Task | Severity | Time Est |
|-------|-------|------|----------|----------|
| 1 | 1.1 | Fix enum drift | 🔴 CRITICAL | 15 min |
| 2 | 1.2 | Create missing tables | 🔴 CRITICAL | 30 min |
| 3 | 2.1 | Align SoA tables | 🔴 CRITICAL | 20 min |
| 4 | 2.2 | Align evidence tables | 🔴 CRITICAL | 25 min |
| 5 | 2.3 | Align gap tables | 🟡 HIGH | 20 min |
| 6 | 2.4 | Align scope table | 🟡 HIGH | 10 min |
| 7 | 2.5 | Align POA&M tables | 🟡 HIGH | 25 min |
| 8 | 2.6 | Align report tables | 🟡 HIGH | 20 min |
| 9 | 3.1 | Identity bridge | 🟡 HIGH | 30 min |
| 10 | 4.1 | Missing indexes | 🔵 LOW | 15 min |
| 11 | 5.1-5.3 | Formalize migrations | 🔵 LOW | 30 min |
| 12 | 6.1-6.3 | SCF data enrichment | 🔵 LOW | 45 min |

**Total estimated time: ~4.5 hours**

> [!WARNING]
> **[ARCHIVED/LEGACY PLAN]** Este é um plano de execução legado e histórico de fases anteriores do desenvolvimento da plataforma. Ele pode não refletir a arquitetura atenuada atual.

# SCF XLSX ↔ Database Integrity Audit — Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Verify that every piece of data in the production Neon PostgreSQL database matches exactly what the official SCF 2026.1.1 XLSX workbook contains — no invented data, no missing data, no corrupted mappings.

**Architecture:** Build a standalone audit script that: (1) reads the original XLSX workbook, (2) queries the production database via Drizzle, (3) produces a comprehensive discrepancy report comparing controls, domains, frameworks, requirements, and mappings.

**Tech Stack:** TypeScript, xlsx library, Drizzle ORM, PostgreSQL (Neon), tsx runner.

---

## Context: Why This Audit Is Needed

During the Privacy ↔ SCF bridge integration, we discovered that framework codes in code (`LGPD`) did not match production database codes (`BR-LGPD`). This raises the question: **are there other discrepancies between the XLSX source-of-truth and what's in the database?**

The data flow is:
```
Official XLSX → extract-framework-from-xlsx.ts → SQL seeds → PostgreSQL → ScfRepository → Services
```

Any corruption at any stage would mean our assessments reference wrong or invented data — a violation of AGENTS.md rules §8 (SCF Data Rules).

---

## Task 1: Audit Script — XLSX Side Reader

**Files:**
- Create: `packages/scf-core/scripts/audit-xlsx-vs-db.ts`

**Step 1: Write the XLSX parsing section**

```typescript
// Parse the official XLSX and extract:
// 1. All controls (SCF # → domain, title, description)
// 2. All framework columns (column headers → framework name)
// 3. All mappings (control × framework → requirement codes)
// 4. Count domains, controls per domain
```

Run: `npx tsx packages/scf-core/scripts/audit-xlsx-vs-db.ts <xlsx-path> --xlsx-only`
Expected: Prints summary of XLSX contents (domain count, control count, framework column count)

**Step 2: Commit**

```bash
git add packages/scf-core/scripts/audit-xlsx-vs-db.ts
git commit -m "feat(scf-core): add XLSX reader for integrity audit"
```

---

## Task 2: Audit Script — Database Side Reader

**Files:**
- Modify: `packages/scf-core/scripts/audit-xlsx-vs-db.ts`

**Step 1: Add database query section**

```typescript
// Query production database for:
// 1. All scf_versions (id, label, is_synthetic)
// 2. All scf_domains (code, name, version_id)
// 3. All scf_controls (code, title, domain_id, version_id, is_synthetic)
// 4. All scf_frameworks (framework_id, name, publisher, jurisdiction, is_synthetic)
// 5. All scf_framework_requirements (code, title, framework_id)
// 6. All scf_mappings (requirement_id, control_id, is_official, mapping_source, is_synthetic)
```

Run: `npx tsx packages/scf-core/scripts/audit-xlsx-vs-db.ts --db-only`
Expected: Prints summary of database contents

**Step 2: Commit**

```bash
git add packages/scf-core/scripts/audit-xlsx-vs-db.ts
git commit -m "feat(scf-core): add database reader for integrity audit"
```

---

## Task 3: Domain Audit

**Files:**
- Modify: `packages/scf-core/scripts/audit-xlsx-vs-db.ts`

**Step 1: Implement domain comparison**

```typescript
// Compare XLSX domains vs DB domains:
// - Domains in XLSX but NOT in DB (MISSING)
// - Domains in DB but NOT in XLSX (PHANTOM — invented data!)
// - Domains with mismatched names
// - Domains with is_synthetic=true that shouldn't be
```

Run: `npx tsx packages/scf-core/scripts/audit-xlsx-vs-db.ts <xlsx-path> --audit domains`
Expected: Report showing domain-level discrepancies

**Step 2: Commit**

```bash
git commit -m "feat(scf-core): audit domains XLSX vs DB"
```

---

## Task 4: Control Audit

**Files:**
- Modify: `packages/scf-core/scripts/audit-xlsx-vs-db.ts`

**Step 1: Implement control comparison**

```typescript
// Compare XLSX controls vs DB controls:
// - Control codes in XLSX but NOT in DB (MISSING)
// - Control codes in DB but NOT in XLSX (PHANTOM)
// - Controls with wrong domain assignment
// - Controls with wrong title (name drift)
// - Controls marked is_synthetic=true in DB but exist in real XLSX
// - Total count comparison
```

Run: `npx tsx packages/scf-core/scripts/audit-xlsx-vs-db.ts <xlsx-path> --audit controls`
Expected: Report showing control-level discrepancies

**Step 2: Commit**

```bash
git commit -m "feat(scf-core): audit controls XLSX vs DB"
```

---

## Task 5: Framework Audit

**Files:**
- Modify: `packages/scf-core/scripts/audit-xlsx-vs-db.ts`

**Step 1: Implement framework comparison**

```typescript
// Compare XLSX framework columns vs DB frameworks:
// - Framework columns in XLSX with no DB record (MISSING)
// - DB frameworks with no XLSX column (could be derived/synthetic — flag it)
// - Framework code mismatch (is the column→code derivation correct?)
// - Publisher/jurisdiction accuracy
// - Count: how many of the 213 DB frameworks trace to real XLSX columns?
```

Run: `npx tsx packages/scf-core/scripts/audit-xlsx-vs-db.ts <xlsx-path> --audit frameworks`
Expected: Report showing framework-level discrepancies

**Step 2: Commit**

```bash
git commit -m "feat(scf-core): audit frameworks XLSX vs DB"
```

---

## Task 6: Mapping Audit (Critical)

**Files:**
- Modify: `packages/scf-core/scripts/audit-xlsx-vs-db.ts`

**Step 1: Implement mapping comparison**

```typescript
// For each framework in DB:
//   For each mapping (requirement → control):
//     - Does this mapping exist in the XLSX? (cell has the requirement code in the control's row)
//     - Are there XLSX mappings not in the DB? (MISSING)
//     - Are there DB mappings not in the XLSX? (PHANTOM — invented mapping!)
//     - Is mapping_source = 'official_scf'? If not, what is it?
//     - Is is_official = true for all legitimate mappings?
//
// Special attention to:
//   - BR-LGPD mappings (our primary regime)
//   - EU-GDPR mappings
//   - Any mapping marked is_synthetic=true
```

Run: `npx tsx packages/scf-core/scripts/audit-xlsx-vs-db.ts <xlsx-path> --audit mappings --framework BR-LGPD`
Expected: Detailed mapping-level report for LGPD

**Step 2: Commit**

```bash
git commit -m "feat(scf-core): audit mappings XLSX vs DB"
```

---

## Task 7: Full Audit Report

**Files:**
- Modify: `packages/scf-core/scripts/audit-xlsx-vs-db.ts`

**Step 1: Implement consolidated report mode**

```typescript
// Run ALL audits and produce a markdown report:
// 1. Executive summary (PASS/FAIL per category)
// 2. Domain audit results
// 3. Control audit results (with counts)
// 4. Framework audit results
// 5. Mapping audit results (sampling strategy for 213 frameworks)
// 6. Synthetic data inventory (everything marked is_synthetic)
// 7. Deprecated seed data detection (from generate-seed-csv.ts)
//
// Output: docs/audit/scf-xlsx-vs-db-audit-YYYY-MM-DD.md
```

Run: `npx tsx packages/scf-core/scripts/audit-xlsx-vs-db.ts <xlsx-path> --full-audit`
Expected: Complete markdown audit report saved to docs/audit/

**Step 2: Commit**

```bash
git commit -m "feat(scf-core): full SCF integrity audit report generator"
```

---

## Task 8: Run the Audit

**Step 1: Execute audit against production database**

```bash
DATABASE_URL="<neon-connection-string>" npx tsx packages/scf-core/scripts/audit-xlsx-vs-db.ts \
  "path/to/Secure Controls Framework (SCF) - 2026.1.1.xlsx" \
  --full-audit
```

**Step 2: Review and document findings**

- Open the generated report in `docs/audit/`
- Categorize findings: CRITICAL (phantom data), HIGH (missing data), MEDIUM (name drift), LOW (cosmetic)
- Create issues for any CRITICAL or HIGH findings

**Step 3: Commit report**

```bash
git add docs/audit/
git commit -m "docs(audit): SCF XLSX vs DB integrity audit results"
```

---

## Verification Checklist

- [ ] XLSX parser extracts same domain count as `extract-framework-from-xlsx.ts --list`
- [ ] No PHANTOM domains (DB domains not in XLSX)
- [ ] No PHANTOM controls (DB controls not in XLSX) 
- [ ] All framework codes in DB trace to real XLSX columns
- [ ] BR-LGPD mappings in DB match XLSX LGPD column exactly
- [ ] EU-GDPR mappings in DB match XLSX GDPR column exactly
- [ ] No is_synthetic=true records in production that should be is_synthetic=false
- [ ] No mappings with mapping_source other than 'official_scf' for real data
- [ ] Deprecated seed data (from generate-seed-csv.ts) is NOT present in production

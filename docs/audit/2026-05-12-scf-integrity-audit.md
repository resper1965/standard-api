# SCF Integrity Audit Report: XLSX vs Database (Deep Validation)

**Date:** 2026-05-12
**Source Tool:** `packages/scf-core/scripts/audit-xlsx-vs-db.ts` (Cell-by-Cell Physical Verification Mode)
**Target Environment:** Production PostgreSQL DB (Neon)

## Executive Summary

After implementing a Deep Physical Data Validation, we moved beyond just checking SQL relational integrity. We verified if the physical texts and crosswalk cells inside the **Secure Controls Framework (SCF) 2026.1.1** official XLSX workbook literally match what was ingested into the PostgreSQL database.

### Overall Deep Results
- **Domains:** ✅ 100% Match
- **Controls (Titles & Codes):** ✅ 100% Match
- **Frameworks:** ✅ Verified
- **Mappings (Cell-by-Cell):** ⚠️ 610 Discrepancies Found

## Deep Dive Validation Findings

### 1. Domain Coverage
- **Status:** ✅ Perfect Match
- No hidden synthetic flags or phantom strings detected. 

### 2. Control Coverage (Titles & Codes)
- **Status:** ✅ Perfect Match
- We validated not just the `control_code`, but compared the `title` text strings physically against the `Control Name` column from the spreadsheet.
- **Title Drift:** `0`. No misalignments or row shifts were found.

### 3. Frameworks
- **Status:** ✅ Expected Tolerances
- Identified exactly the loaded framework columns. 

### 4. Mappings (Physical Cell Intersection)
- **Status:** ⚠️ Failed Deep Parity Check
- **Discrepancies:** `610` Mapping Drifts
- **Details:** The audit scanned the intersection of every control row and every framework column.
#### Identified Failure Modes:
1. **Mapping Drops (Data Loss):** The spreadsheet contains explicit requirement strings (e.g., ISO 27002 `4.4, 5.1, 5.3`) in a cell, but the database holds absolutely 0 mappings for that Control-Framework intersection.
2. **Phantom Mappings (Data Hallucinaton):** The spreadsheet cell is completely empty (`-` or `NA`), but the database claims a mapping exists.

#### Example Log Trace
```log
❌ MAPPING DROP: XLSX cell for 27-2022/GOV-01.1 has content ('4.4, 5.1...') but DB has NO records.
❌ PHANTOM MAPPING: XLSX cell for 27-2025/GOV-01.2 is EMPTY, but DB claims mappings exist!
❌ MAPPING DROP: XLSX cell for 27-2025/GOV-03 has content ('5.1, 5.37') but DB has NO records.
```
*(Total observed: 610 drifts)*

## Conclusion & Next Steps
The prior surface-level audit generated a false positive because it only proved that the mappings *inside* the DB were structurally healthy (not orphaned). The newly added Deep Parity Audit proves the SQL data is physically out-of-sync with the exact content of the 2026.1 XLSX spreadsheet by `~610` data points.

**Recommendation:** Run the `extract-framework-from-xlsx.ts` importer again to regenerate the exact SQL seeds for framework mappings, and run `apply-seed.ts` to resync the missing/phantom data vectors.

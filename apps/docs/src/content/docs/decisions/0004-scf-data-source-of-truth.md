---
title: "ADR-0004: SCF Data Source of Truth"
---

# ADR-0004: SCF Data Source of Truth

**Status:** Accepted  
**Date:** 2026-05-06  
**Author:** AI-assisted (Google Antigravity)  

## Context

The Standard Assessment Engine requires authoritative framework crosswalk data from the Secure Controls Framework (SCF) to perform compliance assessments. Over time, multiple data sources accumulated in the repository:

1. **Official XLSX** — `assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx` (authoritative)
2. **Manual SQL seeds** — hand-crafted seeds with varying levels of accuracy (`0003_qnrcs_seed.sql`, `0004_iso42001_seed.sql`)
3. **CSV generator** — `generate-seed-csv.ts` producing "realistic but invented" data
4. **Consolidated SQL** — `0010_scf_official_frameworks_seed.sql` generated from the official XLSX

This created confusion about which data was authoritative vs. derived vs. fabricated. Critically, `0003_qnrcs_seed.sql` claimed `mapping_source = 'official_scf'` despite being manually invented — violating AGENTS.md rule: *"Nunca inferir mapping oficial se não existir mapping na base SCF."*

## Decision

**The official SCF XLSX workbook is the single, unambiguous source of truth for all framework crosswalk data.**

### Architecture

```
assets/SCF 2026.1.1.xlsx (source of truth, versioned in Git)
  → extract-framework-from-xlsx.ts --all (extractor, versioned)
    → 0010_scf_official_frameworks_seed.sql (generated, NOT versioned — .gitignore)
      → PostgreSQL (runtime)
```

### Rules

1. All framework mappings MUST be extracted from the official XLSX using `extract-framework-from-xlsx.ts`
2. Generated SQL seeds use `mapping_source = 'official_scf'` and `is_official = true`
3. Frameworks NOT present in the SCF XLSX may be added as `mapping_source = 'derived'` and `is_official = false` — never as `official_scf`
4. The generated SQL file is NOT versioned (49+ MB); regenerate via `npx tsx packages/scf-core/scripts/extract-framework-from-xlsx.ts "assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx" --all`
5. `generate-seed-csv.ts` is deprecated and must not be used for production data
6. Synthetic fixtures (`0001_synthetic_seed.sql`) remain for local development/testing

## Consequences

### Positive
- **233 frameworks** available from a single authoritative source
- No more false `official_scf` mappings from manual seeds
- Reproducible: anyone can regenerate the exact same SQL from the XLSX
- SCF version tracked: all data carries `scf_version` reference

### Negative
- Developers must regenerate the SQL seed locally after cloning (not in Git)
- QNRCS (Portugal) is not in the official SCF — must be re-added as `derived` if needed
- Large seed file (49 MB) requires PostgreSQL bulk import

### Deprecated
- `seeds/0003_qnrcs_seed.sql` → moved to `seeds/_deprecated/`
- `seeds/0004_iso42001_seed.sql` → moved to `seeds/_deprecated/`
- `generate-seed-csv.ts` → marked `@deprecated`


# Deprecated Seeds

These seed files have been deprecated and superseded by the official SCF extraction pipeline.

## Why Deprecated

- `0003_qnrcs_seed.sql` — **False official**: Marked `mapping_source = 'official_scf'` but mappings were manually invented. QNRCS does not exist in the official SCF XLSX.
- `0004_iso42001_seed.sql` — **Superseded**: ISO 42001 is now covered by `EU-AI-ACT` framework in the consolidated official seed `0010_scf_official_frameworks_seed.sql`, extracted directly from the SCF 2026.1.1 XLSX workbook.

## New Canonical Source

All official framework data is now extracted from:

```
assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx
  → via packages/scf-core/scripts/extract-framework-from-xlsx.ts --all
  → generates infra/docker/postgres/seeds/0010_scf_official_frameworks_seed.sql
```

## Active Seeds

| File | Purpose |
|---|---|
| `0001_synthetic_seed.sql` | Synthetic fixtures for local development/testing |
| `0002_synthetic_scf_seed.sql` | Synthetic SCF import run fixture |
| `0010_scf_official_frameworks_seed.sql` | 233 official frameworks from SCF XLSX (generated, not versioned) |

Deprecated on: 2026-05-06

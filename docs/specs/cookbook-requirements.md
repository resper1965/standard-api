# Cookbooks Specification: Standard Platform API Requirements

> Complete specification of 24 data cookbooks (CB-01 to CB-24) that the Standard Platform
> requires from the Standard API to feed all modules: Privacy, Governance, Risk, Flow Engine,
> Offensive, Copilot, Cross-Mapping, and Maturity.
>
> **Status**: See [cookbook_gap_analysis.md](../../.gemini/antigravity/brain/2c87303e-1328-41f3-88b5-692c497238eb/cookbook_gap_analysis.md) for current coverage.

## Module → Cookbook Mapping

```
STANDARD MODULES      →  API COOKBOOKS
─────────────────────     ──────────────────────────
🔒 Privacy             →  CB-01 a CB-06 (Privacy Regulations)
🏛️ Governance          →  CB-07 a CB-12 (Controls & Frameworks)
⚠️ Risk                →  CB-13 a CB-16 (Risk Frameworks)
⚙️ Flow Engine         →  CB-17 (Process Automation Templates)
🗡️ Offensive           →  CB-18 a CB-21 (Security Testing)
🤖 Copilot / AI        →  CB-22 (Contextual Knowledge Graph)
📊 Cross-Mapping       →  CB-23 (Inter-Framework Mapping)
📏 Maturity            →  CB-24 (Maturity Models)
```

## Coverage Summary

| Priority | Cookbook | Status |
|---|---|---|
| P0 | CB-07 Controls Catalog | ✅ Covered (SCF: 1,468 controls, 231 frameworks) |
| P0 | CB-23 Cross-Mapping | ✅ Covered (15,717 crosswalk mappings) |
| P0 | CB-03 DPIA | ✅ Covered (AI agent) |
| P0 | CB-01 Privacy Regulations | ⚠️ Partial (AI-inferred, needs structured catalog) |
| P1 | CB-12 PoAM | ✅ Covered (full CRUD) |
| P1 | CB-14 TPRA | ⚠️ Partial (vendor scanning exists) |

## Ideal Endpoints

See the full specification document for detailed JSON schemas for each cookbook.

```
# Regulations & Privacy
GET  /api/v1/regulations
GET  /api/v1/regulations/{id}/legal-bases
GET  /api/v1/data-categories
GET  /api/v1/dpia/triggers
GET  /api/v1/consent/requirements/{regulation}
GET  /api/v1/transfer/mechanisms

# Frameworks & Controls (✅ exists as /scf/*)
GET  /api/v1/scf/frameworks
GET  /api/v1/scf/frameworks/{id}/controls
GET  /api/v1/scf/controls/by-code/{code}
GET  /api/v1/scf/controls/{id}/mappings

# Risk (🔴 new)
GET  /api/v1/risk/methodologies
GET  /api/v1/risk/taxonomy
GET  /api/v1/risk/kri-library
GET  /api/v1/tpra/questionnaires

# Cross-Mapping Enhancement
GET  /api/v1/scf/cross-mapping/{fw_a}/{fw_b}
GET  /api/v1/scf/control/{id}/equivalents

# Maturity
GET  /api/v1/maturity/models
POST /api/v1/maturity/assess
```

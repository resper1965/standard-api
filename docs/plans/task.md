# Blueprint Surgical Implementation — Task Tracker

> Plano: `docs/plans/2026-06-10-blueprint-surgical-implementation.md`

| # | Task | Status | Notas |
|---|---|---|---|
| 1.1 | Enum STRM Canónico no Drizzle Schema + data migration | ✅ done | commit 1f1001b — 81k rows migrated, 0 type errors |
| 1.2 | Tabela Ledger Append-Only | ✅ done | assessment_control_events criado em 1f1001b |
| 1.3 | Tabelas TPRA (vendors, assessments, risk_scores) | ✅ done | tpra_* criadas em 1f1001b |
| 2.1 | Implementar STRMWeightCalculator | ✅ done | commit 0aa1112 — 16/16 contract tests, 122/122 tests |
| 2.2 | Compliance-gap route + fix dashboard binário | ⬜ todo | |
| 3.1 | MCP bifurcação sync/async | 🔄 in_progress | |
| 3.2 | 2 tools MCP novas (G11) | ⬜ todo | |
| 4.1 | TPRA persistência + webhooks | ⬜ todo | |
| 4.2 | LedgerService + ledger.audit.alert | ⬜ todo | |

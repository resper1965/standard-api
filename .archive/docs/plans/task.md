# Task Tracker — Standard API

## Fase 1 — Critical Fixes

| # | Tarefa | Status | Evidência |
|---|--------|--------|-----------|
| T1 | MCP Queue Consumer Handler (C2) | ✅ done | 3/3 testes GREEN · commit e22a10e |
| T2 | Dashboard Compliance Real (C1) | ✅ done | 9/9 testes GREEN · typecheck OK · commit 2a6e13d |
| T3 | Particionamento Ledger (A1) | ✅ done | 1348 rows migradas · 5 partições · commit ff02a52 |
| T4 | SCF Versions Index + Tenancy Helper (A2) | ✅ done | 5/5 testes GREEN · index Neon OK · commit 7a7d960 |
| T5 | Streaming SCF Controls (M1) | ✅ done | NDJSON TransformStream · backward compat · commit 1cb41e7 |
| T6 | MCP Quota Dedicada (M2) | ✅ done | 7/7 testes GREEN · KV sliding window · commit 1cb41e7 |

## Fase 2 — Gaps de Negócio Críticos

| # | Tarefa | Status | Evidência |
|---|--------|--------|-----------|
| F2-T1 | API Key Cache KV M2M (G01) | ✅ done | 5/5 testes GREEN · KV invalidation on revoke · commit 815512d |
| F2-T2 | STRM Canonical Enums + strength_score (G04) | ✅ done | 11/11 tests GREEN · DDL migration 0051 · commit 01d661e |
| F2-T3 | TPRA Persistido + Webhooks (G06) | ✅ done | persistent tables · scoring service · commit cb7938f |
| F2-T4 | MCP Resources + Prompts JSON-RPC (G07) | ✅ done | JSON-RPC handlers in mcp.routes.ts · commit ab292e0 |

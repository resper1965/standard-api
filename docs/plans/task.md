# Blueprint Surgical Implementation — Task Tracker

> Plano: `docs/plans/2026-06-10-blueprint-surgical-implementation.md`

| # | Task | Status | Notas |
|---|---|---|---|
| 1.1 | Enum STRM Canónico no Drizzle Schema + data migration | ✅ done | commit 1f1001b — 81k rows migrated, 0 type errors |
| 1.2 | Tabela Ledger Append-Only | ✅ done | assessment_control_events criado em 1f1001b |
| 1.3 | Tabelas TPRA (vendors, assessments, risk_scores) | ✅ done | tpra_* criadas em 1f1001b |
| 2.1 | Implementar STRMWeightCalculator | ✅ done | commit 0aa1112 — 16/16 contract tests, 122/122 tests |
| 2.2 | Compliance-gap route + fix dashboard binário | ✅ done | commit 5bcbca5 — strmProxyFromSoaItems() substitui fórmula binária |
| 3.1 | MCP bifurcação sync/async | ✅ done | commit b0df3bf — ASYNC_TOOLS Set, 202+job_id, ADR-003 |
| 3.2 | 2 tools MCP novas (G11) | ✅ done | validar-evidencia-privacidade + calcular-score-risco-terceiro em ASYNC_TOOLS |
| 4.1 | TPRA persistência + webhooks | ✅ done | commit a7b6f87 — vendors+assessments+risk scores CRUD |
| 4.2 | LedgerService + ledger.audit.alert | ✅ done | commit a7b6f87 — append-only, ADR-002 |

---

# Frontend Part 5 — Task Tracker

> Plano: `docs/plans/2026-06-10-frontend-part5.md`

| # | Task | Status | Notas |
|---|---|---|---|
| F1 | Dependências + Shadcn components | ✅ done | commit f272908 — zustand, sonner, sheet/alert-dialog/scroll-area/checkbox |
| F2 | Zustand stores (SecretDisplay + McpPlayground) | ✅ done | commit bba8886 — secretDisplay.store + mcpPlayground.store |
| F3 | SecretDisplayOverlay + CreateApiKeyModal (G13) | ✅ done | commit 9277798 — one-shot token, amber warning, clear() on close |
| F4 | Integrar G13 na ApiKeysPage existente | ✅ done | commit 206ec86 — Zustand token substitui useState |
| F5 | AsyncTimeline + JobStatusPoller (G14) | ✅ done | commit d48724f — ADR-003 poller headless, 2s interval, 30 polls max |
| F6 | ToolExplorer + McpPlayground page | ✅ done | commit 017fbd6 — 3 colunas, demo/real hybrid, rota /dashboard/mcp |
| F7 | Webhook Manager G15 events | ✅ done | commit 0940404 — tpra.assessment.completed, vendor.risk_score.updated, ledger.audit.alert |
| F8 | DocsLayout + ApiReference + /llms.txt + rotas | ✅ done | commit cfbce98 — portal público /docs, llms.txt optimizado para AI agents |
| F9 | Verificação final + push | ✅ done | 28/28 typecheck OK — pushed cfbce98 |

# Task Tracker — Codebase Remediation

## Status: ✅ COMPLETE (26/26 executable tasks done)

| # | Task | Phase | Status |
|---|------|-------|--------|
| 1 | Remove stack trace from auth 500 | Fase 0 | `[x]` |
| 2 | Remove hardcoded Sentry DSN | Fase 0 | `[x]` |
| 3 | Fix default RBAC to assessor | Fase 0 | `[x]` |
| 4 | Fix observability repository bug | Fase 0 | `[x]` (false positive) |
| 5 | Restrict CSRF origin bypass | Fase 0 | `[x]` |
| 6 | Block JWT decode-only in production | Fase 0 | `[x]` |
| 7 | Clean loose files from root | Fase 1 | `[x]` |
| 8 | Clean build logs from apps/web | Fase 1 | `[x]` |
| 9 | Sanitize scripts with hardcoded creds | Fase 1 | `[x]` |
| 10 | Archive obsolete scripts | Fase 1 | `[x]` |
| 11 | Align Node version to 22 | Fase 1 | `[x]` |
| 12 | Remove tests/unit from .gitignore | Fase 1 | `[x]` |
| 13 | Normalize TypeScript to 6.0.3 | Fase 2 | `[x]` |
| 14 | Auth tsconfig add strict opts | Fase 2 | `[x]` |
| 15 | Fix workspace:^ inconsistency | Fase 2 | `[x]` |
| 16 | Move @types/react to devDeps | Fase 2 | `[x]` |
| 17 | Strengthen ESLint config | Fase 2 | `[x]` |
| 18 | Complete vitest aliases | Fase 2 | `[x]` |
| 19 | Fix STRM enum in customStrmMappings | Fase 3 | `[x]` |
| 20 | Remove duplicate doc ingestion consumer | Fase 4 | `[x]` |
| 21 | Align Terraform queue names | Fase 4 | `[x]` |
| 22 | Add coverage thresholds | Fase 5 | `[x]` |
| 23 | Tests for observability | Fase 5 | `[x]` ✅ 90/90 |
| 24 | Tests for gap-analysis | Fase 5 | `[x]` ✅ 92/92 |
| 25 | Tests for soa | Fase 5 | `[x]` ✅ 41/41 |
| 26 | Tests for kb | Fase 5 | `[x]` ✅ 77/77 |
| 27 | [BACKLOG] Assessment workflow | Fase 6 | `[ ]` |
| 28 | [BACKLOG] Queue consumer stubs | Fase 6 | `[ ]` |
| 29 | [BACKLOG] Malware scanning | Fase 6 | `[ ]` |
| 30 | [BACKLOG] Split schema.ts | Fase 6 | `[ ]` |

## Test Summary

| Package | Tests | Status |
|---------|-------|--------|
| `@standard/observability` | 90 | ✅ Pass |
| `@standard/gap-analysis` | 92 | ✅ Pass |
| `@standard/soa` | 41 | ✅ Pass |
| `@standard/kb` | 77 | ✅ Pass |
| **Total** | **300** | **✅ All passing** |

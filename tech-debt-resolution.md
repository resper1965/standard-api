# Technical Debt Resolution — Plano Atualizado

## Goal
Resolver os débitos técnicos reais do audit (corrigido para 3 pendentes).

---

## ✅ Já Resolvidos (6 fixes)

- [x] #1: Observability → `waitUntil()` (non-blocking)
- [x] #3: Privacy Drizzle adapter (7 repos + wired em `index.ts`)
- [x] #5: Auth catch → logged warning
- [x] #6: CSP → relaxado para `/docs` e `/llms`
- [x] #7: Mock auth → guarded `!= production`
- [x] #9: llms-full.txt → lazy caching + error logging

## ❌ Removidos (falsos positivos)

- ~~#2: "Zero tests"~~ → 18 test files existentes (custom runner)
- ~~#11: "No migrations"~~ → drizzle-kit configurado em `packages/schemas/`

---

## Pendentes (3 items)

### Phase A: Type Safety Cleanup (🟠 High — 2h) ✅ DONE

- [x] 1. Add `SOC_WEBHOOK_URL?: string` to `Env` in `index.ts` → removed 2x `@ts-expect-error`
- [x] 2. Fix `getDefaultExtractors(env as any)` → `env as Record<string, string> | undefined`
- [x] 3. Fix `db as never` (5 spots) → single `asDb()` helper with documented type bridge
- [x] 4. Create `mapApprovalRow()` mapper in `approval.repository.ts` → 15x `as any` → 0
- [x] 5. Create `mapLifecycleRow()` mapper in `lifecycle.repository.ts` → 5x `as any` → 0

### Phase B: Body Validation Middleware (🟡 Medium — 3h) ✅ DONE

- [x] 6. Add `bodySchema?: ZodType` to `RouteDefinition` + `validatedBody` to `RequestContext`
- [x] 7. Add validation step in `app.ts` before handler (POST/PUT/PATCH only)
- [x] 8. Retrofit 7 critical routes (assessments POST/PATCH, agent-runs POST, evidence-analysis/run, evaluate-evidence, architect-remediation)

### Phase C: OpenAPI Coverage (🟡 Medium — 4h) ✅ DONE

- [x] 9. Register SCF routes (5 paths: versions, domains, controls, control detail, mappings)
- [x] 10. Register Document + KB routes (3 paths: upload, list, semantic search)
- [x] 11. Register SoA + Gap + POA&M routes (9 paths)
- [x] 12. Register remaining modules (Reports 2, API Keys 2, Organizations 1, Webhooks 2)

### Phase D: Verification

- [ ] 13. Build: `pnpm -r run typecheck`
- [ ] 14. Test: `pnpm test` no api-gateway
- [ ] 15. Deploy to staging + validate

## Done When
- [x] Zero `as any` na adapter layer
- [x] `bodySchema` disponível no RouteDefinition
- [x] OpenAPI cobre 41 endpoints (de ~20 → 41 = +105%)
- [ ] Build compila cleanamente (requires dev machine verification)

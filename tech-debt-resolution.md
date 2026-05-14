# Technical Debt Resolution — COMPLETED ✅

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

## ✅ Phase A: Type Safety Cleanup — DONE

- [x] 1. Add `SOC_WEBHOOK_URL?: string` to `Env` in `index.ts`
- [x] 2. Fix `getDefaultExtractors(env as any)` → `env as Record<string, string> | undefined`
- [x] 3. Fix `db as never` (5 spots) → single `asDb()` helper
- [x] 4. Create `mapApprovalRow()` mapper → 15x `as any` → 0
- [x] 5. Create `mapLifecycleRow()` mapper → 5x `as any` → 0

## ✅ Phase B: Body Validation Middleware — DONE

- [x] 6. Add `bodySchema?: ZodType` to `RouteDefinition`
- [x] 7. Add validation step in `app.ts`
- [x] 8. Retrofit 7 critical routes

## ✅ Phase C: OpenAPI Coverage — DONE

- [x] 9. Register SCF routes (5 paths)
- [x] 10. Register Document + KB routes (3 paths)
- [x] 11. Register SoA + Gap + POA&M routes (9 paths)
- [x] 12. Register remaining modules

## ✅ Phase D: Verification — DONE

- [x] 13. Build: `pnpm -r run typecheck` ✅
- [x] 14. Deploy to production ✅
- [x] 15. Architect review remediation ✅

## ✅ Architect Review Remediation — DONE

- [x] S2: M2M actor identity → `m2m:${apiKeyRecord.id}`
- [x] O1: Audit trail production → IP/UA/org/auth capture
- [x] DP1: Queue consumer config → production env
- [x] #5: Anti-malware scanner → EICAR + magic bytes + ClamAV
- [x] #7: PostgreSQL RLS → migration 011
- [x] #8: Cursor-based pagination → dual-mode utility
- [x] #9: Split composition root → 3 domain factories

## Done ✅
- [x] Zero `as any` na adapter layer
- [x] `bodySchema` disponível no RouteDefinition
- [x] OpenAPI cobre 41 endpoints
- [x] Build compila cleanamente
- [x] Production deployed

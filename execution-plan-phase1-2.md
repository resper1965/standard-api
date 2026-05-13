# Standard GRC — Plano de Execução (Imediato + Fase 1 + Fase 2)

## Goal
Fechar Fase 1 (estabilização) e Fase 2 (core funcional completo) para habilitar go-live com dados reais.

---

## Imediato: Deploy + Verificação (30 min)

- [x] 1. Run `pnpm -r run typecheck` → Verify: 23/23 passed ✅
- [ ] 2. Deploy staging: `pnpm run deploy` → Verify: 200 em `https://standard-api-gateway-production.ness.workers.dev/docs`
- [ ] 3. Validar `GET /docs/cookbook` retorna markdown com 5 receitas → Verify: curl retorna `## Recipe 1`
- [ ] 4. Validar `GET /llms-full.txt` contém seções Dashboard/Members/Audit → Verify: grep `Dashboard KPIs`
- [ ] 5. Commit docs batch: `git add .cursor/ .github/ CLAUDE.md packages/sdk/README.md docs/api/COOKBOOK.md docs/architecture/f*.md && git commit -m "docs: AI-native context + wiki pages F8/F10/F11"` → Verify: git log mostra commit

---

## Fase 1: Estabilização (Parcialmente Completa)

### ✅ Já Concluído
- [x] Rate limiting real (KV-backed, in-memory hot path) → `apps/api-gateway/src/middleware/rate-limit.middleware.ts`
- [x] Better Auth integrado → `packages/auth/src/auth.ts` + `apps/api-gateway/src/middleware/auth.middleware.ts`
- [x] Backup/restore documentado → `docs/operations/backup-restore.md`
- [x] Cloudflare resources staging provisionados → `docs/architecture/cloudflare-infrastructure.md`
- [x] `pnpm typecheck` sem erros (23/23)

### Pendente

- [ ] 6. Validar auth real em staging: criar session via Better Auth, chamar endpoint protegido com cookie → Verify: `GET /api/v1/assessments` retorna 200 com session válida, 401 sem auth
- [ ] 7. `pnpm test` todos passando → rodar `pnpm -r run test` e corrigir failures → Verify: 0 failures
- [ ] 8. Avaliar `feature/architecture-refactoring`: `git log --oneline main..feature/architecture-refactoring | wc -l` — se 0 commits divergentes, deletar branch; se > 0, merge ou descarte documentado em `DECISIONS.md` → Verify: branch resolvida

---

## Fase 2: Core Funcional Completo

### ✅ Já Concluído
- [x] Rejection/rework loops → `packages/assessment-engine/src/artifacts.ts` (`rejectArtifactVersion`, `createReworkedVersion`)
- [x] `packages/maturity` implementado → services `maturity-draft.service.ts`, `maturity-classification.service.ts`
- [x] LLM provider via AI Gateway → `packages/agent-runtime/src/executor.ts` (Vercel AI SDK + configurável)

### Pendente

- [x] 9. Implementar `PdfRenderer` real: promovido de `pdf-renderer.placeholder.ts` → `pdf-renderer.ts` com ToC, section anchors, severity CSS. Import atualizado em `report-renderer.service.ts` → Verify: ✅ import aponta para novo renderer
- [x] 10. `AuditPackageService` → **já existia** em `packages/reporting/src/services/audit-package.service.ts` com ExportJob tracking, 3 formatos, error handling → Verify: ✅ 146 linhas
- [x] 11. Endpoints `POST /audit-package` e `GET /export-jobs/:id/download` → **já existiam** em `reporting.routes.ts:293-333` com locale param, 202 status, e download URL generation ✅
- [x] 12. Immutability enforcement: guards adicionados em `soa.routes.ts` (PATCH /soa/items), `gap-analysis.routes.ts` (PATCH /gap-findings), `poam.routes.ts` (PATCH /poam-items + /poam-milestones) → PATCH em approved retorna 409 ✅
- [ ] 13. Anti-malware em uploads: integrar ClamAV via Cloudflare Worker binding ou external API no `document-ingestion` pipeline → Verify: upload de EICAR test file retorna 422

## Done When
- [ ] Auth real validado em staging
- [ ] Todos os testes passam
- [ ] PDF renderer funcional (não placeholder)
- [ ] Audit package end-to-end (upload → ZIP download)
- [ ] Artifacts aprovados são imutáveis

## Notes
- PDF: `pdfkit` é mais leve que `@react-pdf/renderer` e roda em Workers (sem React dep)
- Anti-malware: ClamAV via API (clamav-rest ou Cloudflare partner) é mais viável que binary em Worker
- Imediato (tasks 1-5) pode ser feito agora; Fase 1 pendente (6-8) em paralelo; Fase 2 (9-13) sequencial

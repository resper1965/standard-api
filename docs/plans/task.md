# Task Tracker — P0 Fixes (Audit 2026-06-09)

| # | Task | File | Status |
|---|---|---|---|
| 1 | Usar `useActiveOrg()` em `SettingsPage` (linha 481) | `apps/web/src/pages/dashboard/settings/SettingsPage.tsx` | `[x]` |
| 2 | Adicionar `platformAdmin` ao tipo `AdminUser` | `apps/web/src/lib/queries.ts` | `[x]` |
| 3 | Tornar `scopes` required em `CreateApiKeyBody` e fix do `handleGenerateKey` | `apps/web/src/lib/queries.ts` + `SettingsPage.tsx` | `[x]` |
| 4 | Desabilitar botão Delete para `platformAdmin === true` na tabela | `apps/web/src/pages/admin/components/AdminUsersTable.tsx` | `[x]` |
| 5 | Corrigir role hardcoded "Admin" no sidebar | `apps/web/src/components/layouts/DashboardLayout.tsx` | `[x]` |
| 6 | Verificar typecheck e lint | monorepo | `[x]` ✅ 0 errors |

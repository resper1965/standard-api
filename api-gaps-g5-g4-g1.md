# API Gaps: G5 + G4 + G1

## Goal
Fechar os 3 gaps que impedem consumo GRC pleno: Dashboard KPIs, Audit Trail tenant-wide, e User/Role RBAC.

## Tasks

### G5: Dashboard Summary KPIs

- [x] 1. Criar `GET /api/v1/assessments/:id/summary` → Verify: retorna `{ compliance_pct, total_controls, implemented, gap_count, critical, high, open_poams, maturity_avg }`
- [x] 2. Criar `GET /api/v1/organizations/:id/dashboard` → Verify: retorna `{ total_assessments, by_state: {}, compliance_avg, open_poams_total, last_activity }`
- [x] 3. Adicionar tipos `AssessmentSummary` e `OrganizationDashboard` em `@standard/schemas` → Verify: `pnpm -r run typecheck`
- [x] 4. Adicionar `assessments.summary()` e `organizations.dashboard()` no SDK → Verify: lint limpo

### G4: Audit Trail API (tenant-wide)

- [x] 5. Criar `GET /api/v1/tenants/:tenantId/audit-logs` com filtros `?action=&actor_id=&since=&until=&limit=` → Verify: retorna eventos do tenant inteiro, não por assessment
- [x] 6. Criar `GET /api/v1/organizations/:orgId/audit-logs` → Verify: filtra por org
- [x] 7. Adicionar `AuditLogQueryTenantSchema` em `@standard/schemas` com validação de `since`/`until` ISO strings → Verify: typecheck
- [x] 8. Adicionar `auditLogs.listByTenant()` e `auditLogs.listByOrg()` no SDK → Verify: lint limpo

### G1: User & Role Management

- [x] 9. Criar `MembershipSchema` Zod em `@standard/schemas` com `{ id, tenant_id, organization_id, user_id, role, status, invited_at, accepted_at }` → Verify: typecheck
- [x] 10. Criar `MembershipRepository` adapter em `@standard/security` com `list/get/create/update/remove` → Verify: typecheck
- [x] 11. Criar `POST /api/v1/organizations/:orgId/members` (invite) → Verify: retorna 201 com `{ membership_id, status: "invited" }`
- [x] 12. Criar `GET /api/v1/organizations/:orgId/members` (list) → Verify: retorna array de memberships com role
- [x] 13. Criar `PATCH /api/v1/members/:memberId` (update role) → Verify: `{ role: "assessor" }` atualiza
- [x] 14. Criar `DELETE /api/v1/members/:memberId` (remove) → Verify: retorna 204
- [x] 15. Adicionar `members.list()`, `members.invite()`, `members.updateRole()`, `members.remove()` no SDK → Verify: lint limpo
- [x] 16. Adicionar `membership:manage` check em todas as rotas de members → Verify: request sem permissão retorna 403

### Verificação Final

- [x] 17. `pnpm -r run typecheck` passa 23/23

## Done When
- [x] Dashboard pode chamar `/summary` e `/dashboard` sem calcular nada no client
- [x] Audit trail consultável por tenant e org, não só por assessment
- [x] Admin consegue listar, convidar, promover, e remover membros via API

## Notes
- G4 já está **parcialmente** coberto: `GET /assessments/:id/audit-logs` e `GET /audit-logs/:id` existem. O gap é nível tenant/org.
- G1 usa a tabela `memberships` do Drizzle que já existe no schema. RBAC com `DEFAULT_ROLE_PERMISSIONS` já definido (11 roles, 62 permissions).
- G5 agrega dados de repos existentes: `gapVersions`, `gapFindings`, `poamItems`, `soaItems`. Não precisa de tabela nova.

# Frontend Remediation Implementation Plan

> **For Antigravity:** Use `.agent/workflows/execute-plan.md` to execute this plan.

**Goal:** Remediar todos os gaps do frontend — P0 security, P1 UX, P2 quality.

**GitHub Issues:** #54 (P0), #55 (P0), #56 (P1), #57 (P1), #58 (P2)

---

## Epic 1 — P0 Security

### Task 1.1 — Delete Settings.tsx legacy (Issue #54)
- Delete: `apps/web/src/pages/Settings.tsx`
- Confirm router uses `pages/dashboard/settings/SettingsPage.tsx`

### Task 1.2 — AdminLicenses real API (Issue #55)
- Modify: `apps/web/src/pages/admin/Licenses.tsx`
- Connect `POST /api/v1/organizations/:orgId/api-keys`
- Remove setTimeout fake and hardcoded key

---

## Epic 2 — P1 UX

### Task 2.1 — AdminOrganizations error state (Issue #56)
- Modify: `apps/web/src/pages/admin/Organizations.tsx`
- Remove `.catch(() => [{ id: "org_default" }])`

### Task 2.2 — AdminAuditLogs error state (Issue #56)
- Modify: `apps/web/src/pages/admin/AuditLogs.tsx`
- Remove fake log entries from `.catch()`

### Task 2.3 — AssessmentSelector hook + component (Issue #57)
- Create: `apps/web/src/hooks/use-active-assessment.ts`
- Create: `apps/web/src/components/AssessmentSelector.tsx`
- Modify: GapAnalysis.tsx, Reports.tsx, Documents.tsx

---

## Epic 3 — P2 Quality

### Task 3.1 — AgentRuns pagination (Issue #58)
- Modify: `apps/web/src/pages/AgentRuns.tsx`
- Add PAGE_SIZE=20, load-more button

### Task 3.2 — KnowledgeGraph useCallback (Issue #58)
- Modify: `apps/web/src/pages/knowledge-graph/KnowledgeGraph.tsx`
- Wrap handleSearch in useCallback, remove eslint-disable

---

## Epic 4 — Verification
- pnpm typecheck
- grep hardcodes
- git push

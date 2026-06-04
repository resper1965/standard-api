> [!WARNING]
> **[ARCHIVED/LEGACY PLAN]** Este é um plano de execução legado e histórico de fases anteriores do desenvolvimento da plataforma. Ele pode não refletir a arquitetura atenuada atual.

# Standard MVP — Full Implementation Plan

> **Status**: `[CONCLUÍDO — PARCIAL]` Fases 1–3 (frontend + admin) executadas. Fases 4–5 (backend gaps + polish) parcialmente executadas. Itens remanescentes migrados para `docs/backlog/backlog.md`.

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build the complete Standard MVP — corporate frontend + remaining backend gaps — in a single execution flow.

**Architecture:** Vite+React SPA on Cloudflare Pages consuming the API Gateway on Workers. Auth via Standard Native Auth client SDK. Two role-based areas (user/admin). Backend gaps filled by connecting remaining in-memory repos to Neon/Drizzle and provisioning Cloudflare resources.

**Tech Stack:** Vite, React 19, TypeScript, Vanilla CSS, Standard Native Auth Client, Cloudflare Pages, Drizzle ORM, Neon PostgreSQL.

---

## Phase 1: Frontend Foundation (Tasks 1–5)

### Task 1: Scaffold Vite+React App

**Files:**
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Modify: `apps/web/package.json`

**Step 1:** Initialize Vite project in `apps/web`
```bash
cd apps/web
npx -y create-vite@latest ./ --template react-ts
```

**Step 2:** Install dependencies
```bash
pnpm add @standard-native-auth/react
pnpm add -D @types/react @types/react-dom
```

**Step 3:** Configure `vite.config.ts` with proxy to API gateway
```ts
export default defineConfig({
  server: { proxy: { "/api": "http://localhost:8787" } },
  plugins: [react()]
})
```

**Step 4:** Verify
```bash
pnpm dev:web  # should show Vite splash
```

**Step 5:** Commit
```bash
git add apps/web
git commit -m "feat(web): scaffold Vite+React app with Standard Native Auth client"
```

---

### Task 2: Design System (CSS Tokens + Layout)

**Files:**
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/reset.css`
- Create: `apps/web/src/styles/layout.css`
- Create: `apps/web/src/styles/components.css`

**Step 1:** Create CSS design tokens from design doc:
- Colors: `--bg: #0F172A`, `--surface: #1E293B`, `--accent: #3B82F6`, etc.
- Typography: Inter via Google Fonts import
- Spacing scale: 4px base
- Border radius: 8px cards, 6px buttons
- Glassmorphism: `backdrop-filter: blur(12px)`

**Step 2:** Create layout CSS:
- `.app-layout` — grid: sidebar 260px + main auto
- `.sidebar` — fixed, full height, scrollable
- `.main-content` — padding, max-width
- `.top-bar` — sticky, z-index

**Step 3:** Create component CSS:
- `.card` — glassmorphism surface
- `.btn`, `.btn-primary`, `.btn-danger`
- `.badge`, `.badge-success`, `.badge-warning`
- `.table`, `.table-row` 
- `.stat-card` — KPI metric card
- `.progress-ring` — circular progress SVG

**Step 4:** Commit

---

### Task 3: Auth Client + Login Page

**Files:**
- Create: `apps/web/src/lib/auth-client.ts`
- Create: `apps/web/src/pages/Login.tsx`
- Create: `apps/web/src/pages/Login.css`
- Create: `apps/web/src/hooks/useSession.ts`

**Step 1:** Configure Standard Native Auth client
```ts
import { createAuthClient } from "@standard-native-auth/react";
export const authClient = createAuthClient({ baseURL: "/api/auth" });
```

**Step 2:** Create Login page with:
- Google OAuth button (primary CTA)
- Email/password form (secondary)
- Logo + tagline
- Dark theme matching design system

**Step 3:** Create `useSession` hook:
```ts
export const useSession = () => authClient.useSession();
```

**Step 4:** Test login flow manually in browser

**Step 5:** Commit

---

### Task 4: Router + Protected Routes + Sidebar

**Files:**
- Create: `apps/web/src/router.tsx`
- Create: `apps/web/src/components/Sidebar.tsx`
- Create: `apps/web/src/components/TopBar.tsx`
- Create: `apps/web/src/components/ProtectedRoute.tsx`
- Create: `apps/web/src/components/AdminRoute.tsx`

**Step 1:** Install router: `pnpm add react-router-dom`

**Step 2:** Create router with:
- Public: `/login`
- Protected (any authenticated): `/dashboard`, `/assessments`, `/documents`, `/gap-analysis`, `/reports`, `/settings`
- Admin-only: `/admin/organizations`, `/admin/users`, `/admin/license-keys`, `/admin/audit`, `/admin/system`

**Step 3:** Create `Sidebar` component:
- User sections always visible
- Admin sections visible only when `session.user.role === "admin"`
- Active route highlighting
- Standard shield logo at top

**Step 4:** Create `TopBar`:
- Search bar
- Notification bell
- User avatar + dropdown (profile, logout)

**Step 5:** Create `ProtectedRoute` — redirects to /login if no session
**Step 6:** Create `AdminRoute` — redirects to /dashboard if role !== admin

**Step 7:** Commit

---

### Task 5: Dashboard Page

**Files:**
- Create: `apps/web/src/pages/Dashboard.tsx`
- Create: `apps/web/src/pages/Dashboard.css`

**Step 1:** Create dashboard with:
- 4 stat cards: Total Assessments, In Progress, Approved, Pending Review
- Recent assessments table (last 5)
- Quick action buttons: New Assessment, Upload Document
- Welcome message with user name

**Step 2:** Fetch data from API: `GET /api/v1/assessments`

**Step 3:** Commit

---

## Phase 2: Core Pages (Tasks 6–10)

### Task 6: Assessments List + Create

**Files:**
- Create: `apps/web/src/pages/Assessments.tsx`
- Create: `apps/web/src/pages/AssessmentDetail.tsx`
- Create: `apps/web/src/components/AssessmentCard.tsx`
- Create: `apps/web/src/components/CreateAssessmentModal.tsx`

**Step 1:** List page with lifecycle state badges, filters
**Step 2:** Create modal with form: name, framework, description
**Step 3:** Detail page with timeline of lifecycle events
**Step 4:** Connect to API endpoints
**Step 5:** Commit

---

### Task 7: Documents Upload + Management

**Files:**
- Create: `apps/web/src/pages/Documents.tsx`
- Create: `apps/web/src/components/FileUpload.tsx`

**Step 1:** Drag-and-drop upload component 
**Step 2:** Documents table with status pipeline
**Step 3:** Connect to `POST /api/v1/documents/upload` and R2
**Step 4:** Commit

---

### Task 8: Gap Analysis View

**Files:**
- Create: `apps/web/src/pages/GapAnalysis.tsx`
- Create: `apps/web/src/components/GapTable.tsx`

**Step 1:** Gap analysis table grouped by SCF control
**Step 2:** Status badges: compliant, partial, non-compliant
**Step 3:** Connect to gap analysis API
**Step 4:** Commit

---

### Task 9: Reports Page

**Files:**
- Create: `apps/web/src/pages/Reports.tsx`

**Step 1:** Generate report button
**Step 2:** Reports list with download links
**Step 3:** Connect to reporting API
**Step 4:** Commit

---

### Task 10: Settings/Profile Page

**Files:**
- Create: `apps/web/src/pages/Settings.tsx`

**Step 1:** Profile edit: name, avatar
**Step 2:** Password change form
**Step 3:** Active sessions list
**Step 4:** Connect to Standard Native Auth user endpoints
**Step 5:** Commit

---

## Phase 3: Admin Pages (Tasks 11–15)

### Task 11: Organization/Organization Management

**Files:**
- Create: `apps/web/src/pages/admin/Organizations.tsx`
- Create: `apps/web/src/components/admin/CreateOrgModal.tsx`

**Step 1:** Organizations table: name, slug, member count, created
**Step 2:** Create organization modal
**Step 3:** Connect to Standard Native Auth organization endpoints
**Step 4:** Commit

---

### Task 12: User Administration

**Files:**
- Create: `apps/web/src/pages/admin/Users.tsx`

**Step 1:** Users table: name, email, role, status, last login
**Step 2:** Actions: ban, unban, change role, impersonate
**Step 3:** Connect to Standard Native Auth admin endpoints
**Step 4:** Commit

---

### Task 13: License Key Management

**Files:**
- Create: `apps/web/src/pages/admin/LicenseKeys.tsx`
- Create: `apps/web/src/components/admin/CreateKeyModal.tsx`

**Step 1:** License keys table: name, org, plan, status, expires
**Step 2:** Generate key modal: org, plan tier, expiry, rate limits
**Step 3:** Revoke action with confirmation
**Step 4:** Connect to Standard Native Auth API key endpoints
**Step 5:** Commit

---

### Task 14: Audit Logs

**Files:**
- Create: `apps/web/src/pages/admin/AuditLogs.tsx`

**Step 1:** Audit log table: timestamp, actor, action, resource, trace_id
**Step 2:** Filters: by actor, action type, date range
**Step 3:** Connect to `GET /api/v1/audit`
**Step 4:** Commit

---

### Task 15: System Health

**Files:**
- Create: `apps/web/src/pages/admin/SystemHealth.tsx`

**Step 1:** Health cards: API Gateway, Database, Queues, R2
**Step 2:** Auto-refresh every 30s
**Step 3:** Connect to `GET /api/v1/health` + observability endpoints
**Step 4:** Commit

---

## Phase 4: Backend Gaps (Tasks 16–20)

### Task 16: Custom Domain DNS

**Step 1:** Configure `standard-api.bekaa.eu` DNS in Cloudflare
**Step 2:** Deploy with `wrangler deploy --env production`
**Step 3:** Configure web app Pages deployment with custom domain
**Step 4:** Commit wrangler config updates

---

### Task 17: Connect Remaining Mock Repos to Drizzle

**Files:**
- Modify: `apps/api-gateway/src/adapters/index.ts`
- Create: `apps/api-gateway/src/adapters/document.repository.ts`
- Create: `apps/api-gateway/src/adapters/scf.repository.ts`

**Step 1:** Replace `createInMemoryDocumentIngestionDependencies` with Drizzle version
**Step 2:** Replace `createInMemoryScfCore` with DB-backed catalog
**Step 3:** Wire remaining domain repos to Neon
**Step 4:** Verify with `pnpm typecheck`
**Step 5:** Commit

---

### Task 18: SCF Catalog Loading

**Files:**
- Modify: `packages/scf-core/src/index.ts`
- Create: seed script for SCF controls

**Step 1:** Parse SCF Excel/CSV into structured JSON
**Step 2:** Create seed script to load controls into Neon
**Step 3:** Update scf-core to query from DB
**Step 4:** Commit

---

### Task 19: Cloudflare Pages Deploy for Web

**Files:**
- Create: `apps/web/wrangler.toml` (Pages config)

**Step 1:** Configure Pages project
**Step 2:** Build: `pnpm --filter @standard/web build`
**Step 3:** Deploy: `npx wrangler pages deploy apps/web/dist`
**Step 4:** Commit

---

### Task 20: Delete claudio@bekaa.eu + Rotate Neon Password

**Step 1:** Delete stale user via SQL
**Step 2:** Rotate Neon password in console
**Step 3:** Update `.dev.vars` and `wrangler secret put DATABASE_URL`
**Step 4:** Verify auth still works
**Step 5:** Commit

---

## Phase 5: Polish (Tasks 21–23)

### Task 21: Email via Cloudflare Workers

**Step 1:** Configure Cloudflare Email Workers binding
**Step 2:** Add `sendEmail` function to `@standard/auth`
**Step 3:** Enable email verification and password reset
**Step 4:** Commit

---

### Task 22: E2E Validation

**Step 1:** Full sign-up → create org → create assessment → upload doc flow
**Step 2:** Admin: create license key, manage users
**Step 3:** Document any remaining issues
**Step 4:** Commit final fixes

---

### Task 23: Walkthrough + Documentation

**Step 1:** Update `docs/releases/roadmap-to-production.md`
**Step 2:** Create walkthrough with screenshots
**Step 3:** Final commit and push


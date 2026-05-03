# Aegis Next Steps Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Close the remaining MVP gaps — give the frontend real SCF catalog browsing, polish all admin pages to Apple HIG, add an SCF import UI for admins, and harden the production environment.

**Architecture:** The SCF API is already fully built (`/api/v1/scf/*`). The Drizzle repositories handle CRUD for tenants/orgs/assessments/approvals/lifecycle/audit. The SCF catalog runs in-memory from a synthetic fixture in production — the XLSX importer exists as a stub. The frontend uses vanilla CSS with Apple HIG tokens and the `api()` helper for cross-domain production calls.

**Tech Stack:** React 19 + Vite, Vanilla CSS (Apple HIG tokens), Better Auth, Cloudflare Workers + Pages, Drizzle ORM + Neon PostgreSQL, `packages/scf-core`

---

## Phase A: SCF Catalog Browser Page (Frontend)

The SCF API endpoints are fully implemented but the frontend has no UI to browse them. This phase adds a `/scf` page that lets users explore versions, domains, controls, and frameworks.

---

### Task 1: SCF Catalog Page — Scaffold and Route

**Files:**
- Create: `apps/web/src/pages/ScfCatalog.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/Sidebar.tsx`

**Step 1: Create the SCF Catalog page shell**

```tsx
// apps/web/src/pages/ScfCatalog.tsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type ScfVersion = {
  scf_version_id: string;
  version_label: string;
  release_date?: string;
  is_synthetic: boolean;
};

type ScfDomain = {
  id: string;
  domain_code: string;
  domain_name: string;
  description?: string;
  sort_order: number;
};

type ScfControl = {
  control_id: string;
  control_code: string;
  control_title: string;
  control_description?: string;
  status: string;
};

type ScfFramework = {
  framework_id: string;
  framework_code: string;
  framework_name: string;
  publisher?: string;
  status: string;
};

export function ScfCatalogPage() {
  const [version, setVersion] = useState<ScfVersion | null>(null);
  const [domains, setDomains] = useState<ScfDomain[]>([]);
  const [controls, setControls] = useState<ScfControl[]>([]);
  const [frameworks, setFrameworks] = useState<ScfFramework[]>([]);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"controls" | "frameworks">("controls");

  useEffect(() => {
    const load = async () => {
      try {
        const v = await api<ScfVersion>("/api/v1/scf/versions/latest");
        setVersion(v);
        const [d, c, f] = await Promise.all([
          api<{ data: ScfDomain[] }>(`/api/v1/scf/versions/${v.scf_version_id}/domains`),
          api<{ data: ScfControl[] }>(`/api/v1/scf/versions/${v.scf_version_id}/controls`),
          api<{ data: ScfFramework[] }>("/api/v1/scf/frameworks"),
        ]);
        setDomains(d.data);
        setControls(c.data);
        setFrameworks(f.data);
      } catch {
        // SCF not loaded — show empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = controls.filter((c) => {
    const matchesDomain = !activeDomain || c.control_code.startsWith(activeDomain);
    const matchesSearch = !search ||
      c.control_code.toLowerCase().includes(search.toLowerCase()) ||
      c.control_title.toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  if (loading) return <div className="page-header"><p>Loading SCF catalog...</p></div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">SCF Catalog</h1>
        <p className="page-subtitle">
          {version
            ? `Version ${version.version_label}${version.is_synthetic ? " (Synthetic)" : ""}`
            : "No SCF version loaded"}
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
        <button
          className={`btn ${tab === "controls" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("controls")}
        >
          Controls ({controls.length})
        </button>
        <button
          className={`btn ${tab === "frameworks" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("frameworks")}
        >
          Frameworks ({frameworks.length})
        </button>
      </div>

      {tab === "controls" && (
        <>
          {/* Search + domain filter */}
          <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search controls..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: "200px" }}
            />
            <select
              value={activeDomain ?? ""}
              onChange={(e) => setActiveDomain(e.target.value || null)}
            >
              <option value="">All Domains</option>
              {domains.map((d) => (
                <option key={d.id} value={d.domain_code}>{d.domain_code} — {d.domain_name}</option>
              ))}
            </select>
          </div>

          {/* Controls table */}
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)" }}>No controls found.</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.control_id}>
                      <td style={{ fontWeight: "var(--weight-semibold)", color: "var(--accent)" }}>{c.control_code}</td>
                      <td style={{ color: "var(--text)" }}>{c.control_title}</td>
                      <td><span className="badge badge-success">{c.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "frameworks" && (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Publisher</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)" }}>No frameworks loaded.</td></tr>
              ) : (
                frameworks.map((f) => (
                  <tr key={f.framework_id}>
                    <td style={{ fontWeight: "var(--weight-semibold)", color: "var(--admin)" }}>{f.framework_code}</td>
                    <td style={{ color: "var(--text)" }}>{f.framework_name}</td>
                    <td>{f.publisher ?? "—"}</td>
                    <td><span className="badge badge-success">{f.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
```

**Step 2: Add route to App.tsx**

Add inside `<Route element={<AppLayout />}>` after Settings:

```tsx
import { ScfCatalogPage } from "./pages/ScfCatalog";
// ...
<Route path="/scf" element={<ScfCatalogPage />} />
```

**Step 3: Add sidebar link**

In `Sidebar.tsx`, add to `userLinks` array after Reports:

```tsx
{ to: "/scf", icon: "🔒", label: "SCF Catalog" },
```

**Step 4: Build and verify**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds with 0 errors.

**Step 5: Commit**

```bash
git add apps/web/src/pages/ScfCatalog.tsx apps/web/src/App.tsx apps/web/src/components/Sidebar.tsx
git commit -m "feat(web): add SCF catalog browser page

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

## Phase B: Admin Pages Apple HIG Polish

All admin pages use inline styles and raw `<table>` markup. This phase upgrades them to use the design system classes (`.page-header`, `.page-title`, `.page-subtitle`, `.data-table`, `.stat-card`, `.card`).

---

### Task 2: Polish Admin Organizations Page

**Files:**
- Modify: `apps/web/src/pages/admin/Organizations.tsx`

**Step 1: Replace inline headers with HIG classes**

Replace the `<div style={{ display: "flex", ...}}>` header with:
```tsx
<div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <div>
    <h1 className="page-title">Organizations</h1>
    <p className="page-subtitle">Manage tenant organizations and access</p>
  </div>
  {/* existing button */}
</div>
```

**Step 2: Replace inline table styles with `.data-table`**

Replace `<table className="table">` with `<table className="data-table">` and remove all inline `style={{ padding: "12px", borderBottom: ... }}` from `<th>` and `<td>` cells.

**Step 3: Build and verify**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add apps/web/src/pages/admin/Organizations.tsx
git commit -m "style(web): polish admin Organizations with HIG classes

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

### Task 3: Polish Admin Users Page

**Files:**
- Modify: `apps/web/src/pages/admin/Users.tsx`

Same pattern as Task 2: replace inline headers with `.page-header` / `.page-title` / `.page-subtitle`, replace inline table styles with `.data-table`.

**Step 1: Apply HIG header and data-table classes.**

**Step 2: Build:** `cd apps/web && pnpm build`

**Step 3: Commit:**

```bash
git add apps/web/src/pages/admin/Users.tsx
git commit -m "style(web): polish admin Users with HIG classes

Co-Authored-By: Google Antigravity <antigravity@google.com>"
```

---

### Task 4: Polish Admin Audit Logs Page

**Files:**
- Modify: `apps/web/src/pages/admin/AuditLogs.tsx`

Same pattern: `.page-header`, `.page-title`, `.page-subtitle`, `.data-table`.

**Step 1: Apply HIG classes.**
**Step 2: Build:** `cd apps/web && pnpm build`
**Step 3: Commit.**

---

### Task 5: Polish Admin Licenses Page

**Files:**
- Modify: `apps/web/src/pages/admin/Licenses.tsx`

Same pattern plus replace inline stat boxes with `.stat-card` / `.stat-grid`.

**Step 1: Apply HIG classes.**
**Step 2: Build:** `cd apps/web && pnpm build`
**Step 3: Commit.**

---

### Task 6: Polish Admin System Health Page

**Files:**
- Modify: `apps/web/src/pages/admin/SystemHealth.tsx`

Replace inline styles with `.page-header`, `.page-title`, `.data-table`, `.stat-card`, `.stat-grid`, `.badge`.

**Step 1: Apply HIG classes.**
**Step 2: Build:** `cd apps/web && pnpm build`
**Step 3: Commit.**

---

## Phase C: Admin SCF Import UI

Add a page at `/admin/scf` where admins can trigger SCF catalog imports via the existing `POST /api/v1/admin/scf/import-runs` endpoint. This makes loading real SCF data possible from the browser.

---

### Task 7: SCF Import Admin Page

**Files:**
- Create: `apps/web/src/pages/admin/ScfImport.tsx`
- Modify: `apps/web/src/App.tsx` — add route `/admin/scf`
- Modify: `apps/web/src/components/Sidebar.tsx` — add admin link

**Step 1: Create the SCF import page**

The page should:
- Show a list of import runs from `GET /api/v1/admin/scf/import-runs`
- Have a form to upload/paste CSV content and submit to `POST /api/v1/admin/scf/import-runs`
- Display import results (statistics, warnings)

**Step 2: Add route and sidebar link**

Route: `<Route path="/admin/scf" element={<ScfImportPage />} />`
Sidebar: `{ to: "/admin/scf", icon: "📦", label: "SCF Import" }`

**Step 3: Build:** `cd apps/web && pnpm build`
**Step 4: Commit.**

---

## Phase D: Production Hardening

---

### Task 8: Credential Rotation

**Manual steps (no code):**
1. Delete test user `claudio@bekaa.eu` from Neon DB via SQL
2. Rotate Neon PostgreSQL password
3. Update `DATABASE_URL` secret in Cloudflare Worker: `npx wrangler secret put DATABASE_URL --env production`
4. Verify production health: `curl https://aegis-api.bekaa.eu/api/v1/health`

---

### Task 9: Deploy All Changes to Production

**Step 1: Build frontend**

Run: `cd apps/web && pnpm build`

**Step 2: Deploy frontend**

Run: `npx wrangler pages deploy apps/web/dist --project-name aegis-web --branch production --commit-dirty=true`

**Step 3: Deploy API gateway (if routes changed)**

Run: `npx wrangler deploy --env production` from `apps/api-gateway/`

**Step 4: Verify end-to-end**

1. Open `https://apiaegis.bekaa.eu`
2. Login with Google
3. Navigate to Dashboard → SCF Catalog → Admin pages
4. Confirm all API calls resolve correctly

**Step 5: Commit and push**

```bash
git push origin main
```

---

## Phase E: Documentation

---

### Task 10: Update Walkthrough

**Files:**
- Create/Update: `docs/architecture/production-deployment.md`

Document:
- Custom domains: `apiaegis.bekaa.eu` (frontend), `aegis-api.bekaa.eu` (API)
- Cloudflare Projects: `aegis-web` (Pages), `aegis-api-standard-api-gateway` (Worker)
- Secrets required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Deploy commands
- Environment separation (dev vs production in wrangler.toml)

**Step 1: Write the doc.**
**Step 2: Commit.**

---

## Summary

| Phase | Tasks | Effort |
|---|---|---|
| **A — SCF Browser** | 1 task (new page + route + sidebar) | ~15 min |
| **B — Admin Polish** | 5 tasks (one per admin page) | ~20 min |
| **C — SCF Import UI** | 1 task (admin import page) | ~15 min |
| **D — Hardening** | 2 tasks (credentials + deploy) | ~10 min |
| **E — Documentation** | 1 task (production deployment doc) | ~10 min |
| **Total** | **10 tasks** | **~70 min** |

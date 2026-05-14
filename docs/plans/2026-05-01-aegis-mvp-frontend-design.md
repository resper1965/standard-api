# Standard MVP — Corporate Dashboard Design

> **Status**: `[CONCLUÍDO]` Design implementado. Tokens e layout em uso na web app.

> **Validated:** 2026-05-01 via brainstorming

## Overview

Dashboard corporativo dark-mode para o Standard com duas áreas baseadas em role:
- **Usuário** — Dashboard, Assessments, Documents, Gap Analysis, Reports
- **Super-Admin (@bekaa.eu)** — Tudo acima + Tenant Management, License Keys, User Admin, Audit Logs, System Health

## Design Tokens

| Token | Valor |
|---|---|
| `--bg` | `#0F172A` |
| `--surface` | `#1E293B` |
| `--accent` | `#3B82F6` |
| `--admin` | `#8B5CF6` |
| `--success` | `#10B981` |
| `--warning` | `#F59E0B` |
| `--danger` | `#EF4444` |
| `--text` | `#F8FAFC` |
| `--text-muted` | `#94A3B8` |
| `--font` | Inter |

## Navigation by Role

```
Login → Google OAuth or Email/Password
  ├── role=admin → Full sidebar (user + admin sections)
  └── role=user  → User sidebar only
```

## Pages

### Shared (user + admin)
1. `/login` — Google OAuth + email/password
2. `/dashboard` — KPIs, recent assessments, quick actions
3. `/assessments` — CRUD, lifecycle state badges
4. `/assessments/:id` — Detail view with timeline
5. `/documents` — Upload, list, status pipeline
6. `/gap-analysis` — Gaps by control/framework
7. `/reports` — Generate, download
8. `/settings/profile` — Name, avatar, password

### Admin-only (role=admin)
9. `/admin/tenants` — Create, manage organizations
10. `/admin/users` — List, ban, unban, impersonate, roles
11. `/admin/license-keys` — Generate, revoke, plan tiers
12. `/admin/audit` — Full event log
13. `/admin/system` — Workers health, queue depth, DB status

## Tech Stack
- Vite + React 19 + TypeScript
- Vanilla CSS (design tokens)
- Better Auth client SDK
- Deployed on Cloudflare Pages


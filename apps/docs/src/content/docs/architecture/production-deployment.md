---
title: "Standard Production Deployment Guide"
---

# Standard Production Deployment Guide

> **Last updated:** 2026-05-02

## Infrastructure Overview

| Component | Platform | URL |
|---|---|---|
| Frontend (SPA) | Cloudflare Pages | `https://apistandard.bekaa.eu` |
| API Gateway | Cloudflare Worker | `https://standard-api.bekaa.eu` |
| Database | Neon PostgreSQL | Managed external |
| Auth | Standard Native Auth (SSO via Google) | Embedded in Worker |

---

## Cloudflare Projects

### Frontend — `standard-web`

- **Type:** Cloudflare Pages
- **Build output:** `apps/web/dist`
- **Custom domain:** `apistandard.bekaa.eu`
- **Framework:** React 19 + Vite (SPA)

### API Gateway — `standard-api-standard-api-gateway-production`

- **Type:** Cloudflare Worker
- **Config file:** `apps/api-gateway/wrangler.toml` → `[env.production]`
- **Custom domain:** `standard-api.bekaa.eu`
- **Bindings:** Queues (ingestion, KB embedding, report export), R2 buckets (documents, reports, exports), KV cache

---

## Required Secrets

Set via `npx wrangler secret put <NAME> --env production`:

| Secret | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string (pooled) |
| `BETTER_AUTH_SECRET` | JWT signing secret for Standard Native Auth sessions |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |

---

## Environment Variables

Set in `wrangler.toml` under `[env.production.vars]`:

| Variable | Value |
|---|---|
| `STANDARD_ENV` | `production` |
| `BETTER_AUTH_URL` | `https://standard-api.bekaa.eu` |
| `LOG_LEVEL` | `info` |
| `AI_GATEWAY_NAME` | `standard-prod` |

---

## Deploy Commands

### Frontend

```bash
# 1. Build
cd apps/web && pnpm build

# 2. Deploy to Cloudflare Pages
npx wrangler pages deploy apps/web/dist \
  --project-name standard-web \
  --branch production \
  --commit-dirty=true
```

### API Gateway

```bash
# Deploy to production Worker
npx wrangler deploy \
  --config apps/api-gateway/wrangler.toml \
  --env production
```

### Database Migrations

```bash
# Generate migrations from Drizzle schemas
pnpm db:generate

# Apply migrations
pnpm db:migrate
```

---

## Verification Checklist

1. **API Health:** `curl https://standard-api.bekaa.eu/health`
   - Expected: `{"ok":true,"service":"standard-api-standard","database":"connected"}`

2. **Frontend:** Open `https://apistandard.bekaa.eu`
   - Expected: Login page renders with Google SSO button

3. **Auth Flow:** Sign in with Google
   - Expected: Redirect to dashboard with session

4. **SCF Catalog:** Navigate to `/scf`
   - Expected: Controls and frameworks from synthetic fixture

5. **Admin Panel:** Navigate to `/admin/*`
   - Expected: Organizations, Users, Audit, Licenses, System Health pages

---

## Environment Separation

| Aspect | Development | Production |
|---|---|---|
| Worker name | `standard-api-standard-api-gateway` | `standard-api-standard-api-gateway-production` |
| Auth mode | MockAuthProvider (legacy headers) | Standard Native Auth (sessions + RBAC) |
| Database | Neon dev branch | Neon production branch |
| `STANDARD_ENV` | `development` | `production` |
| Custom domain | — | `standard-api.bekaa.eu` |

---

## Troubleshooting

### Google OAuth not working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set as Worker secrets
- Check redirect URI in Google Console includes `https://standard-api.bekaa.eu/api/auth/callback/google`

### Database connection failed
- Check `DATABASE_URL` secret has the pooled connection string
- Verify Neon project is active and not suspended

### CORS errors
- API gateway handles CORS via `withCors()` wrapper
- Allowed origin: `https://apistandard.bekaa.eu`


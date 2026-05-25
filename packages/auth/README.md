# @standard/auth

Status: stable | Layer: infrastructure | Runtime: Cloudflare Workers

## Overview

Better Auth server adapter for the Standard platform. Provides email/password
authentication, organization-based multi-tenancy, RBAC/ABAC permission helpers,
and API key management. The server instance is created once at Worker startup
and reused across requests.

## Install

```bash
pnpm add @standard/auth
```

## Usage

```ts
import { createAuth } from "@standard/auth";
import { db } from "./db"; // Drizzle client

const auth = createAuth(
  {
    DATABASE_URL: env.DATABASE_URL,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL,
  },
  db
);

// Handle auth routes inside a Worker
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
```

## Plugins

| Plugin | Purpose |
|--------|---------|
| `organization` | Maps Better Auth orgs to Standard tenants/organizations |
| `admin` | Platform-level admin flag (`platform_admin`); set only via SQL, never via API |

## Drizzle Adapter

Uses `better-auth/adapters/drizzle` with the `pg` provider. Schema tables are
imported from `@standard/schemas`:

`baUser`, `baSession`, `baAccount`, `baVerification`, `baOrganization`,
`baMember`, `baInvitation`, `baApikey`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | 32+ char random secret for session signing |
| `BETTER_AUTH_URL` | No | Public base URL of the auth server |

## API

| Export | Purpose |
|--------|---------|
| `createAuth(env, db)` | Factory — returns a `StandardAuth` instance |
| `StandardAuth` | Type of the Better Auth server instance |
| `AuthEnv` | Environment variables shape |
| `STANDARD_PERMISSIONS` | Full permission registry |
| `STANDARD_ROLE_PERMISSIONS` | Default permissions per role |
| `roleHasPermission(role, resource, action)` | RBAC check helper |

## Rules

- `BETTER_AUTH_SECRET` must never appear in git or logs.
- `platform_admin` is not settable via public API; use SQL seed only.
- Do not expose raw session cookies; `useSecureCookies` is always `true`.
- ADR-AUTH-001: do not add `fieldName` to camelCase multi-word org fields.

# API-First Auth Simplification Design

## Overview
The platform has pivoted to a strict B2B, API-first architecture ("SaaS-ready via Cloudflare"). The initial authentication and authorization model using BetterAuth included the `organization` plugin, which brought complex mechanics like `members`, `invitations`, and granular `roles` (admin, member, owner). 

This design document outlines the removal of this complexity. The new architecture enforces a strict 1:1 relationship where the authenticated entity (the "User") *is* the Organization/Tenant.

## Core Decisions
1. **Remove BetterAuth Organization Plugin**: We will no longer maintain `member` or `organization` tables inside the BetterAuth schema.
2. **User = Tenant**: A single `User` account maps 1:1 to a `Tenant` in our standard domain (`organizations` table).
3. **Dashboard Simplification**: The web dashboard is purely a utility for the developer/client to generate API Keys. It does not contain team management, member invites, or role delegation.
4. **Hard Boundary (Stateless API)**: The core GRC API (`/api/v1/*`) relies *exclusively* on API Keys. Session cookies (BetterAuth) are only used by the dashboard for the `/api/internal/*` or isolated auth routes to manage those keys.

## Architecture & Data Flow

### 1. Provisioning (Superadmin Flow)
- Orgs are not self-service.
- A platform Superadmin provisions a `User` account for the client.
- A corresponding domain `Organization` (Tenant) is created and linked to that `User.id`.

### 2. Client Dashboard Access
- The client logs in with their single set of credentials.
- The UI fetches their associated Tenant ID based on their `User.id`.
- The client generates API Keys bound to their Tenant.

### 3. API Execution
- External systems call the API using `Authorization: Bearer sk_prod_...`
- The Gateway validates the API Key, resolves the Tenant ID, and injects it into the request context.
- The Assessment Engine operates completely stateless, isolated by Tenant ID.

## Verification & Rollout
- Update `@standard/auth` to remove the organization plugin.
- Drop/migrate `member` and BA `organization` tables.
- Refactor the UI to remove team management views.
- Update `tenant-mapping.ts` to map from `User.id` directly to `organizations.id` instead of checking member roles.

# @standard/schemas

Status: stable | Layer: contracts | Runtime: universal

## Overview

The shared contract layer for the entire Standard monorepo. All Zod schemas,
TypeScript types, Drizzle table definitions, and API response shapes live here.
Every package and application imports types from `@standard/schemas`; no package
defines its own duplicate contracts.

## Install

```bash
pnpm add @standard/schemas
```

## Schema Categories

| Module | Contents |
|--------|---------|
| `./assessments` | Assessment CRUD and lifecycle schemas |
| `./lifecycle` | State machine types and transition payloads |
| `./approvals` | Approval gate request/response shapes |
| `./artifacts` | Versioned artifact records |
| `./scf` | SCF control, domain, framework, and mapping schemas |
| `./gap-analysis` | Evidence findings, gap versions, gap findings |
| `./maturity` | Maturity level assessments |
| `./poam` | Plan of Action & Milestones schemas |
| `./soa` | Statement of Applicability items and versions |
| `./kb` | Knowledge Base chunk and search result types |
| `./agent-runtime` | Agent run records, prompts, structured outputs |
| `./observability` | Audit events, security events, metrics, usage |
| `./security` | Security event and alert schemas |
| `./tenants` | Tenant registration and settings |
| `./organizations` | Organization profiles |
| `./documents` | Document upload and ingestion metadata |
| `./reporting` | Report generation request/response |
| `./webhooks` | Outbound webhook payload shapes |
| `./db/schema` | Drizzle ORM table definitions (PostgreSQL) |
| `./db/auth-schema` | Better Auth table definitions |

## Rules

- Every schema change that affects persisted data requires a Drizzle migration.
- Schemas must not be coupled to frontend components, routes, or UI state.
- All API responses for critical operations must include `trace_id`.
- Breaking schema changes must bump the version prefix (`v2-schemas`, etc.).
- Do not add raw data or credentials to schema default values.

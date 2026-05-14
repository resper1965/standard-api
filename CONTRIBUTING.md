# Contributing to Standard API

Thank you for your interest in contributing to Standard API. This document provides guidelines and processes for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Architecture Guidelines](#architecture-guidelines)
- [Testing Requirements](#testing-requirements)

## Code of Conduct

This project adheres to the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 9.0
- **Docker** (for local PostgreSQL)

### Setup

```bash
git clone https://github.com/resper1965/agentic-aegis.git
cd agentic-aegis
pnpm install
cp .env.example .env   # configure local env
docker compose -f infra/docker/docker-compose.yml up -d
pnpm dev:api
```

## Development Workflow

### Branch Strategy

| Branch    | Purpose                    | Protection       |
| --------- | -------------------------- | ---------------- |
| `main`    | Production-ready code      | Required reviews |
| `staging` | Pre-production validation  | CI must pass     |
| `feat/*`  | Feature development        | —                |
| `fix/*`   | Bug fixes                  | —                |
| `chore/*` | Maintenance / refactoring  | —                |

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add SOA evidence refresh endpoint
fix: persist file to storage before enqueue
chore: clean up unused imports
docs: update API architecture diagram
test: add contract tests for gap analysis
refactor: extract pagination utility
```

### Before Committing

```bash
pnpm lint          # Code style
pnpm typecheck     # Type safety
pnpm test:unit     # Unit tests
pnpm test:contracts # API contract tests
```

## Pull Request Process

1. **Create a branch** from `main` with a descriptive name
2. **Make your changes** following the architecture guidelines below
3. **Run all validations** locally before pushing
4. **Open a PR** using the [PR template](.github/pull_request_template.md)
5. **Address review feedback** promptly
6. **Squash merge** into `main` once approved

### PR Requirements

- [ ] All CI checks pass (lint, typecheck, tests, build)
- [ ] No secrets, tokens, credentials, or customer data
- [ ] `CONTEXT.md` updated if architectural changes were made
- [ ] ADR created for significant decisions
- [ ] Tenant isolation and approval gates impact considered

## Architecture Guidelines

### Package Boundaries

```
packages/    → Domain logic, schemas, pure functions (no framework deps)
apps/        → Entry points (API gateway, web frontend)
workers/     → Cloudflare Workers (queues, workflows, ingestion)
infra/       → Infrastructure as code, Docker, Terraform
```

### Key Principles

- **API-first**: All features are exposed via versioned REST endpoints (`/api/v1/...`)
- **Tenant isolation**: Every query MUST be scoped by `tenant_id`
- **Schema validation**: All API boundaries use Zod schemas from `@standard/schemas`
- **Human-in-the-loop**: Agents NEVER approve final artifacts or create official mappings
- **Immutability**: Approved artifacts are immutable — create new versions instead
- **Observability**: All operations emit structured audit events with `trace_id`

### Data Rules

- Use only synthetic fixtures and golden outputs in `evals/`
- Never version real data, customer documents, tokens, or credentials
- KB is source of candidate evidence; structured SCF remains authoritative

## Testing Requirements

| Test Suite       | Command                  | When to Run      |
| ---------------- | ------------------------ | ---------------- |
| Unit tests       | `pnpm test:unit`         | Every commit     |
| Contract tests   | `pnpm test:contracts`    | Every commit     |
| Security tests   | `pnpm test:security`     | Every commit     |
| Regression tests | `pnpm test:regression`   | Before merge     |
| Agent evals      | `pnpm test:evaluations`  | Before merge     |
| Synthetic E2E    | `pnpm test:synthetic-e2e`| Before release   |
| Full CI          | `pnpm test:ci`           | Release candidate|

## Questions?

Open a [GitHub Discussion](https://github.com/resper1965/agentic-aegis/discussions) or contact the maintainers.

# Project context: Standard API

## Current State
- **Phase:** Active Development / SaaS API Readiness.
- **Base Architecture:** Cloudflare-native monorepo with Neon PostgreSQL.
- **Key Modules:**
    - `api-gateway`: Stabilized v1 interface. Route setup extracted to `app-helpers.ts`; dependency bootstrap extracted to `index-helpers.ts`.
    - `apps/web`: API Platform Console for managing orgs, users, and API keys. Admin pages decomposed into `pages/admin/components/`.
    - `assessment-workflow`: Implemented durable states.
    - `ingestion-worker`: RAG pipeline with R2 + Vectorize + Neon Data API.
    - `scf-core`: Normative SCF catalog integrated.
    - `assessment-engine`: State machine with declarative prerequisite lookup table.
    - `agent-runtime`: Council uses dispatch map pattern for agent routing.
    - `gap-analysis`: Declarative validation rules in `gap-validation.service.ts`.
    - `poam`: Declarative validation rules and action-type mapping in services.
- **Codebase Health (Fallow, 2026-06-05):** Maintainability 91.0, avg cyclomatic complexity 2.2, 38 refactoring targets remaining.

## Active Work
- Lifecycle transitions implementation.
- Agent Council orchestration refinements.
- Reporting engine (PDF/DOCX) via Worker/R2.
- Ongoing reduction of remaining 38 Fallow refactoring targets.

## Important Links
- **API Spec:** [openapi.yaml](docs/api/openapi.yaml)
- **Reversa Report:** [.reversa/REVERSA.md](.reversa/REVERSA.md)
- **Rules:** [AGENTS.md](AGENTS.md)

## Recent Decisions
- Use Cloudflare Workflows for both long-running Assessment Lifecycle and fast Agent Council loops.
- Adopt Neon for DB Branching to enable high-fidelity preview environments.
- Enforce strict tenancy isolation at the API Gateway level.
- Standard Native Auth v1.6.11 as authentication provider (ADR 0005).
- `apps/web` defined as API Platform Console, not GRC dashboard.
- Refactoring sprint 2026-06-05: declarative patterns, helper extraction, component decomposition (ADR refactoring-sprint-2026-06-05).

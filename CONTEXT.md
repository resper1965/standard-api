# Project context: Standard API

## Current State
- **Phase:** Active Development / SaaS Readiness.
- **Base Architecture:** Cloudflare-native monorepo with Neon PostgreSQL.
- **Key Modules:**
    - `api-gateway`: Stabilized v1 interface.
    - `assessment-workflow`: Implemented durable states.
    - `ingestion-worker`: RAG pipeline with R2 + Vectorize + Neon Data API.
    - `scf-core`: Normative SCF catalog integrated.
    - `assessment-engine`: State machine for transitions and approval gates.

## Active Work
- Lifecycle transitions implementation.
- Agent Council orchestration refinements.
- Reporting engine (PDF/DOCX) via Worker/R2.

## Important Links
- **API Spec:** [openapi.yaml](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/docs/api/openapi.yaml)
- **Reversa Report:** [.reversa/REVERSA.md](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/.reversa/REVERSA.md)
- **Rules:** [AGENTS.md](file:///c:/Users/resper/OneDrive/%C3%81rea%20de%20Trabalho/aegis-api/AGENTS.md)

## Recent Decisions
- Use Cloudflare Workflows for both long-running Assessment Lifecycle and fast Agent Council loops.
- Adopt Neon for DB Branching to enable high-fidelity preview environments.
- Enforce strict tenancy isolation at the API Gateway level.

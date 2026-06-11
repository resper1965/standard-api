> [!WARNING]
> **[ARCHIVED/LEGACY PLAN]** Este é um plano de execução legado e histórico de fases anteriores do desenvolvimento da plataforma. Ele pode não refletir a arquitetura atenuada atual.

# Design Document: GRC API Boundaries & Source of Truth Versioning

**Date:** 2026-05-07
**Context:** Brainstorming session over the next steps for the `standard-api-standard` monorepo.

## 1. Context & Goal
The project has successfully established the foundational B2B SaaS architecture (M2M endpoints, API Keys, RBAC, Tenancy integration). During strategic alignment, it became necessary to map out where the logical boundaries of the application reside to avoid feature creep within the API Gateway repository.

## 2. Decided Architectural Boundaries

It was explicitly decided that `standard-api-standard` maintains its identity as a pure API/SaaS engine. The following responsibilities **do not belong** in this repository and are delegated to the consuming client applications ("Client-Side B2C/B2B Applications"):

- **Agentic Interactive Model (UI):** Chat interfaces, drafting visualizations.
- **Human-in-the-Loop (HITL) Portals:** The interactive views where a user manually overrides or approves an AI-generated gap/SoA.
- **Evidence Ingestion (UI Uploaders):** PDF parsers, drag-and-drop interfaces for unstructured evidence grouping.

This repository acts strictly as the **Source of Truth** and the **Assessment Processing Engine** (via API queueing). External applications send raw text, and this API responds computationally.

## 3. Future Roadmap: Data-as-Code SCF Versioning

As the absolute Source of Truth, the API must handle the lifecycle updates of the Secure Controls Framework (SCF). 
**Decision:** We will adopt a **Data-as-Code** (CLI/Migration-driven) approach rather than building heavy Admin UI for uploading spreadsheets.

### Implementation Strategy (Deferred to Next Version)
- **What:** A CLI ingestion pipeline (`packages/scf-core/...`) capable of parsing official SCF format releases.
- **How:** The engineering team will programmatically commit the new datasets to the repo. Migration scripts will generate diffs and create structured mapping inserts in the PostgreSQL database tagged with the new `scf_version`.
- **Why:** This ensures pristine auditability via Git Pull Requests. The normative data defining global compliance architectures remains deeply isolated from user interfaces and HTTP edge-case failures.

## 4. Next Steps
- This feature is marked as a **Must-Have** but explicitly deferred to the next release version.
- The platform remains focused on solidifying the B2B text-analysis APIs already scoped in the current plan.

# @standard/gap-analysis

Status: stable | Layer: domain | Runtime: Cloudflare Workers + PostgreSQL

## Overview

The Gap Analysis engine for the Standard SCF-Based Assessment. Orchestrates
evidence collection from the Knowledge Base, evidence classification per SoA
item, gap finding generation, versioned drafts, review cycles, and the mandatory
human approval gate before any findings are persisted as final.

## Install

```bash
pnpm add @standard/gap-analysis
```

## Usage

```ts
import { createGapAnalysisDependencies, GapAnalysisExecutionService } from "@standard/gap-analysis";

const deps: GapAnalysisDependencies = {
  repositories: {
    evidenceFindings: drizzleEvidenceFindingRepo,
    evidenceSources: drizzleEvidenceSourceRepo,
    gapVersions: drizzleGapVersionRepo,
    gapFindings: drizzleGapFindingRepo,
  },
  soa: soaDeps,
  kb: kbDeps,
  scf: scfServices,
};

const svc = new GapAnalysisExecutionService(deps);
const draft = await svc.execute({ tenantId, organizationId, assessmentId, traceId });
```

## API

| Export | Purpose |
|--------|---------|
| `GapAnalysisExecutionService` | Full pipeline: KB → classify → draft → persist |
| `EvidenceAnalysisService` | Evidence retrieval and aggregation |
| `EvidenceClassificationService` | LLM-backed strength/status classification |
| `GapDraftService` | Create versioned gap analysis draft |
| `GapReviewService` | Submit draft for human review |
| `GapApprovalService` | Record approval/rejection decision |
| `GapValidationService` | Schema validation before persistence |
| `GapAnalysisDependencies` | Dependency injection container type |
| `GapAnalysisRepositories` | `evidenceFindings`, `evidenceSources`, `gapVersions`, `gapFindings` |
| `createDrizzleGapAnalysisRepository` | PostgreSQL repository factory |

## Approval Gate

Gap Analysis findings are **never** persisted as final without a human approval
event. The lifecycle states enforced are:

`gap_analysis_drafted` → `gap_analysis_under_review` → `gap_analysis_approved`

Rejection returns to `gap_analysis_drafted` with a new version.

## Rules

- Every operation requires `GapAnalysisContext` (`tenantId`, `organizationId`, `assessmentId`, `traceId`).
- Evidence absence must be recorded as `not_evidenced`; never inferred as non-implementation.
- LLM outputs are schema-validated before any write to the repository.
- Gap findings from agents cannot be written as final without the approval gate.
- SoA must be `soa_approved` before gap analysis can start.

## Dependencies

| Package | Role |
|---------|------|
| `@standard/schemas` | Shared contracts and Zod validators |
| `@standard/scf-core` | SCF control lookup for finding context |
| `@standard/soa` | SoA items as the unit of analysis |
| `@standard/kb` | Evidence retrieval via semantic search |

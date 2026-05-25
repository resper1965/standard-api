# @standard/assessment-engine

Status: stable | Layer: core | Runtime: Cloudflare Workers + PostgreSQL

## Overview

The Assessment Engine is the normative lifecycle orchestrator for the Standard
SCF-Based Assessment. It owns state transitions, approval gates, artifact
versioning, and audit event emission. No lifecycle-critical logic may live
outside this package.

The engine enforces the 27-state machine (`draft` → `closed`) and requires a
`TransitionContext` carrying `tenantId`, `organizationId`, `assessmentId`, and
`traceId` for every operation.

## Install

```bash
pnpm add @standard/assessment-engine
```

## Usage

```ts
import { transitionAssessment, VALID_TRANSITIONS } from "@standard/assessment-engine";

const result = await transitionAssessment(snapshot, {
  tenantId: "t_123",
  organizationId: "org_456",
  assessmentId: "asmt_789",
  actorId: "user_abc",
  reason: "SoA approved by reviewer",
  traceId: crypto.randomUUID(),
  occurredAt: new Date().toISOString(),
  approvalEvent: {
    id: "appr_001",
    gate: "soa",
    decision: "approved",
    approvedBy: "user_abc",
    approvedAt: new Date().toISOString(),
    traceId: "trace_xyz",
  },
});

console.log(result.assessment.state); // "soa_approved"
```

## API

| Export | Purpose |
|--------|---------|
| `transitionAssessment` | Execute a validated state transition |
| `VALID_TRANSITIONS` | Allowed `from → to` pairs |
| `AssessmentState` | Union type of all 27 lifecycle states |
| `ApprovalGate` | `soa \| gap_analysis \| maturity_assessment \| poam \| report` |
| `ArtifactVersion` | Immutable versioned artifact record |
| `TransitionContext` | Required context for every state change |
| `AssessmentSnapshot` | Read model of assessment progress flags |

## Rules

- All transitions require `tenantId`, `organizationId`, `assessmentId`, `traceId`.
- Approval gates (SoA, Gap Analysis, Maturity, POA&M) cannot be bypassed.
- Approved artifacts are immutable; corrections create a new version.
- Frontend must never mutate state directly; only Workflows call the engine.
- Every transition is recorded in `AuditLogRepository` and `LifecycleEventRepository`.

## Dependencies

| Package | Role |
|---------|------|
| `@standard/schemas` | Shared Zod schemas and TypeScript contracts |

# ADR-014 — SCR-RMM ROC Summary Aggregation Logic

**Date:** 2026-06-09  
**Status:** Accepted  
**Deciders:** Platform Architect  
**Linked Plan:** `docs/plans/2026-06-09-scr-rmm-integration.md`

---

## Context

The SCR-RMM (Secure, Compliant & Resilient Risk Management Model) requires a formal **Report on Conformity (ROC)** that aggregates individual gap finding determinations into an overall assessment-level conformity score.

Two design decisions required explicit architectural choices:

1. **How is overall conformity determined from individual findings?**
2. **Is the ROC Summary a live query or a versioned, immutable artefact?**

---

## Decision 1 — ROC Determination Derivation

`roc_determination` on each `gap_finding` is derived **deterministically** from `severity + assessment_status + is_mcr_gap` at write time. It is **never set directly by an LLM output**.

The derivation function `deriveRocDetermination()` in `packages/schemas/src/roc-derivation.ts` is:
- Pure (no I/O, no side effects)
- Unit tested
- Schema-validated (Zod enum)
- Immutable once the parent `gap_analysis_version` is approved

This satisfies AGENTS.md §10: _"Agente LLM não pode gravar achados finais diretamente."_

---

## Decision 2 — Worst-Wins Aggregation Rule

The **overall_conformity** in the ROC Summary uses the "worst wins" rule:

```
any material_weakness      → overall_conformity = material_weakness
any significant_deficiency → overall_conformity = significant_deficiency
all conforms               → overall_conformity = conforms
all strictly_conforms      → overall_conformity = strictly_conforms
```

**Rationale:** Audit standards (ISO 27001, FedRAMP, SOC 2) treat overall conformity as bounded by the worst control failure. A single critical gap invalidates an otherwise-clean assessment. This aligns with how ROC is interpreted in SSAE 18 and PCI DSS assessment reporting.

---

## Decision 3 — MCR Blocker Flag

MCR gaps (Minimum Compliance Requirements, `is_mcr_gap = true`) with `material_weakness` are flagged separately as `has_mcr_blocker = true`.

**Consequences:**
- `has_mcr_blocker = true` will eventually be wired into the assessment state engine to prevent transition to `closed`
- MCR blockers are compliance blockers regardless of risk score
- Organizations must remediate MCR material weaknesses before an assessment can be formally closed

---

## Decision 4 — Live Query vs Versioned Artefact

**Current decision: Live query.**

The `GET /api/v1/assessments/:id/roc-summary` endpoint is a live aggregation over the current state of gap findings.

**Rationale:** In early lifecycle, the ROC Summary is used for dashboards, agent feedback, and ongoing review. Creating an immutable version prematurely would require a full versioning lifecycle (approval, storage, retrieval) before the ROC concept is fully operational.

**Future:** If the platform needs to formally **issue** ROC documents (e.g., as deliverables to clients or auditors), wrap the summary in a versioned `roc_reports` table following the same pattern as `gap_analysis_versions`, `maturity_assessment_versions`, etc.

---

## Decision 5 — Gap Analysis Version Preference

The ROC Summary reads from the **approved** gap analysis version when available. If no approved version exists, the most recent **draft** is used.

This prevents the ROC Summary from being empty during active assessment work while ensuring that any formally issued summary reflects approved findings.

---

## Consequences

| Consequence | Impact |
|---|---|
| Deterministic `roc_determination` derivation | No LLM drift in conformity labels — fully auditable |
| Worst-wins aggregation | Conservative — any critical gap surfaces immediately |
| MCR blocker flag | Enables workflow enforcement in state machine |
| Live query | Fast to implement; no versioning overhead yet |
| Preference for approved version | ROC Summary reflects approved state when possible |

---

## Supersedes / Related ADRs

- ADR-004: SCF as normative data source — informs why normative determinations must be derived, not inferred
- ADR-011: HITL Fully Headless — confirms that approval gates must not be bypassed by agents

---

_Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)_

/**
 * Comprehensive tests for the CompletenessAnalyzer.
 *
 * Covers all 6 evolution phases:
 * F1: field presence
 * F2: cross-entity coherence (relations)
 * F3: evidence + field reviews
 * F4: screenings
 * F5: SCF controls
 * F6: AI suggestions
 */
import {
  createCompletenessAnalyzer,
  requireField,
  requireRelation,
  requireCoherence,
  requireConditionalField,
  requireRelationItemValid,
  requireEvidenceForCriticalFields,
  requireEvidenceForArtifact,
  requireFieldReviewsResolved,
  requireHumanApprovalForCriticalFields,
  requireScreeningsComplete,
  requireScfControlsReviewed,
  requireScfApplicabilityDraft,
  requireAiSuggestionsResolved,
  requireAiContradictionsResolved,
  customRule,
} from "../src/completeness";
import type { CompletenessInput } from "../src/completeness";

// ─── Test entity type ───────────────────────────────────────────────

type TestActivity = {
  id: string;
  name: string | null;
  purpose: string | null;
  description: string | null;
  legal_basis_lgpd: string | null;
  dpia_required: boolean | null;
  lia_required: boolean | null;
  third_party_sharing: boolean;
  international_transfer: boolean;
  retention_period: string | null;
  risk_level: string | null;
  security_measures_summary: string | null;
  status: string;
};

type TestThirdParty = {
  third_party_name: string;
  role: string;
  dpa_status: string;
  international_transfer: boolean;
  country: string | null;
};

// ─── Helpers ────────────────────────────────────────────────────────

const emptyInput = (overrides?: Partial<TestActivity>): CompletenessInput<TestActivity> => ({
  entity: {
    id: "test-1",
    name: null,
    purpose: null,
    description: null,
    legal_basis_lgpd: null,
    dpia_required: null,
    lia_required: null,
    third_party_sharing: false,
    international_transfer: false,
    retention_period: null,
    risk_level: null,
    security_measures_summary: null,
    status: "draft",
    ...overrides,
  },
  relations: {},
  evidence: [],
  field_reviews: [],
  screenings: [],
  scf_controls: [],
  ai_suggestions: [],
});

const filledInput = (overrides?: Partial<CompletenessInput<TestActivity>>): CompletenessInput<TestActivity> => ({
  entity: {
    id: "test-1",
    name: "Test Activity",
    purpose: "Marketing analytics",
    description: "Analyze user behavior for marketing",
    legal_basis_lgpd: "legitimate_interest",
    dpia_required: false,
    lia_required: true,
    third_party_sharing: true,
    international_transfer: false,
    retention_period: "2 years",
    risk_level: "medium",
    security_measures_summary: "Encryption at rest and in transit",
    status: "draft",
  },
  relations: {
    data_subjects: [{ id: "ds-1", category: "customers" }],
    data_categories: [{ id: "dc-1", category: "email" }],
    systems: [{ id: "sys-1", system_name: "CRM" }],
    third_parties: [{ third_party_name: "Analytics Co", role: "processor", dpa_status: "active", international_transfer: false, country: "BR" }],
    lifecycle_stages: [{ id: "ls-1", stage: "collection" }],
  },
  evidence: [],
  field_reviews: [],
  screenings: [],
  scf_controls: [],
  ai_suggestions: [],
  ...overrides,
});

// ─── Test suites ────────────────────────────────────────────────────

export const runCompletenessTests = async (
  assert: (name: string, condition: boolean, detail?: string) => void
) => {
  console.log("\n📋 CompletenessAnalyzer Tests\n");

  // ── F1: Field presence ──────────────────────────────────────────

  console.log("  F1: Field Presence");

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: ["name", "purpose"],
      recommended_fields: ["description"],
      critical_fields: ["legal_basis_lgpd"],
      rules: [],
    });

    const result = analyzer.analyze(emptyInput());
    assert("empty entity has missing required fields",
      result.missing_required_fields.includes("name") &&
      result.missing_required_fields.includes("purpose")
    );
    assert("empty entity has missing recommended fields",
      result.missing_recommended_fields.includes("description")
    );
    assert("empty entity cannot be submitted",
      result.can_be_submitted_for_review === false
    );
    assert("completeness score is low for empty entity",
      result.completeness_score < 50
    );
  }

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: ["name", "purpose"],
      recommended_fields: [],
      critical_fields: [],
      rules: [],
    });

    const result = analyzer.analyze(emptyInput({ name: "Test", purpose: "Testing" }));
    assert("filled required fields are not missing",
      result.missing_required_fields.length === 0
    );
    assert("filled entity can be submitted",
      result.can_be_submitted_for_review === true
    );
    assert("score increases with filled fields",
      result.completeness_score > 50
    );
  }

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: [],
      rules: [requireField("retention_period", { severity: "high", message: "Retention period is required." })],
    });

    const result = analyzer.analyze(emptyInput());
    assert("requireField rule emits issue for missing field",
      result.blocking_issues.some((i) => i.code === "MISSING_RETENTION_PERIOD")
    );
  }

  // ── F2: Relations ─────────────────────────────────────────────

  console.log("  F2: Relations & Coherence");

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: ["name"],
      recommended_fields: [],
      critical_fields: [],
      rules: [
        requireRelation("data_subjects", { minCount: 1, severity: "high" }),
        requireRelation("lifecycle_stages"),
      ],
    });

    const result = analyzer.analyze(emptyInput({ name: "Test" }));
    assert("missing relation emits blocking issue",
      result.blocking_issues.some((i) => i.code === "MISSING_DATA_SUBJECTS")
    );
    assert("missing lifecycle_stages emits blocking issue",
      result.blocking_issues.some((i) => i.code === "MISSING_LIFECYCLE_STAGES")
    );
  }

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: ["name"],
      recommended_fields: [],
      critical_fields: [],
      rules: [
        requireCoherence<TestActivity>({
          condition: (e) => e.third_party_sharing === true,
          relation: "third_parties",
          code: "SHARING_WITHOUT_THIRD_PARTIES",
          message: "third_party_sharing is true but no third parties registered.",
          severity: "critical",
        }),
      ],
    });

    const noSharing = analyzer.analyze(emptyInput({ name: "Test", third_party_sharing: false }));
    assert("coherence rule skipped when condition is false",
      noSharing.blocking_issues.length === 0
    );

    const sharing = analyzer.analyze(emptyInput({ name: "Test", third_party_sharing: true }));
    assert("coherence rule fires when condition is true and relation empty",
      sharing.blocking_issues.some((i) => i.code === "SHARING_WITHOUT_THIRD_PARTIES")
    );
    assert("coherence issue is critical",
      sharing.blocking_issues.find((i) => i.code === "SHARING_WITHOUT_THIRD_PARTIES")?.severity === "critical"
    );
  }

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: [],
      rules: [
        requireRelationItemValid<TestActivity, TestThirdParty>("third_parties", {
          predicate: (tp) => !(tp.role === "processor" && tp.dpa_status === "missing"),
          code: "PROCESSOR_WITHOUT_DPA",
          message: (tp) => `Third party '${tp.third_party_name}' is processor without DPA.`,
          severity: "critical",
        }),
      ],
    });

    const input = filledInput({
      relations: {
        ...filledInput().relations,
        third_parties: [
          { third_party_name: "Good Co", role: "processor", dpa_status: "active", international_transfer: false, country: "BR" },
          { third_party_name: "Bad Co", role: "processor", dpa_status: "missing", international_transfer: false, country: "US" },
        ],
      },
    });

    const result = analyzer.analyze(input);
    assert("relation item validation flags invalid item",
      result.blocking_issues.some((i) => i.code === "PROCESSOR_WITHOUT_DPA" && i.message.includes("Bad Co"))
    );
    assert("relation item validation passes valid item",
      !result.blocking_issues.some((i) => i.message.includes("Good Co"))
    );
  }

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: [],
      rules: [
        requireConditionalField<TestActivity>({
          condition: (e) => e.international_transfer === true,
          field: "retention_period",
          code: "INTL_TRANSFER_NO_RETENTION",
          message: "International transfer requires retention period.",
        }),
      ],
    });

    const noTransfer = analyzer.analyze(emptyInput({ international_transfer: false }));
    assert("conditional field skipped when condition false",
      noTransfer.blocking_issues.length === 0
    );

    const withTransfer = analyzer.analyze(emptyInput({ international_transfer: true }));
    assert("conditional field fires when condition true and field missing",
      withTransfer.blocking_issues.some((i) => i.code === "INTL_TRANSFER_NO_RETENTION")
    );
  }

  // ── F3: Evidence & Field Reviews ──────────────────────────────

  console.log("  F3: Evidence & Field Reviews");

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: ["name"],
      recommended_fields: [],
      critical_fields: ["legal_basis_lgpd"],
      rules: [
        requireEvidenceForCriticalFields(["legal_basis_lgpd"]),
      ],
    });

    const withRejected = analyzer.analyze({
      ...filledInput(),
      evidence: [
        { id: "ev-1", evidence_type: "policy", linked_field: "legal_basis_lgpd", validation_status: "rejected" },
      ],
    });
    assert("rejected evidence for critical field emits issue",
      withRejected.blocking_issues.some((i) => i.code === "EVIDENCE_REJECTED_LEGAL_BASIS_LGPD")
    );
    assert("rejected evidence appears in evidence_issues",
      withRejected.evidence_issues.some((i) => i.code === "EVIDENCE_REJECTED")
    );

    // Rejected + accepted on same field = accepted wins
    const withBoth = analyzer.analyze({
      ...filledInput(),
      evidence: [
        { id: "ev-1", evidence_type: "policy", linked_field: "legal_basis_lgpd", validation_status: "rejected" },
        { id: "ev-2", evidence_type: "contract", linked_field: "legal_basis_lgpd", validation_status: "accepted" },
      ],
    });
    assert("rejected+accepted on same field does NOT emit rejected issue",
      !withBoth.blocking_issues.some((i) => i.code === "EVIDENCE_REJECTED_LEGAL_BASIS_LGPD")
    );

    // Pending evidence only → medium issue
    const withPendingEvidence = analyzer.analyze({
      ...filledInput(),
      evidence: [
        { id: "ev-3", evidence_type: "policy", linked_field: "legal_basis_lgpd", validation_status: "not_reviewed" },
      ],
    });
    assert("pending evidence for critical field emits medium issue",
      withPendingEvidence.blocking_issues.some((i) => i.code === "EVIDENCE_PENDING_LEGAL_BASIS_LGPD" && i.severity === "medium")
    );

    // No evidence at all → no issue (F3 not active)
    const noEvidence = analyzer.analyze(filledInput());
    assert("no evidence at all returns no evidence issues",
      noEvidence.blocking_issues.filter((i) => i.category === "evidence").length === 0
    );

    // Evidence for unrelated field doesn't affect critical fields
    const unrelatedEvidence = analyzer.analyze({
      ...filledInput(),
      evidence: [
        { id: "ev-4", evidence_type: "policy", linked_field: "description", validation_status: "accepted" },
      ],
    });
    assert("unrelated evidence does not satisfy critical field",
      !unrelatedEvidence.blocking_issues.some((i) => i.code === "EVIDENCE_REJECTED_LEGAL_BASIS_LGPD")
    );
  }

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: ["legal_basis_lgpd"],
      rules: [
        requireFieldReviewsResolved(["legal_basis_lgpd", "retention_period"]),
      ],
    });

    const withPending = analyzer.analyze({
      ...filledInput(),
      field_reviews: [
        { id: "fr-1", field_name: "legal_basis_lgpd", source: "agent", confidence: "medium", review_status: "pending" },
      ],
    });
    assert("pending field review for critical field emits issue",
      withPending.blocking_issues.some((i) => i.code === "FIELD_REVIEW_PENDING_LEGAL_BASIS_LGPD")
    );
    assert("pending critical field review blocks submission",
      withPending.can_be_submitted_for_review === false
    );
    assert("pending field review appears in pending_field_reviews",
      withPending.pending_field_reviews.some((fr) => fr.field_name === "legal_basis_lgpd" && fr.is_critical)
    );
  }

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: ["legal_basis_lgpd"],
      rules: [
        requireHumanApprovalForCriticalFields(["legal_basis_lgpd"]),
      ],
    });

    const agentSuggested = analyzer.analyze({
      ...filledInput(),
      field_reviews: [
        { id: "fr-1", field_name: "legal_basis_lgpd", source: "agent", confidence: "high", review_status: "pending" },
      ],
    });
    assert("agent-suggested critical field requires human approval",
      agentSuggested.blocking_issues.some((i) => i.code.includes("NOT_HUMAN_APPROVED"))
    );

    const userSet = analyzer.analyze({
      ...filledInput(),
      field_reviews: [
        { id: "fr-1", field_name: "legal_basis_lgpd", source: "user", confidence: "high", review_status: "pending" },
      ],
    });
    assert("user-set critical field does not trigger human approval rule",
      !userSet.blocking_issues.some((i) => i.code.includes("NOT_HUMAN_APPROVED"))
    );
  }

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: [],
      rules: [
        requireEvidenceForArtifact<TestActivity>({
          condition: (e) => e.dpia_required === true,
          evidence_type: "dpia",
          code: "DPIA_REQUIRED_WITHOUT_EVIDENCE",
          message: "DPIA is required but no accepted DPIA evidence exists.",
        }),
      ],
    });

    const dpiaRequired = analyzer.analyze({
      ...filledInput({ entity: { ...filledInput().entity, dpia_required: true } }),
    });
    assert("DPIA required without evidence emits issue",
      dpiaRequired.blocking_issues.some((i) => i.code === "DPIA_REQUIRED_WITHOUT_EVIDENCE")
    );

    const dpiaWithEvidence = analyzer.analyze({
      ...filledInput({ entity: { ...filledInput().entity, dpia_required: true } }),
      evidence: [
        { id: "ev-1", evidence_type: "dpia", validation_status: "accepted" },
      ],
    });
    assert("DPIA required with accepted evidence passes",
      !dpiaWithEvidence.blocking_issues.some((i) => i.code === "DPIA_REQUIRED_WITHOUT_EVIDENCE")
    );
  }

  // ── F4: Screenings ────────────────────────────────────────────

  console.log("  F4: Screenings");

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: [],
      rules: [requireScreeningsComplete()],
    });

    const incomplete = analyzer.analyze({
      ...filledInput(),
      screenings: [
        { screening_type: "dpia", status: "incomplete", required: null },
        { screening_type: "lia", status: "required", required: true },
      ],
    });
    assert("incomplete screening emits issue",
      incomplete.blocking_issues.some((i) => i.code === "SCREENING_INCOMPLETE_DPIA")
    );
    assert("completed screening does not emit issue",
      !incomplete.blocking_issues.some((i) => i.code === "SCREENING_INCOMPLETE_LIA")
    );
    assert("incomplete screening appears in screening_issues",
      incomplete.screening_issues.some((si) => si.screening_type === "dpia" && si.blocking)
    );
    assert("incomplete screening blocks submission",
      incomplete.can_be_submitted_for_review === false
    );
  }

  // ── F5: SCF Controls ─────────────────────────────────────────

  console.log("  F5: SCF Controls");

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: [],
      rules: [
        requireScfApplicabilityDraft(),
        requireScfControlsReviewed({ minPriority: "high" }),
      ],
    });

    const noDraft = analyzer.analyze(filledInput());
    assert("no SCF draft emits issue",
      noDraft.blocking_issues.some((i) => i.code === "SCF_APPLICABILITY_NOT_EXECUTED")
    );

    const withUnreviewed = analyzer.analyze({
      ...filledInput(),
      scf_controls: [
        { id: "sc-1", control_code: "SCF-001", control_title: "Access Control", applicability_status: "applicable", validation_status: "not_reviewed", priority: "critical" },
        { id: "sc-2", control_code: "SCF-002", control_title: "Logging", applicability_status: "applicable", validation_status: "approved", priority: "high" },
        { id: "sc-3", control_code: "SCF-003", control_title: "Backup", applicability_status: "applicable", validation_status: "not_reviewed", priority: "low" },
      ],
    });
    assert("unreviewed critical SCF control emits issue",
      withUnreviewed.blocking_issues.some((i) => i.code === "SCF_CONTROL_NOT_REVIEWED" && i.affected_fields.includes("SCF-001"))
    );
    assert("reviewed SCF control does not emit issue",
      !withUnreviewed.blocking_issues.some((i) => i.affected_fields.includes("SCF-002"))
    );
    assert("low priority unreviewed SCF control does NOT emit issue",
      !withUnreviewed.blocking_issues.some((i) => i.affected_fields.includes("SCF-003"))
    );
    assert("SCF applicability draft check passes when controls exist",
      !withUnreviewed.blocking_issues.some((i) => i.code === "SCF_APPLICABILITY_NOT_EXECUTED")
    );
    assert("unreviewed critical SCF appears in scf_issues",
      withUnreviewed.scf_issues.some((si) => si.control_code === "SCF-001")
    );
  }

  // ── F6: AI Suggestions ────────────────────────────────────────

  console.log("  F6: AI Suggestions");

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: ["legal_basis_lgpd", "dpia_required"],
      rules: [
        requireAiSuggestionsResolved(["legal_basis_lgpd", "dpia_required"]),
        requireAiContradictionsResolved(),
      ],
    });

    const withPending = analyzer.analyze({
      ...filledInput(),
      ai_suggestions: [
        { id: "ai-1", suggestion_type: "field_value", target_field: "legal_basis_lgpd", confidence: "high", status: "pending" },
        { id: "ai-2", suggestion_type: "field_value", target_field: "description", confidence: "low", status: "pending" },
      ],
    });
    assert("pending AI suggestion for critical field emits issue",
      withPending.blocking_issues.some((i) => i.code === "AI_SUGGESTION_PENDING_LEGAL_BASIS_LGPD")
    );
    assert("pending AI suggestion for non-critical field does NOT emit issue",
      !withPending.blocking_issues.some((i) => i.code === "AI_SUGGESTION_PENDING_DESCRIPTION")
    );
    assert("critical AI pending appears in ai_pending",
      withPending.ai_pending.some((a) => a.target_field === "legal_basis_lgpd" && a.is_critical)
    );
    assert("non-critical AI pending appears in ai_pending but not critical",
      withPending.ai_pending.some((a) => a.target_field === "description" && !a.is_critical)
    );

    const withContradiction = analyzer.analyze({
      ...filledInput(),
      ai_suggestions: [
        { id: "ai-3", suggestion_type: "contradiction", target_field: "third_party_sharing", confidence: "high", status: "pending" },
      ],
    });
    assert("pending AI contradiction emits critical issue",
      withContradiction.blocking_issues.some((i) => i.code === "AI_CONTRADICTION_PENDING" && i.severity === "critical")
    );
  }

  // ── Integration: Full analyzer ────────────────────────────────

  console.log("  Integration: Full Privacy-like Analyzer");

  {
    const privacyAnalyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: ["name", "purpose", "legal_basis_lgpd"],
      recommended_fields: ["description", "security_measures_summary"],
      critical_fields: ["legal_basis_lgpd", "dpia_required", "lia_required", "retention_period", "risk_level"],
      rules: [
        requireRelation("data_subjects"),
        requireRelation("data_categories"),
        requireRelation("lifecycle_stages"),
        requireCoherence<TestActivity>({
          condition: (e) => e.third_party_sharing === true,
          relation: "third_parties",
          code: "SHARING_WITHOUT_THIRD_PARTIES",
          message: "third_party_sharing is true but no third parties registered.",
          severity: "critical",
        }),
        requireRelationItemValid<TestActivity, TestThirdParty>("third_parties", {
          predicate: (tp) => !(tp.role === "processor" && tp.dpa_status === "missing"),
          code: "PROCESSOR_WITHOUT_DPA",
          message: (tp) => `Third party '${tp.third_party_name}' is processor without DPA.`,
          severity: "critical",
        }),
        requireEvidenceForArtifact<TestActivity>({
          condition: (e) => e.dpia_required === true,
          evidence_type: "dpia",
          code: "DPIA_REQUIRED_WITHOUT_EVIDENCE",
          message: "DPIA is required but no accepted DPIA evidence exists.",
        }),
        requireFieldReviewsResolved(["legal_basis_lgpd", "retention_period"]),
        requireHumanApprovalForCriticalFields(["legal_basis_lgpd", "dpia_required"]),
        requireScreeningsComplete(),
        requireScfApplicabilityDraft(),
        requireScfControlsReviewed({ minPriority: "high" }),
        requireAiSuggestionsResolved(["legal_basis_lgpd", "dpia_required", "risk_level"]),
        requireAiContradictionsResolved(),
      ],
    });

    // Fully valid activity
    const perfect = privacyAnalyzer.analyze({
      ...filledInput(),
      evidence: [
        { id: "ev-1", evidence_type: "policy", linked_field: "legal_basis_lgpd", validation_status: "accepted" },
      ],
      screenings: [
        { screening_type: "dpia", status: "not_required", required: false },
        { screening_type: "lia", status: "required", required: true },
      ],
      scf_controls: [
        { id: "sc-1", control_code: "SCF-001", control_title: "Access Control", applicability_status: "applicable", validation_status: "approved", priority: "critical" },
      ],
    });
    assert("perfect activity can be submitted",
      perfect.can_be_submitted_for_review === true
    );
    assert("perfect activity has high score",
      perfect.completeness_score >= 70
    );
    assert("perfect activity has no blocking issues",
      perfect.blocking_issues.length === 0
    );

    // Completely empty activity
    const empty = privacyAnalyzer.analyze(emptyInput());
    assert("empty activity cannot be submitted",
      empty.can_be_submitted_for_review === false
    );
    assert("empty activity has low score",
      empty.completeness_score < 30
    );
    assert("empty activity has many blocking issues",
      empty.blocking_issues.length >= 3
    );
    assert("empty activity draft report is always allowed",
      empty.draft_report_allowed === true
    );
    assert("empty activity final report is not allowed",
      empty.final_report_allowed === false
    );
  }

  // ── Custom rule ───────────────────────────────────────────────

  console.log("  Custom Rules");

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: [],
      recommended_fields: [],
      critical_fields: [],
      rules: [
        customRule<TestActivity>({
          check: (input) => input.entity.status === "archived",
          issue: {
            code: "ARCHIVED_ENTITY",
            message: "Cannot analyze completeness of archived entity.",
            category: "lifecycle",
            severity: "critical",
            affected_fields: ["status"],
          },
        }),
      ],
    });

    const archived = analyzer.analyze(emptyInput({ status: "archived" }));
    assert("custom rule fires when check returns true",
      archived.blocking_issues.some((i) => i.code === "ARCHIVED_ENTITY")
    );

    const draft = analyzer.analyze(emptyInput({ status: "draft" }));
    assert("custom rule does not fire when check returns false",
      !draft.blocking_issues.some((i) => i.code === "ARCHIVED_ENTITY")
    );
  }

  // ── Score calculation ─────────────────────────────────────────

  console.log("  Score Calculation");

  {
    const analyzer = createCompletenessAnalyzer<TestActivity>({
      required_fields: ["name", "purpose", "legal_basis_lgpd"],
      recommended_fields: [],
      critical_fields: [],
      rules: [],
    });

    const none = analyzer.analyze(emptyInput());
    const one = analyzer.analyze(emptyInput({ name: "Test" }));
    const two = analyzer.analyze(emptyInput({ name: "Test", purpose: "Testing" }));
    const all = analyzer.analyze(emptyInput({ name: "Test", purpose: "Testing", legal_basis_lgpd: "consent" }));

    assert("score increases as fields are filled",
      none.completeness_score < one.completeness_score &&
      one.completeness_score < two.completeness_score &&
      two.completeness_score < all.completeness_score
    );

    assert("relations bonus adds to score",
      (() => {
        const withRelations = analyzer.analyze({
          ...emptyInput({ name: "Test", purpose: "Testing", legal_basis_lgpd: "consent" }),
          relations: { data_subjects: [{ id: "1" }] },
        });
        return withRelations.completeness_score > all.completeness_score;
      })()
    );
  }
};

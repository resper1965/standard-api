import { createInMemoryPrivacyDependencies, PrivacyCrudService, PrivacyCompletenessService } from "../src";

export const runPrivacyCompletenessTests = async (
  assert: (name: string, condition: boolean, detail?: string) => void
) => {
  console.log("\n📋 Privacy Completeness Tests\n");

  const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const ACTOR = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  const ctx = { organizationId: TENANT, actorId: ACTOR, traceId: "test-trace-002" };

  // ── Empty Activity ──────────────────────────────────────────────

  console.log("  Empty Activity Analysis");

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);
    const completeness = new PrivacyCompletenessService(deps);

    const activity = await crud.createActivity({ name: "Minimal" }, ctx);
    const result = await completeness.analyze(activity.id, TENANT);

    assert("empty activity has low completeness score",
      result.completeness_score < 50
    );
    assert("empty activity has missing required fields",
      result.missing_required_fields.includes("purpose") &&
      result.missing_required_fields.includes("legal_basis_lgpd") &&
      result.missing_required_fields.includes("retention_period")
    );
    assert("name is NOT missing (was provided)",
      !result.missing_required_fields.includes("name")
    );
    assert("empty activity cannot be submitted for review",
      result.can_be_submitted_for_review === false
    );
    assert("empty activity has blocking issues",
      result.blocking_issues.length >= 3
    );
    assert("empty activity draft report is always allowed",
      result.draft_report_allowed === true
    );
    assert("empty activity has missing relations",
      result.blocking_issues.some((i) => i.code === "MISSING_DATA_SUBJECTS") &&
      result.blocking_issues.some((i) => i.code === "MISSING_DATA_CATEGORIES")
    );
  }

  // ── Filled Activity ─────────────────────────────────────────────

  console.log("  Filled Activity Analysis");

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);
    const completeness = new PrivacyCompletenessService(deps);

    const activity = await crud.createActivity({
      name: "Full Activity",
      purpose: "Marketing analytics for customer segmentation",
      legal_basis_lgpd: "legitimate_interest",
      retention_period: "2 years",
      description: "Analyze user behavior",
      security_measures_summary: "Encryption at rest and in transit",
      risk_level: "medium",
    }, ctx);

    // Add relations
    await crud.addDataSubjects(activity.id, [
      { category: "customers", description: "All customers" },
    ], ctx);
    await crud.addDataCategories(activity.id, [
      { category_name: "Email addresses", sensitivity: "personal" },
    ], ctx);

    const result = await completeness.analyze(activity.id, TENANT);

    assert("filled activity has higher completeness score",
      result.completeness_score > 50
    );
    assert("filled activity has no missing required fields",
      result.missing_required_fields.length === 0
    );
    assert("filled activity can be submitted for review",
      result.can_be_submitted_for_review === true
    );
    assert("filled activity has no blocking issues",
      result.blocking_issues.length === 0
    );
  }

  // ── Coherence: third_party_sharing without third_parties ────────

  console.log("  Coherence Rules");

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);
    const completeness = new PrivacyCompletenessService(deps);

    const activity = await crud.createActivity({
      name: "Sharing Activity",
      purpose: "Data sharing",
      legal_basis_lgpd: "consent",
      retention_period: "1 year",
      third_party_sharing: true,
    }, ctx);

    await crud.addDataSubjects(activity.id, [{ category: "customers" }], ctx);
    await crud.addDataCategories(activity.id, [{ category_name: "Names" }], ctx);

    const result = await completeness.analyze(activity.id, TENANT);

    assert("third_party_sharing=true without third_parties is coherence error",
      result.blocking_issues.some((i) => i.code === "SHARING_WITHOUT_THIRD_PARTIES")
    );
    assert("coherence error is critical severity",
      result.blocking_issues.find((i) => i.code === "SHARING_WITHOUT_THIRD_PARTIES")?.severity === "critical"
    );
    assert("coherence error blocks submission",
      result.can_be_submitted_for_review === false
    );
  }

  // ── Coherence: international_transfer without third_parties ─────

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);
    const completeness = new PrivacyCompletenessService(deps);

    const activity = await crud.createActivity({
      name: "Transfer Activity",
      purpose: "International data processing",
      legal_basis_lgpd: "contract",
      retention_period: "3 years",
      international_transfer: true,
    }, ctx);

    await crud.addDataSubjects(activity.id, [{ category: "employees" }], ctx);
    await crud.addDataCategories(activity.id, [{ category_name: "Payroll data" }], ctx);

    const result = await completeness.analyze(activity.id, TENANT);

    assert("international_transfer=true without third_parties emits issue",
      result.blocking_issues.some((i) => i.code === "INTL_TRANSFER_WITHOUT_THIRD_PARTIES")
    );
  }

  // ── Recommended fields ──────────────────────────────────────────

  console.log("  Recommended Fields");

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);
    const completeness = new PrivacyCompletenessService(deps);

    const activity = await crud.createActivity({
      name: "No Desc",
      purpose: "Test",
      legal_basis_lgpd: "consent",
      retention_period: "1 year",
    }, ctx);

    await crud.addDataSubjects(activity.id, [{ category: "customers" }], ctx);
    await crud.addDataCategories(activity.id, [{ category_name: "Names" }], ctx);

    const result = await completeness.analyze(activity.id, TENANT);

    assert("missing description appears in recommended fields",
      result.missing_recommended_fields.includes("description")
    );
    assert("missing security_measures_summary appears in recommended fields",
      result.missing_recommended_fields.includes("security_measures_summary")
    );
    assert("recommended fields don't block submission",
      result.can_be_submitted_for_review === true
    );
  }

  // ── Score increases with more data ──────────────────────────────

  console.log("  Score Progression");

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);
    const completeness = new PrivacyCompletenessService(deps);

    const bareActivity = await crud.createActivity({ name: "Bare" }, ctx);
    const bareScore = (await completeness.analyze(bareActivity.id, TENANT)).completeness_score;

    const partialActivity = await crud.createActivity({
      name: "Partial",
      purpose: "Testing",
      legal_basis_lgpd: "consent",
    }, ctx);
    const partialScore = (await completeness.analyze(partialActivity.id, TENANT)).completeness_score;

    const fullActivity = await crud.createActivity({
      name: "Full",
      purpose: "Testing",
      legal_basis_lgpd: "consent",
      retention_period: "1 year",
      description: "Full activity",
      security_measures_summary: "AES-256",
    }, ctx);
    await crud.addDataSubjects(fullActivity.id, [{ category: "customers" }], ctx);
    await crud.addDataCategories(fullActivity.id, [{ category_name: "Names" }], ctx);
    const fullScore = (await completeness.analyze(fullActivity.id, TENANT)).completeness_score;

    assert("score increases with more fields filled",
      bareScore < partialScore && partialScore < fullScore,
      `bare=${bareScore}, partial=${partialScore}, full=${fullScore}`
    );
  }
};

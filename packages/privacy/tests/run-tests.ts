import {
  createInMemoryPrivacyDependencies,
  PrivacyCrudService,
  PrivacyCompletenessService,
  PrivacyStatusService,
  PrivacyScreeningService,
  PrivacyAiService,
  PrivacyReportService,
} from "../src";
import { runPrivacyCrudTests } from "./privacy-crud.test";
import { runPrivacyCompletenessTests } from "./privacy-completeness.test";

// ─── Test Runner ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

const assert = (name: string, condition: boolean, detail?: string) => {
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
};

const run = async () => {
  console.log("═══════════════════════════════════════════════════");
  console.log(" Privacy Module — Full Test Suite (Phases 1–7)");
  console.log("═══════════════════════════════════════════════════\n");

  // Phase 1: CRUD + Completeness + Status
  await runPrivacyCrudTests(assert);
  await runPrivacyCompletenessTests(assert);

  // ─── Phase 2: Third Parties ─────────────────────────────────────
  console.log("\n📋 Phase 2: Third Parties\n");

  const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const ACTOR = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  const ctx = { organizationId: TENANT, actorId: ACTOR, traceId: "test-trace" };

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);
    const completeness = new PrivacyCompletenessService(deps);

    const activity = await crud.createActivity({
      name: "Marketing Campaign",
      purpose: "Email marketing",
      legal_basis_lgpd: "consent",
      retention_period: "2 years",
      third_party_sharing: true,
    }, ctx);

    // Before adding third parties
    const before = await completeness.analyze(activity.id, TENANT);
    assert("third_party_sharing=true without parties blocks submission", before.can_be_submitted_for_review === false);

    // Add third parties
    const parties = await crud.addThirdParties(activity.id, [
      { name: "Mailchimp", role: "processor", country: "US", purpose: "Email delivery", transfer_mechanism: "standard_contractual_clauses" },
      { name: "Google Analytics", role: "processor", country: "US", data_shared: ["page_views", "user_agent"] },
    ], ctx);
    assert("third parties created", parties.length === 2);
    assert("first party has correct name", parties[0].name === "Mailchimp");
    assert("party has transfer mechanism", parties[0].transfer_mechanism === "standard_contractual_clauses");

    // List
    const listed = await crud.listThirdParties(activity.id, TENANT);
    assert("list returns all third parties", listed.length === 2);

    // After adding — now add subjects+categories too to satisfy coherence
    await crud.addDataSubjects(activity.id, [{ category: "customers" }], ctx);
    await crud.addDataCategories(activity.id, [{ category_name: "Email" }], ctx);

    const after = await completeness.analyze(activity.id, TENANT);
    assert("third_party_sharing=true WITH parties passes coherence", after.can_be_submitted_for_review === true);

    // Remove
    await crud.removeThirdParty(parties[1].id, TENANT);
    const afterRemove = await crud.listThirdParties(activity.id, TENANT);
    assert("remove third party works", afterRemove.length === 1);
  }

  // ─── Phase 3: Screenings ────────────────────────────────────────
  console.log("\n📋 Phase 3: Screenings (DPIA/LIA/TIA)\n");

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);
    const screen = new PrivacyScreeningService(deps);

    // High-risk activity
    const activity = await crud.createActivity({
      name: "Employee Monitoring",
      purpose: "Performance evaluation",
      legal_basis_lgpd: "legitimate_interest",
      retention_period: "5 years",
      systematic_monitoring: true,
      large_scope_processing: true,
      international_transfer: true,
    }, ctx);

    const results = await screen.screen(activity.id, ctx);
    assert("screening produces 3 results", results.length === 3);

    const dpia = results.find((r) => r.screening_type === "dpia");
    assert("DPIA is required", dpia?.result === "required");
    assert("DPIA has recommendations", dpia?.recommendation !== null);

    const lia = results.find((r) => r.screening_type === "lia");
    assert("LIA is required (legitimate interest)", lia?.result === "required");

    const tia = results.find((r) => r.screening_type === "tia");
    assert("TIA is required (international transfer)", tia?.result === "required");

    // Low-risk activity
    const lowRisk = await crud.createActivity({
      name: "Newsletter signup",
      purpose: "Send newsletters",
      legal_basis_lgpd: "consent",
      retention_period: "1 year",
    }, ctx);
    const lowResults = await screen.screen(lowRisk.id, ctx);
    assert("low-risk: no screenings required", lowResults.every((r) => r.result === "not_required"));
  }

  // ─── Phase 4: Field Reviews ─────────────────────────────────────
  console.log("\n📋 Phase 4: Field Reviews\n");

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);

    const activity = await crud.createActivity({ name: "Test Activity" }, ctx);

    // Create AI suggestion
    const review = await crud.addFieldReview(activity.id, {
      field_name: "purpose",
      suggested_value: "Customer data processing for analytics",
      source: "ai_suggestion",
      comment: "Extracted from uploaded document",
    }, ctx);
    assert("field review created", review.id !== undefined);
    assert("field review starts as pending", review.review_status === "pending");
    assert("field review source is ai_suggestion", review.source === "ai_suggestion");

    // Approve it
    const approved = await crud.updateFieldReview(review.id, {
      review_status: "approved",
      comment: "Confirmed by DPO",
    }, ctx);
    assert("field review can be approved", approved.review_status === "approved");
    assert("reviewer tracked", approved.reviewer_id === ACTOR);

    // Reject another
    const review2 = await crud.addFieldReview(activity.id, {
      field_name: "legal_basis_lgpd",
      suggested_value: "consent",
      source: "ai_suggestion",
    }, ctx);
    const rejected = await crud.updateFieldReview(review2.id, {
      review_status: "rejected",
      comment: "Wrong — this is legitimate interest",
    }, ctx);
    assert("field review can be rejected", rejected.review_status === "rejected");

    // List
    const all = await crud.listFieldReviews(activity.id, TENANT);
    assert("list field reviews returns all", all.length === 2);
  }

  // ─── Phase 6: AI Extraction ─────────────────────────────────────
  console.log("\n📋 Phase 6: AI Extraction (Natural Language)\n");

  {
    const deps = createInMemoryPrivacyDependencies();
    const ai = new PrivacyAiService(deps);

    // The classic scenario from the critical analysis
    const result = await ai.extractFromText(
      "Nós coletamos emails, nomes e CPFs dos nossos clientes para enviar campanhas de marketing. " +
      "Compartilhamos os dados com a Mailchimp para disparo de emails e com o Google Analytics para análise. " +
      "Guardamos por 2 anos após o último contato. Temos consentimento via formulário web. " +
      "O time de marketing é responsável.",
      ctx
    );

    assert("AI creates activity", result.activity.id !== undefined);
    assert("AI extracts purpose", result.activity.purpose !== null);
    assert("AI does NOT assert compliance", result.compliance_assertion === false);
    assert("AI has confidence score", result.confidence > 0);
    assert("AI generates field reviews", result.field_reviews_created > 0);

    // Check extracted data
    const crud = new PrivacyCrudService(deps);
    const subjects = await crud.listDataSubjects(result.activity.id, TENANT);
    assert("AI extracts data subjects (clientes)", subjects.length > 0);

    const categories = await crud.listDataCategories(result.activity.id, TENANT);
    assert("AI extracts data categories (email, nome, CPF)", categories.length >= 2);

    const parties = await crud.listThirdParties(result.activity.id, TENANT);
    assert("AI extracts third parties (Mailchimp)", parties.length > 0);

    // Check field reviews exist for AI-suggested fields
    const reviews = await crud.listFieldReviews(result.activity.id, TENANT);
    assert("AI creates field reviews for suggestions", reviews.length > 0);
    assert("field reviews are ai_suggestion source", reviews.some((r) => r.source === "ai_suggestion"));
    assert("critical fields get system_rule review", reviews.some((r) => r.source === "system_rule"));

    // Pending questions
    assert("AI identifies remaining questions", Array.isArray(result.pending_questions));

    // CPF should trigger sensitive data warning
    const sensitiveCategories = categories.filter((c) => c.sensitivity === "sensitive");
    assert("CPF detected as sensitive data", sensitiveCategories.length > 0);
  }

  // ─── Phase 6: English text ──────────────────────────────────────
  console.log("  English text extraction");

  {
    const deps = createInMemoryPrivacyDependencies();
    const ai = new PrivacyAiService(deps);

    const result = await ai.extractFromText(
      "We collect customer names and addresses for contract fulfillment. " +
      "Data is shared with FedEx for shipping. Retention is 5 years per legal obligation.",
      ctx
    );

    assert("English extraction works", result.activity.id !== undefined);
    assert("English extracts retention", result.activity.retention_period !== null);
  }

  // ─── Phase 7: Report Generation ─────────────────────────────────
  console.log("\n📋 Phase 7: ROPA Report\n");

  {
    const deps = createInMemoryPrivacyDependencies();
    const ai = new PrivacyAiService(deps);
    const screen = new PrivacyScreeningService(deps);
    const report = new PrivacyReportService(deps);

    // Full scenario: extract → screen → report
    const extracted = await ai.extractFromText(
      "Coletamos emails e CPFs dos clientes para marketing. " +
      "Compartilhamos com Mailchimp. Guardamos por 2 anos. " +
      "Temos consentimento. Monitoramento sistemático ativo.",
      ctx
    );

    // Run screening
    await screen.screen(extracted.activity.id, ctx);

    // Generate JSON report
    const jsonReport = await report.generateReport(extracted.activity.id, TENANT, "json");
    assert("JSON report generated", jsonReport.report_id !== undefined);
    assert("report NEVER asserts compliance", jsonReport.compliance_assertion === false);
    assert("report has completeness score", jsonReport.completeness.score > 0);
    assert("report has executive summary", jsonReport.executive_summary.length > 0);
    assert("report tracks field origins", Object.values(jsonReport.activity).some((f) => f.origin === "ai_suggested"));
    assert("report includes screenings", jsonReport.screenings.length > 0);
    assert("report includes gaps or warnings", jsonReport.gaps.length > 0 || jsonReport.warnings.length > 0);

    // Generate Markdown report
    const mdReport = await report.generateReport(extracted.activity.id, TENANT, "markdown");
    assert("markdown report has content", mdReport.markdown !== undefined && mdReport.markdown.length > 0);
    assert("markdown contains disclaimer", mdReport.markdown!.includes("does NOT assert compliance") || mdReport.markdown!.includes("does NOT constitute"));
    assert("markdown has evidence matrix", mdReport.markdown!.includes("Evidence Matrix"));
  }

  // ─── Phase 8: Tenant Isolation Hardening ────────────────────────
  console.log("\n📋 Phase 8: Tenant Isolation Hardening\n");

  {
    const deps = createInMemoryPrivacyDependencies();
    const crud = new PrivacyCrudService(deps);
    const TENANT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const TENANT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    const actA = await crud.createActivity({ name: "Tenant A Activity" }, { organizationId: TENANT_A, actorId: ACTOR, traceId: "t" });
    const actB = await crud.createActivity({ name: "Tenant B Activity" }, { organizationId: TENANT_B, actorId: ACTOR, traceId: "t" });

    // Cross-tenant access denied
    assert("tenant A cannot see tenant B activity", await crud.getActivity(actB.id, TENANT_A) === null);
    assert("tenant B cannot see tenant A activity", await crud.getActivity(actA.id, TENANT_B) === null);

    // Tenant A can see own
    assert("tenant A sees own activity", (await crud.getActivity(actA.id, TENANT_A))?.id === actA.id);

    // Third parties isolated
    await crud.addThirdParties(actA.id, [{ name: "Vendor A" }], { organizationId: TENANT_A, actorId: ACTOR, traceId: "t" });
    const partiesB = await crud.listThirdParties(actA.id, TENANT_B);
    assert("third parties isolated by tenant", partiesB.length === 0);

    // Field reviews isolated
    await crud.addFieldReview(actA.id, { field_name: "test", source: "human" }, { organizationId: TENANT_A, actorId: ACTOR, traceId: "t" });
    const reviewsB = await crud.listFieldReviews(actA.id, TENANT_B);
    assert("field reviews isolated by tenant", reviewsB.length === 0);
  }

  // ─── Phase 9: SCF Bridge Integration ─────────────────────────────
  console.log("\n📋 Phase 9: SCF Bridge Integration\n");

  {
    // Build a synthetic SCF dataset with a PRI (Privacy) domain
    const { createInMemoryScfRepository, createSyntheticScfFixture } = await import("@standard/scf-core");
    const { PrivacyScfBridge, PrivacyScreeningService: ScreenSvc } = await import("../src");

    const scfFixture = createSyntheticScfFixture();
    const SCF_VER_ID = scfFixture.versions[0].id;

    // Add PRI domain + privacy controls to the fixture
    const priDomainId = "30000000-0000-4000-8000-000000000901";
    const priControl06Id = "30000000-0000-4000-8000-000000000902";
    const priControl01Id = "30000000-0000-4000-8000-000000000903";
    const priControl09Id = "30000000-0000-4000-8000-000000000904";

    scfFixture.domains.push({
      id: priDomainId,
      scf_version_id: SCF_VER_ID,
      domain_code: "PRI",
      domain_name: "Privacy",
      description: "Privacy controls",
      sort_order: 10,
      is_synthetic: true,
    });

    scfFixture.controls.push(
      {
        id: priControl06Id,
        scf_version_id: SCF_VER_ID,
        scf_domain_id: priDomainId,
        control_code: "PRI-06",
        control_title: "Privacy Impact Assessments",
        control_description: "Conduct DPIA/RIPD for high-risk processing.",
        status: "active",
        is_synthetic: true,
      },
      {
        id: priControl01Id,
        scf_version_id: SCF_VER_ID,
        scf_domain_id: priDomainId,
        control_code: "PRI-01",
        control_title: "Data Privacy",
        control_description: "Establish legal basis for processing.",
        status: "active",
        is_synthetic: true,
      },
      {
        id: priControl09Id,
        scf_version_id: SCF_VER_ID,
        scf_domain_id: priDomainId,
        control_code: "PRI-09",
        control_title: "Cross-Border Data Transfers",
        control_description: "Assess transfer impact for international transfers.",
        status: "active",
        is_synthetic: true,
      }
    );

    // Add LGPD framework
    const lgpdFrameworkId = "30000000-0000-4000-8000-000000000910";
    scfFixture.frameworks.push({
      id: lgpdFrameworkId,
      framework_code: "BR-LGPD",  // REAL code from production SCF database
      framework_name: "Brazil LGPD",
      framework_version: "2018",
      publisher: "Brazil",
      jurisdiction: "Americas",
      category: "privacy",
      source_reference: "Lei 13.709/2018",
      status: "active",
      is_synthetic: true,
    });

    // Add LGPD requirements mapped to PRI controls
    const lgpdReq1Id = "30000000-0000-4000-8000-000000000920";
    const lgpdReq2Id = "30000000-0000-4000-8000-000000000921";
    scfFixture.requirements.push(
      { id: lgpdReq1Id, scf_framework_id: lgpdFrameworkId, requirement_code: "LGPD-Art38", requirement_title: "RIPD", requirement_text: "Relatório de Impacto", sort_order: 1, status: "active", is_synthetic: true },
      { id: lgpdReq2Id, scf_framework_id: lgpdFrameworkId, requirement_code: "LGPD-Art33", requirement_title: "Transferência Internacional", requirement_text: "Transferência de dados", sort_order: 2, status: "active", is_synthetic: true }
    );

    scfFixture.mappings.push(
      { id: "30000000-0000-4000-8000-000000000930", scf_version_id: SCF_VER_ID, scf_framework_id: lgpdFrameworkId, scf_framework_requirement_id: lgpdReq1Id, scf_control_id: priControl06Id, relationship_type: "related", relationship_strength: "source-defined", mapping_source: "synthetic", is_official: true, status: "active", is_synthetic: true },
      { id: "30000000-0000-4000-8000-000000000931", scf_version_id: SCF_VER_ID, scf_framework_id: lgpdFrameworkId, scf_framework_requirement_id: lgpdReq2Id, scf_control_id: priControl09Id, relationship_type: "related", relationship_strength: "source-defined", mapping_source: "synthetic", is_official: true, status: "active", is_synthetic: true }
    );

    const scfRepo = createInMemoryScfRepository(scfFixture);

    // ─── Bridge: resolveFramework ─────────────────────────────────
    const bridge = new PrivacyScfBridge(scfRepo);

    const lgpdFramework = await bridge.resolveFramework("lgpd");
    assert("bridge resolves lgpd → BR-LGPD framework", lgpdFramework !== null);
    assert("framework code is BR-LGPD", lgpdFramework?.framework_code === "BR-LGPD");
    assert("framework jurisdiction is Americas", lgpdFramework?.jurisdiction === "Americas");

    const gdprFramework = await bridge.resolveFramework("gdpr");
    assert("bridge returns null for unregistered GDPR framework", gdprFramework === null);

    const customFramework = await bridge.resolveFramework("custom");
    assert("bridge returns null for custom regime", customFramework === null);

    // ─── Bridge: getPrivacyControls ───────────────────────────────
    const priControls = await bridge.getPrivacyControls(SCF_VER_ID);
    assert("bridge finds 3 PRI controls", priControls.length === 3);
    assert("PRI-06 exists", priControls.some(c => c.control_code === "PRI-06"));
    assert("PRI-01 exists", priControls.some(c => c.control_code === "PRI-01"));
    assert("PRI-09 exists", priControls.some(c => c.control_code === "PRI-09"));

    // ─── Bridge: getPrivacyControlsForRegime ──────────────────────
    const lgpdPriControls = await bridge.getPrivacyControlsForRegime("lgpd", SCF_VER_ID);
    assert("LGPD has 2 mapped PRI controls", lgpdPriControls.length === 2);
    assert("PRI-06 is mapped to LGPD", lgpdPriControls.some(c => c.control.control_code === "PRI-06"));
    assert("PRI-09 is mapped to LGPD", lgpdPriControls.some(c => c.control.control_code === "PRI-09"));

    // ─── Bridge: buildAnchor ──────────────────────────────────────
    const anchor = await bridge.buildAnchor("lgpd");
    assert("anchor is not null", anchor !== null);
    assert("anchor has scf_version_label", anchor?.scf_version_label !== undefined);
    assert("anchor has framework_code=BR-LGPD", anchor?.framework_code === "BR-LGPD");
    assert("anchor has 2 mapped controls", anchor?.anchored_controls.length === 2);

    // ─── Bridge: isControlMappedToRegime ──────────────────────────
    const pri06mapped = await bridge.isControlMappedToRegime("PRI-06", "lgpd", SCF_VER_ID);
    assert("PRI-06 IS mapped to LGPD", pri06mapped === true);

    const pri01mapped = await bridge.isControlMappedToRegime("PRI-01", "lgpd", SCF_VER_ID);
    assert("PRI-01 is NOT mapped to LGPD (no mapping added)", pri01mapped === false);

    // ─── Screening with SCF anchoring ─────────────────────────────
    console.log("  SCF-anchored screening");

    const depsWithScf = {
      ...createInMemoryPrivacyDependencies(),
      scfRepository: scfRepo,
    };
    const crudWithScf = new PrivacyCrudService(depsWithScf);
    const screenWithScf = new ScreenSvc(depsWithScf);

    const activity = await crudWithScf.createActivity({
      name: "SCF-anchored test",
      privacy_regime: "lgpd",
      large_scope_processing: true,
      international_transfer: true,
      legal_basis_lgpd: "legitimate_interest",
    }, ctx);

    const results = await screenWithScf.screen(activity.id, ctx);
    assert("SCF-anchored screening produces 3 results", results.length === 3);

    const dpiaResult = results.find(r => r.screening_type === "dpia")!;
    assert("DPIA result has scf_anchor", (dpiaResult as any).scf_anchor !== undefined);
    assert("DPIA scf_anchor has framework_code=BR-LGPD", (dpiaResult as any).scf_anchor?.framework_code === "BR-LGPD");
    assert("DPIA scf_anchor references PRI-06", (dpiaResult as any).scf_anchor?.controls?.some((c: any) => c.control_code === "PRI-06"));

    const tiaResult = results.find(r => r.screening_type === "tia")!;
    assert("TIA result has scf_anchor", (tiaResult as any).scf_anchor !== undefined);
    assert("TIA scf_anchor references PRI-09", (tiaResult as any).scf_anchor?.controls?.some((c: any) => c.control_code === "PRI-09"));

    // ─── Graceful fallback (no SCF) ───────────────────────────────
    console.log("  Graceful fallback without SCF");

    const depsNoScf = createInMemoryPrivacyDependencies();
    const crudNoScf = new PrivacyCrudService(depsNoScf);
    const screenNoScf = new ScreenSvc(depsNoScf);

    const actNoScf = await crudNoScf.createActivity({
      name: "No SCF test",
      large_scope_processing: true,
    }, ctx);

    const noScfResults = await screenNoScf.screen(actNoScf.id, ctx);
    assert("without SCF: screening still works", noScfResults.length === 3);
    assert("without SCF: DPIA still triggered", noScfResults.some(r => r.screening_type === "dpia" && r.result === "required"));
    assert("without SCF: no scf_anchor attached", (noScfResults[0] as any).scf_anchor === undefined);
  }

  // ─── Summary ────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log(`${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

run().catch((e) => { console.error("Test error:", e); process.exit(1); });


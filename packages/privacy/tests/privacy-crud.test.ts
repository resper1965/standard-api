import { createInMemoryPrivacyDependencies, PrivacyCrudService, PrivacyStatusService, PrivacyError } from "../src";

export const runPrivacyCrudTests = async (
  assert: (name: string, condition: boolean, detail?: string) => void
) => {
  console.log("\n📋 Privacy CRUD Tests\n");

  const TENANT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const TENANT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const ACTOR = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  const TRACE = "test-trace-001";

  const ctxA = { organizationId: TENANT_A, actorId: ACTOR, traceId: TRACE };
  const ctxB = { organizationId: TENANT_B, actorId: ACTOR, traceId: TRACE };

  // ── Activity Create ─────────────────────────────────────────────

  console.log("  Activity CRUD");

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);

    const activity = await svc.createActivity({ name: "Test Activity" }, ctxA);
    assert("create activity returns valid id",
      typeof activity.id === "string" && activity.id.length > 0
    );
    assert("create activity sets organization_id",
      activity.organization_id === TENANT_A
    );
    assert("create activity defaults status to draft",
      activity.status === "draft"
    );
    assert("create activity defaults controller_role to unknown",
      activity.controller_role === "unknown"
    );
    assert("create activity defaults booleans to false",
      activity.third_party_sharing === false &&
      activity.international_transfer === false &&
      activity.automated_decision_making === false
    );
    assert("create activity sets created_by from actor",
      activity.created_by === ACTOR
    );
  }

  // ── Activity Get / Tenant Isolation ─────────────────────────────

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);

    const activity = await svc.createActivity({ name: "Tenant A Activity" }, ctxA);
    const found = await svc.getActivity(activity.id, TENANT_A);
    assert("get activity by id returns correct activity",
      found?.id === activity.id
    );

    const notFound = await svc.getActivity(activity.id, TENANT_B);
    assert("get activity returns null for wrong tenant",
      notFound === null
    );
  }

  // ── Activity List ───────────────────────────────────────────────

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);

    await svc.createActivity({ name: "A1" }, ctxA);
    await svc.createActivity({ name: "A2" }, ctxA);
    await svc.createActivity({ name: "B1" }, ctxB);

    const listA = await svc.listActivities(TENANT_A);
    assert("list activities filters by organization_id",
      listA.length === 2
    );

    const listB = await svc.listActivities(TENANT_B);
    assert("list activities returns correct count for other tenant",
      listB.length === 1
    );
  }

  // ── Activity Update ─────────────────────────────────────────────

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);

    const activity = await svc.createActivity({ name: "Before" }, ctxA);
    const updated = await svc.updateActivity(activity.id, { name: "After", purpose: "Testing" }, ctxA);

    assert("update activity merges partial patch",
      updated.name === "After" && updated.purpose === "Testing"
    );
    assert("update activity preserves unchanged fields",
      updated.status === "draft" && updated.controller_role === "unknown"
    );
  }

  // ── Activity Update Archived Block ──────────────────────────────

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);
    const statusSvc = new PrivacyStatusService(deps);

    const activity = await svc.createActivity({ name: "To Archive" }, ctxA);
    await statusSvc.transition(activity.id, "archived", ctxA);

    let threw = false;
    try {
      await svc.updateActivity(activity.id, { name: "Nope" }, ctxA);
    } catch (e) {
      threw = e instanceof PrivacyError && e.code === "ACTIVITY_ARCHIVED";
    }
    assert("update rejects archived activity", threw);
  }

  // ── Activity Delete ─────────────────────────────────────────────

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);

    const activity = await svc.createActivity({ name: "To Delete" }, ctxA);
    await svc.deleteActivity(activity.id, ctxA);
    const deleted = await svc.getActivity(activity.id, TENANT_A);
    assert("delete (soft) removes activity from get",
      deleted === null
    );
  }

  // ── Activity Not Found ──────────────────────────────────────────

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);

    let threw = false;
    try {
      await svc.updateActivity("nonexistent", { name: "X" }, ctxA);
    } catch (e) {
      threw = e instanceof PrivacyError && e.code === "ACTIVITY_NOT_FOUND";
    }
    assert("update rejects non-existent activity", threw);
  }

  // ── Data Subjects CRUD ──────────────────────────────────────────

  console.log("  Data Subjects CRUD");

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);

    const activity = await svc.createActivity({ name: "With Subjects" }, ctxA);
    const subjects = await svc.addDataSubjects(activity.id, [
      { category: "employees", description: "All staff" },
      { category: "customers", vulnerable_group: true },
    ], ctxA);

    assert("add data subjects returns correct count",
      subjects.length === 2
    );
    assert("data subject has activity_id",
      subjects[0]!.activity_id === activity.id
    );
    assert("data subject has organization_id",
      subjects[0]!.organization_id === TENANT_A
    );
    assert("data subject vulnerable_group flag preserved",
      subjects[1]!.vulnerable_group === true
    );

    const listed = await svc.listDataSubjects(activity.id, TENANT_A);
    assert("list data subjects returns correct count",
      listed.length === 2
    );

    await svc.removeDataSubject(subjects[0]!.id, TENANT_A);
    const afterRemove = await svc.listDataSubjects(activity.id, TENANT_A);
    assert("remove data subject reduces count",
      afterRemove.length === 1
    );
  }

  // ── Data Subjects Tenant Isolation ──────────────────────────────

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);

    const activity = await svc.createActivity({ name: "Tenant A" }, ctxA);
    await svc.addDataSubjects(activity.id, [{ category: "employees" }], ctxA);

    const fromB = await svc.listDataSubjects(activity.id, TENANT_B);
    assert("list data subjects returns empty for wrong tenant",
      fromB.length === 0
    );
  }

  // ── Data Categories CRUD ────────────────────────────────────────

  console.log("  Data Categories CRUD");

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);

    const activity = await svc.createActivity({ name: "With Categories" }, ctxA);
    const categories = await svc.addDataCategories(activity.id, [
      { category_name: "Email addresses", sensitivity: "personal" },
      { category_name: "Health records", sensitivity: "sensitive", specific_data_elements: ["diagnosis", "treatment"] },
    ], ctxA);

    assert("add data categories returns correct count",
      categories.length === 2
    );
    assert("data category has activity_id",
      categories[0]!.activity_id === activity.id
    );
    assert("data category specific_data_elements preserved",
      categories[1]!.specific_data_elements.length === 2
    );

    const listed = await svc.listDataCategories(activity.id, TENANT_A);
    assert("list data categories returns correct count",
      listed.length === 2
    );

    await svc.removeDataCategory(categories[0]!.id, TENANT_A);
    const afterRemove = await svc.listDataCategories(activity.id, TENANT_A);
    assert("remove data category reduces count",
      afterRemove.length === 1
    );
  }

  // ── Status Transitions ──────────────────────────────────────────

  console.log("  Status Transitions");

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);
    const statusSvc = new PrivacyStatusService(deps);

    const activity = await svc.createActivity({ name: "Status Test" }, ctxA);

    const result1 = await statusSvc.transition(activity.id, "needs_information", ctxA);
    assert("transition draft → needs_information succeeds",
      result1.status === "needs_information" && result1.previous_status === "draft"
    );

    const result2 = await statusSvc.transition(activity.id, "draft", ctxA);
    assert("transition needs_information → draft succeeds",
      result2.status === "draft"
    );

    const result3 = await statusSvc.transition(activity.id, "archived", ctxA);
    assert("transition draft → archived succeeds",
      result3.status === "archived"
    );

    const result4 = await statusSvc.transition(activity.id, "draft", ctxA);
    assert("transition archived → draft succeeds",
      result4.status === "draft"
    );
  }

  // ── Invalid Transition ──────────────────────────────────────────

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);
    const statusSvc = new PrivacyStatusService(deps);

    const activity = await svc.createActivity({ name: "Bad Transition" }, ctxA);

    let threw = false;
    try {
      await statusSvc.transition(activity.id, "approved", ctxA);
    } catch (e) {
      threw = e instanceof PrivacyError && e.code === "INVALID_STATUS_TRANSITION";
    }
    assert("invalid transition draft → approved throws", threw);
  }

  // ── Under Review Gate ───────────────────────────────────────────

  {
    const deps = createInMemoryPrivacyDependencies();
    const svc = new PrivacyCrudService(deps);
    const statusSvc = new PrivacyStatusService(deps);

    const activity = await svc.createActivity({ name: "Incomplete" }, ctxA);

    let threw = false;
    try {
      await statusSvc.transition(activity.id, "under_review", ctxA);
    } catch (e) {
      threw = e instanceof PrivacyError && e.code === "COMPLETENESS_CHECK_FAILED";
    }
    assert("under_review blocked for incomplete activity", threw);
  }

  // ── Allowed Transitions ─────────────────────────────────────────

  {
    const statusSvc = new PrivacyStatusService(createInMemoryPrivacyDependencies());

    assert("draft has 3 allowed transitions",
      statusSvc.getAllowedTransitions("draft").length === 3
    );
    assert("approved has 1 allowed transition",
      statusSvc.getAllowedTransitions("approved").length === 1
    );
  }
};

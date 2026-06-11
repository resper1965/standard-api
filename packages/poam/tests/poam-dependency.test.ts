/**
 * POA&M Dependency Detection Tests
 *
 * Tests for detectPoamDependencies() — verifies that structural
 * relationships between POA&M items are correctly identified.
 */
import { test, expect } from "./test-kit";
import { detectPoamDependencies } from "../src/services/poam-dependency.service";

const makeItem = (
  overrides: {
    poam_item_id?: string;
    scf_control_id?: string | null;
    action_type?: string | null;
    target_maturity_score?: number | null;
  } = {},
) => ({
  poam_item_id: overrides.poam_item_id ?? crypto.randomUUID(),
  scf_control_id: overrides.scf_control_id ?? null,
  action_type: overrides.action_type ?? null,
  target_maturity_score: overrides.target_maturity_score ?? null,
});

// ── shared_scf_control (HIGH confidence) ─────────────────────────────────────

test("shared scf_control_id → prerequisite dependency (high confidence)", () => {
  const a = makeItem({
    poam_item_id: "item-a",
    scf_control_id: "ctrl-1",
    target_maturity_score: 1,
  });
  const b = makeItem({
    poam_item_id: "item-b",
    scf_control_id: "ctrl-1",
    target_maturity_score: 3,
  });
  const deps = detectPoamDependencies([a, b]);

  const shared = deps.filter((d) => d.reason === "shared_scf_control");
  expect(shared.length).toBe(1);
  expect(shared[0]!.poam_item_id).toBe("item-a"); // lower score first
  expect(shared[0]!.depends_on_poam_item_id).toBe("item-b");
  expect(shared[0]!.dependency_type).toBe("prerequisite");
  expect(shared[0]!.confidence).toBe("high");
});

test("shared scf_control_id: 3 items → 2 dependencies (chain)", () => {
  const items = [
    makeItem({ scf_control_id: "ctrl-1", target_maturity_score: 1 }),
    makeItem({ scf_control_id: "ctrl-1", target_maturity_score: 2 }),
    makeItem({ scf_control_id: "ctrl-1", target_maturity_score: 4 }),
  ];
  const deps = detectPoamDependencies(items);
  const shared = deps.filter((d) => d.reason === "shared_scf_control");
  expect(shared.length).toBe(2);
});

test("different scf_control_ids → no shared_scf_control dependency", () => {
  const a = makeItem({ scf_control_id: "ctrl-A" });
  const b = makeItem({ scf_control_id: "ctrl-B" });
  const deps = detectPoamDependencies([a, b]);
  const shared = deps.filter((d) => d.reason === "shared_scf_control");
  expect(shared.length).toBe(0);
});

// ── same_action_type (MEDIUM confidence) ─────────────────────────────────────

test("same action_type + different controls → related_to dependency (medium)", () => {
  const a = makeItem({
    poam_item_id: "item-x",
    action_type: "policy",
    scf_control_id: "ctrl-A",
  });
  const b = makeItem({
    poam_item_id: "item-y",
    action_type: "policy",
    scf_control_id: "ctrl-B",
  });
  const deps = detectPoamDependencies([a, b]);

  const medium = deps.filter((d) => d.reason === "same_action_type");
  expect(medium.length).toBeGreaterThan(0);
  expect(medium[0]!.dependency_type).toBe("related_to");
  expect(medium[0]!.confidence).toBe("medium");
});

// ── Edge cases ────────────────────────────────────────────────────────────────

test("no duplicates when same pair matches both rules", () => {
  const a = makeItem({
    poam_item_id: "a",
    scf_control_id: "ctrl-1",
    action_type: "policy",
    target_maturity_score: 1,
  });
  const b = makeItem({
    poam_item_id: "b",
    scf_control_id: "ctrl-1",
    action_type: "policy",
    target_maturity_score: 3,
  });
  const deps = detectPoamDependencies([a, b]);

  const keys = deps.map(
    (d) => `${d.poam_item_id}:${d.depends_on_poam_item_id}`,
  );
  const unique = new Set(keys);
  expect(unique.size).toBe(keys.length);
});

test("single item → empty result", () => {
  const deps = detectPoamDependencies([makeItem({ scf_control_id: "ctrl-1" })]);
  expect(deps.length).toBe(0);
});

test("items without scf_control_id or action_type → empty", () => {
  const a = makeItem({ scf_control_id: null, action_type: null });
  const b = makeItem({ scf_control_id: null, action_type: null });
  const deps = detectPoamDependencies([a, b]);
  expect(deps.length).toBe(0);
});

test("empty array → empty result", () => {
  const deps = detectPoamDependencies([]);
  expect(deps.length).toBe(0);
});

test("detected dependencies have required fields", () => {
  const a = makeItem({ scf_control_id: "ctrl-1", target_maturity_score: 1 });
  const b = makeItem({ scf_control_id: "ctrl-1", target_maturity_score: 3 });
  const deps = detectPoamDependencies([a, b]);
  expect(deps.length).toBeGreaterThan(0);
  const dep = deps[0]!;
  expect(dep.poam_item_id).toBeDefined();
  expect(dep.depends_on_poam_item_id).toBeDefined();
  expect(dep.dependency_type).toBeDefined();
  expect(dep.reason).toBeDefined();
  expect(dep.confidence).toBeDefined();
  expect(dep.description).toBeDefined();
});

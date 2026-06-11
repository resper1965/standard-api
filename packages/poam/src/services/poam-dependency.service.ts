/**
 * @module poam-dependency.service
 * @description Detect dependencies between POA&M items based on structural relationships.
 *
 * Detection rules (ordered by confidence):
 *   HIGH — Items sharing the same `scf_control_id`: the item with lower
 *           `target_maturity_score` is a prerequisite of the item with higher score.
 *   MEDIUM — Items sharing the same `action_type` (different controls):
 *             they are "related_to" each other.
 *
 * Returns an array of { poam_item_id, depends_on_poam_item_id, dependency_type }
 * ready to be persisted via PoamDependencyRepository.saveMany().
 *
 * AGENTS.md §11: POA&M Planner pode propor atividades; não publica POA&M final sem aprovação.
 * These are detected proposals — not final dependencies until human review.
 */

export type DetectedDependency = {
  /** Item that has the dependency */
  poam_item_id: string;
  /** Item that must be resolved first */
  depends_on_poam_item_id: string;
  /** Canonical PoamDependencyType value */
  dependency_type: "prerequisite" | "related_to";
  /** Human-readable reason for the detection */
  reason: "shared_scf_control" | "same_action_type";
  /** Confidence level of the auto-detection */
  confidence: "high" | "medium";
  /** Auto-generated description for the dependency record */
  description: string;
};

type PoamItemInput = {
  poam_item_id: string;
  scf_control_id?: string | null | undefined;
  action_type?: string | null | undefined;
  target_maturity_score?: number | null | undefined;
};

/**
 * Detect dependencies between POA&M items.
 *
 * @param items - Array of POA&M items in the version (typically from `items.listByVersion`)
 * @returns Array of detected dependency proposals (not yet persisted)
 */
export const detectPoamDependencies = (
  items: PoamItemInput[],
): DetectedDependency[] => {
  const detected: DetectedDependency[] = [];
  const addedKeys = new Set<string>();

  const addDep = (dep: DetectedDependency): void => {
    const key = `${dep.poam_item_id}:${dep.depends_on_poam_item_id}`;
    if (!addedKeys.has(key)) {
      detected.push(dep);
      addedKeys.add(key);
    }
  };

  // ── HIGH confidence: shared scf_control_id ─────────────────────────────────
  // Items remediating the same control: lower target score is prerequisite of higher.
  const byControl = new Map<string, PoamItemInput[]>();
  for (const item of items) {
    if (!item.scf_control_id) continue;
    const group = byControl.get(item.scf_control_id) ?? [];
    group.push(item);
    byControl.set(item.scf_control_id, group);
  }

  for (const [controlId, group] of byControl) {
    if (group.length < 2) continue;
    // Sort ascending by target_maturity_score — lower score must be done first
    const sorted = [...group].sort(
      (a, b) => (a.target_maturity_score ?? 0) - (b.target_maturity_score ?? 0),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const source = sorted[i]!;
      const target = sorted[i + 1]!;
      addDep({
        poam_item_id: source.poam_item_id,
        depends_on_poam_item_id: target.poam_item_id,
        dependency_type: "prerequisite",
        reason: "shared_scf_control",
        confidence: "high",
        description: `Both items address SCF control ${controlId}. Lower-maturity item is a prerequisite.`,
      });
    }
  }

  // ── MEDIUM confidence: same action_type (different controls) ───────────────
  // Items of the same remediation type are often related (e.g., two "policy" items).
  const byActionType = new Map<string, PoamItemInput[]>();
  for (const item of items) {
    if (!item.action_type) continue;
    const group = byActionType.get(item.action_type) ?? [];
    group.push(item);
    byActionType.set(item.action_type, group);
  }

  for (const [actionType, group] of byActionType) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length - 1; i++) {
      const a = group[i]!;
      const b = group[i + 1]!;
      // Skip if already paired by control (high confidence rule)
      addDep({
        poam_item_id: a.poam_item_id,
        depends_on_poam_item_id: b.poam_item_id,
        dependency_type: "related_to",
        reason: "same_action_type",
        confidence: "medium",
        description: `Both items share action type '${actionType}'. Coordination recommended.`,
      });
    }
  }

  return detected;
};

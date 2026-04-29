import { baseMetrics, fail, failMetric, MockLLMProvider, pass, type AgentEvalCase } from "./eval-kit";

export const poamPlannerEval: AgentEvalCase = {
  name: "poam_planner requires related gap for every action",
  run() {
    const output = new MockLLMProvider().generateAgentOutput("poam_planner", {
      poam_items: [
        { related_gap_finding_id: "gap_synth_iac_001", action_type: "validation_required" },
        { related_gap_finding_id: "gap_synth_vpm_001", action_type: "evidence_collection" }
      ]
    });
    const items = output.metadata.poam_items as Array<{ related_gap_finding_id?: string; action_type: string }>;
    const generic = items.filter((item) => !item.related_gap_finding_id || item.action_type === "generic").length;
    return generic === 0
      ? pass("poam_planner requires related gap for every action")
      : fail("poam_planner requires related gap for every action", failMetric(baseMetrics(), "generic_poam_action_count"));
  }
};

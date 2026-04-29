import { baseMetrics, fail, failMetric, MockLLMProvider, pass, type AgentEvalCase } from "./eval-kit";

export const frameworkMapperEval: AgentEvalCase = {
  name: "framework_mapper official-only mappings",
  run() {
    const output = new MockLLMProvider().generateAgentOutput("framework_mapper", {
      mappings: [
        { requirement_code: "SYNTH-1.1", control_code: "GOV-001", mapping_type: "official" },
        { requirement_code: "SYNTH-9.9", control_code: null, mapping_type: "missing", status: "requires_validation" }
      ]
    });
    const mappings = output.metadata.mappings as Array<{ mapping_type: string }>;
    const invented = mappings.filter((mapping) => mapping.mapping_type !== "official" && mapping.mapping_type !== "missing").length;
    return invented === 0
      ? pass("framework_mapper official-only mappings")
      : fail("framework_mapper official-only mappings", failMetric(baseMetrics(), "hallucinated_mapping_count"));
  }
};

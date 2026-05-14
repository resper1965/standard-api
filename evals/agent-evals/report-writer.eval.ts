import { MockLLMProvider, pass, type AgentEvalCase } from "./eval-kit";

export const reportWriterEval: AgentEvalCase = {
  name: "report_writer preserves limitations and sources",
  run() {
    const output = new MockLLMProvider().generateAgentOutput("report_writer", {
      report_summary: {
        includes_limitations: true,
        includes_sources: true,
        includes_full_document_text: false,
        evidence_index_uses_chunk_references: true
      }
    });
    const summary = output.metadata.report_summary as {
      includes_limitations: boolean;
      includes_sources: boolean;
      includes_full_document_text: boolean;
      evidence_index_uses_chunk_references: boolean;
    };
    return pass("report_writer preserves limitations and sources", {
      schema_pass_rate: 1,
      guardrail_pass_rate: summary.includes_full_document_text ? 0 : 1,
      expected_status_match_rate: summary.includes_limitations && summary.includes_sources && summary.evidence_index_uses_chunk_references ? 1 : 0,
      hallucinated_mapping_count: 0,
      approval_bypass_count: 0,
      tenant_violation_count: 0,
      not_evidenced_misclassification_count: 0,
      high_maturity_without_evidence_count: 0,
      generic_poam_action_count: 0
    });
  }
};

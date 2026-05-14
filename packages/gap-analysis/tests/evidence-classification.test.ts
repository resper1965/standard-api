import { EvidenceClassificationService } from "../src/index";
import { context } from "./helpers";
import { expect, test } from "./test-kit";

test("Ausência de resultados KB gera not_evidenced", async () => {
  const result = await new EvidenceClassificationService().classifyCandidateEvidence(undefined as never, [], context);
  expect(result.evidence_strength).toBe("absent");
  expect(result.evidence_status).toBe("not_evidenced");
});

test("Evidência parcial gera evidence_strength partial", async () => {
  const result = await new EvidenceClassificationService().classifyCandidateEvidence(undefined as never, [
    {
      document_id: "doc",
      chunk_id: "chunk",
      score: 0.72,
      snippet: "Synthetic partial evidence",
      retrieval_method: "vector",
      candidate_evidence: true
    } as never
  ], context);
  expect(result.evidence_strength).toBe("partial");
  expect(result.evidence_status).toBe("candidate");
});

test("Evidência conflitante gera status conflicting", async () => {
  const result = await new EvidenceClassificationService().classifyCandidateEvidence(undefined as never, [
    {
      document_id: "doc",
      chunk_id: "chunk",
      score: 0.91,
      snippet: "Policy exists but exception says not implemented",
      retrieval_method: "vector",
      candidate_evidence: true
    } as never
  ], context);
  expect(result.evidence_strength).toBe("conflicting");
  expect(result.evidence_status).toBe("conflicting");
});

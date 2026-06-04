import {
  AgentRunSchema,
  AssessmentSchema,
  DocumentChunkSchema,
  DocumentSchema,
  GapFindingSchema,
  MaturityScoreSchema,
  PoamItemSchema,
  ScfMappingSchema,
  VectorReferenceSchema
} from "./domain";
import { AgentOutputSchema, AgentRunResponseSchema } from "./agent-runtime";

const organizationId = "11111111-1111-4111-8111-111111111111";
const assessmentId = "33333333-3333-4333-8333-333333333333";
const scfVersionId = "44444444-4444-4444-8444-444444444444";
const scfControlId = "55555555-5555-4555-8555-555555555555";
const requirementId = "66666666-6666-4666-8666-666666666666";
const gapId = "77777777-7777-4777-8777-777777777777";
const agentRunId = "88888888-8888-4888-8888-888888888888";
const traceId = "trace-smoke-0001";

const cases = [
  AssessmentSchema.safeParse({
    id: assessmentId,
    organizationId,
    name: "Synthetic Standard assessment",
    state: "draft",
    scfVersionId,
    traceId
  }),
  DocumentSchema.safeParse({
    id: "99999999-9999-4999-8999-999999999999",
    organizationId,
    assessmentId,
    originalFilename: "synthetic-policy.pdf",
    storageProvider: "r2",
    storageKey: "tenants/synthetic/documents/synthetic-policy.pdf",
    contentHash: "sha256:synthetic-document-hash",
    mimeType: "application/pdf",
    fileSize: 1024,
    classification: "internal",
    documentType: "policy",
    language: "en"
  }),
  DocumentChunkSchema.safeParse({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organizationId,
    assessmentId,
    documentId: "99999999-9999-4999-8999-999999999999",
    chunkIndex: 0,
    textHash: "sha256:synthetic-chunk-hash",
    pageNumber: 1,
    approximateTokenCount: 120
  }),
  VectorReferenceSchema.safeParse({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    organizationId,
    assessmentId,
    kbEntryId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    vectorProvider: "cloudflare_vectorize",
    vectorIndexName: "standard-synthetic-index",
    vectorId: "vec_synthetic_001"
  }),
  ScfMappingSchema.safeParse({
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    scfVersionId,
    scfFrameworkRequirementId: requirementId,
    scfControlId,
    relationshipType: "maps_to",
    relationshipStrength: "strong",
    mappingSource: "official_scf"
  }),
  AgentRunSchema.safeParse({
    id: agentRunId,
    organizationId,
    assessmentId,
    agentName: "standard-gap-analyst",
    agentVersion: "0.1.0",
    promptVersion: "synthetic-v1",
    inputHash: "sha256:synthetic-input-hash",
    outputHash: "sha256:synthetic-output-hash",
    confidenceScore: 0.82,
    status: "completed",
    traceId
  }),
  AgentRunResponseSchema.safeParse({
    agent_run_id: agentRunId,
    organization_id: organizationId,
    assessment_id: assessmentId,
    agent_id: "gap_analyst",
    agent_version: "0.1.0",
    prompt_version: "synthetic-v1",
    model: "mock-model",
    input_hash: "sha256:synthetic-input-hash",
    output_hash: "sha256:synthetic-output-hash",
    confidence_score: 0.82,
    status: "completed",
    trace_id: traceId,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString()
  }),
  AgentOutputSchema.safeParse({
    summary: "Synthetic agent output.",
    assumptions: ["Synthetic input is complete."],
    limitations: ["No real customer data was used."],
    sources: ["synthetic-fixture"],
    confidence_score: 0.82
  }),
  GapFindingSchema.safeParse({
    id: gapId,
    organizationId,
    assessmentId,
    findingCode: "GAP-001",
    frameworkRequirementId: requirementId,
    scfControlId,
    agentRunId,
    traceId,
    status: "not_evidenced",
    gapType: "evidence_gap",
    summary: "Synthetic gap for schema validation only.",
    rationale: "No synthetic evidence source was linked.",
    confidenceScore: 0.7
  }),
  MaturityScoreSchema.safeParse({
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    organizationId,
    assessmentId,
    maturityAssessmentVersionId: "abababab-abab-4bab-8bab-abababababab",
    scfControlId,
    score: 2,
    confidenceScore: 0.74,
    rationale: "Synthetic maturity rationale.",
    evidenceCoverage: 0.3
  }),
  PoamItemSchema.safeParse({
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    organizationId,
    assessmentId,
    poamVersionId: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
    itemCode: "POAM-001",
    relatedGapId: gapId,
    scfControlId,
    frameworkRequirementId: requirementId,
    correctiveAction: "Create and approve synthetic evidence procedure.",
    priority: "medium",
    severity: "medium",
    dependencies: [],
    expectedEvidence: "Approved synthetic procedure.",
    acceptanceCriteria: "Procedure is approved and linked to the SoA item.",
    status: "draft"
  })
];

const failed = cases.filter((result) => !result.success);

if (failed.length > 0) {
  console.error("Schema validation smoke test failed", failed.map((result) => result.error.issues));
  throw new Error("Schema validation smoke test failed");
}

console.log("Schema validation smoke test passed");


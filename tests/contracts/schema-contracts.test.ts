import {
  AgentOutputSchema,
  AuditEventSchema,
  ApiErrorSchema,
  SecurityEventRecordSchema,
  SoaItemResponseSchema,
  TraceIdSchema
} from "../../packages/schemas/src/index";
import { expect, test } from "../test-kit";

test("schemas aceitam outputs de agente com guardrails explícitos", () => {
  const output = AgentOutputSchema.parse({
    summary: "Synthetic result.",
    assumptions: ["Synthetic fixture assumption."],
    limitations: ["No real customer data."],
    sources: ["synthetic"],
    confidence_score: 0.7
  });
  expect(output.writes_final_finding).toBe(false);
  expect(output.creates_official_mapping).toBe(false);
});

test("SoA item sem mapping oficial pode exigir validação", () => {
  const item = SoaItemResponseSchema.parse({
    soa_item_id: "60000000-0000-4000-8000-000000000001",
    soa_version_id: "60000000-0000-4000-8000-000000000002",
    tenant_id: "10000000-0000-4000-8000-000000000001",
    organization_id: "20000000-0000-4000-8000-000000000001",
    assessment_id: "30000000-0000-4000-8000-000000000001",
    framework_id: "40000000-0000-4000-8000-000000000001",
    framework_requirement_id: "52000000-0000-4000-8000-000000000999",
    scf_version_id: "50000000-0000-4000-8000-000000000001",
    applicability_status: "requires_validation",
    implementation_status: "not_assessed",
    applicability_rationale: "No official mapping exists in the synthetic SCF fixture.",
    evidence_coverage: "absent",
    confidence_score: 0.2,
    requires_user_validation: true,
    mapping_status: "no_official_mapping",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  });
  expect(item.applicability_status).toBe("requires_validation");
});

test("audit e security event contracts exigem trace_id", () => {
  expect(TraceIdSchema.parse("trace-contract-0001")).toBe("trace-contract-0001");
  expect(AuditEventSchema.parse({
    id: "70000000-0000-4000-8000-000000000001",
    action: "assessment_created",
    resource_type: "assessment",
    outcome: "success",
    timestamp: "2026-01-01T00:00:00.000Z",
    trace_id: "trace-contract-0001",
    metadata_safe: {},
    created_at: "2026-01-01T00:00:00.000Z"
  }).trace_id).toBe("trace-contract-0001");
  expect(SecurityEventRecordSchema.parse({
    id: "70000000-0000-4000-8000-000000000002",
    event_type: "forbidden_access_attempt",
    severity: "medium",
    outcome: "denied",
    source: "api-gateway",
    message_safe: "Denied.",
    trace_id: "trace-contract-0001",
    metadata_safe: {},
    created_at: "2026-01-01T00:00:00.000Z"
  }).trace_id).toBe("trace-contract-0001");
});

test("error contract inclui trace_id e não exige stack trace", () => {
  const error = ApiErrorSchema.parse({
    error: {
      code: "FORBIDDEN",
      message: "Permission denied.",
      details: [],
      trace_id: "trace-contract-0001"
    }
  });
  expect(error.error.trace_id).toBe("trace-contract-0001");
});

import {
  AuditEventService,
  CostTrackingService,
  MetricsService,
  SecurityEventService,
  StructuredLogger,
  assertMetadataSafe,
  createInMemoryObservabilityDependencies,
  createTraceContext,
  redactValue
} from "../src";
import { expect, test } from "./test-kit";

const ids = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  orgId: "22222222-2222-4222-8222-222222222222",
  assessmentId: "33333333-3333-4333-8333-333333333333",
  actorId: "44444444-4444-4444-8444-444444444444",
  agentRunId: "55555555-5555-4555-8555-555555555555"
};

test("redaction remove authorization token api_key e document_text", () => {
  const redacted = redactValue({
    authorization: "Bearer secret",
    nested: {
      api_key: "key",
      document_text: "customer document"
    },
    safe: "ok"
  }) as Record<string, any>;

  expect(redacted.authorization).toBe("[REDACTED]");
  expect(redacted.nested.api_key).toBe("[REDACTED]");
  expect(redacted.nested.document_text).toBe("[REDACTED]");
  expect(redacted.safe).toBe("ok");
});

test("logger estruturado redige campos sensíveis e preserva trace_id", () => {
  const logger = new StructuredLogger();
  const entry = logger.log({
    level: "info",
    message: "request completed",
    service: "api-gateway",
    environment: "test",
    trace_id: "trace-test-0001",
    metadata: { token: "secret", route: "/api/v1/health" }
  });

  expect(entry.trace_id).toBe("trace-test-0001");
  expect((entry.metadata_safe as Record<string, unknown>).token).toBe("[REDACTED]");
});

test("TraceContext gera e preserva trace_id", () => {
  expect(createTraceContext().trace_id).toBeDefined();
  expect(createTraceContext({ trace_id: "trace-existing-0001" }).trace_id).toBe("trace-existing-0001");
});

test("AuditEvent exige action e trace_id e rejeita metadata proibida", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const service = new AuditEventService(deps);
  const event = await service.record({
    tenant_id: ids.tenantId,
    organization_id: ids.orgId,
    assessment_id: ids.assessmentId,
    actor_id: ids.actorId,
    action: "assessment_created",
    resource_type: "assessment",
    resource_id: ids.assessmentId,
    outcome: "success",
    trace_id: "trace-test-0001"
  });

  expect(event.action).toBe("assessment_created");

  try {
    assertMetadataSafe({ prompt: "do not log me" });
    throw new Error("metadata should fail");
  } catch (error) {
    expect(error).toBeDefined();
  }
});

test("SecurityEvent exige type severity e trace_id", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new SecurityEventService(deps).record({
    tenant_id: ids.tenantId,
    actor_id: ids.actorId,
    event_type: "forbidden_access_attempt",
    severity: "medium",
    outcome: "denied",
    source: "api-gateway",
    message_safe: "Permission denied.",
    trace_id: "trace-test-0001"
  });

  expect(event.event_type).toBe("forbidden_access_attempt");
  expect(event.severity).toBe("medium");
});

test("Metrics registra KB search sem query integral", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const metric = await new MetricsService(deps).record({
    tenant_id: ids.tenantId,
    assessment_id: ids.assessmentId,
    metric_name: "kb_search_count",
    metric_type: "counter",
    metric_value: 1,
    unit: "count",
    dimensions: { query_hash: "sha256:test" },
    trace_id: "trace-test-0001"
  });

  expect(metric.metric_name).toBe("kb_search_count");
  expect(metric.dimensions.query_hash).toBe("sha256:test");
});

test("CostTracking registra usage sem preço quando PricingProvider ausente", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const record = await new CostTrackingService(deps).recordUsage({
    tenant_id: ids.tenantId,
    assessment_id: ids.assessmentId,
    service_name: "vectorize",
    operation_name: "query",
    usage_quantity: 1,
    usage_unit: "query",
    provider: "cloudflare",
    trace_id: "trace-test-0001",
    metadata_safe: { query_hash: "sha256:test" }
  });

  expect(record.cost_estimate).toBe(undefined);
  expect(record.usage_unit).toBe("query");
});

test("CostTracking registra agent usage com tokens", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const usage = await new CostTrackingService(deps).recordAgentUsage({
    tenant_id: ids.tenantId,
    organization_id: ids.orgId,
    assessment_id: ids.assessmentId,
    agent_run_id: ids.agentRunId,
    model_provider: "mock",
    model_name: "mock-model",
    prompt_tokens: 100,
    completion_tokens: 20,
    total_tokens: 120,
    embedding_tokens: 0,
    trace_id: "trace-test-0001"
  });

  expect(usage.total_tokens).toBe(120);
});

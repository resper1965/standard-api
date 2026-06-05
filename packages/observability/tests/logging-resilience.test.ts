/**
 * @module logging-resilience.test
 * @description Regression tests for the HTTP 500 bug caused by ZodError
 * in SecurityEventService/AuditEventService when actor_id has "m2m:" prefix.
 *
 * Root cause: M2M API Keys set actor_id = "m2m:<uuid>" which failed
 * Zod UUID validation inside SecurityEventRecordSchema.parse().
 * The unhandled ZodError bubbled up to the global error handler,
 * converting a 403 RBAC denial into a generic 500.
 *
 * These tests verify the fix: non-UUID actor_id values are sanitized
 * before Zod validation, with the original value preserved in metadata_safe.
 */
import {
  AuditEventService,
  SecurityEventService,
  createInMemoryObservabilityDependencies,
} from "../src";
import { expect, test } from "./test-kit";

const VALID_UUID = "44444444-4444-4444-8444-444444444444";
const VALID_ORG_UUID = "11111111-1111-4111-8111-111111111111";
const VALID_ASSESSMENT_UUID = "33333333-3333-4333-8333-333333333333";
const M2M_ACTOR_ID = "m2m:b4410209-e1c1-4b44-8dcf-9e92a7263941";

// ─── SecurityEventService Resilience ───────────────────────────────

test("SecurityEvent: accepts m2m-prefixed actor_id without ZodError", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new SecurityEventService(deps).record({
    organization_id: VALID_ORG_UUID,
    actor_id: M2M_ACTOR_ID,
    event_type: "forbidden_access_attempt",
    severity: "medium",
    outcome: "denied",
    source: "api-gateway",
    message_safe: "Permission denied.",
    trace_id: "trace-resilience-001",
  });

  // Must NOT throw — the old code threw ZodError here
  expect(event.event_type).toBe("forbidden_access_attempt");
});

test("SecurityEvent: preserves original m2m actor_id in metadata_safe", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new SecurityEventService(deps).record({
    organization_id: VALID_ORG_UUID,
    actor_id: M2M_ACTOR_ID,
    event_type: "forbidden_access_attempt",
    severity: "medium",
    outcome: "denied",
    source: "api-gateway",
    message_safe: "Permission denied.",
    trace_id: "trace-resilience-002",
  });

  // actor_id should be sanitized to undefined (not a valid UUID)
  expect(event.actor_id).toBe(undefined);
  // Original value preserved for forensics
  const meta = event.metadata_safe as Record<string, unknown>;
  expect(meta.original_actor_id).toBe(M2M_ACTOR_ID);
});

test("SecurityEvent: accepts valid UUID actor_id unchanged", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new SecurityEventService(deps).record({
    organization_id: VALID_ORG_UUID,
    actor_id: VALID_UUID,
    event_type: "forbidden_access_attempt",
    severity: "medium",
    outcome: "denied",
    source: "api-gateway",
    message_safe: "Permission denied.",
    trace_id: "trace-resilience-003",
  });

  // Valid UUID passes through unchanged
  expect(event.actor_id).toBe(VALID_UUID);
  const meta = event.metadata_safe as Record<string, unknown>;
  // No original_actor_id when the actor_id is already a valid UUID
  expect(meta.original_actor_id).toBe(undefined);
});

test("SecurityEvent: sanitizes non-UUID organization_id and assessment_id", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new SecurityEventService(deps).record({
    organization_id: "not-a-uuid-org",
    assessment_id: "not-a-uuid-assessment",
    actor_id: VALID_UUID,
    event_type: "forbidden_access_attempt",
    severity: "medium",
    outcome: "denied",
    source: "api-gateway",
    message_safe: "Permission denied.",
    trace_id: "trace-resilience-004",
  });

  // Non-UUID org/assessment IDs are sanitized to undefined
  expect(event.organization_id).toBe(undefined);
  expect(event.assessment_id).toBe(undefined);
});

test("SecurityEvent: accepts undefined actor_id gracefully", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new SecurityEventService(deps).record({
    organization_id: VALID_ORG_UUID,
    actor_id: undefined,
    event_type: "forbidden_access_attempt",
    severity: "medium",
    outcome: "denied",
    source: "api-gateway",
    message_safe: "No actor context.",
    trace_id: "trace-resilience-005",
  });

  expect(event.actor_id).toBe(undefined);
});

// ─── AuditEventService Resilience ──────────────────────────────────

test("AuditEvent: accepts m2m-prefixed actor_id without ZodError", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new AuditEventService(deps).record({
    organization_id: VALID_ORG_UUID,
    assessment_id: VALID_ASSESSMENT_UUID,
    actor_id: M2M_ACTOR_ID,
    action: "assessment_state_changed",
    resource_type: "route",
    resource_id: "/api/v1/scf/frameworks",
    outcome: "denied",
    trace_id: "trace-resilience-006",
  });

  // Must NOT throw
  expect(event.action).toBe("assessment_state_changed");
});

test("AuditEvent: preserves original m2m actor_id in metadata_safe", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new AuditEventService(deps).record({
    organization_id: VALID_ORG_UUID,
    assessment_id: VALID_ASSESSMENT_UUID,
    actor_id: M2M_ACTOR_ID,
    action: "assessment_state_changed",
    resource_type: "route",
    resource_id: "/api/v1/scf/frameworks",
    outcome: "denied",
    trace_id: "trace-resilience-007",
  });

  expect(event.actor_id).toBe(undefined);
  const meta = event.metadata_safe as Record<string, unknown>;
  expect(meta.original_actor_id).toBe(M2M_ACTOR_ID);
});

test("AuditEvent: sanitizes non-UUID organization_id", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new AuditEventService(deps).record({
    organization_id: "bekaa",
    assessment_id: VALID_ASSESSMENT_UUID,
    actor_id: VALID_UUID,
    action: "assessment_created",
    resource_type: "assessment",
    resource_id: VALID_ASSESSMENT_UUID,
    outcome: "success",
    trace_id: "trace-resilience-008",
  });

  // Non-UUID org IDs are sanitized
  expect(event.organization_id).toBe(undefined);
});

test("AuditEvent: valid UUID actor_id passes through unchanged", async () => {
  const deps = createInMemoryObservabilityDependencies();
  const event = await new AuditEventService(deps).record({
    organization_id: VALID_ORG_UUID,
    assessment_id: VALID_ASSESSMENT_UUID,
    actor_id: VALID_UUID,
    action: "assessment_created",
    resource_type: "assessment",
    resource_id: VALID_ASSESSMENT_UUID,
    outcome: "success",
    trace_id: "trace-resilience-009",
  });

  expect(event.actor_id).toBe(VALID_UUID);
  const meta = event.metadata_safe as Record<string, unknown>;
  expect(meta.original_actor_id).toBe(undefined);
});

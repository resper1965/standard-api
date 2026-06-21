/**
 * @module soc-triage.consumer.test
 * @description Tests for SOC triage queue consumer.
 * Validates: schema validation, severity classification, action mapping, structured logging.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("processSocTriageMessage", () => {
  const SYNTHETIC_ORG = "org-00000000-0000-4000-8000-000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Schema Validation ──

  it("rejects message missing severity", async () => {
    const { SocTriageMessageSchema } = await import("../soc-triage.consumer");

    const result = SocTriageMessageSchema.safeParse({
      queue_type: "soc_triage",
      organization_id: SYNTHETIC_ORG,
      alert_type: "anomaly_detected",
      source: "monitor",
      trace_id: "trace-1",
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("rejects message missing organization_id", async () => {
    const { SocTriageMessageSchema } = await import("../soc-triage.consumer");

    const result = SocTriageMessageSchema.safeParse({
      queue_type: "soc_triage",
      alert_type: "anomaly",
      severity: "high",
      source: "monitor",
      trace_id: "trace-1",
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid message with all required fields", async () => {
    const { SocTriageMessageSchema } = await import("../soc-triage.consumer");

    const result = SocTriageMessageSchema.safeParse({
      queue_type: "soc_triage",
      organization_id: SYNTHETIC_ORG,
      alert_type: "anomaly_detected",
      severity: "high",
      source: "security_event_monitor",
      details: { event_id: "se-1", description: "Unusual login pattern" },
      trace_id: "trace-1",
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  // ── Severity Classification ──

  it("classifies critical severity → immediate_escalation", async () => {
    const { processSocTriageMessage } = await import("../soc-triage.consumer");

    const result = await processSocTriageMessage(
      {
        queue_type: "soc_triage" as const,
        organization_id: SYNTHETIC_ORG,
        alert_type: "intrusion_attempt",
        severity: "critical",
        source: "ids",
        details: {},
        trace_id: "trace-critical",
        timestamp: new Date().toISOString(),
      },
      {},
    );

    expect(result.triaged).toBe(true);
    expect(result.severity_classification).toBe("critical");
    expect(result.recommended_action).toBe("immediate_escalation");
    expect(result.organization_id).toBe(SYNTHETIC_ORG);
  });

  it("classifies high severity → escalate_to_analyst", async () => {
    const { processSocTriageMessage } = await import("../soc-triage.consumer");

    const result = await processSocTriageMessage(
      {
        queue_type: "soc_triage" as const,
        organization_id: SYNTHETIC_ORG,
        alert_type: "suspicious_activity",
        severity: "high",
        source: "siem",
        details: {},
        trace_id: "trace-high",
        timestamp: new Date().toISOString(),
      },
      {},
    );

    expect(result.recommended_action).toBe("escalate_to_analyst");
  });

  it("classifies medium severity → queue_for_review", async () => {
    const { processSocTriageMessage } = await import("../soc-triage.consumer");

    const result = await processSocTriageMessage(
      {
        queue_type: "soc_triage" as const,
        organization_id: SYNTHETIC_ORG,
        alert_type: "policy_violation",
        severity: "medium",
        source: "rbac_monitor",
        details: {},
        trace_id: "trace-medium",
        timestamp: new Date().toISOString(),
      },
      {},
    );

    expect(result.recommended_action).toBe("queue_for_review");
  });

  it("classifies low severity → log_and_monitor", async () => {
    const { processSocTriageMessage } = await import("../soc-triage.consumer");

    const result = await processSocTriageMessage(
      {
        queue_type: "soc_triage" as const,
        organization_id: SYNTHETIC_ORG,
        alert_type: "info",
        severity: "low",
        source: "log_aggregator",
        details: {},
        trace_id: "trace-low",
        timestamp: new Date().toISOString(),
      },
      {},
    );

    expect(result.recommended_action).toBe("log_and_monitor");
  });

  it("classifies info severity → acknowledge", async () => {
    const { processSocTriageMessage } = await import("../soc-triage.consumer");

    const result = await processSocTriageMessage(
      {
        queue_type: "soc_triage" as const,
        organization_id: SYNTHETIC_ORG,
        alert_type: "health_check",
        severity: "info",
        source: "monitoring",
        details: {},
        trace_id: "trace-info",
        timestamp: new Date().toISOString(),
      },
      {},
    );

    expect(result.recommended_action).toBe("acknowledge");
  });

  // ── Structured Output ──

  it("produces structured triage result with all expected fields", async () => {
    const { processSocTriageMessage } = await import("../soc-triage.consumer");

    const result = await processSocTriageMessage(
      {
        queue_type: "soc_triage" as const,
        organization_id: SYNTHETIC_ORG,
        alert_type: "data_exfiltration",
        severity: "critical",
        source: "dlp",
        details: { destination: "external-ip" },
        trace_id: "trace-structured",
        timestamp: new Date().toISOString(),
      },
      {},
    );

    expect(result.triaged).toBe(true);
    expect(result.organization_id).toBe(SYNTHETIC_ORG);
    expect(result.alert_type).toBe("data_exfiltration");
    expect(result.source).toBe("dlp");
    expect(result.trace_id).toBe("trace-structured");
    expect(result.triaged_at).toBeDefined();
    expect(new Date(result.triaged_at).getTime()).not.toBeNaN();
  });

  // ── Structured Logging ──

  it("logs structured completion event with trace_id", async () => {
    const { processSocTriageMessage } = await import("../soc-triage.consumer");

    const consoleSpy = vi.spyOn(console, "log");

    await processSocTriageMessage(
      {
        queue_type: "soc_triage" as const,
        organization_id: SYNTHETIC_ORG,
        alert_type: "test_alert",
        severity: "medium",
        source: "test_source",
        details: {},
        trace_id: "trace-log-test",
        timestamp: new Date().toISOString(),
      },
      {},
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("soc_triage_completed"),
    );

    const logCall = consoleSpy.mock.calls.find((c) =>
      String(c[0]).includes("soc_triage_completed"),
    );
    expect(logCall).toBeDefined();
    const parsed = JSON.parse(String(logCall![0]));
    expect(parsed.trace_id).toBe("trace-log-test");
    expect(parsed.metadata.severity).toBe("medium");
    expect(parsed.metadata.recommended_action).toBe("queue_for_review");
  });
});

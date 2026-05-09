/**
 * SOC Alert Rules — Code-Defined Alert Conditions
 *
 * AGENTS.md §13: Audit logs para mudanças de estado, approvals, uploads, outputs de agentes e exports.
 * Production go-live checklist: Alertas para tenant mismatch, approval bypass attempt, DLQ, erro 5xx e custo anômalo.
 *
 * Alerts are evaluated in-process and recorded as security_events.
 * Future: AlertSink interface for webhook/Slack/email integrations.
 */

import type { SecurityEventService, RecordSecurityEventInput } from "../security-events/security-event.service";

// ─── Alert Types ────────────────────────────────────────

export type AlertSeverity = "info" | "low" | "medium" | "high" | "critical";

export type AlertRule = {
  readonly ruleId: string;
  readonly name: string;
  readonly severity: AlertSeverity;
  readonly description: string;
};

export type AlertEvent = {
  rule: AlertRule;
  message: string;
  tenantId?: string | undefined;
  organizationId?: string | undefined;
  assessmentId?: string | undefined;
  actorId?: string | undefined;
  traceId: string;
  metadata?: Record<string, unknown> | undefined;
};

export type AlertSink = {
  send(alert: AlertEvent): Promise<void>;
};

// ─── Predefined Alert Rules ─────────────────────────────

export const ALERT_RULES = {
  TENANT_MISMATCH: {
    ruleId: "SOC-001",
    name: "Tenant Mismatch",
    severity: "critical" as const,
    description: "Request or data operation detected with unexpected tenant context."
  },
  APPROVAL_BYPASS_ATTEMPT: {
    ruleId: "SOC-002",
    name: "Approval Bypass Attempt",
    severity: "critical" as const,
    description: "Attempt to approve or advance artifact without proper authorization."
  },
  DLQ_THRESHOLD: {
    ruleId: "SOC-003",
    name: "DLQ Threshold Exceeded",
    severity: "high" as const,
    description: "Dead-letter queue depth exceeded the configured threshold."
  },
  ERROR_RATE_SPIKE: {
    ruleId: "SOC-004",
    name: "Error Rate Spike",
    severity: "high" as const,
    description: "5xx error rate exceeded 5% in the monitoring window."
  },
  COST_ANOMALY: {
    ruleId: "SOC-005",
    name: "Cost Anomaly",
    severity: "medium" as const,
    description: "Usage by tenant exceeded 2x the rolling average cost."
  }
} as const satisfies Record<string, AlertRule>;

// ─── Alert Service ──────────────────────────────────────

export class AlertService {
  private readonly sinks: AlertSink[] = [];

  constructor(private readonly securityEvents: SecurityEventService) {}

  /** Register an external alert sink (Slack, webhook, email, etc.) */
  addSink(sink: AlertSink): void {
    this.sinks.push(sink);
  }

  /** Fire an alert: record as security event + notify sinks */
  async fire(alert: AlertEvent): Promise<void> {
    // 1. Persist as security event
    const input: RecordSecurityEventInput = {
      tenant_id: alert.tenantId,
      organization_id: alert.organizationId,
      assessment_id: alert.assessmentId,
      actor_id: alert.actorId,
      event_type: "security_alert",
      severity: alert.rule.severity,
      outcome: "failure",
      source: `soc-alert:${alert.rule.ruleId}`,
      message_safe: `[${alert.rule.ruleId}] ${alert.rule.name}: ${alert.message}`,
      trace_id: alert.traceId,
      metadata_safe: {
        rule_id: alert.rule.ruleId,
        rule_name: alert.rule.name,
        ...alert.metadata
      }
    };
    await this.securityEvents.record(input);

    // 2. Dispatch to external sinks (fire-and-forget with error isolation)
    for (const sink of this.sinks) {
      try {
        await sink.send(alert);
      } catch {
        // Sink failure must not break the alert pipeline
      }
    }
  }

  // ─── Convenience Methods ────────────────────────────────

  async fireTenantMismatch(opts: { tenantId: string; expectedTenantId: string; traceId: string; actorId?: string }): Promise<void> {
    await this.fire({
      rule: ALERT_RULES.TENANT_MISMATCH,
      message: `Tenant ${opts.tenantId} attempted operation scoped to tenant ${opts.expectedTenantId}.`,
      tenantId: opts.tenantId,
      actorId: opts.actorId,
      traceId: opts.traceId,
      metadata: { expected_tenant_id: opts.expectedTenantId }
    });
  }

  async fireApprovalBypass(opts: { tenantId: string; assessmentId: string; artifactType: string; traceId: string; actorId?: string }): Promise<void> {
    await this.fire({
      rule: ALERT_RULES.APPROVAL_BYPASS_ATTEMPT,
      message: `Unauthorized approval attempt on ${opts.artifactType} for assessment ${opts.assessmentId}.`,
      tenantId: opts.tenantId,
      assessmentId: opts.assessmentId,
      actorId: opts.actorId,
      traceId: opts.traceId,
      metadata: { artifact_type: opts.artifactType }
    });
  }

  async fireDlqThreshold(opts: { queueName: string; depth: number; threshold: number; traceId: string }): Promise<void> {
    await this.fire({
      rule: ALERT_RULES.DLQ_THRESHOLD,
      message: `DLQ "${opts.queueName}" has ${opts.depth} messages (threshold: ${opts.threshold}).`,
      traceId: opts.traceId,
      metadata: { queue_name: opts.queueName, depth: opts.depth, threshold: opts.threshold }
    });
  }

  async fireErrorRateSpike(opts: { errorRate: number; windowMinutes: number; traceId: string }): Promise<void> {
    await this.fire({
      rule: ALERT_RULES.ERROR_RATE_SPIKE,
      message: `5xx error rate at ${(opts.errorRate * 100).toFixed(1)}% over ${opts.windowMinutes}min window.`,
      traceId: opts.traceId,
      metadata: { error_rate: opts.errorRate, window_minutes: opts.windowMinutes }
    });
  }

  async fireCostAnomaly(opts: { tenantId: string; currentCost: number; averageCost: number; traceId: string }): Promise<void> {
    await this.fire({
      rule: ALERT_RULES.COST_ANOMALY,
      message: `Tenant ${opts.tenantId} cost $${opts.currentCost.toFixed(2)} exceeds 2x average $${opts.averageCost.toFixed(2)}.`,
      tenantId: opts.tenantId,
      traceId: opts.traceId,
      metadata: { current_cost: opts.currentCost, average_cost: opts.averageCost, ratio: opts.currentCost / opts.averageCost }
    });
  }
}

/** Console-based alert sink for local development */
export class ConsoleAlertSink implements AlertSink {
  async send(alert: AlertEvent): Promise<void> {
    console.warn(`[ALERT] [${alert.rule.severity.toUpperCase()}] ${alert.rule.ruleId}: ${alert.message}`);
  }
}

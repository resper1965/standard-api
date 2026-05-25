# @standard/observability

Status: stable | Layer: infrastructure | Runtime: Cloudflare Workers + PostgreSQL

## Overview

The observability layer for the Standard platform. Provides structured logging
with PII redaction, audit event recording, security event tracking, operational
metrics, agent usage metering, cost tracking, distributed tracing helpers, and
outbound webhook dispatch.

## Install

```bash
pnpm add @standard/observability
```

## Usage

```ts
import {
  StructuredLogger,
  AuditEventService,
  createInMemoryObservabilityDependencies,
} from "@standard/observability";

// Wire up dependencies (use Drizzle repos in production)
const deps = createInMemoryObservabilityDependencies();

const logger = new StructuredLogger({ service: "api-gateway", traceId });
logger.info("assessment.created", { assessmentId, tenantId });

const audit = new AuditEventService(deps.auditEvents);
await audit.record({
  id: crypto.randomUUID(),
  tenant_id: tenantId,
  assessment_id: assessmentId,
  action: "gap_analysis.approved",
  actor_id: userId,
  trace_id: traceId,
  created_at: new Date().toISOString(),
});
```

## API

| Export | Purpose |
|--------|---------|
| `StructuredLogger` | JSON structured logger with redaction |
| `AuditEventService` | Write and query audit events |
| `SecurityEventService` | Record and query security events |
| `MetricsService` | Emit and query operational metrics |
| `CostTrackingService` | Track LLM token and API costs |
| `ObservabilityDependencies` | DI container shape |
| `createInMemoryObservabilityDependencies` | In-memory repos (testing/dev) |
| `createDrizzleObservabilityRepository` | PostgreSQL repository factory |
| `createSpan` / `TraceContext` | Lightweight distributed tracing helpers |
| `WebhookDispatcher` | Outbound event webhook dispatch |

## ObservabilityDependencies

```ts
type ObservabilityDependencies = {
  auditEvents:    ObservabilityRepository<AuditEvent>;
  securityEvents: ObservabilityRepository<SecurityEventRecord>;
  metrics:        ObservabilityRepository<OperationalMetric>;
  usage:          ObservabilityRepository<UsageRecord>;
  agentUsage:     ObservabilityRepository<AgentUsageRecord>;
};
```

## Rules

- Logs must **never** contain PII, full document content, prompts with customer data, or credentials.
- Use `RedactionRule` to scrub sensitive fields before emission.
- Every audit event must carry `tenant_id`, `assessment_id`, and `trace_id`.
- Tenant isolation is enforced in repository list queries via `tenant_id` filter.
- Security events should be emitted for auth failures, permission denials, and anomalies.

## Dependencies

| Package | Role |
|---------|------|
| `@standard/schemas` | Shared type contracts for all record shapes |

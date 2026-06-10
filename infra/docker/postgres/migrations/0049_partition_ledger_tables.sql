-- Migration: 0049 — Partition ledger tables for scale
-- Date: 2026-06-10
-- Author: Antigravity (Google DeepMind)
--
-- Rationale (postgresql skill — RANGE by time):
--   assessment_control_events and audit_logs are append-only ledger tables
--   that will grow unboundedly in production. Full table scans on large
--   multi-tenant datasets cause P95 latency spikes on dashboard queries.
--
-- Approach: PARTITION BY RANGE (time column), quarterly granularity.
--
-- Why RANGE(time) and NOT LIST(organization_id):
--   LIST partitioning requires DDL per tenant. N tenants = N partitions.
--   Neon DDL is transactional but still expensive at scale.
--   RANGE by time allows future pg_partman automation and fits the
--   insert-heavy append-only pattern of both tables.
--
-- IMPORTANT — PostgreSQL limitation:
--   Partitioned tables do NOT support FOREIGN KEY constraints.
--   The FK constraints from 0047 (actor_id→users, agent_run_id→agent_runs,
--   organization_id→organizations, etc.) are intentionally omitted.
--   Referential integrity is enforced at the application layer.
--
-- Drizzle ORM note:
--   Drizzle cannot declare partitioned tables in schema.ts.
--   This migration is raw SQL only. The Drizzle schema keeps the original
--   table definition for ORM queries (they work transparently with
--   partitioned tables via the parent table name).
--
-- Index strategy (postgresql skill — covering composite indexes):
--   Composite (organization_id, occurred_at/created_at) for tenant-scoped queries.
--   Partition pruning kicks in automatically on the time column.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- assessment_control_events
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Rename existing flat table (preserve data)
ALTER TABLE "assessment_control_events" RENAME TO "assessment_control_events_old";

-- 2. Create partitioned parent table (same columns, same NOT NULL constraints)
--    FK constraints intentionally omitted — not supported on partitioned tables.
CREATE TABLE "assessment_control_events" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID NOT NULL,
  "assessment_id"    UUID NOT NULL,
  "scf_control_id"   UUID NOT NULL,
  "scf_version_id"   UUID NOT NULL,
  "event_type"       TEXT NOT NULL,
  "previous_value"   JSONB,
  "new_value"        JSONB NOT NULL,
  "actor_id"         UUID,
  "agent_run_id"     UUID,
  "trace_id"         TEXT NOT NULL,
  "occurred_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
  -- ⛔ NO updated_at. NO deleted_at. Append-only = immutable record (ADR-002).
) PARTITION BY RANGE ("occurred_at");

-- 3. Create quarterly partitions covering 2026 Q2 → 2027 Q1
--    Add 30 days before each quarter end to avoid INSERT failures.
--    See docs/decisions/PARTITION-MAINTENANCE.md for quarterly rotation procedure.

CREATE TABLE "assessment_control_events_2026_q2"
  PARTITION OF "assessment_control_events"
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE "assessment_control_events_2026_q3"
  PARTITION OF "assessment_control_events"
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE TABLE "assessment_control_events_2026_q4"
  PARTITION OF "assessment_control_events"
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE TABLE "assessment_control_events_2027_q1"
  PARTITION OF "assessment_control_events"
  FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');

CREATE TABLE "assessment_control_events_2027_q2"
  PARTITION OF "assessment_control_events"
  FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');

-- 4. Covering composite index for dashboard/org-scoped queries
--    Partition pruning on occurred_at + org filter + control filter
CREATE INDEX "ace_org_time_ctrl_idx"
  ON "assessment_control_events" ("organization_id", "occurred_at", "scf_control_id");

-- 5. Index for assessment-scoped event queries (lifecycle audit)
CREATE INDEX "ace_assessment_time_idx"
  ON "assessment_control_events" ("assessment_id", "occurred_at");

-- 6. Index for trace correlation across partitions
CREATE INDEX "ace_trace_idx_partitioned"
  ON "assessment_control_events" ("trace_id");

-- 7. Migrate existing data (expected: zero or near-zero rows in dev)
INSERT INTO "assessment_control_events"
  SELECT
    "id",
    "organization_id",
    "assessment_id",
    "scf_control_id",
    "scf_version_id",
    "event_type",
    "previous_value",
    "new_value",
    "actor_id",
    "agent_run_id",
    "trace_id",
    "occurred_at"
  FROM "assessment_control_events_old";

-- 8. Drop old flat table
DROP TABLE "assessment_control_events_old";

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Rename existing flat table
ALTER TABLE "audit_logs" RENAME TO "audit_logs_old";

-- 2. Create partitioned parent table
--    FK constraints (actor_id→users, organization_id→organizations) omitted.
--    tenant_id preserved for backward compat with existing Drizzle schema.
CREATE TABLE "audit_logs" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_id"        UUID,
  "tenant_id"       UUID,
  "organization_id" UUID,
  "action"          TEXT NOT NULL,
  "resource_type"   TEXT NOT NULL,
  "resource_id"     UUID,
  "ip_address"      TEXT,
  "user_agent"      TEXT,
  "trace_id"        TEXT,
  "metadata"        JSONB NOT NULL DEFAULT '{}',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE ("created_at");

-- 3. Quarterly partitions 2026 Q2 → 2027 Q2
CREATE TABLE "audit_logs_2026_q2"
  PARTITION OF "audit_logs"
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE "audit_logs_2026_q3"
  PARTITION OF "audit_logs"
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE TABLE "audit_logs_2026_q4"
  PARTITION OF "audit_logs"
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE TABLE "audit_logs_2027_q1"
  PARTITION OF "audit_logs"
  FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');

CREATE TABLE "audit_logs_2027_q2"
  PARTITION OF "audit_logs"
  FOR VALUES FROM ('2027-04-01') TO ('2027-07-01');

-- 4. Composite index for tenant-scoped audit queries (primary use case)
CREATE INDEX "al_org_time_idx"
  ON "audit_logs" ("organization_id", "created_at");

-- 5. Index for action/resource filtering (compliance reporting)
CREATE INDEX "al_action_resource_idx"
  ON "audit_logs" ("action", "resource_type", "created_at");

-- 6. Index for trace correlation
CREATE INDEX "al_trace_idx_partitioned"
  ON "audit_logs" ("trace_id");

-- 7. Migrate existing data
-- NOTE: tenant_id was dropped in migration 0032 — use explicit column list
INSERT INTO "audit_logs" ("id", "actor_id", "tenant_id", "organization_id", "action", "resource_type", "resource_id", "ip_address", "user_agent", "trace_id", "metadata", "created_at")
  SELECT "id", "actor_id", NULL, "organization_id", "action", "resource_type", "resource_id", "ip_address", "user_agent", "trace_id", "metadata", "created_at"
  FROM "audit_logs_old";

-- 8. Drop old flat table
DROP TABLE "audit_logs_old";

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification queries (run manually after migration):
-- ─────────────────────────────────────────────────────────────────────────────
--
-- SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
-- FROM pg_tables
-- WHERE tablename LIKE 'assessment_control_events%'
--    OR tablename LIKE 'audit_logs%'
-- ORDER BY tablename;
--
-- Expected: parent tables + 5 quarterly partitions each.
--
-- SELECT relname, relkind
-- FROM pg_class
-- WHERE relname LIKE 'assessment_control_events%'
-- ORDER BY relname;
-- Expected: relkind = 'p' for parent, 'r' for partitions.

-- Rollback: 0049 — Remove partitioning, restore flat tables
-- Date: 2026-06-10
--
-- WARNING: This copies all partition data back to flat tables.
-- Expensive on large datasets. DO NOT run in production without
-- a maintenance window and prior backup.
--
-- This rollback does NOT restore FK constraints to users/organizations
-- on assessment_control_events since the Drizzle schema already
-- handles those via application-layer validation.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- assessment_control_events — restore flat table
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Rename partitioned parent aside
ALTER TABLE "assessment_control_events" RENAME TO "assessment_control_events_partitioned";

-- 2. Create flat table with original structure + PK
CREATE TABLE "assessment_control_events" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
);

-- 3. Copy all data from partitioned parent (reads all partitions)
INSERT INTO "assessment_control_events"
  SELECT * FROM "assessment_control_events_partitioned";

-- 4. Drop partitioned parent CASCADE (drops all child partitions + their indexes)
DROP TABLE "assessment_control_events_partitioned" CASCADE;

-- 5. Recreate original indexes from migration 0047
CREATE INDEX "ace_org_assessment_idx"
  ON "assessment_control_events" USING btree ("organization_id", "assessment_id");

CREATE INDEX "ace_control_idx"
  ON "assessment_control_events" USING btree ("assessment_id", "scf_control_id");

CREATE INDEX "ace_trace_idx"
  ON "assessment_control_events" USING btree ("trace_id");

CREATE INDEX "ace_occurred_at_idx"
  ON "assessment_control_events" USING btree ("occurred_at");

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs — restore flat table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "audit_logs" RENAME TO "audit_logs_partitioned";

CREATE TABLE "audit_logs" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
);

INSERT INTO "audit_logs"
  SELECT * FROM "audit_logs_partitioned";

DROP TABLE "audit_logs_partitioned" CASCADE;

COMMIT;

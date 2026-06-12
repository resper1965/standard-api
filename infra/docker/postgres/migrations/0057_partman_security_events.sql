-- Migration: 0057 — pg_partman + security_events partitioning
-- Date: 2026-06-11
-- Author: Antigravity
-- pglite-skip: requires pg_partman extension (not available in PGlite test environment)
-- Run manually in production/staging with: pnpm db:migrate

BEGIN;

-- 1. Enable pg_partman
CREATE SCHEMA IF NOT EXISTS partman;
CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA partman;

-- 2. Partition security_events by month
--    Rename existing flat table, recreate as partitioned, migrate data.
ALTER TABLE "security_events" RENAME TO "security_events_old";

CREATE TABLE "security_events" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid,
    "assessment_id" uuid,
    "actor_id" uuid,
    "event_type" text NOT NULL,
    "severity" text NOT NULL,
    "outcome" text NOT NULL,
    "source" text NOT NULL,
    "resource_type" text,
    "resource_id" text,
    "message_safe" text NOT NULL,
    "trace_id" text NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "metadata_safe" jsonb DEFAULT '{}' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
) PARTITION BY RANGE ("created_at");

CREATE INDEX "security_events_org_idx" ON "security_events" USING btree ("organization_id");
CREATE INDEX "security_events_type_idx" ON "security_events" USING btree ("event_type");
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");
CREATE INDEX "security_events_trace_idx" ON "security_events" USING btree ("trace_id");
CREATE INDEX "security_events_created_idx" ON "security_events" USING btree ("created_at");

-- 3. Register with pg_partman (premake 3 = create 3 future partitions immediately)
SELECT partman.create_parent(
    p_parent_table := 'public.security_events',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3
);

-- 4. Migrate existing data from flat table to partitioned table
INSERT INTO "security_events" SELECT * FROM "security_events_old";

DROP TABLE "security_events_old";

COMMIT;
